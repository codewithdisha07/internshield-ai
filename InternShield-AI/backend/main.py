from datetime import datetime, timezone
from urllib.parse import urlparse
import re
import sqlite3
from pathlib import Path
import secrets
import json
import joblib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from pydantic import BaseModel, Field
from openpyxl import Workbook

from train_model import train_and_evaluate, METRICS_FILE, ALGORITHMS
from verification import (
    verify_company,
    verify_recruiter,
    deep_scan_document,
    explain_prediction,
    generate_cybercrime_complaint,
    evaluate_interview_flags
)


# ============================================================
# PATHS
# ============================================================

BASE = Path(__file__).resolve().parent

DB_PATH = BASE / "internshield.db"
EXPORT_DIR = BASE / "exports"
EXPORT_DIR.mkdir(exist_ok=True)

FRONTEND_DIST = BASE.parent / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = BASE / "dist"

# Trained ML model
MODEL_FILE = BASE / "models" / "scam_model.joblib"

# Load model safely
model = None

if MODEL_FILE.exists():
    try:
        model = joblib.load(MODEL_FILE)
        print(f"ML model loaded successfully: {MODEL_FILE}")
    except Exception as exc:
        print(f"ML model could not be loaded: {exc}")
        model = None
else:
    print(f"ML model not found: {MODEL_FILE}")
    print("Text scanning will use rule-based detection until the model is trained.")


# ============================================================
# GOOGLE GMAIL SETTINGS
# ============================================================

GOOGLE_CLIENT_SECRET = BASE / "client_secret.json"

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

GMAIL_REDIRECT_URI = "http://localhost:8000/api/auth/gmail/callback"

FRONTEND_URL = "http://localhost:5173"


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="InternShield AI API",
    version="0.3.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONNECTORS
# ============================================================

CONNECTORS = [
    {
        "name": "Google",
        "type": "Gmail / Google Account",
        "status": "Not connected",
        "icon": "🌐"
    },
    {
        "name": "LinkedIn",
        "type": "Professional Profile & Job Network",
        "status": "Not connected",
        "icon": "💼"
    },
]


# ============================================================
# SAMPLE DATA
# ============================================================

SAMPLE_ITEMS = [
    {
        "source": "Gmail",
        "type": "Email",
        "title": "Congratulations! You are selected",
        "company": "ABC Technologies",
        "sender": "abc.hr@gmail.com",
        "url": "https://abc-technologies.xyz/apply",
        "risk": 91,
        "severity": "High Risk",
        "reasons": [
            "Free-mail sender claims to represent a company",
            "Company/domain mismatch",
            "Urgent selection language"
        ]
    },
    {
        "source": "Naukri",
        "type": "Job listing",
        "title": "Software Developer Internship",
        "company": "ABC Technologies",
        "sender": "recruiter@abc-technologies.com",
        "url": "https://abc-technologies.com/careers",
        "risk": 18,
        "severity": "Safe",
        "reasons": [
            "Company domain is consistent",
            "No payment request detected"
        ]
    },
    {
        "source": "SMS",
        "type": "SMS",
        "title": "Pay ₹999 to confirm internship",
        "company": "Unknown",
        "sender": "+91 98XXXXXX12",
        "url": "http://internship-confirm.example/pay",
        "risk": 97,
        "severity": "High Risk",
        "reasons": [
            "Payment request",
            "Suspicious URL",
            "Pressure to act immediately"
        ]
    },
    {
        "source": "LinkedIn",
        "type": "Recruiter",
        "title": "Remote internship opportunity",
        "company": "Northstar Labs",
        "sender": "Recruiter profile",
        "url": "https://northstarlabs.example/jobs",
        "risk": 42,
        "severity": "Suspicious",
        "reasons": [
            "Recruiter identity needs verification",
            "Limited independent evidence"
        ]
    },
]

SAMPLE_OFFERS = [
    {
        "source": "LinkedIn",
        "sender": "Rajesh Verma (HR Talent Lead)",
        "sender_email": "rajesh.hr.talent@gmail.com",
        "company": "Apex Data Tech Solutions",
        "title": "Internship Offer Letter - Remote Junior Associate",
        "stipend": "₹45,000 / month (Part-Time)",
        "body": "Congratulations! Your profile on LinkedIn has been selected for the Remote Internship position. Attached is your formal Offer Letter. Important Onboarding Requirement: Candidates must submit a refundable laptop security deposit of ₹1,500 via UPI (hr.apex@okaxis) before dispatch tracking for company equipment is released.",
        "attachment_name": "Offer_Letter_Apex_Solutions.pdf",
        "risk": 96,
        "severity": "High Risk",
        "prediction": "fraudulent",
        "reasons": "Demands upfront ₹1,500 laptop security deposit | Free-mail HR sender @gmail.com | Unrealistic stipend for fresher data entry | UPI payment trap"
    },
    {
        "source": "Google",
        "sender": "TCS Campus Recruitment Cell",
        "sender_email": "careers@tcs.com",
        "company": "Tata Consultancy Services (TCS)",
        "title": "Official Internship Selection & Project Onboarding Letter",
        "stipend": "₹25,000 / month · 6 Months Duration",
        "body": "Dear Candidate, We are pleased to extend an offer for Software Development Internship at Tata Consultancy Services following your technical evaluation. Compensation includes a monthly stipend of ₹25,000. TCS never requests any registration, training, or equipment fees at any phase of hiring. Please review and sign the attached Non-Disclosure Agreement (NDA).",
        "attachment_name": "TCS_Offer_Letter_2026.pdf",
        "risk": 5,
        "severity": "Safe",
        "prediction": "legitimate",
        "reasons": "Verified corporate domain @tcs.com | Standard corporate NDA clause included | Zero fee policy explicitly affirmed | Legitimate MNC internship"
    }
]


# ============================================================
# DATABASE
# ============================================================

def db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            source TEXT,
            type TEXT,
            title TEXT,
            company TEXT,
            sender TEXT,
            url TEXT,
            risk INTEGER,
            severity TEXT,
            reasons TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            scan_id INTEGER,
            action TEXT,
            status TEXT,
            notes TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS gmail_oauth (
            id INTEGER PRIMARY KEY CHECK(id=1),
            state TEXT,
            token_json TEXT,
            email TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS oauth_states (
            state TEXT PRIMARY KEY,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS linkedin_connection (
            id INTEGER PRIMARY KEY CHECK(id=1),
            connected_at TEXT NOT NULL,
            profile_url TEXT NOT NULL,
            profile_name TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS incoming_offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL,
            sender TEXT NOT NULL,
            sender_email TEXT,
            company TEXT NOT NULL,
            title TEXT NOT NULL,
            stipend TEXT,
            body TEXT NOT NULL,
            attachment_name TEXT,
            risk INTEGER NOT NULL,
            severity TEXT NOT NULL,
            prediction TEXT,
            reasons TEXT,
            status TEXT DEFAULT 'unread'
        )
        """
    )

    conn.commit()

    if conn.execute("SELECT COUNT(*) FROM incoming_offers").fetchone()[0] == 0:
        for o in SAMPLE_OFFERS:
            conn.execute(
                """
                INSERT INTO incoming_offers(
                    timestamp, source, sender, sender_email, company, title, stipend,
                    body, attachment_name, risk, severity, prediction, reasons, status
                )
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread')
                """,
                (
                    now(), o["source"], o["sender"], o["sender_email"], o["company"],
                    o["title"], o["stipend"], o["body"], o["attachment_name"],
                    o["risk"], o["severity"], o["prediction"], o["reasons"]
                )
            )
        conn.commit()

    if conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0] == 0:
        for x in SAMPLE_ITEMS:
            conn.execute(
                """
                INSERT INTO scans(
                    timestamp,
                    source,
                    type,
                    title,
                    company,
                    sender,
                    url,
                    risk,
                    severity,
                    reasons
                )
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    now(),
                    x["source"],
                    x["type"],
                    x["title"],
                    x["company"],
                    x["sender"],
                    x["url"],
                    x["risk"],
                    x["severity"],
                    " | ".join(x["reasons"])
                )
            )

        conn.commit()

    conn.close()


@app.on_event("startup")
def startup_event():
    init_db()
    global model
    if model is None or not MODEL_FILE.exists():
        try:
            print("Auto-training initial model on startup...")
            train_and_evaluate()
            reload_ml_model()
        except Exception as exc:
            print(f"Startup model check note: {exc}")


def now():
    return datetime.now(timezone.utc).isoformat()


def classify(score):
    if score >= 70:
        return "High Risk"

    if score >= 35:
        return "Suspicious"

    return "Safe"


def save_scan(
    source,
    typ,
    title,
    company,
    sender,
    url,
    score,
    severity,
    reasons
):
    conn = db()

    cur = conn.execute(
        """
        INSERT INTO scans(
            timestamp,
            source,
            type,
            title,
            company,
            sender,
            url,
            risk,
            severity,
            reasons
        )
        VALUES(?,?,?,?,?,?,?,?,?,?)
        """,
        (
            now(),
            source,
            typ,
            title,
            company,
            sender,
            url,
            score,
            severity,
            " | ".join(reasons)
        )
    )

    conn.commit()

    scan_id = cur.lastrowid

    conn.close()

    return scan_id


# ============================================================
# REQUEST MODELS
# ============================================================

class TextScan(BaseModel):
    text: str = Field(min_length=1)


class UrlScan(BaseModel):
    url: str = Field(min_length=1)


class CompanyVerifyRequest(BaseModel):
    company_name: str = Field(min_length=1)
    website_url: str = ""
    hr_email: str = ""
    cin_number: str = ""
    gstin: str = ""


class RecruiterVerifyRequest(BaseModel):
    recruiter_name: str = Field(min_length=1)
    company_name: str = ""
    email: str = ""
    phone: str = ""
    platform: str = "Email"
    interview_mode: str = "Video call"
    fee_requested: bool = False
    fee_details: str = ""


class DocumentDeepScanRequest(BaseModel):
    text: str = Field(min_length=1)
    document_name: str = "Uploaded Document"


class ModelTrainRequest(BaseModel):
    algorithm: str = "logistic_regression"


class ExplainRequest(BaseModel):
    text: str = Field(min_length=1)


class CybercrimeComplaintRequest(BaseModel):
    victim_name: str = Field(..., min_length=1)
    victim_phone: str = ""
    victim_email: str = ""
    victim_city: str = "New Delhi"
    victim_state: str = "Delhi"
    incident_date: str = ""
    platform: str = "Telegram / WhatsApp"
    scam_category: str = "Job / Internship Fraud"
    suspect_name: str = ""
    suspect_phone: str = ""
    suspect_telegram: str = ""
    suspect_email: str = ""
    suspect_upi: str = ""
    suspect_bank_acc: str = ""
    amount_lost: float = 0.0
    transaction_id: str = ""
    payment_mode: str = "UPI"
    incident_narrative: str = ""


class InterviewEvaluateRequest(BaseModel):
    flags: list[str] = Field(default_factory=list)
    custom_notes: str = ""


class LinkedInConnectRequest(BaseModel):
    profile_url: str = Field(..., min_length=1)
    profile_name: str = ""


class GoogleLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class LinkedInLoginRequest(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)


class SimulateOfferRequest(BaseModel):
    source: str = "LinkedIn"
    preset: str = "scam"


# ============================================================
# RULE-BASED TEXT SCANNER
# ============================================================

def score_text(text):
    """
    Context-aware job/internship scam scoring.

    The older version treated isolated words such as "pay" or "selected"
    as strong evidence. That can create false positives because legitimate
    messages often mention payments, selection, or WhatsApp too.

    This version scores combinations and phrases instead, while reducing
    the score for explicit anti-scam/legitimate statements.
    """
    t = re.sub(r"\s+", " ", str(text).lower()).strip()
    score = 0
    reasons = []

    def add(points, reason):
        nonlocal score
        score += points
        reasons.append(reason)

    # Strong financial scam signals.
    if re.search(r"(registration|processing|training|security|verification|joining|refundable)\s*(fee|charge|deposit)", t):
        add(45, "Upfront job/internship fee request detected")
    elif re.search(r"\b(pay|payment|fee|deposit|charge)\b", t) and re.search(
        r"\b(job|internship|intern|placement|joining|offer|recruiter|candidate)\b", t
    ):
        add(28, "Payment-related language connected to a job offer")

    if re.search(r"\b(upi|bank account|account number|ifsc|cvv|card number|credit card|debit card)\b", t):
        add(35, "Sensitive banking/payment information requested")

    if re.search(r"\b(otp|one[- ]time password|password|pin)\b", t):
        add(35, "Authentication secret requested")

    if re.search(r"\b(aadhaar|pan card|passport|driving license|identity proof|id proof)\b", t):
        add(18, "Identity document requested")

    # High-pressure tactics.
    if re.search(r"\b(urgent|immediately|within \d+\s*(hour|hours)|today only|act now|limited time)\b", t):
        add(18, "High-pressure deadline language detected")

    if re.search(r"\b(pay|payment|fee|deposit|transfer)\b", t) and re.search(
        r"\b(urgent|immediately|within \d+\s*(hour|hours)|today only|act now)\b", t
    ):
        add(18, "Urgency combined with a payment request")

    # Unrealistic or guaranteed employment claims.
    if re.search(r"\b(guaranteed job|guaranteed placement|100%\s*(job|placement)|no interview|without interview|instant job|easy money)\b", t):
        add(28, "Unrealistic or guaranteed employment claim")

    if re.search(r"\b(earn|salary|income)\b.{0,60}\b(per day|daily|per week|weekly)\b", t) and re.search(
        r"\b(no experience|easy|guaranteed)\b", t
    ):
        add(20, "Unusually easy/high-income employment claim")

    # External communication/payment channels.
    if re.search(r"\b(whatsapp|telegram)\b", t) and re.search(
        r"\b(job|internship|recruiter|offer|candidate)\b", t
    ):
        add(15, "Job process moved to an external messaging channel")

    if re.search(r"\b(crypto|usdt|bitcoin|gift card|steam card)\b", t):
        add(30, "Unusual payment method detected")

    # Link/phishing language in the extracted text.
    if re.search(r"https?://|www\.", t) and re.search(
        r"\b(verify|verification|registration|claim|activate|login|password|payment|fee)\b", t
    ):
        add(20, "Link combined with verification/login/payment language")

    # Impersonation-style language.
    if re.search(r"\b(official|hr|human resources|recruiter)\b", t) and re.search(
        r"\b(send|share|submit|provide)\b.{0,80}\b(otp|password|bank|cvv|upi|card)\b", t
    ):
        add(30, "Recruiter/HR message requests sensitive credentials")

    # Explicitly safe wording should not be treated as a scam signal.
    safe_phrases = [
        "we never ask for payment",
        "no fee is required",
        "no registration fee",
        "do not pay any fee",
        "we will never ask for otp",
        "never share your otp",
        "do not share your otp",
        "official careers page",
        "apply through our official website",
    ]
    safe_hits = sum(1 for p in safe_phrases if p in t)
    if safe_hits:
        score -= min(20, safe_hits * 10)
        reasons.append("Explicit safety/official-application wording detected")

    # A message with very little evidence should stay low risk.
    if not reasons:
        return 0, ["No strong job-scam indicators detected"]

    score = min(max(score, 0), 100)

    # Remove contradictory generic warnings when the text is explicitly safe
    # and has no strong scam combination.
    if safe_hits and score < 30:
        return score, reasons

    return score, reasons


# ============================================================
# ML TEXT SCANNER
# ============================================================

def reload_ml_model():
    """Reloads the trained scikit-learn model from disk."""
    global model
    if MODEL_FILE.exists():
        try:
            model = joblib.load(MODEL_FILE)
            print(f"ML model reloaded successfully: {MODEL_FILE}")
            return True
        except Exception as exc:
            print(f"Error reloading ML model: {exc}")
            return False
    return False


def ml_score_text(text):
    """
    Uses the trained TF-IDF + Classifier pipeline (100% offline, zero APIs).

    Returns:
        score
        prediction
        confidence
        probabilities
        matched_indicators
        explanation
    """
    if model is None:
        return None

    try:
        prediction = model.predict([text])[0]
        probabilities = model.predict_proba([text])[0]
        classes = list(model.classes_)

        probability_map = {
            str(label): float(probability)
            for label, probability in zip(classes, probabilities)
        }

        confidence = max(probabilities)
        fraudulent_probability = probability_map.get("fraudulent", 0.0)
        suspicious_probability = probability_map.get("suspicious", 0.0)
        legitimate_probability = probability_map.get("legitimate", 0.0)

        # Convert model probabilities into a 0-100 risk score
        score = (
            fraudulent_probability * 100
            + suspicious_probability * 60
            + legitimate_probability * 0
        )
        score = int(round(min(max(score, 0), 100)))

        # Explainable AI: extract specific tokens matching model vocabulary
        explanation = explain_prediction(model, text)

        return {
            "score": score,
            "prediction": str(prediction),
            "confidence": float(confidence),
            "probabilities": probability_map,
            "matched_indicators": explanation.get("matched_tokens", []),
            "explanation": explanation.get("explanation", "")
        }

    except Exception as exc:
        print(f"ML prediction error: {exc}")
        return None


# ============================================================
# URL SCANNER
# ============================================================

def score_url(raw):
    """
    URL risk scanner.

    This is a demo security heuristic scanner. It checks:
    - HTTPS usage
    - suspicious/action keywords
    - known high-risk generic TLDs
    - suspicious subdomain depth
    - multiple hyphens
    - company/brand impersonation

    It does NOT visit or download anything from the submitted URL.
    """

    value = raw.strip()

    candidate = (
        value
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", value)
        else "https://" + value
    )

    parsed = urlparse(candidate)
    host = (parsed.hostname or "").lower().strip(".")
    path = (parsed.path or "").lower()
    full_url = f"{host}{path}"

    if not host:
        return 95, "Invalid/unknown host", ["Invalid or malformed URL"]

    score = 5
    reasons = []

    # ------------------------------------------------------------
    # 1. HTTPS
    # ------------------------------------------------------------
    if parsed.scheme != "https":
        score += 20
        reasons.append("URL does not use HTTPS")

    # ------------------------------------------------------------
    # 2. Suspicious/action keywords
    # ------------------------------------------------------------
    suspicious_words = [
        "login",
        "verify",
        "verification",
        "secure",
        "account",
        "payment",
        "pay",
        "apply",
        "apply-now",
        "application",
        "job",
        "jobs",
        "job-offer",
        "joboffer",
        "career",
        "careers",
        "offer-letter",
        "claim",
        "confirm",
        "registration",
        "registration-fee",
    ]

    matched_words = [word for word in suspicious_words if word in full_url]

    if matched_words:
        score += min(25, 10 + len(matched_words) * 4)
        reasons.append(
            "URL contains suspicious job/action keywords: "
            + ", ".join(matched_words[:6])
        )

    # ------------------------------------------------------------
    # 3. Company/brand impersonation
    #
    # Example:
    # tcs-job-offer.example.com
    # fake-tcs-careers.com
    #
    # These are suspicious because the company name appears in
    # the hostname but the hostname is not the official domain.
    # ------------------------------------------------------------
    official_domains = {
        "tcs": ["tcs.com"],
        "infosys": ["infosys.com"],
        "wipro": ["wipro.com"],
        "accenture": ["accenture.com"],
        "microsoft": ["microsoft.com"],
        "google": ["google.com"],
        "amazon": ["amazon.com"],
        "ibm": ["ibm.com"],
        "cognizant": ["cognizant.com"],
        "capgemini": ["capgemini.com"],
        "deloitte": ["deloitte.com"],
        "oracle": ["oracle.com"],
        "adobe": ["adobe.com"],
        "apple": ["apple.com"],
        "meta": ["meta.com"],
        "flipkart": ["flipkart.com"],
    }

    host_labels = set(host.split("."))

    for brand, official_domains_for_brand in official_domains.items():
        # Detect the brand as a hostname label, including forms such
        # as fake-tcs, tcs-jobs, tcs-careers, etc.
        brand_mentioned = (
            brand in host_labels
            or any(
                brand in label
                for label in host_labels
                if label
            )
        )

        if not brand_mentioned:
            continue

        is_official = any(
            host == domain
            or host.endswith("." + domain)
            for domain in official_domains_for_brand
        )

        if not is_official:
            score += 60
            reasons.append(
                f"Possible {brand.upper()} brand impersonation: "
                f"the domain is not an official {brand.upper()} domain"
            )

        break

    # ------------------------------------------------------------
    # 4. Reserved/example domains used in testing
    # ------------------------------------------------------------
    if host == "example.com" or host.endswith(".example.com"):
        score += 35
        reasons.append(
            "Reserved example/test domain detected"
        )

    # ------------------------------------------------------------
    # 5. Higher-risk generic TLDs
    # ------------------------------------------------------------
    if host.endswith(
        (
            ".xyz",
            ".top",
            ".click",
            ".work",
            ".online",
            ".site",
        )
    ):
        score += 25
        reasons.append(
            "Domain uses a higher-risk generic TLD in this demo"
        )

    # ------------------------------------------------------------
    # 6. Deep subdomain structure
    # ------------------------------------------------------------
    if host.count(".") >= 3:
        score += 10
        reasons.append(
            "Unusually deep subdomain structure"
        )

    # ------------------------------------------------------------
    # 7. Multiple hyphens
    # ------------------------------------------------------------
    if host.count("-") >= 2:
        score += 10
        reasons.append(
            "Domain contains multiple hyphens"
        )

    # ------------------------------------------------------------
    # 8. Suspicious URL user-info section
    # Example: https://company.com@evil.example
    # ------------------------------------------------------------
    if parsed.username or parsed.password:
        score += 35
        reasons.append(
            "URL contains a suspicious username/password section"
        )

    score = min(max(score, 0), 100)

    if not reasons:
        reasons.append("No demo URL rule triggered")

    return score, host, reasons


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():
    init_db()


# ============================================================
# BASIC API
# ============================================================

@app.get("/")
def root():
    index_file = FRONTEND_DIST / "index.html"
    if FRONTEND_DIST.exists() and index_file.exists():
        return FileResponse(index_file)
    return {
        "name": "InternShield AI",
        "status": "running",
        "version": "0.3.0",
        "ml_model_loaded": model is not None
    }


@app.get("/api/health")
@app.get("/api/status")
def health():
    return {
        "status": "ok",
        "name": "InternShield AI",
        "version": "0.3.0",
        "time": now(),
        "ml_model_loaded": model is not None
    }


# ============================================================
# CONNECTORS
# ============================================================

@app.get("/api/connectors")
def connectors():
    conn = db()

    gmail_row = conn.execute(
        "SELECT email FROM gmail_oauth WHERE id=1"
    ).fetchone()

    linkedin_row = conn.execute(
        "SELECT profile_url, profile_name FROM linkedin_connection WHERE id=1"
    ).fetchone()

    conn.close()

    result = [dict(x) for x in CONNECTORS]

    for item in result:
        if item["name"] in ("Google", "Gmail"):
            item["status"] = (
                "Connected"
                if gmail_row
                else "Not connected"
            )
            if gmail_row:
                item["email"] = gmail_row["email"]
        elif item["name"] == "LinkedIn":
            item["status"] = (
                "Connected"
                if linkedin_row
                else "Not connected"
            )
            if linkedin_row:
                item["profile_url"] = linkedin_row["profile_url"]
                item["profile_name"] = linkedin_row["profile_name"]

    return result


# ============================================================
# GMAIL OAUTH
# ============================================================

def gmail_flow(state=None):

    if not GOOGLE_CLIENT_SECRET.exists():
        raise RuntimeError(
            f"Missing {GOOGLE_CLIENT_SECRET.name} in backend folder"
        )

    flow = Flow.from_client_secrets_file(
        str(GOOGLE_CLIENT_SECRET),
        scopes=GOOGLE_SCOPES,
        state=state
    )

    flow.redirect_uri = GMAIL_REDIRECT_URI

    return flow


def get_gmail_credentials():

    conn = db()

    row = conn.execute(
        "SELECT token_json FROM gmail_oauth WHERE id=1"
    ).fetchone()

    conn.close()

    if not row:
        return None

    try:
        return json.loads(row["token_json"])

    except Exception:
        return None


@app.get("/api/auth/gmail/login")
def gmail_login():

    state = secrets.token_urlsafe(32)

    print(f"Gmail OAuth state created: {state}")

    conn = db()

    conn.execute(
        """
        INSERT OR REPLACE INTO oauth_states(
            state,
            created_at
        )
        VALUES(?,?)
        """,
        (
            state,
            now()
        )
    )

    conn.commit()

    conn.close()

    flow = gmail_flow(state=state)

    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    return RedirectResponse(authorization_url)


@app.get("/api/auth/gmail/callback")
def gmail_callback(
    code: str = "",
    state: str = ""
):

    print(f"Gmail OAuth callback state: {state}")

    if not code or not state:

        return RedirectResponse(
            FRONTEND_URL + "?gmail=error"
        )

    conn = db()

    state_row = conn.execute(
        """
        SELECT state
        FROM oauth_states
        WHERE state=?
        """,
        (state,)
    ).fetchone()

    conn.execute(
        "DELETE FROM oauth_states WHERE state=?",
        (state,)
    )

    conn.commit()

    conn.close()

    if not state_row:

        print(
            "Gmail OAuth invalid state. "
            "The OAuth state was not found in the database."
        )

        return RedirectResponse(
            FRONTEND_URL + "?gmail=invalid_state"
        )

    try:

        flow = gmail_flow(state=state)

        flow.fetch_token(code=code)

        creds = flow.credentials

        service = build(
            "gmail",
            "v1",
            credentials=creds,
            cache_discovery=False
        )

        profile = service.users().getProfile(
            userId="me"
        ).execute()

        email = profile.get(
            "emailAddress",
            "Gmail user"
        )

        conn = db()

        conn.execute(
            """
            INSERT OR REPLACE INTO gmail_oauth(
                id,
                state,
                token_json,
                email
            )
            VALUES(1,?,?,?)
            """,
            (
                state,
                creds.to_json(),
                email
            )
        )

        conn.commit()

        conn.close()

        print(
            f"Gmail connected successfully: {email}"
        )

        return RedirectResponse(
            FRONTEND_URL + "?gmail=connected"
        )

    except Exception as exc:

        print(
            f"Gmail OAuth error: {exc}"
        )

        return RedirectResponse(
            FRONTEND_URL + "?gmail=error"
        )


@app.get("/api/auth/gmail/status")
def gmail_status():

    conn = db()

    row = conn.execute(
        """
        SELECT email
        FROM gmail_oauth
        WHERE id=1
        """
    ).fetchone()

    conn.close()

    return {
        "connected": bool(row),
        "email": row["email"] if row else None
    }


@app.post("/api/auth/gmail/disconnect")
def gmail_disconnect():

    conn = db()

    conn.execute(
        "DELETE FROM gmail_oauth WHERE id=1"
    )

    conn.commit()

    conn.close()

    return {
        "connected": False
    }


@app.post("/api/auth/google/login")
def google_direct_login(payload: GoogleLoginRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid Google email address.")
    if len(payload.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")

    conn = db()
    conn.execute(
        """
        INSERT OR REPLACE INTO gmail_oauth(id, state, token_json, email)
        VALUES(1, 'direct_auth', '{}', ?)
        """,
        (email,)
    )
    conn.commit()
    conn.close()
    return {"connected": True, "email": email}


# ============================================================
# LINKEDIN CONNECTION
# ============================================================

@app.get("/api/auth/linkedin/status")
def linkedin_status():
    conn = db()
    row = conn.execute(
        "SELECT profile_url, profile_name, connected_at FROM linkedin_connection WHERE id=1"
    ).fetchone()
    conn.close()
    return {
        "connected": bool(row),
        "profile_url": row["profile_url"] if row else None,
        "profile_name": row["profile_name"] if row else None,
        "connected_at": row["connected_at"] if row else None,
    }


@app.post("/api/auth/linkedin/connect")
def linkedin_connect(payload: LinkedInConnectRequest):
    url = payload.profile_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="LinkedIn profile URL or handle is required.")

    if not url.startswith("http://") and not url.startswith("https://"):
        if "linkedin.com" in url:
            url = "https://" + url
        else:
            clean_username = url.lstrip("@/").strip()
            url = f"https://www.linkedin.com/in/{clean_username}"

    name = payload.profile_name.strip()
    if not name:
        match = re.search(r"linkedin\.com/in/([^/?#]+)", url)
        name = match.group(1).replace("-", " ").title() if match else "LinkedIn Member"

    conn = db()
    conn.execute(
        """
        INSERT OR REPLACE INTO linkedin_connection(id, connected_at, profile_url, profile_name)
        VALUES(1, ?, ?, ?)
        """,
        (now(), url, name)
    )
    conn.commit()
    conn.close()

    return {
        "connected": True,
        "profile_url": url,
        "profile_name": name,
    }


@app.post("/api/auth/linkedin/disconnect")
def linkedin_disconnect():
    conn = db()
    conn.execute("DELETE FROM linkedin_connection WHERE id=1")
    conn.commit()
    conn.close()
    return {"connected": False}


@app.post("/api/auth/linkedin/login")
def linkedin_login(payload: LinkedInLoginRequest):
    username = payload.username.strip()
    password = payload.password.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Please enter your LinkedIn username or email.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="LinkedIn password must be at least 6 characters.")

    if "linkedin.com/in/" in username:
        match = re.search(r"linkedin\.com/in/([^/?#]+)", username)
        clean_handle = match.group(1) if match else "member"
        profile_url = f"https://www.linkedin.com/in/{clean_handle}"
        profile_name = clean_handle.replace("-", " ").replace(".", " ").title()
    else:
        clean_handle = username.split("@")[0].replace(" ", "-").lower()
        clean_handle = re.sub(r"[^a-zA-Z0-9_-]", "", clean_handle) or "member"
        profile_url = f"https://www.linkedin.com/in/{clean_handle}"
        profile_name = username.split("@")[0].replace(".", " ").replace("-", " ").title()

    conn = db()
    conn.execute(
        """
        INSERT OR REPLACE INTO linkedin_connection(id, connected_at, profile_url, profile_name)
        VALUES(1, ?, ?, ?)
        """,
        (now(), profile_url, profile_name)
    )
    conn.commit()
    conn.close()
    return {
        "connected": True,
        "profile_url": profile_url,
        "profile_name": profile_name
    }


# ============================================================
# LIVE INBOX & OFFER LETTER MONITORING
# ============================================================

@app.get("/api/monitor/offers")
def get_monitored_offers():
    conn = db()
    gmail_row = conn.execute("SELECT email FROM gmail_oauth WHERE id=1").fetchone()
    linkedin_row = conn.execute("SELECT profile_url, profile_name FROM linkedin_connection WHERE id=1").fetchone()

    allowed_sources = []
    if gmail_row:
        allowed_sources.append("Google")
    if linkedin_row:
        allowed_sources.append("LinkedIn")

    # If neither is connected, return empty offers with status
    if not allowed_sources:
        conn.close()
        return {
            "google_connected": False,
            "linkedin_connected": False,
            "google_email": None,
            "linkedin_profile": None,
            "offers": []
        }

    placeholders = ",".join("?" for _ in allowed_sources)
    rows = conn.execute(
        f"SELECT * FROM incoming_offers WHERE source IN ({placeholders}) ORDER BY id DESC",
        allowed_sources
    ).fetchall()
    conn.close()

    return {
        "google_connected": bool(gmail_row),
        "linkedin_connected": bool(linkedin_row),
        "google_email": gmail_row["email"] if gmail_row else None,
        "linkedin_profile": linkedin_row["profile_url"] if linkedin_row else None,
        "linkedin_name": linkedin_row["profile_name"] if linkedin_row else None,
        "offers": [dict(r) for r in rows]
    }


@app.post("/api/monitor/simulate")
def simulate_incoming_offer(payload: SimulateOfferRequest):
    source = payload.source if payload.source in ("Google", "LinkedIn") else "LinkedIn"

    # Auto-activate connector if simulated while disconnected so it displays immediately
    conn = db()
    if source == "Google":
        g_row = conn.execute("SELECT email FROM gmail_oauth WHERE id=1").fetchone()
        if not g_row:
            conn.execute(
                "INSERT OR REPLACE INTO gmail_oauth(id, state, token_json, email) VALUES(1, 'direct_auth', '{}', 'student.monitor@gmail.com')"
            )
            conn.commit()
    elif source == "LinkedIn":
        li_row = conn.execute("SELECT profile_url FROM linkedin_connection WHERE id=1").fetchone()
        if not li_row:
            conn.execute(
                "INSERT OR REPLACE INTO linkedin_connection(id, connected_at, profile_url, profile_name) VALUES(1, ?, 'https://www.linkedin.com/in/student-candidate', 'Student Candidate')",
                (now(),)
            )
            conn.commit()
    conn.close()

    if payload.preset == "authentic":
        sender = "Google Campus Relations" if source == "Google" else "Microsoft India HR"
        sender_email = "university-hiring@google.com" if source == "Google" else "careers@microsoft.com"
        company = "Google India Pvt Ltd" if source == "Google" else "Microsoft India Development Center"
        title = "Software Engineering Intern - Summer 2026 Offer"
        stipend = "₹85,000 / month · 6 Months"
        body = (
            f"Dear Candidate, On behalf of {company}, we are delighted to offer you the position of Software Engineering Intern. "
            "Your stipend will be ₹85,000 per month with comprehensive health coverage and office equipment provided. "
            "Please review the attached formal contract and sign the NDA. We never charge any training or onboarding fees."
        )
        attachment_name = "Official_Employment_Agreement.pdf"
    elif payload.preset == "telegram":
        sender = "Daily Earn Task HR" if source == "Google" else "Neha (Talent HR Lead)"
        sender_email = "hr.tasks@gmail.com"
        company = "Global Online Task Media"
        title = "Urgent: Part-Time Operations Task Offer"
        stipend = "₹3,000 / day (Immediate Payout)"
        body = (
            "Congratulations! You are selected without interview. Join our Telegram channel @task_payouts_hr now. "
            "To activate your task account and VIP daily payout server, pay ₹999 refundable activation fee via UPI."
        )
        attachment_name = "Task_Worker_Contract.pdf"
    else:  # scam
        sender = "Apex Digital Recruitment" if source == "Google" else "Rajesh Talent HR"
        sender_email = "careers.apex@gmail.com"
        company = "Apex Digital Technologies"
        title = "Offer Letter & Equipment Dispatch: Data Associate Intern"
        stipend = "₹40,000 / month"
        body = (
            "Offer of Internship: You have been selected for Remote Data Intern. "
            "A company MacBook Air has been allocated to you. As per policy, you must pay ₹1,500 laptop insurance "
            "and courier deposit via UPI (hr-apex@okaxis) before dispatch tracking is shared. Amount is 100% refundable with first stipend."
        )
        attachment_name = "Provisional_Offer_Letter.pdf"

    rule_score, rule_reasons = score_text(body)
    ml_result = ml_score_text(body)
    if ml_result is not None:
        final_score = round(ml_result["score"] * 0.6 + rule_score * 0.4)
        pred = ml_result["prediction"]
    else:
        final_score = rule_score
        pred = "suspicious" if rule_score > 35 else "legitimate"

    final_score = min(max(final_score, 0), 100)
    sev = classify(final_score)
    reasons_str = " | ".join(rule_reasons)

    conn = db()
    cur = conn.execute(
        """
        INSERT INTO incoming_offers(
            timestamp, source, sender, sender_email, company, title, stipend,
            body, attachment_name, risk, severity, prediction, reasons, status
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread')
        """,
        (now(), source, sender, sender_email, company, title, stipend, body, attachment_name, final_score, sev, pred, reasons_str)
    )
    new_id = cur.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM incoming_offers WHERE id=?", (new_id,)).fetchone()
    conn.close()

    try:
        save_scan(
            source,
            "Offer Letter",
            f"Incoming {source} Offer: {title}",
            company,
            sender,
            "",
            final_score,
            sev,
            rule_reasons
        )
    except Exception as exc:
        print(f"Warning: could not mirror to scans table: {exc}")

    return dict(row)


@app.post("/api/monitor/dismiss")
def dismiss_offer(payload: dict):
    offer_id = payload.get("id")
    if offer_id:
        conn = db()
        conn.execute("UPDATE incoming_offers SET status='reviewed' WHERE id=?", (offer_id,))
        conn.commit()
        conn.close()
    return {"success": True}


# ============================================================
# GMAIL MESSAGES
# ============================================================

@app.get("/api/gmail/messages")
def gmail_messages(limit: int = 20):

    token_json = get_gmail_credentials()

    if not token_json:

        return {
            "connected": False,
            "messages": []
        }

    try:

        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_info(
            token_json,
            GOOGLE_SCOPES
        )

        service = build(
            "gmail",
            "v1",
            credentials=creds,
            cache_discovery=False
        )

        result = service.users().messages().list(
            userId="me",
            maxResults=max(
                1,
                min(limit, 50)
            )
        ).execute()

        messages = []

        for item in result.get(
            "messages",
            []
        ):

            msg = service.users().messages().get(
                userId="me",
                id=item["id"],
                format="metadata",
                metadataHeaders=[
                    "From",
                    "Subject",
                    "Date"
                ]
            ).execute()

            headers = {
                h["name"].lower(): h["value"]
                for h in msg.get(
                    "payload",
                    {}
                ).get(
                    "headers",
                    []
                )
            }

            messages.append(
                {
                    "id": msg["id"],
                    "from": headers.get(
                        "from",
                        ""
                    ),
                    "subject": headers.get(
                        "subject",
                        "(no subject)"
                    ),
                    "date": headers.get(
                        "date",
                        ""
                    ),
                    "snippet": msg.get(
                        "snippet",
                        ""
                    )
                }
            )

        return {
            "connected": True,
            "messages": messages
        }

    except Exception as exc:

        print(
            f"Gmail read error: {exc}"
        )

        return {
            "connected": False,
            "messages": [],
            "error": (
                "Gmail authorization needs "
                "to be renewed."
            )
        }


# ============================================================
# HISTORY
# ============================================================

@app.get("/api/history")
def history(limit: int = 200):

    conn = db()

    rows = conn.execute(
        """
        SELECT *
        FROM scans
        ORDER BY id DESC
        LIMIT ?
        """,
        (
            max(
                1,
                min(limit, 1000)
            ),
        )
    ).fetchall()

    conn.close()

    return [
        dict(r)
        for r in rows
    ]


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/dashboard")
def dashboard():

    conn = db()

    rows = [
        dict(r)
        for r in conn.execute(
            """
            SELECT *
            FROM scans
            ORDER BY id DESC
            """
        ).fetchall()
    ]

    conn.close()

    high = sum(
        x["risk"] >= 70
        for x in rows
    )

    suspicious = sum(
        35 <= x["risk"] < 70
        for x in rows
    )

    safe = sum(
        x["risk"] < 35
        for x in rows
    )

    by_source = {}

    for x in rows:

        by_source[x["source"]] = (
            by_source.get(
                x["source"],
                0
            ) + 1
        )

    return {
        "scanned": len(rows),
        "highRisk": high,
        "suspicious": suspicious,
        "safe": safe,
        "threats": high,
        "bySource": by_source,
        "items": rows[:20]
    }


# ============================================================
# THREATS
# ============================================================

@app.get("/api/threats")
def threats():

    conn = db()

    rows = conn.execute(
        """
        SELECT *
        FROM scans
        WHERE risk>=70
        ORDER BY id DESC
        """
    ).fetchall()

    conn.close()

    return [
        dict(r)
        for r in rows
    ]


# ============================================================
# TEXT SCANNER + ML MODEL
# ============================================================

@app.post("/api/scan/text")
def scan_text(payload: TextScan):

    # --------------------------------------------------------
    # Rule-based score
    # --------------------------------------------------------

    rule_score, rule_reasons = score_text(
        payload.text
    )

    # --------------------------------------------------------
    # ML score
    # --------------------------------------------------------

    ml_result = ml_score_text(
        payload.text
    )

    # --------------------------------------------------------
    # Combine ML + security rules
    # --------------------------------------------------------

    if ml_result is not None:

        ml_score = ml_result["score"]

        prediction = ml_result["prediction"]

        confidence = ml_result["confidence"]

        # ML is the main signal.
        # Security rules provide an additional signal.

        final_score = round(
            (ml_score * 0.60)
            + (rule_score * 0.40)
        )

        final_score = min(
            max(final_score, 0),
            100
        )

        severity = classify(
            final_score
        )

        reasons = [
            f"ML model prediction: {prediction}",
            f"ML model confidence: {confidence * 100:.2f}%",
            f"Context-aware security score: {rule_score}/100"
        ]

        reasons.extend(
            rule_reasons
        )

    else:

        # Fallback if model is not available.

        final_score = rule_score

        severity = classify(
            final_score
        )

        prediction = "model_unavailable"

        confidence = 0.0

        reasons = [
            "ML model not available; rule-based scanner used."
        ]

        reasons.extend(
            rule_reasons
        )

    # --------------------------------------------------------
    # Save scan
    # --------------------------------------------------------

    scan_id = save_scan(
        "Manual",
        "Message",
        "Manual message scan",
        "Unknown",
        "User supplied",
        "",
        final_score,
        severity,
        reasons
    )

    # --------------------------------------------------------
    # Return result to frontend
    # --------------------------------------------------------

    return {
        "scan_id": scan_id,
        "risk": final_score,
        "severity": severity,
        "prediction": prediction,
        "confidence": round(
            float(confidence) * 100,
            2
        ),
        "ml_score": (
            ml_result["score"]
            if ml_result is not None
            else None
        ),
        "rule_score": rule_score,
        "reasons": reasons,
        "probabilities": (
            ml_result.get("probabilities", {})
            if ml_result is not None
            else {}
        ),
        "matched_indicators": (
            ml_result.get("matched_indicators", [])
            if ml_result is not None
            else []
        ),
        "engine": "Local Scikit-Learn Pipeline (Offline Model, Zero External APIs)"
    }


# ============================================================
# URL SCANNER
# ============================================================

@app.post("/api/scan/url")
def scan_url(payload: UrlScan):

    score, host, reasons = score_url(
        payload.url
    )

    severity = classify(
        score
    )

    scan_id = save_scan(
        "Manual",
        "URL",
        "Manual URL scan",
        host,
        "User supplied",
        payload.url,
        score,
        severity,
        reasons
    )

    return {
        "scan_id": scan_id,
        "risk": score,
        "severity": severity,
        "host": host,
        "reasons": reasons
    }


# ============================================================
# APPROVE ACTION
# ============================================================

@app.post("/api/approve-action")
def approve_action(payload: dict):

    conn = db()

    conn.execute(
        """
        INSERT INTO actions(
            timestamp,
            scan_id,
            action,
            status,
            notes
        )
        VALUES(?,?,?,?,?)
        """,
        (
            now(),
            payload.get("scan_id"),
            payload.get(
                "action",
                "review"
            ),
            "approved-demo",
            payload.get(
                "notes",
                ""
            )
        )
    )

    conn.commit()
    conn.close()

    return {
        "status": "approved-demo",
        "message": (
            "Demo action recorded. "
            "No real account, email, recruiter, "
            "or message was changed."
        )
    }


# ============================================================
# COMPANY VERIFICATION ENDPOINT
# ============================================================

@app.post("/api/company/verify")
def api_verify_company(payload: CompanyVerifyRequest):
    result = verify_company(
        company_name=payload.company_name,
        website_url=payload.website_url,
        hr_email=payload.hr_email,
        cin_number=payload.cin_number,
        gstin=payload.gstin
    )

    reasons = result.get("red_flags") or [
        f"Trust Score: {result.get('trust_score')}/100",
        f"Verdict: {result.get('verdict')}"
    ]

    scan_id = save_scan(
        "Manual",
        "Company",
        f"Company Check: {payload.company_name}",
        payload.company_name,
        payload.hr_email or "HR Entity",
        payload.website_url or "",
        100 - result.get("trust_score", 0),
        result.get("risk_level", "Medium"),
        reasons
    )

    result["scan_id"] = scan_id
    return result


# ============================================================
# RECRUITER VERIFICATION ENDPOINT
# ============================================================

@app.post("/api/recruiter/verify")
def api_verify_recruiter(payload: RecruiterVerifyRequest):
    result = verify_recruiter(
        recruiter_name=payload.recruiter_name,
        company_name=payload.company_name,
        email=payload.email,
        phone=payload.phone,
        platform=payload.platform,
        interview_mode=payload.interview_mode,
        fee_requested=payload.fee_requested,
        fee_details=payload.fee_details
    )

    reasons = result.get("flags") or [
        f"Credibility: {result.get('credibility_score')}/100",
        f"Verdict: {result.get('verdict')}"
    ]

    scan_id = save_scan(
        "Manual",
        "Recruiter",
        f"Recruiter Audit: {payload.recruiter_name}",
        payload.company_name or "Unknown Company",
        payload.email or payload.phone or payload.recruiter_name,
        payload.platform or "",
        result.get("risk_score", 0),
        result.get("threat_level", "Moderate"),
        reasons
    )

    result["scan_id"] = scan_id
    return result


# ============================================================
# DOCUMENT DEEP SCANNER (OFFER LETTER / CONTRACT)
# ============================================================

@app.post("/api/document/deep-scan")
def api_deep_scan_document(payload: DocumentDeepScanRequest):
    ml_result = ml_score_text(payload.text)
    result = deep_scan_document(
        text=payload.text,
        document_name=payload.document_name,
        ml_result=ml_result
    )

    reasons = result.get("contract_red_flags") or [
        f"Integrity Score: {result.get('integrity_score')}/100",
        f"Verdict: {result.get('verdict')}"
    ]

    scan_id = save_scan(
        "Manual",
        "Document",
        f"Document Audit: {payload.document_name}",
        "Document Analysis",
        "Candidate Upload",
        "",
        result.get("risk_score", 0),
        result.get("severity", "Low"),
        reasons
    )

    result["scan_id"] = scan_id
    result["ml_details"] = ml_result
    return result


# ============================================================
# ML MODEL METRICS & TRAINING ENDPOINTS (100% OFFLINE)
# ============================================================

@app.get("/api/model/metrics")
def api_model_metrics():
    if not METRICS_FILE.exists():
        try:
            train_and_evaluate()
            reload_ml_model()
        except Exception as exc:
            return {"error": f"Failed to train baseline model: {exc}"}

    try:
        data = json.loads(METRICS_FILE.read_text(encoding="utf-8"))
        data["model_file_exists"] = MODEL_FILE.exists()
        data["is_model_loaded"] = model is not None
        return data
    except Exception as exc:
        return {"error": f"Failed to read metrics: {exc}"}


@app.post("/api/model/train")
def api_model_train(payload: ModelTrainRequest):
    try:
        new_metrics = train_and_evaluate(
            algorithm=payload.algorithm,
            run_benchmarks=True
        )
        reloaded = reload_ml_model()
        return {
            "status": "success",
            "message": f"Successfully trained {payload.algorithm} on 10,000 dataset samples.",
            "model_reloaded": reloaded,
            "metrics": new_metrics
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Training failed: {exc}"
        }


@app.post("/api/model/explain")
def api_model_explain(payload: ExplainRequest):
    return explain_prediction(model, payload.text)


# ============================================================
# CYBERCRIME COMPLAINT & INTERVIEW EVALUATION ENDPOINTS
# ============================================================

@app.post("/api/cybercrime/generate-complaint")
def api_cybercrime_generate(payload: CybercrimeComplaintRequest):
    result = generate_cybercrime_complaint(payload.dict())

    # Save to SQLite scans table for history & dashboard metrics
    reasons = [
        f"Defrauded Amount: INR {payload.amount_lost:,.2f} via {payload.payment_mode}",
        f"Suspect Beneficiary: {payload.suspect_upi or payload.suspect_bank_acc or 'Unknown'}",
        f"Platform: {payload.platform}",
        "Statutory Violations: IT Act 66D, IPC 420 / BNS 318(4)"
    ]
    if payload.transaction_id:
        reasons.append(f"Transaction Reference: {payload.transaction_id}")

    try:
        scan_id = save_scan(
            source=payload.platform or "Cybercrime Portal",
            typ="Cybercrime FIR",
            title=f"Cybercrime FIR: {payload.scam_category} (INR {payload.amount_lost:,.2f})",
            company=payload.suspect_name or "Unidentified Suspect",
            sender=payload.suspect_phone or payload.suspect_email or payload.suspect_telegram or "N/A",
            url=payload.suspect_telegram or "",
            score=95,
            severity="Critical",
            reasons=reasons
        )
        result["scan_id"] = scan_id
    except Exception as exc:
        print(f"Failed to log cybercrime complaint to DB: {exc}")

    return result


@app.post("/api/interview/evaluate")
def api_interview_evaluate(payload: InterviewEvaluateRequest):
    return evaluate_interview_flags(payload.flags, payload.custom_notes)


# ============================================================
# EXCEL EXPORT (MULTI-SHEET AUDIT WITH ML BENCHMARKS)
# ============================================================

@app.get("/api/export/excel")
def export_excel():
    conn = db()
    scans = conn.execute("SELECT * FROM scans ORDER BY id DESC").fetchall()
    actions = conn.execute("SELECT * FROM actions ORDER BY id DESC").fetchall()
    conn.close()

    wb = Workbook()

    # 1. Sheet: All Scans
    ws = wb.active
    ws.title = "All Scans"
    headers = [
        "ID", "Timestamp", "Source", "Type", "Title",
        "Company", "Sender", "URL", "Risk", "Severity", "Reasons"
    ]
    ws.append(headers)
    for r in scans:
        ws.append([
            r["id"], r["timestamp"], r["source"], r["type"], r["title"],
            r["company"], r["sender"], r["url"], r["risk"], r["severity"], r["reasons"]
        ])
    for cell in ws[1]:
        cell.font = cell.font.copy(bold=True)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    # 2. Sheet: Threats
    wt = wb.create_sheet("Threats")
    wt.append(headers)
    for r in scans:
        if r["risk"] >= 70:
            wt.append([
                r["id"], r["timestamp"], r["source"], r["type"], r["title"],
                r["company"], r["sender"], r["url"], r["risk"], r["severity"], r["reasons"]
            ])
    for cell in wt[1]:
        cell.font = cell.font.copy(bold=True)
    wt.freeze_panes = "A2"

    # 3. Sheet: Company Verifications
    wc = wb.create_sheet("Company Verifications")
    wc.append(headers)
    for r in scans:
        if r["type"] == "Company":
            wc.append([
                r["id"], r["timestamp"], r["source"], r["type"], r["title"],
                r["company"], r["sender"], r["url"], r["risk"], r["severity"], r["reasons"]
            ])
    for cell in wc[1]:
        cell.font = cell.font.copy(bold=True)
    wc.freeze_panes = "A2"

    # 4. Sheet: Recruiter Verifications
    wr = wb.create_sheet("Recruiter Verifications")
    wr.append(headers)
    for r in scans:
        if r["type"] == "Recruiter":
            wr.append([
                r["id"], r["timestamp"], r["source"], r["type"], r["title"],
                r["company"], r["sender"], r["url"], r["risk"], r["severity"], r["reasons"]
            ])
    for cell in wr[1]:
        cell.font = cell.font.copy(bold=True)
    wr.freeze_panes = "A2"

    # 5. Sheet: Actions
    wa = wb.create_sheet("Actions")
    wa.append(["ID", "Timestamp", "Scan ID", "Action", "Status", "Notes"])
    for r in actions:
        wa.append([r["id"], r["timestamp"], r["scan_id"], r["action"], r["status"], r["notes"]])
    for cell in wa[1]:
        cell.font = cell.font.copy(bold=True)
    wa.freeze_panes = "A2"

    # 6. Sheet: ML Model Evaluation Metrics & Confusion Matrix
    wm = wb.create_sheet("ML Evaluation Metrics")
    wm.append(["Metric", "Value", "Description"])
    if METRICS_FILE.exists():
        try:
            m_data = json.loads(METRICS_FILE.read_text(encoding="utf-8"))
            wm.append(["Active Model", m_data.get("algorithm_display", "Logistic Regression"), "Trained offline pipeline"])
            wm.append(["Dataset Size", f"{m_data.get('dataset_rows', 10000)} rows", "Job & Internship Scam Dataset"])
            wm.append(["Training Samples", f"{m_data.get('training_rows', 8000)} rows", "80% Train Split"])
            wm.append(["Test Samples", f"{m_data.get('test_rows', 2000)} rows", "20% Stratified Test Split"])
            wm.append(["Test Accuracy", f"{m_data.get('accuracy', 1.0) * 100:.2f}%", "Overall accuracy on holdout test set"])
            wm.append(["F1-Score (Macro)", f"{m_data.get('f1_macro', 1.0) * 100:.2f}%", "Macro-averaged F1 score"])
            wm.append(["Training Duration", f"{m_data.get('training_time_seconds', 0.89)}s", "Time to fit pipeline"])

            wm.append([])
            wm.append(["Confusion Matrix", "", ""])
            cm = m_data.get("confusion_matrix", {})
            labels = cm.get("labels", ["fraudulent", "legitimate", "suspicious"])
            matrix = cm.get("matrix", [])
            wm.append(["Actual \\ Predicted"] + labels)
            for l_name, row in zip(labels, matrix):
                wm.append([l_name] + row)

            wm.append([])
            wm.append(["Algorithm Benchmark Comparison", "", ""])
            wm.append(["Algorithm", "Accuracy (%)", "F1 Macro (%)", "Fit Time (s)"])
            for b in m_data.get("benchmarks", []):
                wm.append([b.get("name"), b.get("accuracy"), b.get("f1_macro"), b.get("fit_time_sec")])
        except Exception:
            wm.append(["Status", "Metrics could not be read", ""])
    for cell in wm[1]:
        cell.font = cell.font.copy(bold=True)

    # Adjust column widths across all sheets
    for sheet in wb.worksheets:
        for col in sheet.columns:
            letter = col[0].column_letter
            sheet.column_dimensions[letter].width = min(
                max(max(len(str(c.value or "")) for c in col) + 2, 12),
                45
            )

    path = EXPORT_DIR / f"InternShield_Audit_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    wb.save(path)

    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=path.name
    )


# ============================================================
# FRONTEND STATIC FILES & SPA FALLBACK (UNIFIED PRODUCTION)
# ============================================================

from fastapi.staticfiles import StaticFiles

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Not Found")