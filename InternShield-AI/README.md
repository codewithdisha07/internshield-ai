# InternShield AI - Next-Gen Student Internship & Job Scam Defense

An end-to-end, privacy-preserving AI cybersecurity platform engineered to protect students and freshers from fraudulent job postings, fake recruiters, deceptive offer letters, and corporate impersonation scams.

---

## Key Highlights for Academic Review & Evaluation

- **100% In-House Trained Machine Learning Model (Zero External Cloud / Paid APIs)**:
  - Unlike wrapper projects that depend on OpenAI, Gemini, or third-party APIs, InternShield trains and runs all NLP classification **100% locally** using Scikit-Learn.
  - Trained on a balanced dataset of **10,000 verified job and internship samples** (`backend/data/internshield_job_internship_training_10000.csv`).
- **Multi-Algorithm Benchmark Suite**:
  - Compares 4 ML algorithms: **Logistic Regression (Tuned)**, **Linear SVM (SGD Calibrated)**, **Complement Naive Bayes**, and **Random Forest**.
  - Generates comprehensive classification metrics: **Precision, Recall, F1-Score (Macro & Weighted), and a full 3x3 Confusion Matrix**.
- **Local Explainable AI (XAI)**:
  - Deconstructs text inputs into TF-IDF n-grams and computes exact mathematical feature weights to explain *why* an offer was flagged as fraudulent.
- **Multi-Factor Entity Verification**:
  - **Company Verification**: Indian MCA CIN (Corporate Identity Number) validator, GSTIN format validator, brand typosquatting detector, and corporate email consistency checks.
  - **Recruiter Credibility Scanner**: Telegram/WhatsApp interview risk scoring, free email spoofing detection, and Zero-Fee Policy enforcement.
  - **Offer Letter Contract Inspector**: Detects laptop security deposits, training charges, crypto/UPI traps, and missing standard corporate clauses (NDA, PF, notice periods).
- **Persistent SQLite Database & Multi-Sheet Excel Reports**:
  - Stores all scans in SQLite (`backend/internshield.db`).
  - Exports a multi-sheet audit workbook containing All Scans, Threats, Company Checks, Recruiter Checks, and the complete **ML Evaluation Metrics & Confusion Matrix**.

---

## Project Architecture

```text
InternShield-AI/
├── backend/
│   ├── data/
│   │   └── internshield_job_internship_training_10000.csv   # 10,000 row dataset (balanced)
│   ├── models/
│   │   ├── scam_model.joblib                                # Trained ML pipeline weights
│   │   └── training_metrics.json                            # Accuracy, F1, confusion matrix & benchmarks
│   ├── train_model.py                                       # Multi-model training & benchmarking script
│   ├── verification.py                                      # Domain, MCA CIN, GSTIN, recruiter & contract engine
│   ├── main.py                                              # FastAPI backend with 25 endpoints
│   ├── requirements.txt                                     # Python dependencies
│   └── internshield.db                                      # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                                          # React dashboard & interactive modules
│   │   ├── styles.css                                       # Premium cyber-defense design system
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
└── README.md
```

---

## Machine Learning Architecture

### 1. Dataset Breakdown
- **Total Samples**: 10,000
- **Classes**:
  - `fraudulent` (3,333 samples)
  - `suspicious` (3,333 samples)
  - `legitimate` (3,334 samples)
- **Train / Test Split**: 80% Train (8,000 rows) / 20% Stratified Holdout Test (2,000 rows)

### 2. Feature Extraction
- **Vectorization**: Sublinear TF-IDF Vectorizer
- **N-Grams**: Unigrams and Bigrams `(1, 2)`
- **Vocabulary Size**: Up to 30,000 features
- **Normalization**: L2 normalization with sublinear term-frequency scaling

### 3. Algorithm Benchmark Comparison
| Model | Algorithm | Test Accuracy | Macro F1 | Fit Time | Recommendation |
|---|---|---|---|---|---|
| **Primary** | Logistic Regression (Tuned L2) | 100.00% | 100.00% | ~0.11s | Optimal balance of speed & calibrated probabilities |
| **Linear SVM** | SGDClassifier (loss='log_loss') | 100.00% | 100.00% | ~0.13s | Strong boundary separation on high-dimensional text |
| **Naive Bayes** | ComplementNB | 100.00% | 100.00% | ~0.02s | High-speed NLP baseline |
| **Ensemble** | Random Forest Classifier | 100.00% | 100.00% | ~0.28s | Non-linear tree bagging comparison |

### 4. Top Learned Scam Features (Coefficient Weights)
- `send money` (+2.45)
- `banking credentials` (+2.38)
- `telegram` (+2.29)
- `send otp` (+2.15)
- `guaranteed stipend` (+2.04)
- `registration fee` (+1.98)
- `crypto payment` (+1.92)

---

## How to Run the Project

### Prerequisites
- Python 3.10+
- Node.js 18+ (20+ recommended)
- VS Code or PowerShell

### Step 1: Backend Setup & Model Training
Open a terminal in `backend`:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# (Optional) Retrain or benchmark the model via CLI:
python train_model.py

# Start FastAPI server on port 8000:
python -m uvicorn main:app --reload --port 8000
```
Backend API will be live at: `http://127.0.0.1:8000`  
Interactive Swagger Docs at: `http://127.0.0.1:8000/docs`

### Step 2: Frontend Setup
Open a second terminal in `frontend`:
```powershell
cd frontend
npm install
npm run dev
```
Open your browser at: `http://localhost:5173`

---


## Live Feature Guide

### 1. Dashboard
- Displays Live Protection metrics, items scanned, threat breakdown, and recent intelligence.
- Displays an **Active ML Model Banner** detailing the active algorithm, training sample count, and test accuracy.

### 2. Universal Scanner
- Analyze messages, SMS, WhatsApp texts, or recruitment offers.
- Includes **1-Click Demo Presets**:
  - `Fee / Registration Scam`
  - `Telegram Daily Task Scam`
  - `Authentic Corporate Offer`
- Returns:
  - Risk Score (0-100) & Severity
  - **Local ML Prediction & Confidence**
  - **Class Probabilities Bar** (Fraudulent %, Suspicious %, Legitimate %)
  - **Local Model N-Gram Signals** (tokens highlighted with their feature weights)
  - Rule-based reasons checklist

### 3. Company Verification
- Verifies company legitimacy without external paid APIs:
  - **Domain Infrastructure**: Detects disposable TLDs (`.xyz`, `.top`, `.click`, `.site`) and free hosting platforms (`wixsite`, `firebaseapp`, `weebly`).
  - **Brand Typosquatting**: Catches domain impersonation (e.g. `google-careers-portal.xyz` claiming to be Google).
  - **Corporate Email Check**: Flags free webmail (`@gmail.com`) used for corporate recruitment.
  - **Indian MCA CIN Validator**: Decodes 21-character CIN (checks listing code, industry, state, incorporation year, ownership type).
  - **GSTIN Validator**: Validates 15-character statutory format.
- Includes **1-Click Demo Presets**:
  - `Legitimate: Tata Consultancy Services`
  - `Scam Lookalike: Google Careers on .xyz`

### 4. Recruiter Verification
- Audits recruiter credibility:
  - **Channel Risk**: Flags outreach via Telegram, Instagram, or Signal.
  - **Interview Rigor**: Flags direct offers or text-only interviews without video/in-person screening.
  - **Zero-Fee Policy**: Flags any request for laptop deposits, registration fees, or training charges.
- Includes **1-Click Demo Presets**:
  - `Legitimate: Corporate Senior HR`
  - `Scam Trap: Telegram Laptop Courier Fee`

### 5. Document Scanner (Deep Offer Letter & Contract Inspector)
- Upload PDF, DOCX, TXT, or Image files (client-side OCR supported).
- Audits contract clauses:
  - Flags equipment deposits, laptop shipping fees, training fees.
  - Flags cryptocurrency or personal UPI payment demands.
  - Checks for standard corporate clauses (NDA, Notice Period, Working Hours, Registered Address, Provident Fund).
- Includes **1-Click Test Offer Letters**:
  - `Scam Offer: Refundable Laptop Deposit`
  - `Legitimate Offer: Corporate Engineering Intern`

### 6. Model Intelligence (ML Center)
- **100% Offline ML Status**: Zero third-party APIs used.
- **Interactive Model Retraining**: Choose from 4 algorithms and retrain directly from the UI in under 1 second.
- **Algorithm Benchmark Table**: Accuracy, Macro F1, and training time side-by-side.
- **Interactive 3x3 Confusion Matrix**: Color-coded True vs Predicted counts.
- **Top Learned Scam Indicators**: Feature weights tag-cloud.
- **Explainable AI (XAI) Token Inspector**: Type any sentence to test token weights in real time.

### 7. Job Board Overlay Simulator (LinkedIn / Internshala / Indeed)
An interactive simulator reproducing popular hiring platforms equipped with the **InternShield Protective Overlay**:
- Supports tab switching between **LinkedIn Jobs**, **Internshala**, and **Indeed**.
- Demonstrates how InternShield intercepts malicious job posts in real-time, injecting floating safety badges:
  - 🟢 **VERIFIED SAFE (96% Confidence)**: Verified MCA CIN, official corporate domain, zero fee demand.
  - 🟡 **CAUTION / UNVERIFIED**: Free email recruiters (`@gmail.com`), newly registered domains.
  - 🚨 **CRITICAL SCAM BLOCKED**: Intercepts advance fee demands, AnyDesk traps, and Telegram redirections.
- **Deep Inspect AI**: Opens a forensic drawer detailing the ML classification, token attribution, and reasons.
- **Custom Post Simulator**: Allows testing any custom job text to preview how the overlay responds.

### 8. 1-Click Cybercrime Complaint & Evidence Generator (cybercrime.gov.in / 1930)
Generates court-admissible criminal complaint drafts tailored for the **National Cyber Crime Reporting Portal** and **National Helpline 1930**:
- Fast 1-click presets for common frauds: *Telegram Task / Review Scam (₹2,500 lost)*, *Laptop Courier Bond Fraud (₹4,999 lost)*, and *MNC Impersonation & AnyDesk Extortion (₹1,200 lost)*.
- Incorporates statutory penal codes:
  - **Section 66D, Information Technology Act, 2000**: Cheating by personation using computer resource.
  - **Section 420 IPC / Section 318(4) Bharatiya Nyaya Sanhita (BNS, 2023)**: Cheating and dishonestly inducing delivery of property.
  - **Section 66C, Information Technology Act, 2000**: Identity theft.
- Assembles a complete **Evidence Dossier** with suspect UPI IDs, phone numbers, transaction UTRs, and digital footprints.
- Outlines the critical **Golden Hour Emergency Response Protocol** to trigger inter-bank account freezes via 1930 before funds are laundered.

### 9. AI Video / Audio Interview Red Flag Checklist
A real-time diagnostic checklist and threat index for virtual candidate interviews:
- Evaluates 10 behavioral and technical indicators across 4 threat categories:
  - **Malware & Screen Takeover**: Demands for AnyDesk, TeamViewer, or RustDesk.
  - **Direct Extortion**: Upfront demands for laptop deposits, training fees, or uniform bonds.
  - **Credential Theft**: Requests for bank app screen-sharing or OTP disclosure.
  - **Identity Concealment & Synthetic Media**: Camera refusal, AI avatar / deepfake lip-sync anomalies, and exclusive Telegram/WhatsApp audio calls.
- Computes a dynamic **Live Interview Safety Index (0–100%)** with color-coded safety meters and immediate countermeasure action plans.
- Direct **1-click transfer** to the Cybercrime Complaint Generator when critical threats are confirmed.

### 10. Multi-Sheet Excel Audit Export
Click **Export Excel** in the top navigation to download an `.xlsx` report containing:
1. `All Scans`: Complete persistent history.
2. `Threats`: Filtered high-risk incidents.
3. `Company Verifications`: Company audit logs.
4. `Recruiter Verifications`: Recruiter audit logs.
5. `Actions`: User approvals.
6. `ML Evaluation Metrics`: Active model details, benchmark comparison table, and the full Confusion Matrix.

---

   - Render automatically reads [`render.yaml`](render.yaml) to build the frontend, install backend dependencies, train the ML model, and launch the unified FastAPI + React server.
   - Click **Apply**.
3. For detailed manual configuration, Docker deployment, and environment variable setup, see the complete [Render Deployment Guide](RENDER_DEPLOY_GUIDE.md).

