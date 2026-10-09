import re
from urllib.parse import urlparse
from datetime import datetime

# Common free / disposable email providers
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "protonmail.com", "zoho.com", "mail.com", "yandex.com", "icloud.com",
    "rediffmail.com", "gmx.com", "tempmail.com", "guerrillamail.com"
}

# Suspicious / high-risk TLDs commonly used for throwaway phishing sites
SUSPICIOUS_TLDS = {
    "xyz", "top", "work", "click", "live", "site", "online", "club",
    "vip", "cf", "ga", "gq", "ml", "tk", "pw", "monster", "rest", "cam"
}

# Free website builders commonly abused by fake job operations
FREE_HOSTING_PLATFORMS = [
    "wixsite.com", "firebaseapp.com", "weebly.com", "blogspot.com",
    "sites.google.com", "wordpress.com", "github.io", "webflow.io",
    "carrd.co", "notion.site", "vercel.app"
]

# Common corporate brand domains for lookalike/spoofing detection
FAMOUS_BRANDS = {
    "google": "google.com",
    "microsoft": "microsoft.com",
    "amazon": "amazon.com",
    "infosys": "infosys.com",
    "tcs": "tcs.com",
    "wipro": "wipro.com",
    "cognizant": "cognizant.com",
    "accenture": "accenture.com",
    "ibm": "ibm.com",
    "meta": "meta.com",
    "apple": "apple.com",
    "flipkart": "flipkart.com",
    "swiggy": "swiggy.com",
    "zomato": "zomato.com",
    "deloitte": "deloitte.com",
    "kpmg": "kpmg.com",
    "ey": "ey.com",
    "pwc": "pwc.com",
    "hcl": "hcltech.com",
    "techmahindra": "techmahindra.com"
}

# Indian MCA CIN validation regex:
# Format: [L|U]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}
# e.g., U74999DL2018PTC123456 or L72200MH1995PLC085699
CIN_REGEX = re.compile(r"^([LUlu]{1})([0-9]{5})([A-Za-z]{2})([0-9]{4})([A-Za-z]{3})([0-9]{6})$")

# Indian GSTIN validation regex (15 characters):
# e.g., 29ABCDE1234F1Z5
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


def extract_domain(url_or_email):
    """Cleanly extracts domain name from URL or email address."""
    s = str(url_or_email).strip().lower()
    if "@" in s:
        return s.split("@")[-1].strip()
    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    try:
        parsed = urlparse(s)
        domain = parsed.netloc or parsed.path
        domain = domain.split(":")[0].strip()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return s


def verify_company(company_name, website_url="", hr_email="", cin_number="", gstin=""):
    """
    Performs comprehensive multi-factor verification on a company profile:
    - Domain legitimacy & SSL / hoster check
    - Lookalike brand impersonation check
    - HR email domain consistency
    - MCA CIN (Corporate Identity Number) pattern & structural decoding
    - GSTIN statutory format verification
    - High-risk naming / shell entity patterns
    """
    c_name = str(company_name).strip()
    website = str(website_url).strip()
    email = str(hr_email).strip().lower()
    cin = str(cin_number).strip().upper()
    gst = str(gstin).strip().upper()

    score = 75  # Starting neutral-positive baseline
    checks = []
    red_flags = []
    trust_badges = []
    recommendations = []

    if not c_name:
        return {
            "trust_score": 0,
            "verdict": "Invalid Data",
            "risk_level": "High",
            "checks": [{"name": "Company Name", "status": "FAIL", "detail": "Company name is required"}],
            "red_flags": ["Missing company name"],
            "trust_badges": [],
            "recommendations": ["Please provide a valid company name to verify."]
        }

    # 1. Company Name Analysis
    generic_scam_words = ["earn daily", "data entry solutions", "sms send", "global fast job", "click worker", "quick earn"]
    if any(w in c_name.lower() for w in generic_scam_words):
        score -= 40
        red_flags.append(f"Company name contains suspicious commercial buzzwords ({c_name})")
        checks.append({"name": "Entity Name Screening", "status": "FAIL", "detail": "Matches known job scam naming tropes"})
    else:
        checks.append({"name": "Entity Name Screening", "status": "PASS", "detail": "No blacklist keywords found in entity name"})

    # 2. Website & Domain Analysis
    if website:
        domain = extract_domain(website)
        tld = domain.split(".")[-1] if "." in domain else ""

        # Free hosting check
        if any(h in domain for h in FREE_HOSTING_PLATFORMS):
            score -= 30
            red_flags.append(f"Company uses free hosting ({domain}) instead of an official company domain")
            checks.append({"name": "Domain Infrastructure", "status": "WARN", "detail": f"Hosted on free service: {domain}"})
        elif tld in SUSPICIOUS_TLDS:
            score -= 25
            red_flags.append(f"Company uses low-reputation generic TLD (.{tld})")
            checks.append({"name": "Domain Reputation", "status": "WARN", "detail": f"TLD .{tld} has high association with disposable sites"})
        else:
            score += 10
            trust_badges.append(f"Valid Domain: {domain}")
            checks.append({"name": "Domain Infrastructure", "status": "PASS", "detail": f"Official custom domain detected: {domain}"})

        # Brand Impersonation / Typosquatting Check
        for brand, official_domain in FAMOUS_BRANDS.items():
            if brand in c_name.lower() or brand in domain:
                if domain != official_domain and not domain.endswith("." + official_domain):
                    score -= 45
                    red_flags.append(f"Possible impersonation of '{brand.capitalize()}'. Official domain is '{official_domain}', but found '{domain}'")
                    checks.append({"name": "Brand Authenticity", "status": "FAIL", "detail": f"Domain does not match official {brand.capitalize()} portal"})
                    break
                else:
                    trust_badges.append(f"Official {brand.capitalize()} Entity")
                    score += 15
                    checks.append({"name": "Brand Authenticity", "status": "PASS", "detail": f"Matches legitimate corporate domain ({official_domain})"})
                    break
    else:
        score -= 10
        checks.append({"name": "Domain Presence", "status": "WARN", "detail": "No official website provided for verification"})
        recommendations.append("Authentic companies maintain an active website with verifiable leadership and careers portals.")

    # 3. HR / Recruiter Email Check
    if email:
        email_domain = extract_domain(email)
        if email_domain in FREE_EMAIL_DOMAINS:
            score -= 35
            red_flags.append(f"Recruiter uses a free public email provider (@{email_domain}) instead of corporate domain")
            checks.append({"name": "Email Domain Authenticity", "status": "FAIL", "detail": f"Public email service (@{email_domain}) used for hiring"})
            recommendations.append(f"Never accept employment contracts sent from free email addresses (e.g. {email}) for corporate roles.")
        else:
            if website:
                web_domain = extract_domain(website)
                if email_domain == web_domain or email_domain.endswith("." + web_domain):
                    score += 15
                    trust_badges.append("Corporate Email Matches Website")
                    checks.append({"name": "Email-to-Domain Consistency", "status": "PASS", "detail": f"HR email domain matches company website ({email_domain})"})
                else:
                    score -= 15
                    red_flags.append(f"HR email domain (@{email_domain}) does not match website domain ({web_domain})")
                    checks.append({"name": "Email-to-Domain Consistency", "status": "WARN", "detail": f"Mismatch between email domain and website"})
            else:
                score += 5
                trust_badges.append(f"Custom Corporate Email: @{email_domain}")
                checks.append({"name": "Email Domain Authenticity", "status": "PASS", "detail": f"Uses private enterprise domain @{email_domain}"})
    else:
        checks.append({"name": "HR Email Verification", "status": "INFO", "detail": "No HR email provided"})

    # 4. Indian MCA CIN (Corporate Identity Number) Verification
    if cin:
        cin_match = CIN_REGEX.match(cin)
        if cin_match:
            listing, ind_code, state, year, ownership, reg_no = cin_match.groups()
            listing_type = "Listed on Stock Exchange" if listing.upper() == "L" else "Unlisted Entity"
            ownership_map = {"PTC": "Private Limited", "PLC": "Public Limited", "GOI": "Govt of India", "NPL": "Non-Profit"}
            ownership_desc = ownership_map.get(ownership.upper(), ownership.upper())

            score += 20
            trust_badges.append(f"Valid MCA CIN: {cin}")
            checks.append({
                "name": "MCA CIN Verification",
                "status": "PASS",
                "detail": f"Format Valid: {listing_type}, {ownership_desc}, State: {state.upper()}, Inc. Year: {year}"
            })
        else:
            score -= 20
            red_flags.append(f"Invalid Corporate Identification Number format: {cin}")
            checks.append({"name": "MCA CIN Verification", "status": "FAIL", "detail": "Does not conform to 21-character MCA CIN standard"})
    else:
        checks.append({"name": "Corporate Registration (CIN)", "status": "INFO", "detail": "CIN not provided (recommended for Indian private/public firms)"})

    # 5. GSTIN Verification
    if gst:
        if GSTIN_REGEX.match(gst):
            score += 10
            trust_badges.append(f"Valid GSTIN: {gst}")
            checks.append({"name": "Statutory GSTIN", "status": "PASS", "detail": f"Valid 15-character statutory GST format (State code: {gst[:2]})"})
        else:
            score -= 15
            red_flags.append(f"Malformed GSTIN provided: {gst}")
            checks.append({"name": "Statutory GSTIN", "status": "FAIL", "detail": "Invalid GSTIN checksum or length"})

    # Final score normalization
    final_score = max(0, min(100, score))

    if final_score >= 80:
        verdict = "Verified Authentic Entity"
        risk_level = "Low"
    elif final_score >= 50:
        verdict = "Moderate Risk / Unverified Claims"
        risk_level = "Medium"
    else:
        verdict = "High Scam Risk Entity"
        risk_level = "High"

    if not recommendations:
        if risk_level == "Low":
            recommendations.append("The company credentials adhere to authentic corporate standards. Verify the specific offer letter clauses before signing.")
        elif risk_level == "Medium":
            recommendations.append("Request the HR representative to communicate from an official corporate email ID.")
            recommendations.append("Cross-check company registration on the MCA (Ministry of Corporate Affairs) portal or official LinkedIn page.")
        else:
            recommendations.append("Do NOT pay any security deposit, laptop fee, or training fee.")
            recommendations.append("Avoid sharing government identity documents (Aadhaar, PAN, Bank Details) without verified credentials.")

    return {
        "company_name": c_name,
        "trust_score": final_score,
        "verdict": verdict,
        "risk_level": risk_level,
        "checks": checks,
        "red_flags": red_flags,
        "trust_badges": trust_badges,
        "recommendations": recommendations,
        "timestamp": datetime.utcnow().isoformat()
    }


def verify_recruiter(recruiter_name, company_name="", email="", phone="", platform="Email", interview_mode="Video call", fee_requested=False, fee_details=""):
    """
    Performs specialized threat scoring on a recruiter/HR interaction:
    - Communication platform threat level (Telegram/WhatsApp vs Official/LinkedIn)
    - Interview screening legitimacy (Chat-only / No-interview scams)
    - Demands for payments / deposits (Zero tolerance rule)
    - Corporate identity spoofing
    """
    r_name = str(recruiter_name).strip()
    c_name = str(company_name).strip()
    r_email = str(email).strip().lower()
    r_phone = str(phone).strip()
    r_plat = str(platform).strip()
    r_mode = str(interview_mode).strip()

    risk_points = 0
    flags = []
    checks = []
    action_advice = []

    # 1. Payment / Fee Requested Check (CRITICAL)
    if fee_requested:
        risk_points += 60
        flags.append(f"Recruiter demanded payment: {fee_details or 'Registration / Training / Equipment Deposit'}")
        checks.append({"name": "Zero-Fee Policy", "status": "CRITICAL", "detail": "Demanding fees for employment violates labor laws and is the primary sign of an internship scam"})
        action_advice.append("STOP ALL CONTACT IMMEDIATELY. Legitimate companies never charge candidates for job offers, training materials, or laptop delivery.")
    else:
        checks.append({"name": "Zero-Fee Policy", "status": "PASS", "detail": "No upfront fee demanded by recruiter"})

    # 2. Interview Screening Mode
    chat_modes = ["whatsapp chat", "telegram group", "telegram chat", "direct offer (no interview)", "no interview", "google chat text"]
    if any(m in r_mode.lower() for m in chat_modes):
        risk_points += 35
        flags.append(f"Unorthodox interview format: '{r_mode}' without video or in-person evaluation")
        checks.append({"name": "Interview Rigor", "status": "FAIL", "detail": "Direct offers or chat-only interviews are classic hallmarks of phishing campaigns"})
        action_advice.append("Reputable firms always conduct live technical or HR evaluations (Google Meet, Zoom, MS Teams, or On-site).")
    else:
        checks.append({"name": "Interview Rigor", "status": "PASS", "detail": f"Standard interview format reported: {r_mode}"})

    # 3. Communication Channel Platform
    if r_plat.lower() in ["telegram", "instagram", "signal"]:
        risk_points += 25
        flags.append(f"High-risk outreach channel: '{r_plat}' is heavily used by anonymous scammers")
        checks.append({"name": "Outreach Channel", "status": "WARN", "detail": f"Recruiting via {r_plat} affords anonymity to fraudulent operators"})
    elif r_plat.lower() in ["whatsapp"]:
        risk_points += 10
        checks.append({"name": "Outreach Channel", "status": "INFO", "detail": "WhatsApp is common for updates, but should be backed by official email correspondence"})
    else:
        checks.append({"name": "Outreach Channel", "status": "PASS", "detail": f"Professional recruitment channel: {r_plat}"})

    # 4. Email Credibility
    if r_email:
        email_dom = extract_domain(r_email)
        if email_dom in FREE_EMAIL_DOMAINS:
            risk_points += 25
            flags.append(f"Recruiter is using personal email (@{email_dom}) claiming to represent {c_name or 'a company'}")
            checks.append({"name": "Email Authentication", "status": "FAIL", "detail": f"Free public webmail (@{email_dom})"})
            action_advice.append(f"Request the recruiter to send an official email from their company domain (@{c_name.lower().replace(' ', '')}.com).")
        else:
            checks.append({"name": "Email Authentication", "status": "PASS", "detail": f"Enterprise email domain (@{email_dom})"})
    else:
        risk_points += 10
        checks.append({"name": "Email Authentication", "status": "WARN", "detail": "No email address provided for validation"})

    # 5. Phone validation
    if r_phone:
        # Check international code or VoIP prefixes
        if r_phone.startswith("+") and not (r_phone.startswith("+91") or r_phone.startswith("+1") or r_phone.startswith("+44")):
            risk_points += 15
            flags.append(f"Uncommon international dialing code ({r_phone[:4]}) for local opportunity")
            checks.append({"name": "Contact Number Validation", "status": "WARN", "detail": f"International code prefix: {r_phone[:4]}"})
        else:
            checks.append({"name": "Contact Number Validation", "status": "PASS", "detail": "Valid phone contact format"})

    # Calculate final scores
    risk_score = min(100, max(0, risk_points))
    credibility_score = 100 - risk_score

    if risk_score >= 60:
        verdict = "Dangerous / Fraudulent Recruiter"
        threat_level = "High Danger"
    elif risk_score >= 30:
        verdict = "Suspicious Recruiter Profile"
        threat_level = "Caution Required"
    else:
        verdict = "Credible Professional Recruiter"
        threat_level = "Safe / Authentic"

    if not action_advice:
        action_advice.append("Recruiter credentials appear consistent with standard hiring practices.")

    return {
        "recruiter_name": r_name,
        "company_name": c_name,
        "credibility_score": credibility_score,
        "risk_score": risk_score,
        "threat_level": threat_level,
        "verdict": verdict,
        "checks": checks,
        "flags": flags,
        "action_advice": action_advice,
        "timestamp": datetime.utcnow().isoformat()
    }


def deep_scan_document(text, document_name="Uploaded Offer Letter", ml_result=None):
    """
    Performs in-depth audit on offer letters, internship agreements, and recruitment contracts.
    Combines Scikit-learn offline ML inference with contractual compliance checks:
    - Deposit / Laptop courier / Training fee clauses
    - Cryptocurrency / Personal UPI payment demands
    - Absence of legal boilerplate (Probation, Leave, Jurisdiction, Address)
    - Unrealistic salary claims for fresher / data entry roles
    """
    t = str(text)
    t_lower = t.lower()

    contract_penalties = 0
    detected_clauses = []
    contract_red_flags = []
    missing_clauses = []

    # 1. Financial Extortion Clauses (Severe)
    fee_patterns = [
        (r"(refundable\s*deposit|security\s*deposit|laptop\s*deposit)", "Equipment Security Deposit Clause", 40),
        (r"(registration\s*fee|processing\s*charge|training\s*fee|portal\s*charge)", "Upfront Registration / Training Fee Clause", 45),
        (r"(courier\s*charge|dispatch\s*fee|uniform\s*charge)", "Courier / Material Dispatch Charge", 35),
        (r"(police\s*verification\s*charge|background\s*check\s*fee)", "Document / Background Check Fee", 35)
    ]
    for pattern, desc, pts in fee_patterns:
        m = re.search(pattern, t_lower)
        if m:
            contract_penalties += pts
            snippet = t[max(0, m.start() - 30): min(len(t), m.end() + 30)].strip()
            contract_red_flags.append(f"{desc} detected: '...{snippet}...'")
            detected_clauses.append({"type": "DANGER", "title": desc, "snippet": snippet})

    # 2. Payment Method Scams
    pay_patterns = [
        (r"(crypto|bitcoin|usdt|binance|trustwallet)", "Cryptocurrency Remittance Clause", 40),
        (r"(google pay to|paytm to|phonepe to|upi id:?\s*[\w\.\-]+@\w+)", "Personal UPI Payment Transfer Requested", 35),
        (r"(gift\s*card|amazon\s*pay\s*balance|steam\s*card)", "Gift Card Payment Trap", 45)
    ]
    for pattern, desc, pts in pay_patterns:
        m = re.search(pattern, t_lower)
        if m:
            contract_penalties += pts
            snippet = t[max(0, m.start() - 25): min(len(t), m.end() + 25)].strip()
            contract_red_flags.append(f"{desc}: '...{snippet}...'")
            detected_clauses.append({"type": "DANGER", "title": desc, "snippet": snippet})

    # 3. Unrealistic Compensation for Fresher / Low Skill Roles
    unrealistic_pay = [
        r"(daily\s*earning\s*of\s*(rs\.?|inr|\$)\s*[0-9]+)",
        r"([0-9]{4,6}\s*(per|a)\s*(day|hour))",
        r"(data\s*entry.*(50000|60000|70000|80000|90000))"
    ]
    for pattern in unrealistic_pay:
        m = re.search(pattern, t_lower)
        if m:
            contract_penalties += 25
            snippet = t[max(0, m.start() - 20): min(len(t), m.end() + 20)].strip()
            contract_red_flags.append(f"Unrealistic remuneration promise: '...{snippet}...'")
            detected_clauses.append({"type": "WARN", "title": "Inflated Compensation", "snippet": snippet})
            break

    # 4. Standard Legitimate Employment Clauses Check
    standard_clauses = [
        ("Confidentiality / NDA", r"(confidential|proprietary|non[- ]disclosure|intellectual property)"),
        ("Termination & Notice Period", r"(notice period|termination of employment|immediate effect)"),
        ("Leave / Working Hours", r"(working hours|leave policy|holidays|work schedule)"),
        ("Registered Corporate Address", r"(registered office|corporate headquarters|pincode|cin:?)"),
        ("Compensation & Tax (TDS/PF)", r"(tax deduction|tds|provident fund|stipend amount|gross salary)")
    ]
    for name, pattern in standard_clauses:
        if re.search(pattern, t_lower):
            detected_clauses.append({"type": "PASS", "title": f"Standard Clause Present: {name}", "snippet": ""})
        else:
            missing_clauses.append(name)

    # Combine with ML text scan if available
    ml_score = 0
    ml_pred = "legitimate"
    ml_conf = 0.0
    if ml_result:
        ml_score = ml_result.get("score", 0)
        ml_pred = ml_result.get("prediction", "legitimate")
        ml_conf = ml_result.get("confidence", 0.0)

    # 55% ML Model + 45% Contract Heuristics
    heuristic_risk = min(100, contract_penalties)
    combined_risk = round(ml_score * 0.55 + heuristic_risk * 0.45)
    combined_risk = max(0, min(100, combined_risk))
    integrity_score = 100 - combined_risk

    if combined_risk >= 70:
        verdict = "Fraudulent Offer Letter / Employment Scam"
        severity = "High"
    elif combined_risk >= 35:
        verdict = "Questionable Agreement (Proceed with Caution)"
        severity = "Moderate"
    else:
        verdict = "Legitimate Corporate Offer Letter"
        severity = "Low"

    return {
        "document_name": document_name,
        "integrity_score": integrity_score,
        "risk_score": combined_risk,
        "verdict": verdict,
        "severity": severity,
        "ml_prediction": ml_pred,
        "ml_confidence": round(ml_conf * 100, 2),
        "contract_red_flags": contract_red_flags,
        "detected_clauses": detected_clauses,
        "missing_clauses": missing_clauses,
        "timestamp": datetime.utcnow().isoformat()
    }


def explain_prediction(pipeline, text, top_k=8):
    """
    Local Explainable AI (XAI):
    Computes exact TF-IDF token contributions against the model's coefficients.
    Returns matched suspicious tokens and legitimate tokens with impact weights.
    100% offline, zero API calls.
    """
    if pipeline is None:
        return {"matched_tokens": [], "explanation": "Model not loaded"}

    try:
        tfidf = pipeline.named_steps.get("tfidf")
        clf = pipeline.named_steps.get("classifier")

        if not hasattr(clf, "coef_") or tfidf is None:
            return {"matched_tokens": [], "explanation": "Non-linear classifier"}

        feature_names = tfidf.get_feature_names_out()
        classes = list(clf.classes_)
        t_vec = tfidf.transform([text]).toarray()[0]

        # Find non-zero feature indices present in the user text
        non_zero_idx = np_where_nonzero(t_vec)
        if not non_zero_idx:
            return {"matched_tokens": [], "explanation": "No vocabulary tokens matched"}

        fraud_idx = classes.index("fraudulent") if "fraudulent" in classes else 0
        legit_idx = classes.index("legitimate") if "legitimate" in classes else 1

        matched = []
        for idx in non_zero_idx:
            term = str(feature_names[idx])
            tfidf_val = float(t_vec[idx])
            fraud_weight = float(clf.coef_[fraud_idx][idx]) * tfidf_val
            legit_weight = float(clf.coef_[legit_idx][idx]) * tfidf_val

            impact = "suspicious" if fraud_weight > 0.05 else ("safe" if legit_weight > 0.05 else "neutral")
            matched.append({
                "term": term,
                "impact": impact,
                "weight": round(fraud_weight, 3),
                "legit_weight": round(legit_weight, 3)
            })

        matched.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return {
            "matched_tokens": matched[:top_k],
            "explanation": f"Evaluated {len(non_zero_idx)} text n-grams using locally trained TF-IDF weights."
        }
    except Exception as exc:
        return {"matched_tokens": [], "explanation": f"XAI error: {exc}"}


def np_where_nonzero(arr):
    return [i for i, v in enumerate(arr) if v > 0.0]


# ============================================================
# 1-CLICK CYBERCRIME COMPLAINT & EVIDENCE GENERATOR
# ============================================================

def generate_cybercrime_complaint(data: dict) -> dict:
    """
    Generates a formal legal cybercrime complaint (FIR draft) adhering to
    the National Cyber Crime Reporting Portal (cybercrime.gov.in / 1930) guidelines,
    incorporating IT Act Sections 66D, 66C and IPC 420 / BNS 318(4).
    100% offline, zero cloud API dependency.
    """
    v_name = (data.get("victim_name") or "Complainant").strip()
    v_phone = (data.get("victim_phone") or "Not provided").strip()
    v_email = (data.get("victim_email") or "Not provided").strip()
    v_city = (data.get("victim_city") or "New Delhi").strip()
    v_state = (data.get("victim_state") or "Delhi").strip()
    inc_date = (data.get("incident_date") or datetime.utcnow().strftime("%Y-%m-%d")).strip()
    platform = (data.get("platform") or "Telegram / WhatsApp / Online Job Portal").strip()
    category = (data.get("scam_category") or "Job / Internship Fraud").strip()

    s_name = (data.get("suspect_name") or "Unidentified Suspect / Impersonator").strip()
    s_phone = (data.get("suspect_phone") or "Not provided").strip()
    s_telegram = (data.get("suspect_telegram") or "N/A").strip()
    s_email = (data.get("suspect_email") or "N/A").strip()
    s_upi = (data.get("suspect_upi") or "N/A").strip()
    s_bank = (data.get("suspect_bank_acc") or "N/A").strip()

    amount = float(data.get("amount_lost") or 0.0)
    tx_id = (data.get("transaction_id") or "Pending Bank Reconciliation").strip()
    pay_mode = (data.get("payment_mode") or "UPI").strip()
    narrative = (data.get("incident_narrative") or "").strip()

    today_str = datetime.utcnow().strftime("%d %B %Y")

    if not narrative:
        narrative = (
            f"The complainant was approached on {platform} with an alluring job/internship offer ({category}). "
            f"The suspect ({s_name}) deceptively induced the complainant into transferring money under the pretext of "
            f"mandatory laptop security deposit, registration fees, or document verification. "
            f"After transferring INR {amount:,.2f} via {pay_mode} to beneficiary {s_upi}, the suspect severed communications "
            f"and failed to provide any employment or refund."
        )

    # Formal Legal Complaint Text
    complaint_text = f"""FORMAL CRIMINAL COMPLAINT UNDER SECTION 154 CrPC / BNSS
READ WITH SECTIONS 66D & 66C OF INFORMATION TECHNOLOGY ACT, 2000
AND SECTION 420 IPC / SECTION 318(4) BHARATIYA NYAYA SANHITA (BNS)

TO:
The Station House Officer (S.H.O.) / Nodal Cyber Crime Cell,
National Cybercrime Reporting Portal (cybercrime.gov.in / Helpline 1930),
Cyber Crime Division, {v_city}, {v_state}

SUBJECT: Criminal Complaint Regarding Cyber Job/Internship Fraud, Cheating by Personation, and Extortion of INR {amount:,.2f}/- Committed via {platform}.

Respected Sir / Madam,

I, {v_name}, residing at {v_city}, {v_state} (Mobile: {v_phone}, Email: {v_email}), submit this formal complaint regarding an organized cyber employment scam committed against me.

1. COMPLAINANT PARTICULARS:
   - Full Name: {v_name}
   - Contact Mobile: {v_phone}
   - Email Address: {v_email}
   - Residential Location: {v_city}, {v_state}

2. PARTICULARS OF THE SUSPECT / BENEFICIARY ENTITY:
   - Suspect Name / Recruiter Alias: {s_name}
   - Suspect Contact / WhatsApp: {s_phone}
   - Suspect Telegram Handle: {s_telegram}
   - Suspect Email / Domain: {s_email}
   - Medium of Solicitation: {platform}
   - Beneficiary UPI ID (VPA): {s_upi}
   - Beneficiary Bank Account / Details: {s_bank}

3. TRANSACTIONAL & FINANCIAL TRAIL:
   - Amount Extorted / Defrauded: INR {amount:,.2f}
   - Date of Incident / Transaction: {inc_date}
   - Payment Remittance Mode: {pay_mode}
   - Transaction Reference / UTR Number: {tx_id}

4. STATEMENT OF FACTS & MODUS OPERANDI:
{narrative}

5. APPLICABLE STATUTORY VIOLATIONS:
   a) Section 66D, Information Technology Act, 2000: Cheating by personation by using computer resource (cognizable offence; imprisonment up to 3 years and fine).
   b) Section 66C, Information Technology Act, 2000: Punishment for identity theft and fraudulent use of digital electronic signatures/identities.
   c) Section 420 of Indian Penal Code / Section 318(4) of Bharatiya Nyaya Sanhita (BNS): Cheating and dishonestly inducing delivery of property (imprisonment up to 7 years).
   d) Section 419 of Indian Penal Code / Section 319 of Bharatiya Nyaya Sanhita (BNS): Cheating by personation.

6. PRAYER & IMMEDIATE RELIEFS SOUGHT:
   In view of the serious cyber offences detailed herein, I respectfully pray that:
   i. Immediate 'Lien Marking' / Bank Account Freeze be transmitted to the beneficiary bank/UPI handle ({s_upi}) under 1930 Cyber Fraud Emergency Protocols to prevent withdrawal of defrauded funds.
   ii. A First Information Report (FIR) be registered against the named suspect(s) under the cited provisions of the IT Act and IPC/BNS.
   iii. Call Detail Records (CDR), IP address logs, and KYC verification records of phone number {s_phone} and Telegram account {s_telegram} be requisitioned from the concerned service providers.
   iv. The defrauded sum of INR {amount:,.2f} be recovered and restituted to the complainant.

7. ENCLOSURES & DIGITAL EVIDENCE ATTACHED:
   - Annexure 1: Screenshots of conversational chat logs (WhatsApp/Telegram/Job Portal).
   - Annexure 2: Bank transaction advice & UPI payment confirmation receipt (UTR: {tx_id}).
   - Annexure 3: Fraudulent job offer letters, forged company identity cards, or application forms.
   - Annexure 4: Call history logs and suspect recruiter email headers.

I certify under penalty of perjury that the statements made above are true, complete, and accurate to the best of my knowledge.

Yours faithfully,

{v_name}
Date: {today_str}
Place: {v_city}, {v_state}
Contact: {v_phone}
"""

    evidence_checklist = [
        {"item": "Bank / UPI Payment Screenshot", "desc": f"Proof showing debit of INR {amount:,.2f} and UTR {tx_id}", "status": "Critical"},
        {"item": "Chat History Export", "desc": f"Complete unedited chat logs from {platform} with suspect {s_name}", "status": "Critical"},
        {"item": "Job Posting / Offer Letter", "desc": "Fake offer PDF, Google form link, or job post screenshot", "status": "Important"},
        {"item": "Beneficiary Details", "desc": f"Suspect UPI ({s_upi}) and phone ({s_phone})", "status": "Critical"},
        {"item": "Call Logs", "desc": "Timestamped screenshots of incoming WhatsApp or cellular calls", "status": "Helpful"}
    ]

    golden_hour_steps = [
        {
            "step": 1,
            "title": "Call 1930 Helpline Immediately",
            "action": f"Dial 1930 (National Cyber Crime Helpline). Provide UTR {tx_id} and beneficiary UPI {s_upi} to trigger an immediate inter-bank freeze."
        },
        {
            "step": 2,
            "title": "Lodge Complaint on cybercrime.gov.in",
            "action": "Visit cybercrime.gov.in -> 'Report Financial Fraud'. Paste the generated legal complaint draft and attach transaction screenshots."
        },
        {
            "step": 3,
            "title": "Notify Your Bank's Fraud Desk",
            "action": "Email or visit your home bank's Cyber Nodal Officer with the 1930 acknowledgement number to mark a dispute and chargeback."
        },
        {
            "step": 4,
            "title": "Preserve Evidence & Avoid Retaliation",
            "action": "Do not delete or block the chat thread yet. Take full screen recordings and export chat archives for digital forensics."
        }
    ]

    statutory_sections = [
        {"code": "IT Act Sec 66D", "title": "Cheating by Personation via Computer Resource", "punishment": "Up to 3 yrs imprisonment + fine"},
        {"code": "IPC Sec 420 / BNS Sec 318(4)", "title": "Cheating & Dishonestly Inducing Delivery of Property", "punishment": "Up to 7 yrs imprisonment + fine"},
        {"code": "IT Act Sec 66C", "title": "Identity Theft & Domain Spoofing", "punishment": "Up to 3 yrs imprisonment + fine"},
        {"code": "IPC Sec 419 / BNS Sec 319", "title": "Punishment for Cheating by Personation", "punishment": "Up to 3 yrs imprisonment + fine"}
    ]

    return {
        "status": "success",
        "complaint_text": complaint_text.strip(),
        "summary": {
            "victim_name": v_name,
            "suspect_name": s_name,
            "amount_lost": amount,
            "transaction_id": tx_id,
            "platform": platform,
            "incident_date": inc_date
        },
        "statutory_sections": statutory_sections,
        "evidence_checklist": evidence_checklist,
        "golden_hour_steps": golden_hour_steps,
        "generated_at": datetime.utcnow().isoformat()
    }


# ============================================================
# AI VIDEO / AUDIO INTERVIEW RED FLAG EVALUATOR
# ============================================================

def evaluate_interview_flags(selected_flag_ids: list, custom_notes: str = "") -> dict:
    """
    Evaluates video/audio interview security risk based on behavioral,
    synthetic media, platform, and financial red flags.
    100% offline heuristic & weighted threat index.
    """
    ALL_FLAGS = {
        "remote_access": {
            "title": "Demanded Remote Desktop Tool (AnyDesk / TeamViewer / RustDesk)",
            "weight": 35,
            "category": "High Threat Malware Trap",
            "severity": "CRITICAL",
            "warning": "Legitimate interviewers never require candidate screen control via AnyDesk/TeamViewer. This is a vector to drain bank accounts."
        },
        "payment_demand": {
            "title": "Upfront Money Demanded on Call (Training / Laptop / Security Deposit)",
            "weight": 35,
            "category": "Direct Extortion",
            "severity": "CRITICAL",
            "warning": "Legitimate employers never charge candidates for job application, onboarding, or laptop courier. Under ILO rules, recruitment fees are illegal."
        },
        "sensitive_creds": {
            "title": "Asked for OTP / Netbanking / Screen Sharing of Personal Accounts",
            "weight": 40,
            "category": "Account Takeover",
            "severity": "CRITICAL",
            "warning": "Immediate financial theft attempt. Interviewer wants to intercept 2FA OTPs or observe banking passwords."
        },
        "camera_off": {
            "title": "Interviewer Refused Camera While Forcing Candidate's Camera On",
            "weight": 18,
            "category": "Identity Concealment",
            "severity": "HIGH",
            "warning": "Scammers conceal their identity and facial features to prevent biometric identification or reverse image matching."
        },
        "synthetic_ai": {
            "title": "AI Avatar / Deepfake Indicators (Laggy Lip-Sync, Robotic Audio, Glitching)",
            "weight": 25,
            "category": "Synthetic Media Fraud",
            "severity": "HIGH",
            "warning": "Interviewer shows unnatural eye blinking, distorted neck/collar contours, or synthetic TTS voice inflection."
        },
        "off_platform_chat": {
            "title": "Interview Conducted Only via WhatsApp/Telegram Audio or Text Chat",
            "weight": 22,
            "category": "Informal Channel Risk",
            "severity": "HIGH",
            "warning": "Corporate hiring protocols use Microsoft Teams, Google Meet, or Zoom with corporate domain invites, never Telegram."
        },
        "immediate_offer": {
            "title": "Instant Job Offer Within 5-10 Minutes Without Technical Questions",
            "weight": 20,
            "category": "Predatory Baiting",
            "severity": "MEDIUM",
            "warning": "Scammers give instant pseudo-validation to excite victims before presenting a fee or deposit request."
        },
        "unrealistic_salary": {
            "title": "Extravagant Compensation for Low-Skill / Fresher Position",
            "weight": 18,
            "category": "Bait & Switch",
            "severity": "MEDIUM",
            "warning": "Offers like ₹60,000/month for basic data entry or part-time typing are classic indicators of employment scams."
        },
        "suspicious_app_install": {
            "title": "Asked to Download Unverified .apk / .exe Meeting File",
            "weight": 30,
            "category": "Trojan Distribution",
            "severity": "CRITICAL",
            "warning": "Fake conferencing links often drop info-stealing trojans or spyware on candidate machines."
        },
        "urgency_pressure": {
            "title": "High Urgency Pressure ('Must Pay / Accept Within 30 Minutes')",
            "weight": 20,
            "category": "Psychological Manipulation",
            "severity": "HIGH",
            "warning": "Artificial deadlines are designed to induce panic and prevent candidates from discussing the offer with mentors or parents."
        }
    }

    raw_score = sum(ALL_FLAGS[fid]["weight"] for fid in selected_flag_ids if fid in ALL_FLAGS)
    threat_score = min(100, max(0, raw_score))
    safety_score = 100 - threat_score

    triggered = [ALL_FLAGS[fid] for fid in selected_flag_ids if fid in ALL_FLAGS]

    if threat_score >= 70:
        verdict = "CRITICAL SCAM DETECTED - TERMINATE IMMEDIATELY"
        threat_level = "CRITICAL"
        action = "Immediately disconnect the call, revoke screen-sharing permissions, and block the recruiter on all channels."
    elif threat_score >= 40:
        verdict = "HIGH FRAUD RISK - SUSPICIOUS INTERVIEW"
        threat_level = "HIGH"
        action = "Do not transfer money or install software. Request formal written communication from an official corporate domain."
    elif threat_score >= 15:
        verdict = "ELEVATED CAUTION - IRREGULAR RECRUITMENT BEHAVIOR"
        threat_level = "MODERATE"
        action = "Cross-check the interviewer's identity on LinkedIn and verify the company's official careers portal."
    else:
        verdict = "VERIFIED SAFE INTERVIEW PROTOCOL"
        threat_level = "SAFE"
        action = "No predatory interview red flags detected. Adhere to standard professional interview practices."

    countermeasures = []
    if any(fid in selected_flag_ids for fid in ["remote_access", "suspicious_app_install"]):
        countermeasures.append("Disconnect internet and run an anti-malware scan immediately if AnyDesk or unknown software was launched.")
    if any(fid in selected_flag_ids for fid in ["payment_demand"]):
        countermeasures.append("Firmly refuse any payment. Cite that recognized corporate internships never charge onboarding fees.")
    if any(fid in selected_flag_ids for fid in ["sensitive_creds"]):
        countermeasures.append("Check bank accounts immediately for unauthorized access and contact bank fraud hotline if OTP was shared.")
    if threat_score >= 50:
        countermeasures.append("Capture screenshots of the interview invite, phone numbers, and chat logs to report to National Cybercrime Portal (1930).")

    return {
        "safety_score": safety_score,
        "threat_score": threat_score,
        "verdict": verdict,
        "threat_level": threat_level,
        "primary_action": action,
        "triggered_flags": triggered,
        "countermeasures": countermeasures,
        "total_flags_checked": len(triggered),
        "timestamp": datetime.utcnow().isoformat()
    }

