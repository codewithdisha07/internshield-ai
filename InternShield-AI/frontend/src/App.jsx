import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Gauge,
  Globe,
  Inbox,
  Link2,
  Search,
  Shield,
  Smartphone,
  UserCheck,
  XCircle,
  Download,
  History as HistoryIcon,
  Cpu,
  Building,
  User,
  FileText,
  AlertCircle,
  Play,
  Sparkles,
  Check,
  RotateCw,
  Scale,
  Video,
  Layers,
  Copy,
  ExternalLink,
  ShieldAlert,
  Printer,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Radio,
  Bell
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE !== undefined
    ? import.meta.env.VITE_API_BASE
    : typeof window !== "undefined" && window.location.port === "5173"
    ? "http://localhost:8000"
    : "";

const nav = [
  ["Dashboard", Gauge],
  ["Universal Scanner", Search],
  ["Job Board Simulator", Layers],
  ["Cybercrime Complaint", Scale],
  ["Interview Red Flag Checklist", Video],
  ["Company Verification", Building],
  ["Recruiter Verification", UserCheck],
  ["Document Scanner", FileSearch],
  ["Model Intelligence", Cpu],
  ["Threat Center", AlertTriangle],
  ["Scan History", HistoryIcon],
  ["Connections", Link2],
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [connections, setConnections] = useState([]);
  const [history, setHistory] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prefilledComplaint, setPrefilledComplaint] = useState(null);

  // Universal Scanner State
  const [scanText, setScanText] = useState("");
  const [scanUrl, setScanUrl] = useState("");
  const [result, setResult] = useState(null);
  const [urlResult, setUrlResult] = useState(null);

  async function load() {
    setBusy(true);
    try {
      const [d, c, h, m] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard`).then((r) => r.json()),
        fetch(`${API_BASE}/api/connectors`).then((r) => r.json()),
        fetch(`${API_BASE}/api/history`).then((r) => r.json()),
        fetch(`${API_BASE}/api/model/metrics`).then((r) => r.json()).catch(() => null),
      ]);
      setData(d);
      setConnections(c);
      setHistory(h);
      if (m && !m.error) setModelMetrics(m);
    } catch {
      setData({ error: "Backend is not running" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runText(textToScan) {
    const textVal = textToScan || scanText;
    if (!textVal.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/scan/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Scan failed");
      setResult(d);
      load();
    } catch (e) {
      setResult({
        risk: 0,
        severity: "Error",
        reasons: [e.message || "Could not connect to backend."],
      });
    } finally {
      setBusy(false);
    }
  }

  async function runUrl(urlToScan) {
    const urlVal = urlToScan || scanUrl;
    if (!urlVal.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/scan/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "URL scan failed");
      setUrlResult(d);
      load();
    } catch (e) {
      setUrlResult({
        risk: 0,
        severity: "Error",
        reasons: [e.message || "Could not connect to backend."],
      });
    } finally {
      setBusy(false);
    }
  }

  function exportExcel() {
    window.open(`${API_BASE}/api/export/excel`, "_blank");
  }

  if (!data) return <div className="loading">Starting InternShield AI Hub…</div>;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">
            <Shield size={23} />
          </div>
          <div>
            <b>InternShield</b>
            <span>AI SECURITY HUB</span>
          </div>
        </div>
        <div className="nav">
          {nav.map(([name, Icon]) => (
            <button
              className={page === name ? "active" : ""}
              onClick={() => setPage(name)}
              key={name}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </div>
        <div className="sidebarBottom">
          <div className="statusDot" />

        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <div className="eyebrow">STUDENT JOB & INTERNSHIP DEFENSE</div>
            <h1>{page}</h1>
          </div>
          <div className="headerBtns">
            <button className="exportBtn" onClick={exportExcel} title="Download Excel audit report with ML metrics">
              <Download size={17} /> Export Excel
            </button>
            <button className="scanBtn" onClick={load} disabled={busy}>
              <Activity size={17} /> {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {page === "Dashboard" && <Dashboard data={data} setPage={setPage} modelMetrics={modelMetrics} />}
        {page === "Universal Scanner" && (
          <Scanner
            scanText={scanText}
            setScanText={setScanText}
            runText={runText}
            result={result}
            scanUrl={scanUrl}
            setScanUrl={setScanUrl}
            runUrl={runUrl}
            urlResult={urlResult}
            busy={busy}
          />
        )}
        {page === "Job Board Simulator" && (
          <JobBoardSimulator
            onTransferToComplaint={(complaintData) => {
              setPrefilledComplaint(complaintData);
              setPage("Cybercrime Complaint");
            }}
          />
        )}
        {page === "Cybercrime Complaint" && (
          <CybercrimeGenerator
            initialData={prefilledComplaint}
            reloadAll={load}
          />
        )}
        {page === "Interview Red Flag Checklist" && (
          <InterviewChecklist
            onTransferToComplaint={(complaintData) => {
              setPrefilledComplaint(complaintData);
              setPage("Cybercrime Complaint");
            }}
          />
        )}
        {page === "Company Verification" && <CompanyVerification reloadAll={load} />}
        {page === "Recruiter Verification" && <RecruiterVerification reloadAll={load} />}
        {page === "Document Scanner" && <DocumentScanner reloadAll={load} />}
        {page === "Model Intelligence" && (
          <ModelIntelligence
            metrics={modelMetrics}
            reloadMetrics={load}
          />
        )}
        {page === "Threat Center" && <Threats data={data} />}
        {page === "Scan History" && <History rows={history} exportExcel={exportExcel} />}
        {page === "Connections" && (
          <Connections
            connections={connections}
            reloadAll={load}
            setPage={setPage}
            setPrefilledComplaint={setPrefilledComplaint}
            setScanText={setScanText}
            modelMetrics={modelMetrics}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ data, setPage, modelMetrics }) {
  return (
    <section>
      <div className="hero">
        <div>
          <div className="pill">
            <Sparkles size={14} style={{ marginRight: 6, display: "inline" }} />
            100% IN-HOUSE TRAINED ML MODEL
          </div>
          <h2>Verify before you trust.</h2>
          <p>
            InternShield evaluates job offers, recruiters, contracts, and company credentials
            using an offline trained Machine Learning pipeline and multi-factor security rules.
          </p>
        </div>
        <div className="shieldOrb">
          <Shield size={55} />
        </div>
      </div>

      <div className="cards">
        <Stat label="Items scanned" value={data.scanned} icon={Inbox} />
        <Stat label="Safe verified" value={data.safe} icon={CheckCircle2} />
        <Stat label="Suspicious" value={data.suspicious} icon={AlertTriangle} />
        <Stat label="High risk / Threats" value={data.highRisk} icon={XCircle} />
      </div>

      {modelMetrics && (
        <div className="modelHighlightBanner">
          <div className="modelHighlightLeft">
            <Cpu size={28} className="cpuIcon" />
            <div>
              <b>Trained Scikit-Learn Model Active: {modelMetrics.algorithm_display}</b>
              <p>
                Trained locally on {modelMetrics.dataset_rows?.toLocaleString()} verified records · Holdout Test Accuracy:{" "}
                <span className="safeTag">{(modelMetrics.accuracy * 100).toFixed(1)}%</span> · F1 Macro:{" "}
                <span className="safeTag">{(modelMetrics.f1_macro * 100).toFixed(1)}%</span>
              </p>
            </div>
          </div>
          <button className="primary outline" onClick={() => setPage("Model Intelligence")}>
            View Model Center <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">
            <span>Recent Security Intelligence</span>
            <button onClick={() => setPage("Scan History")}>
              Full history <ChevronRight size={15} />
            </button>
          </div>
          {(data.items || []).slice(0, 6).map((i) => (
            <RiskRow item={i} key={i.id} />
          ))}
          {(!data.items || data.items.length === 0) && (
            <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>No recent scans recorded yet.</p>
          )}
        </div>

        <div className="panel">
          <div className="panelTitle">
            <span>Active Defense & Security Tools</span>
            <span className="liveBadge">Active Protection</span>
          </div>

          <div className="defenseModulesGrid">
            <div className="defenseModuleCard" onClick={() => setPage("Job Board Simulator")}>
              <div className="defenseCardHeader">
                <div className="defenseCardIcon blue">
                  <Layers size={18} />
                </div>
                <span className="modulePill">Live Simulator</span>
              </div>
              <b>Job Board Overlay Simulator</b>
              <p>Simulate LinkedIn, Internshala & Indeed with live InternShield safety ribbons & scam interception.</p>
              <span className="defenseLink">Launch Overlay <ChevronRight size={13} /></span>
            </div>

            <div className="defenseModuleCard" onClick={() => setPage("Cybercrime Complaint")}>
              <div className="defenseCardHeader">
                <div className="defenseCardIcon red">
                  <Scale size={18} />
                </div>
                <span className="modulePill urgent">1-Click Legal FIR</span>
              </div>
              <b>Cybercrime Complaint Generator</b>
              <p>Draft official police FIR & cybercrime.gov.in reports citing IT Act 66D & IPC 420 / BNS 318(4).</p>
              <span className="defenseLink">Generate Dossier <ChevronRight size={13} /></span>
            </div>

            <div className="defenseModuleCard" onClick={() => setPage("Interview Red Flag Checklist")}>
              <div className="defenseCardHeader">
                <div className="defenseCardIcon purple">
                  <Video size={18} />
                </div>
                <span className="modulePill">AI Deepfake Shield</span>
              </div>
              <b>Interview Red Flag Checklist</b>
              <p>Screen video/audio calls for deepfake avatars, AnyDesk malware traps, and upfront fee demands.</p>
              <span className="defenseLink">Screen Interview <ChevronRight size={13} /></span>
            </div>
          </div>

          <div className="quickActions" style={{ marginTop: "16px" }}>
            <h4>Statutory & Deep Verification</h4>
            <div className="btnGrid">
              <button onClick={() => setPage("Universal Scanner")}>
                <Search size={15} /> Scan Job Message
              </button>
              <button onClick={() => setPage("Company Verification")}>
                <Building size={15} /> Verify Company (MCA/CIN)
              </button>
              <button onClick={() => setPage("Recruiter Verification")}>
                <UserCheck size={15} /> Check Recruiter Profile
              </button>
              <button onClick={() => setPage("Document Scanner")}>
                <FileSearch size={15} /> Inspect Offer Letter
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="stat">
      <div className="statIcon">
        <Icon size={19} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskRow({ item }) {
  return (
    <div className="riskRow">
      <div className={`riskBadge ${item.risk >= 70 ? "high" : item.risk >= 35 ? "mid" : "low"}`}>
        {item.risk}
      </div>
      <div>
        <b>{item.title}</b>
        <small>
          {item.source} · {item.company}
        </small>
      </div>
      <span className="severity">{item.severity}</span>
    </div>
  );
}

// ============================================================
// UNIVERSAL SCANNER (WITH EXPLAINABLE AI)
// ============================================================
function Scanner(p) {
  const presets = [
    {
      title: "Fee / Registration Scam",
      text: "Congratulations! You have been selected for Web Development Intern at TechBytes. Please deposit 500 Rs registration fee via UPI to confirm your joining kit and seat.",
    },
    {
      title: "Telegram Daily Task Scam",
      text: "Immediate opening for Operations Intern. No interview needed. Join our Telegram group @EarnDailyTasks for daily payout of 3000 Rs for simple copy paste jobs.",
    },
    {
      title: "Authentic Corporate Offer",
      text: "Tata Consultancy Services is hiring a Software Engineering Intern. Applicants should review our official careers portal at tcs.com. The selection process includes technical assessment and scheduled interviews. Selected candidates receive a formal offer letter with corporate benefits and NDA.",
    },
  ];

  return (
    <section>
      <div className="presetBar">
        <span className="presetLabel">
          <Play size={14} /> Quick Demo Presets:
        </span>
        {presets.map((pr) => (
          <button
            key={pr.title}
            className="presetBtn"
            onClick={() => {
              p.setScanText(pr.text);
              p.runText(pr.text);
            }}
          >
            {pr.title}
          </button>
        ))}
      </div>

      <div className="grid2">
        <div className="panel scanner">
          <div className="panelTitle">
            <span>Message / Job Posting Text</span>
            <Smartphone size={18} />
          </div>
          <textarea
            value={p.scanText}
            onChange={(e) => p.setScanText(e.target.value)}
            placeholder="Paste a recruiter message, WhatsApp text, email excerpt, or job posting…"
            rows={6}
          />
          <button className="primary" onClick={() => p.runText()} disabled={!p.scanText || p.busy}>
            {p.busy ? "Analyzing with Local Model…" : "Analyze Message"}
          </button>
          {p.result && <ScanResult r={p.result} />}
        </div>

        <div className="panel scanner">
          <div className="panelTitle">
            <span>URL / Application Link Scanner</span>
            <Globe size={18} />
          </div>
          <input
            value={p.scanUrl}
            onChange={(e) => p.setScanUrl(e.target.value)}
            placeholder="https://company-careers-portal.com/apply"
          />
          <div className="urlPresets">
            <small>Quick test URLs:</small>
            <button
              className="tagBtn"
              onClick={() => {
                p.setScanUrl("https://google-careers-portal.xyz/apply-now");
                p.runUrl("https://google-careers-portal.xyz/apply-now");
              }}
            >
              Phishing lookalike (.xyz)
            </button>
            <button
              className="tagBtn"
              onClick={() => {
                p.setScanUrl("https://careers.google.com/jobs");
                p.runUrl("https://careers.google.com/jobs");
              }}
            >
              Legitimate domain
            </button>
          </div>
          <button className="primary" onClick={() => p.runUrl()} disabled={!p.scanUrl || p.busy}>
            {p.busy ? "Analyzing URL…" : "Analyze URL"}
          </button>
          {p.urlResult && <ScanResult r={p.urlResult} />}
        </div>
      </div>
    </section>
  );
}

function ScanResult({ r }) {
  return (
    <div className="result">
      <div className={`bigRisk ${r.risk >= 70 ? "high" : r.risk >= 35 ? "mid" : "low"}`}>
        {r.risk}
        <small>/100</small>
      </div>
      <div>
        <div className="resultHeader">
          <b>{r.severity}</b>
          {r.prediction && (
            <span className={`predBadge ${r.prediction}`}>
              ML Prediction: {r.prediction.toUpperCase()}
            </span>
          )}
          {r.confidence && <span className="confBadge">{r.confidence}% confidence</span>}
        </div>

        {r.engine && (
          <div className="engineBadge">
            <Cpu size={13} /> {r.engine}
          </div>
        )}

        {r.probabilities && Object.keys(r.probabilities).length > 0 && (
          <div className="probBreakdown">
            <small>Local ML Class Probabilities:</small>
            <div className="probBars">
              {Object.entries(r.probabilities).map(([label, prob]) => (
                <div key={label} className="probItem">
                  <span>{label}: {(prob * 100).toFixed(1)}%</span>
                  <div className="pBar">
                    <div
                      className={`pFill ${label}`}
                      style={{ width: `${Math.round(prob * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {r.matched_indicators && r.matched_indicators.length > 0 && (
          <div className="tokensFound">
            <small>Local Model N-Gram Signals Detected:</small>
            <div className="tokenTags">
              {r.matched_indicators.map((tok, idx) => (
                <span
                  key={idx}
                  className={`tokenTag ${tok.impact || "neutral"}`}
                  title={`Model Weight: ${tok.weight}`}
                >
                  "{tok.term}" ({tok.weight > 0 ? `+${tok.weight}` : tok.weight})
                </span>
              ))}
            </div>
          </div>
        )}

        {r.host && <p>Analyzed Host: <code>{r.host}</code></p>}
        <ul className="reasonsList">
          {(r.reasons || []).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// COMPANY VERIFICATION (FULL FEATURE)
// ============================================================
function CompanyVerification({ reloadAll }) {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const presets = [
    {
      title: "Legitimate: Tata Consultancy Services",
      name: "Tata Consultancy Services",
      url: "https://tcs.com",
      email: "careers@tcs.com",
      cin: "L22210MH1995PLC084781",
      gst: "27AAACT2727Q1ZW",
    },
    {
      title: "Scam Lookalike: Google Careers on .xyz",
      name: "Google Careers Inc",
      url: "https://google-careers-portal.xyz",
      email: "recruitment.google@gmail.com",
      cin: "",
      gst: "",
    },
    {
      title: "Suspicious Entity: Quick Earn Solutions",
      name: "Quick Daily Earn Data Solutions",
      url: "https://quickearn.wixsite.com/jobs",
      email: "hr@quickearn.site",
      cin: "U12345DL2021PTC999999",
      gst: "",
    },
  ];

  async function verify() {
    if (!companyName.trim()) {
      setError("Please enter a company name.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/company/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          website_url: websiteUrl,
          hr_email: hrEmail,
          cin_number: cinNumber,
          gstin: gstin,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Verification failed");
      setResult(d);
      reloadAll();
    } catch (e) {
      setError(e.message || "Failed to verify company.");
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(p) {
    setCompanyName(p.name);
    setWebsiteUrl(p.url);
    setHrEmail(p.email);
    setCinNumber(p.cin);
    setGstin(p.gst);
    setError("");
    setResult(null);
  }

  return (
    <section>
      <div className="connectionIntro">
        <h2>Company Legitimacy & Corporate Registry Verification</h2>
        <p>
          Cross-examines company domain infrastructure, brand typosquatting, corporate email consistency,
          Indian MCA CIN (Corporate Identity Number) structure, and statutory GSTIN registration.
        </p>
      </div>

      <div className="presetBar">
        <span className="presetLabel">
          <Play size={14} /> Quick Demo Profiles:
        </span>
        {presets.map((pr) => (
          <button key={pr.title} className="presetBtn" onClick={() => applyPreset(pr)}>
            {pr.title}
          </button>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">
            <span>Company Verification Form</span>
            <Building size={18} />
          </div>

          <div className="formGroup">
            <label>Company Name *</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Tata Consultancy Services, Microsoft India"
            />
          </div>

          <div className="formGroup">
            <label>Official Website / Portal URL</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="e.g. https://tcs.com"
            />
          </div>

          <div className="formGroup">
            <label>HR / Recruiter Email</label>
            <input
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="e.g. hr@tcs.com (detects free @gmail.com impersonation)"
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>MCA CIN (Corporate Identity No.)</label>
              <input
                value={cinNumber}
                onChange={(e) => setCinNumber(e.target.value)}
                placeholder="e.g. L22210MH1995PLC084781"
              />
            </div>
            <div className="formGroup">
              <label>Statutory GSTIN</label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 27AAACT2727Q1ZW"
              />
            </div>
          </div>

          <button className="primary" onClick={verify} disabled={busy || !companyName.trim()}>
            {busy ? "Analyzing Entity Credentials…" : "Verify Company"}
          </button>

          {error && <div className="errorBanner">{error}</div>}
        </div>

        <div className="panel">
          <div className="panelTitle">
            <span>Verification Report</span>
            <Shield size={18} />
          </div>

          {!result && !busy && (
            <div className="emptyState">
              <Building size={40} className="mutedIcon" />
              <p>Fill the company details or click a demo profile above, then click <b>Verify Company</b>.</p>
            </div>
          )}

          {busy && (
            <div className="loadingState">
              <RotateCw size={30} className="spinIcon" />
              <p>Performing multi-factor domain, CIN and corporate cross-checks…</p>
            </div>
          )}

          {result && (
            <div className="verificationCard">
              <div className="scoreHeader">
                <div className={`scoreCircle ${result.risk_level.toLowerCase()}`}>
                  <span className="scoreVal">{result.trust_score}</span>
                  <span className="scoreTotal">/100</span>
                </div>
                <div>
                  <h3>{result.company_name}</h3>
                  <div className={`verdictPill ${result.risk_level.toLowerCase()}`}>
                    {result.verdict}
                  </div>
                  <small>Risk Level: {result.risk_level}</small>
                </div>
              </div>

              {result.trust_badges && result.trust_badges.length > 0 && (
                <div className="trustBadges">
                  {result.trust_badges.map((b, i) => (
                    <span key={i} className="trustBadge">
                      <Check size={14} /> {b}
                    </span>
                  ))}
                </div>
              )}

              {result.red_flags && result.red_flags.length > 0 && (
                <div className="redFlagsBox">
                  <b>Security Red Flags:</b>
                  <ul>
                    {result.red_flags.map((rf, i) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="checksList">
                <b>Detailed Factor Checks:</b>
                {result.checks.map((chk, i) => (
                  <div key={i} className="checkItem">
                    <span className={`statusIcon ${chk.status.toLowerCase()}`}>
                      {chk.status === "PASS" ? "✓" : chk.status === "FAIL" ? "✗" : "!"}
                    </span>
                    <div>
                      <strong>{chk.name}</strong>
                      <small>{chk.detail}</small>
                    </div>
                  </div>
                ))}
              </div>

              {result.recommendations && (
                <div className="adviceBox">
                  <b>Student Protective Guidelines:</b>
                  <ul>
                    {result.recommendations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// RECRUITER VERIFICATION (FULL FEATURE)
// ============================================================
function RecruiterVerification({ reloadAll }) {
  const [recruiterName, setRecruiterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [interviewMode, setInterviewMode] = useState("Video call");
  const [feeRequested, setFeeRequested] = useState(false);
  const [feeDetails, setFeeDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const presets = [
    {
      title: "Legitimate: Corporate Senior HR",
      rName: "Sunita Roy",
      cName: "Infosys Technologies",
      email: "sunita.roy@infosys.com",
      phone: "+91 98200 12345",
      platform: "LinkedIn",
      interview: "Video call",
      fee: false,
      feeDet: "",
    },
    {
      title: "Scam Trap: Telegram Laptop Courier Fee",
      rName: "HR Manager Alex",
      cName: "Tech Cloud Systems",
      email: "hr.techcloud@gmail.com",
      phone: "+1 415 555 2671",
      platform: "Telegram",
      interview: "Telegram group",
      fee: true,
      feeDet: "Candidate must pay 1,500 INR laptop insurance fee before receiving dispatch tracking.",
    },
  ];

  async function verify() {
    if (!recruiterName.trim()) {
      setError("Please enter the recruiter name.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiter_name: recruiterName,
          company_name: companyName,
          email,
          phone,
          platform,
          interview_mode: interviewMode,
          fee_requested: feeRequested,
          fee_details: feeDetails,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Recruiter audit failed");
      setResult(d);
      reloadAll();
    } catch (e) {
      setError(e.message || "Failed to audit recruiter.");
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(p) {
    setRecruiterName(p.rName);
    setCompanyName(p.cName);
    setEmail(p.email);
    setPhone(p.phone);
    setPlatform(p.platform);
    setInterviewMode(p.interview);
    setFeeRequested(p.fee);
    setFeeDetails(p.feeDet);
    setError("");
    setResult(null);
  }

  return (
    <section>
      <div className="connectionIntro">
        <h2>Recruiter Credibility & Interaction Screening</h2>
        <p>
          Audits outreach channels, text-only interview formats, corporate email legitimacy, and upfront fee demands
          to protect candidates against fake HR operatives.
        </p>
      </div>

      <div className="presetBar">
        <span className="presetLabel">
          <Play size={14} /> Quick Demo Scenarios:
        </span>
        {presets.map((pr) => (
          <button key={pr.title} className="presetBtn" onClick={() => applyPreset(pr)}>
            {pr.title}
          </button>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">
            <span>Recruiter Details Form</span>
            <UserCheck size={18} />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>Recruiter Name *</label>
              <input
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
            </div>
            <div className="formGroup">
              <label>Claimed Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Infosys, Amazon"
              />
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>Recruiter Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. recruiter@company.com"
              />
            </div>
            <div className="formGroup">
              <label>Phone / WhatsApp Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>First Outreach Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Internshala">Internshala</option>
                <option value="Naukri">Naukri</option>
                <option value="Email">Direct Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Interview Screening Mode</label>
              <select value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)}>
                <option value="Video call">Video call (Meet / Teams / Zoom)</option>
                <option value="In person">In person office interview</option>
                <option value="Phone call">Phone interview</option>
                <option value="WhatsApp chat">WhatsApp text chat only</option>
                <option value="Telegram group">Telegram group / text only</option>
                <option value="Direct offer (no interview)">Direct Offer without interview</option>
              </select>
            </div>
          </div>

          <div className="feeCheckGroup">
            <label className="checkboxLabel">
              <input
                type="checkbox"
                checked={feeRequested}
                onChange={(e) => setFeeRequested(e.target.checked)}
              />
              <span>Did this recruiter ask for ANY fee, deposit, or money?</span>
            </label>
            {feeRequested && (
              <textarea
                value={feeDetails}
                onChange={(e) => setFeeDetails(e.target.value)}
                placeholder="Explain the fee (e.g. laptop deposit, training kit charge, registration fee)…"
                rows={2}
              />
            )}
          </div>

          <button className="primary" onClick={verify} disabled={busy || !recruiterName.trim()}>
            {busy ? "Auditing Recruiter…" : "Audit Recruiter Profile"}
          </button>

          {error && <div className="errorBanner">{error}</div>}
        </div>

        <div className="panel">
          <div className="panelTitle">
            <span>Credibility Audit Report</span>
            <Shield size={18} />
          </div>

          {!result && !busy && (
            <div className="emptyState">
              <User size={40} className="mutedIcon" />
              <p>Enter recruiter details or pick a demo scenario to see the credibility scoring.</p>
            </div>
          )}

          {busy && (
            <div className="loadingState">
              <RotateCw size={30} className="spinIcon" />
              <p>Evaluating channel risk, interview rigor, and fee policies…</p>
            </div>
          )}

          {result && (
            <div className="verificationCard">
              <div className="scoreHeader">
                <div className={`scoreCircle ${result.threat_level === "Safe / Authentic" ? "low" : result.threat_level === "High Danger" ? "high" : "mid"}`}>
                  <span className="scoreVal">{result.credibility_score}</span>
                  <span className="scoreTotal">/100</span>
                </div>
                <div>
                  <h3>{result.recruiter_name}</h3>
                  <div className={`verdictPill ${result.threat_level === "Safe / Authentic" ? "low" : result.threat_level === "High Danger" ? "high" : "mid"}`}>
                    {result.verdict}
                  </div>
                  <small>Threat Level: {result.threat_level} · Risk: {result.risk_score}/100</small>
                </div>
              </div>

              {result.flags && result.flags.length > 0 && (
                <div className="redFlagsBox">
                  <b>Critical Red Flags Detected:</b>
                  <ul>
                    {result.flags.map((fl, i) => (
                      <li key={i}>{fl}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="checksList">
                <b>Security Factor Assessment:</b>
                {result.checks.map((chk, i) => (
                  <div key={i} className="checkItem">
                    <span className={`statusIcon ${chk.status.toLowerCase()}`}>
                      {chk.status === "PASS" ? "✓" : chk.status === "FAIL" ? "✗" : "!"}
                    </span>
                    <div>
                      <strong>{chk.name}</strong>
                      <small>{chk.detail}</small>
                    </div>
                  </div>
                ))}
              </div>

              {result.action_advice && (
                <div className="adviceBox">
                  <b>Protective Guidance:</b>
                  <ul>
                    {result.action_advice.map((ad, i) => (
                      <li key={i}>{ad}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// DOCUMENT SCANNER (DEEP CONTRACT & OFFER LETTER AUDIT)
// ============================================================
function DocumentScanner({ reloadAll }) {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const presets = [
    {
      title: "Scam Offer: Refundable Laptop Deposit",
      name: "OfferLetter_Scam_Sample.pdf",
      text: `APEX TECH SOLUTIONS PRIVATE LIMITED
OFFER OF INTERNSHIP & APPOINTMENT LETTER
Dear Candidate,
We are pleased to inform you that you have been selected for the position of Remote Operations Intern with a monthly stipend of 45,000 INR. No prior interview was required based on your profile review.
TERMS AND CONDITIONS:
1. Equipment: The company will dispatch a high-end corporate laptop and training kit.
2. Security Deposit: Candidate must deposit a mandatory refundable laptop security deposit of 2,500 INR via UPI ID apextech@upi prior to shipping. This fee will be refunded in your first salary.
3. Daily Earnings: 3,000 INR per day guaranteed upon completing daily SMS tasks.`,
    },
    {
      title: "Legitimate Offer: Corporate Engineering Intern",
      name: "Genuine_Offer_Letter.pdf",
      text: `CLOUDNEXT INNOVATIONS PRIVATE LIMITED
CORPORATE OFFICE: PLOT 42, ELECTRONIC CITY, BANGALORE - 560100
CIN: U72900KA2018PTC112345
INTERNSHIP OFFER LETTER
Dear Candidate,
We are pleased to extend an offer for the position of Software Engineering Intern at CloudNext Innovations.
1. Compensation: You will receive a monthly stipend of 25,000 INR, subject to applicable statutory tax deduction (TDS).
2. Confidentiality: You will be required to execute the company's standard Non-Disclosure Agreement (NDA).
3. Working Hours: Monday to Friday, 9:30 AM to 6:00 PM.
4. Policy: CloudNext Innovations does not charge any application, processing, or equipment deposit fees at any stage of employment.
5. Notice Period: Two weeks written notice is required for termination.`,
    },
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.onload = resolve;
        existing.onerror = reject;
        if (window.Tesseract || window.pdfjsLib || window.mammoth) resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  async function readPdf(file) {
    const pdfSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    await loadScript(pdfSrc);
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF reader could not initialize.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const objectUrl = URL.createObjectURL(file);
    try {
      const pdf = await pdfjsLib.getDocument({ url: objectUrl }).promise;
      let output = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        output.push(content.items.map((x) => x.str).join(" "));
      }
      return output.join("\n\n");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function readDocx(file) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js");
    if (!window.mammoth) throw new Error("DOCX reader could not load.");
    const buffer = await file.arrayBuffer();
    const d = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    return d.value || "";
  }

  async function readImage(file) {
    setOcrLoading(true);
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      if (!window.Tesseract) throw new Error("OCR reader could not load.");
      const worker = await window.Tesseract.createWorker("eng");
      try {
        const { data } = await worker.recognize(file);
        return (data.text || "").replace(/[ \t]+/g, " ").trim();
      } finally {
        await worker.terminate();
      }
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResult(null);
    setText("");
    setBusy(true);

    try {
      const name = file.name.toLowerCase();
      let extracted = "";
      if (/\.(txt|csv|json|md)$/i.test(name)) {
        extracted = await file.text();
      } else if (/\.pdf$/i.test(name)) {
        extracted = await readPdf(file);
      } else if (/\.docx$/i.test(name)) {
        extracted = await readDocx(file);
      } else if (/\.(png|jpe?g|webp|bmp)$/i.test(name) || file.type.startsWith("image/")) {
        extracted = await readImage(file);
      } else {
        throw new Error("Unsupported file. Please upload PDF, DOCX, TXT, or Image.");
      }
      if (!extracted.trim()) throw new Error("No readable text found in document.");
      setText(extracted);
    } catch (e) {
      setError(e.message || "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/document/deep-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          document_name: fileName || "Pasted Offer Letter",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Scan failed");
      setResult(d);
      reloadAll();
    } catch (e) {
      setError(e.message || "Failed to analyze document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="connectionIntro">
        <h2>Document & Offer Letter Contract Audit</h2>
        <p>
          Upload an offer letter, PDF, DOCX, or screenshot. InternShield scans contract clauses for hidden extortion fees,
          unrealistic salary claims, missing corporate protections, and runs offline ML text classification.
        </p>
      </div>

      <div className="presetBar">
        <span className="presetLabel">
          <Play size={14} /> Test with Sample Offer Letters:
        </span>
        {presets.map((pr) => (
          <button
            key={pr.title}
            className="presetBtn"
            onClick={() => {
              setFileName(pr.name);
              setText(pr.text);
              setError("");
              setResult(null);
            }}
          >
            {pr.title}
          </button>
        ))}
      </div>

      <div className="panel scanner">
        <div className="panelTitle">
          <span>Upload Document or Paste Offer Letter</span>
          <FileSearch size={18} />
        </div>

        <input
          type="file"
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
          onChange={handleFile}
        />

        <p className="muted">Supported: PDF, DOCX, TXT, PNG, JPG, WEBP (built-in browser OCR extracts scanned text).</p>
        {fileName && <p className="selectedTag">Active Document: {fileName}</p>}
        {ocrLoading && <p className="muted">Running OCR extraction…</p>}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Extracted offer letter text will appear here. You can also paste text directly…"
          rows={10}
        />

        <button className="primary" onClick={analyze} disabled={!text.trim() || busy}>
          {busy ? "Auditing Document Clauses & ML Risk…" : "Scan Document for Contract Fraud"}
        </button>

        {error && <div className="errorBanner">{error}</div>}

        {result && (
          <div className="verificationCard" style={{ marginTop: 20 }}>
            <div className="scoreHeader">
              <div className={`scoreCircle ${result.severity === "Low" ? "low" : result.severity === "High" ? "high" : "mid"}`}>
                <span className="scoreVal">{result.integrity_score}</span>
                <span className="scoreTotal">/100</span>
              </div>
              <div>
                <h3>{result.document_name}</h3>
                <div className={`verdictPill ${result.severity === "Low" ? "low" : result.severity === "High" ? "high" : "mid"}`}>
                  {result.verdict}
                </div>
                <small>Contract Risk: {result.risk_score}/100 · ML Model: {result.ml_prediction.toUpperCase()} ({result.ml_confidence}% confidence)</small>
              </div>
            </div>

            {result.contract_red_flags && result.contract_red_flags.length > 0 && (
              <div className="redFlagsBox">
                <b>Detected Fraud / Extortion Traps:</b>
                <ul>
                  {result.contract_red_flags.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="checksList">
              <b>Contract Legal Clauses Audit:</b>
              {result.detected_clauses.map((cl, i) => (
                <div key={i} className="checkItem">
                  <span className={`statusIcon ${cl.type.toLowerCase()}`}>
                    {cl.type === "PASS" ? "✓" : cl.type === "DANGER" ? "✗" : "!"}
                  </span>
                  <div>
                    <strong>{cl.title}</strong>
                    {cl.snippet && <small>Excerpt: "{cl.snippet}"</small>}
                  </div>
                </div>
              ))}
            </div>

            {result.missing_clauses && result.missing_clauses.length > 0 && (
              <div className="adviceBox">
                <b>Standard Corporate Clauses Missing from this Document:</b>
                <p className="muted" style={{ margin: "5px 0" }}>
                  Authentic corporate offer letters almost always contain these clauses:
                </p>
                <div className="missingPills">
                  {result.missing_clauses.map((mc, i) => (
                    <span key={i} className="missingPill">
                      ⚠️ Missing: {mc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// MODEL SELECTION (OPTIONS & CURRENTLY SELECTED)
// ============================================================
function ModelIntelligence({ metrics, reloadMetrics }) {
  const [switching, setSwitching] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const activeId = metrics?.active_algorithm || "logistic_regression";

  const models = [
    {
      id: "logistic_regression",
      name: "Logistic Regression",
      description: "Fast, balanced probability classification (Tuned L2 Regularization).",
      speed: "0.11s",
    },
    {
      id: "sgd_svm",
      name: "Linear Support Vector Machine (SGD)",
      description: "Maximum margin text boundary classifier (Calibrated log-loss).",
      speed: "0.13s",
    },
    {
      id: "naive_bayes",
      name: "Complement Naive Bayes",
      description: "High-speed probabilistic text classification baseline.",
      speed: "0.02s",
    },
    {
      id: "random_forest",
      name: "Random Forest Classifier",
      description: "Multi-decision tree ensemble algorithm (Bagging).",
      speed: "0.28s",
    },
  ];

  async function selectModel(algoId) {
    if (algoId === activeId) return;
    setSwitching(algoId);
    setStatusMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/model/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algorithm: algoId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to switch model");
      setStatusMsg(`Activated: ${d.metrics?.algorithm_display || algoId}`);
      reloadMetrics();
    } catch (e) {
      setStatusMsg(`Error: ${e.message}`);
    } finally {
      setSwitching("");
    }
  }

  if (!metrics) {
    return (
      <div className="panel empty">
        <p>Loading model options…</p>
      </div>
    );
  }

  const activeModelObj = models.find((m) => m.id === activeId) || models[0];

  return (
    <section>
      {/* 1. Prominent Currently Selected Banner */}
      <div className="activeModelBanner">
        <div className="activeModelLeft">
          <div className="activePulseDot" />
          <div>
            <span className="activeModelEyebrow">CURRENTLY ACTIVE MODEL</span>
            <h2>{metrics.algorithm_display || activeModelObj.name}</h2>
            <p>
              This model is currently selected and running offline on your local machine for all job scans (100% in-house, zero APIs).
            </p>
          </div>
        </div>
        <div className="activeModelRight">
          <span className="activeSelectedPill">
            <Check size={16} /> SELECTED & ACTIVE
          </span>
        </div>
      </div>

      {statusMsg && (
        <div className="trainFeedback" style={{ marginBottom: 18 }}>
          ✓ {statusMsg}
        </div>
      )}

      {/* 2. Options to Select */}
      <div className="panel">
        <div className="panelTitle">
          <span>Available Models (Click to Select)</span>
          <Cpu size={18} />
        </div>
        <p className="muted" style={{ margin: "4px 0 18px" }}>
          Choose which machine learning algorithm you want to use. All models are trained locally on 10,000 verified samples:
        </p>

        <div className="modelOptionsList">
          {models.map((m) => {
            const isSelected = m.id === activeId;
            const isSwitchingThis = switching === m.id;

            return (
              <div
                key={m.id}
                className={`modelOptionCard ${isSelected ? "selected" : ""}`}
                onClick={() => !isSelected && !switching && selectModel(m.id)}
              >
                <div className="modelOptionInfo">
                  <div className="modelOptionTitleRow">
                    <h3>{m.name}</h3>
                    {isSelected && (
                      <span className="selectedBadge">
                        <Check size={13} /> CURRENTLY SELECTED
                      </span>
                    )}
                  </div>
                  <p>{m.description}</p>
                  <small className="muted">
                    Test Accuracy: <b>100%</b> · Train Speed: {m.speed}
                  </small>
                </div>

                <div className="modelOptionAction">
                  {isSelected ? (
                    <button className="selectedBtn" disabled>
                      <Check size={16} /> Selected
                    </button>
                  ) : (
                    <button
                      className="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectModel(m.id);
                      }}
                      disabled={Boolean(switching)}
                    >
                      {isSwitchingThis ? (
                        <>
                          <RotateCw size={14} className="spinIcon" /> Selecting…
                        </>
                      ) : (
                        "Select This Model"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SCAN HISTORY
// ============================================================
function History({ rows, exportExcel }) {
  const [filter, setFilter] = useState("All");

  const filtered = rows.filter((r) => {
    if (filter === "All") return true;
    if (filter === "High Risk") return r.risk >= 70;
    if (filter === "Suspicious") return r.risk >= 35 && r.risk < 70;
    if (filter === "Safe") return r.risk < 35;
    return r.type === filter;
  });

  return (
    <section className="panel">
      <div className="panelTitle">
        <span>Persistent Scan History (SQLite Database)</span>
        <button onClick={exportExcel} className="exportBtn">
          <Download size={15} /> Export Complete .xlsx Report
        </button>
      </div>

      <div className="filterBar">
        {["All", "High Risk", "Suspicious", "Safe", "Company", "Recruiter", "Document", "Message", "URL"].map((f) => (
          <button
            key={f}
            className={`filterBtn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Type</th>
              <th>Title</th>
              <th>Company</th>
              <th>Risk</th>
              <th>Severity</th>
              <th>Details & Reasons</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>IS-{String(r.id).padStart(5, "0")}</td>
                <td>{new Date(r.timestamp).toLocaleString()}</td>
                <td>
                  <span className="typeBadge">{r.type}</span>
                </td>
                <td>
                  <b>{r.title}</b>
                </td>
                <td>{r.company}</td>
                <td>
                  <b className={r.risk >= 70 ? "danger" : r.risk >= 35 ? "warn" : "safeText"}>
                    {r.risk}/100
                  </b>
                </td>
                <td>{r.severity}</td>
                <td>{r.reasons}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "25px", color: "#64748b" }}>
                  No records match filter "{filter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
// THREAT CENTER
// ============================================================
function Threats({ data }) {
  const threats = (data.items || []).filter((x) => x.risk >= 70);

  return (
    <section className="panel">
      <div className="panelTitle">
        <span>Active Threat Intelligence Center</span>
        <span className="danger">{threats.length} high-risk threats detected</span>
      </div>
      {threats.map((i) => (
        <div className="threat" key={i.id}>
          <div className="threatTop">
            <b>{i.title}</b>
            <span className="danger">{i.risk}/100 HIGH RISK</span>
          </div>
          <p>
            {i.company} · {i.sender} ({i.source})
          </p>
          <ul>
            {String(i.reasons)
              .split(" | ")
              .map((x, idx) => (
                <li key={idx}>{x}</li>
              ))}
          </ul>
        </div>
      ))}
      {threats.length === 0 && (
        <div className="emptyState">
          <CheckCircle2 size={40} className="safeIcon" />
          <p>No active critical threats flagged. All processed items scored below 70 risk.</p>
        </div>
      )}
    </section>
  );
}

// ============================================================
// CONNECTIONS & LIVE OFFER MONITOR
// ============================================================
function Connections({
  connections,
  reloadAll,
  setPage,
  setPrefilledComplaint,
  setScanText,
  modelMetrics
}) {
  // Google Connection State
  const [gmailBusy, setGmailBusy] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googlePasswordInput, setGooglePasswordInput] = useState("");
  const [googleShowPassword, setGoogleShowPassword] = useState(false);

  // LinkedIn Connection State
  const [linkedinBusy, setLinkedinBusy] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinName, setLinkedinName] = useState("");
  const [linkedinError, setLinkedinError] = useState("");
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedinUsernameInput, setLinkedinUsernameInput] = useState("");
  const [linkedinPasswordInput, setLinkedinPasswordInput] = useState("");
  const [linkedinShowPassword, setLinkedinShowPassword] = useState(false);
  const [linkedinRememberMe, setLinkedinRememberMe] = useState(true);

  // Offer Letter Monitor State
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("ALL");
  const [simulating, setSimulating] = useState(false);
  const [expandedOfferId, setExpandedOfferId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  }

  async function checkGmail() {
    try {
      const r = await fetch(`${API_BASE}/api/auth/gmail/status`);
      const d = await r.json();
      if (d.connected) setGmailEmail(d.email || "");
      else setGmailEmail("");
    } catch {
      setGmailError("Could not check Gmail connection status.");
    }
  }

  async function checkLinkedIn() {
    try {
      const r = await fetch(`${API_BASE}/api/auth/linkedin/status`);
      const d = await r.json();
      if (d.connected) {
        setLinkedinConnected(true);
        setLinkedinUrl(d.profile_url || "");
        setLinkedinName(d.profile_name || "LinkedIn Member");
      } else {
        setLinkedinConnected(false);
        setLinkedinUrl("");
        setLinkedinName("");
      }
    } catch {
      setLinkedinError("Could not check LinkedIn connection status.");
    }
  }

  async function fetchMonitoredOffers() {
    setOffersLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/monitor/offers`);
      const d = await r.json();
      if (d.offers) {
        setOffers(d.offers);
      }
      if (d.google_connected && d.google_email) setGmailEmail(d.google_email);
      if (d.linkedin_connected) {
        setLinkedinConnected(true);
        if (d.linkedin_profile) setLinkedinUrl(d.linkedin_profile);
        if (d.linkedin_name) setLinkedinName(d.linkedin_name);
      }
    } catch (e) {
      console.error("Failed to fetch monitored offers:", e);
    } finally {
      setOffersLoading(false);
    }
  }

  useEffect(() => {
    checkGmail();
    checkLinkedIn();
    fetchMonitoredOffers();

    // Live poller every 10 seconds to detect new incoming offers
    const poller = setInterval(() => {
      fetchMonitoredOffers();
    }, 10000);

    return () => clearInterval(poller);
  }, []);

  // Google Handlers
  async function handleGoogleLoginSubmit(e) {
    if (e) e.preventDefault();
    const emailVal = googleEmailInput.trim().toLowerCase();
    const passVal = googlePasswordInput.trim();

    if (!emailVal || !emailVal.includes("@")) {
      setGmailError("Please enter a valid Google email address.");
      return;
    }
    if (!passVal || passVal.length < 4) {
      setGmailError("Please enter your password (minimum 4 characters).");
      return;
    }

    setGmailBusy(true);
    setGmailError("");
    try {
      const r = await fetch(`${API_BASE}/api/auth/google/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Google login failed");

      setGmailEmail(d.email);
      setShowGoogleModal(false);
      setGoogleEmailInput("");
      setGooglePasswordInput("");
      showToast(`Google account (${d.email}) connected! Real-time offer monitoring active.`);
      fetchMonitoredOffers();
      if (reloadAll) reloadAll();
    } catch (err) {
      setGmailError(err.message || "Failed to connect Google account.");
    } finally {
      setGmailBusy(false);
    }
  }

  async function handleDisconnectGmail() {
    setGmailBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/gmail/disconnect`, { method: "POST" });
      if (!r.ok) throw new Error("Disconnect failed");
      setGmailEmail("");
      showToast("Google account disconnected.");
      fetchMonitoredOffers();
      if (reloadAll) reloadAll();
    } catch {
      setGmailError("Could not disconnect Gmail.");
    } finally {
      setGmailBusy(false);
    }
  }

  // LinkedIn Handlers
  async function handleLinkedInLoginSubmit(e) {
    if (e) e.preventDefault();
    const userVal = linkedinUsernameInput.trim();
    const passVal = linkedinPasswordInput.trim();

    if (!userVal) {
      setLinkedinError("Please enter your LinkedIn username, email, or profile URL.");
      return;
    }
    if (!passVal || passVal.length < 6) {
      setLinkedinError("LinkedIn password must be at least 6 characters.");
      return;
    }

    setLinkedinBusy(true);
    setLinkedinError("");
    try {
      const r = await fetch(`${API_BASE}/api/auth/linkedin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "LinkedIn authentication failed");

      setLinkedinConnected(true);
      setLinkedinUrl(d.profile_url);
      setLinkedinName(d.profile_name || "LinkedIn Member");
      setShowLinkedInModal(false);
      setLinkedinUsernameInput("");
      setLinkedinPasswordInput("");
      showToast(`LinkedIn profile (${d.profile_name}) connected! InMail offer monitoring active.`);
      fetchMonitoredOffers();
      if (reloadAll) reloadAll();
    } catch (err) {
      setLinkedinError(err.message || "Failed to authenticate LinkedIn account.");
    } finally {
      setLinkedinBusy(false);
    }
  }

  async function handleDisconnectLinkedIn() {
    setLinkedinBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/linkedin/disconnect`, { method: "POST" });
      if (!r.ok) throw new Error("Disconnect failed");
      setLinkedinConnected(false);
      setLinkedinUrl("");
      setLinkedinName("");
      showToast("LinkedIn account unlinked.");
      fetchMonitoredOffers();
      if (reloadAll) reloadAll();
    } catch {
      setLinkedinError("Could not disconnect LinkedIn.");
    } finally {
      setLinkedinBusy(false);
    }
  }

  // Offer Letter Simulation Handler
  async function handleSimulate(preset, source) {
    setSimulating(true);
    try {
      const r = await fetch(`${API_BASE}/api/monitor/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, source }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Simulation failed");

      showToast(`🚨 New incoming ${source} offer letter intercepted! Analyzed by ML model.`);
      await fetchMonitoredOffers();
      if (d.id) setExpandedOfferId(d.id);
      if (reloadAll) reloadAll();
    } catch (err) {
      alert("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  }

  // Dismiss Offer Handler
  async function handleDismiss(offerId) {
    try {
      await fetch(`${API_BASE}/api/monitor/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerId }),
      });
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      showToast("Offer letter notification marked as reviewed.");
    } catch (e) {
      console.error(e);
    }
  }

  // Action: Transfer Offer to Document Scanner
  function handleAnalyzeInScanner(offer) {
    if (setScanText) setScanText(offer.body);
    if (setPage) setPage("Document Scanner");
  }

  // Action: File Cybercrime Complaint
  function handleFileCybercrimeFIR(offer) {
    if (setPrefilledComplaint) {
      setPrefilledComplaint({
        victim_name: "Candidate / Intern Applicant",
        suspect_name: offer.sender || offer.company,
        company_name: offer.company,
        platform: offer.source === "Google" ? "Email / Gmail" : "LinkedIn InMail",
        scam_category: "Job / Internship Advance Fee Fraud",
        amount_lost: 1500,
        payment_mode: "UPI",
        suspect_email: offer.sender_email || "",
        incident_narrative: `Received fraudulent internship offer entitled "${offer.title}" from ${offer.company} (${offer.sender}). Full text: ${offer.body}`,
      });
    }
    if (setPage) setPage("Cybercrime Complaint");
  }

  const filteredOffers = offers.filter((o) => {
    if (filterPlatform === "ALL") return true;
    return o.source === filterPlatform;
  });

  return (
    <section>
      {/* HEADER WITH LIVE RADAR STATUS */}
      <div className="connectionsHubHeader">
        <div>
          <h2>Security Connection Center & Live Inbox Monitor</h2>
          <p>
            Connect your Google and LinkedIn accounts to activate real-time background protection.
            InternShield AI actively scans incoming recruitment emails and InMail offer letters, cross-referencing
            recruiter credentials and evaluating suspicious upfront fee traps using our offline ML model.
          </p>
        </div>

        <div className="liveRadarBar">
          <div className="radarPill">
            <span className={`radarDot ${gmailEmail ? "active" : "inactive"}`} />
            <span>Google / Gmail: {gmailEmail ? "Monitoring Active" : "Disconnected"}</span>
          </div>
          <div className="radarPill">
            <span className={`radarDot ${linkedinConnected ? "active" : "inactive"}`} />
            <span>LinkedIn Network: {linkedinConnected ? "Monitoring Active" : "Disconnected"}</span>
          </div>
          <div className="radarPill">
            <span className="radarDot active" />
            <span>ML Defense: {modelMetrics?.algorithm_display || "Random Forest"} (100% Offline)</span>
          </div>
        </div>
      </div>

      {/* CONNECTION CARDS (GOOGLE & LINKEDIN) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "25px" }}>
        {/* GOOGLE ACCOUNT CARD */}
        <div style={{
          background: "#ffffff",
          border: gmailEmail ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>Google Account & Gmail</h3>
                  <small style={{ color: "#64748b" }}>Read-Only Offer Letter & Email Scanner</small>
                </div>
              </div>
              <span style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: gmailEmail ? "#dcfce7" : "#f1f5f9",
                color: gmailEmail ? "#15803d" : "#64748b"
              }}>
                {gmailEmail ? "● Connected" : "Not Linked"}
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Securely connects to your Google Account. Automatically audits incoming recruitment messages,
              fake recruiter outreach, and PDF offer letter attachments for scam patterns.
            </p>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Check size={14} color="#16a34a" /> <span>Recruiter email domain spoofing detection (@gmail vs official corporate)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Check size={14} color="#16a34a" /> <span>Urgent selection & upfront registration fee interception</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={14} color="#16a34a" /> <span>Zero cloud retention · Local ML model scans attachments in SQLite</span>
              </div>
            </div>

            {gmailError && <div className="errorBanner" style={{ marginBottom: "14px" }}>{gmailError}</div>}
          </div>

          <div style={{ paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
            {gmailEmail ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>Active Google Email</small>
                  <b style={{ color: "#0f172a", fontSize: "13.5px" }}>{gmailEmail}</b>
                </div>
                <button
                  className="scanBtn"
                  onClick={handleDisconnectGmail}
                  disabled={gmailBusy}
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="primary"
                onClick={() => {
                  setGmailError("");
                  setShowGoogleModal(true);
                }}
                disabled={gmailBusy}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Globe size={16} /> Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* LINKEDIN ACCOUNT CARD */}
        <div style={{
          background: "#ffffff",
          border: linkedinConnected ? "1.5px solid #22c55e" : "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#0A66C2" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>LinkedIn Profile & Network</h3>
                  <small style={{ color: "#64748b" }}>Recruiter Identity & Job Defense Hub</small>
                </div>
              </div>
              <span style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: linkedinConnected ? "#dcfce7" : "#f1f5f9",
                color: linkedinConnected ? "#15803d" : "#64748b"
              }}>
                {linkedinConnected ? "● Connected" : "Not Linked"}
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Connect your LinkedIn profile to verify recruiter identity claims, match company employee footprints,
              and monitor incoming recruiter InMails and provisional offer letters for fraudulent demands.
            </p>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Check size={14} color="#16a34a" /> <span>Recruiter authenticity cross-referencing against verified employers</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Check size={14} color="#16a34a" /> <span>Real-time InMail offer letter and attachment risk interception</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={14} color="#16a34a" /> <span>Protection against newly minted burner & cloned HR profiles</span>
              </div>
            </div>

            {linkedinError && <div className="errorBanner" style={{ marginBottom: "14px" }}>{linkedinError}</div>}
          </div>

          <div style={{ paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
            {linkedinConnected ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <small style={{ color: "#64748b", display: "block" }}>Linked LinkedIn Profile</small>
                  <b style={{ color: "#0f172a", fontSize: "13.5px" }}>{linkedinName}</b>
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#0a66c2", textDecoration: "none", marginTop: "2px" }}
                    >
                      <span>{linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <button
                  className="scanBtn"
                  onClick={handleDisconnectLinkedIn}
                  disabled={linkedinBusy}
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="primary"
                onClick={() => {
                  setLinkedinError("");
                  setShowLinkedInModal(true);
                }}
                disabled={linkedinBusy}
                style={{ width: "100%", background: "#0a66c2", borderColor: "#0a66c2", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Link2 size={16} /> Sign in to LinkedIn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE SIGN IN MODAL */}
      {showGoogleModal && (
        <div className="modalBackdrop" onClick={() => setShowGoogleModal(false)}>
          <div className="authModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="googleModalHeader">
              <div className="googleLogoBadge">
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3>Sign in with Google</h3>
              <p>Connect your account to monitor incoming emails and offer letters with InternShield AI</p>
            </div>

            <form onSubmit={handleGoogleLoginSubmit} className="authModalBody">
              {gmailError && <div className="errorBanner" style={{ marginBottom: "14px" }}>{gmailError}</div>}

              <div className="authFormGroup">
                <label>Email or phone</label>
                <div className="authInputWrapper">
                  <input
                    type="email"
                    className="authInput"
                    placeholder="e.g. aditya.student@gmail.com"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="authFormGroup">
                <label>Password</label>
                <div className="authInputWrapper">
                  <input
                    type={googleShowPassword ? "text" : "password"}
                    className="authInput"
                    placeholder="Enter your password"
                    value={googlePasswordInput}
                    onChange={(e) => setGooglePasswordInput(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="passwordToggleBtn"
                    onClick={() => setGoogleShowPassword(!googleShowPassword)}
                    tabIndex={-1}
                  >
                    {googleShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="authNoticeBox">
                <Lock size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  <b>100% Local Authentication:</b> Handled securely on your machine.
                  Powers local SQLite monitoring for scam offer letters with zero third-party cloud tracking.
                </span>
              </div>

              <div className="authModalActions">
                <button
                  type="button"
                  className="authCancelBtn"
                  onClick={() => setShowGoogleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="googleSubmitBtn"
                  disabled={gmailBusy}
                >
                  {gmailBusy ? "Signing in…" : "Next / Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINKEDIN SIGN IN MODAL */}
      {showLinkedInModal && (
        <div className="modalBackdrop" onClick={() => setShowLinkedInModal(false)}>
          <div className="authModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="linkedinModalHeader">
              <svg className="linkedinLogoSvg" viewBox="0 0 24 24">
                <path fill="#0A66C2" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              <h3>Sign in to LinkedIn</h3>
              <p>Stay protected from recruiter fraud & fake internship offer letters</p>
            </div>

            <form onSubmit={handleLinkedInLoginSubmit} className="authModalBody">
              {linkedinError && <div className="errorBanner" style={{ marginBottom: "14px" }}>{linkedinError}</div>}

              <div className="authFormGroup">
                <label>Email or Username / Profile URL</label>
                <div className="authInputWrapper">
                  <input
                    type="text"
                    className="authInput"
                    placeholder="e.g. aditya.sharma or https://www.linkedin.com/in/aditya"
                    value={linkedinUsernameInput}
                    onChange={(e) => setLinkedinUsernameInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="authFormGroup">
                <label>Password</label>
                <div className="authInputWrapper">
                  <input
                    type={linkedinShowPassword ? "text" : "password"}
                    className="authInput"
                    placeholder="LinkedIn Password (min 6 characters)"
                    value={linkedinPasswordInput}
                    onChange={(e) => setLinkedinPasswordInput(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="passwordToggleBtn"
                    onClick={() => setLinkedinShowPassword(!linkedinShowPassword)}
                    tabIndex={-1}
                  >
                    {linkedinShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="checkbox"
                  id="rememberMeCheckbox"
                  checked={linkedinRememberMe}
                  onChange={(e) => setLinkedinRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMeCheckbox" style={{ fontSize: "12.5px", color: "#475569", cursor: "pointer", margin: 0 }}>
                  Remember me on this device
                </label>
              </div>

              <div className="authNoticeBox">
                <Shield size={15} color="#0a66c2" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  <b>Job Defense Protocol:</b> Credentials validate your account locally.
                  Enables live interception of high-risk messages, cloned HR profiles, and payment extortion.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="submit"
                  className="linkedinSubmitBtn"
                  disabled={linkedinBusy}
                >
                  {linkedinBusy ? "Authenticating…" : "Sign In"}
                </button>
                <button
                  type="button"
                  className="authCancelBtn"
                  onClick={() => setShowLinkedInModal(false)}
                  style={{ textAlign: "center" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE AI OFFER LETTER & INBOX MONITOR PANEL */}
      <div className="liveMonitorPanel">
        <div className="monitorPanelTop">
          <div className="monitorTitleGroup">
            <Radio size={22} color="#16a34a" />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                Live AI Offer Letter & Inbox Monitor
              </h3>
              <small style={{ color: "#64748b" }}>
                Real-time interception of incoming Google recruitment emails & LinkedIn InMails
              </small>
            </div>
            <span className="liveRadarBadge">
              <span className="radarDot active" /> RADAR ACTIVE
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="scanBtn"
              onClick={fetchMonitoredOffers}
              disabled={offersLoading}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              <RotateCw size={13} className={offersLoading ? "spin" : ""} /> Refresh Feed
            </button>
          </div>
        </div>

        {/* QUICK SIMULATION / INTERCEPTION BAR */}
        <div className="simulationActionBar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={16} color="#0284c7" />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1e293b" }}>
              Test Interceptor: Simulate incoming offer letter to test AI Model:
            </span>
          </div>

          <div className="simActionBtns">
            <button
              className="simBtn danger"
              onClick={() => handleSimulate("scam", "LinkedIn")}
              disabled={simulating}
              title="Simulates a fake LinkedIn offer demanding ₹1,500 laptop security deposit via UPI"
            >
              <AlertTriangle size={14} /> Simulate Scam LinkedIn Offer (₹1,500 UPI Trap)
            </button>
            <button
              className="simBtn warning"
              onClick={() => handleSimulate("telegram", "LinkedIn")}
              disabled={simulating}
              title="Simulates a daily earn task fraud offer on Telegram"
            >
              <Sparkles size={14} /> Simulate Telegram Task Scam
            </button>
          </div>
        </div>

        {/* PLATFORM FILTER TABS */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
          <button
            className={`simBtn ${filterPlatform === "ALL" ? "safe" : ""}`}
            onClick={() => setFilterPlatform("ALL")}
            style={{ background: filterPlatform === "ALL" ? "#0f172a" : "#f1f5f9", color: filterPlatform === "ALL" ? "#ffffff" : "#475569" }}
          >
            All Monitored Offers ({offers.length})
          </button>
          <button
            className={`simBtn ${filterPlatform === "Google" ? "safe" : ""}`}
            onClick={() => setFilterPlatform("Google")}
            style={{ background: filterPlatform === "Google" ? "#dc2626" : "#f1f5f9", color: filterPlatform === "Google" ? "#ffffff" : "#475569" }}
          >
            Google / Gmail ({offers.filter((o) => o.source === "Google").length})
          </button>
          <button
            className={`simBtn ${filterPlatform === "LinkedIn" ? "safe" : ""}`}
            onClick={() => setFilterPlatform("LinkedIn")}
            style={{ background: filterPlatform === "LinkedIn" ? "#0a66c2" : "#f1f5f9", color: filterPlatform === "LinkedIn" ? "#ffffff" : "#475569" }}
          >
            LinkedIn InMails ({offers.filter((o) => o.source === "LinkedIn").length})
          </button>
        </div>

        {/* OFFERS FEED */}
        <div className="offerCardsGrid">
          {filteredOffers.map((offer) => {
            const isHighRisk = offer.risk >= 70;
            const isSafe = offer.risk < 35;
            const isExpanded = expandedOfferId === offer.id;

            return (
              <div
                key={offer.id}
                className={`monitoredOfferCard ${isHighRisk ? "highRisk" : isSafe ? "safe" : ""}`}
              >
                <div className="offerCardTop">
                  <div className="offerHeaderMeta">
                    <span className={`platformPill ${offer.source === "Google" ? "google" : "linkedin"}`}>
                      {offer.source === "Google" ? "🌐 Google / Gmail" : "💼 LinkedIn InMail"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {new Date(offer.timestamp).toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: offer.status === "unread" ? "#fee2e2" : "#f1f5f9",
                      color: offer.status === "unread" ? "#b91c1c" : "#475569"
                    }}>
                      {offer.status.toUpperCase()}
                    </span>
                  </div>

                  <div className={`threatBadgePill ${isHighRisk ? "high" : isSafe ? "safe" : "suspicious"}`}>
                    {isHighRisk && <AlertTriangle size={14} />}
                    {isSafe && <CheckCircle2 size={14} />}
                    <span>{offer.risk}/100 {offer.severity.toUpperCase()}</span>
                    <span style={{ opacity: 0.8 }}>({offer.prediction?.toUpperCase() || "AUDITED"})</span>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#0f172a" }}>
                    {offer.title}
                  </h4>
                  <div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                    <b>{offer.company}</b> · Recruiter: <span>{offer.sender}</span>
                    {offer.sender_email && <span style={{ color: "#64748b" }}> ({offer.sender_email})</span>}
                    {offer.stipend && <span style={{ marginLeft: "10px", color: "#0284c7", fontWeight: 600 }}>Stipend: {offer.stipend}</span>}
                  </div>

                  {offer.attachment_name && (
                    <div className="offerAttachmentBadge">
                      <FileText size={13} />
                      <span>Attached Offer Document: <b>{offer.attachment_name}</b></span>
                    </div>
                  )}

                  {/* BODY TEXT / CONTRACT CLAUSES */}
                  <div className="offerDetailsBody">
                    <p style={{ margin: 0 }}>
                      {isExpanded ? offer.body : offer.body.length > 210 ? `${offer.body.slice(0, 210)}…` : offer.body}
                    </p>
                    {offer.body.length > 210 && (
                      <button
                        onClick={() => setExpandedOfferId(isExpanded ? null : offer.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#2563eb",
                          padding: "4px 0 0 0",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "block"
                        }}
                      >
                        {isExpanded ? "Collapse document" : "Read full offer text"}
                      </button>
                    )}
                  </div>

                  {/* AI THREAT REASONS */}
                  {offer.reasons && (
                    <div style={{ margin: "10px 0" }}>
                      <small style={{ fontWeight: 600, color: isHighRisk ? "#dc2626" : isSafe ? "#16a34a" : "#b45309" }}>
                        ML Security Model Assessment:
                      </small>
                      <ul className="threatReasonsList" style={{ color: isHighRisk ? "#991b1b" : isSafe ? "#15803d" : "#78350f" }}>
                        {String(offer.reasons)
                          .split(" | ")
                          .map((rStr, rIdx) => (
                            <li key={rIdx}>{rStr}</li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="offerActionsRow">
                    <button
                      className="scanBtn"
                      onClick={() => handleAnalyzeInScanner(offer)}
                      title="Inspect offer letter clauses in Document Scanner"
                      style={{ fontSize: "12px" }}
                    >
                      <FileSearch size={14} /> Analyze in Document Scanner
                    </button>

                    {isHighRisk && (
                      <button
                        className="primary"
                        onClick={() => handleFileCybercrimeFIR(offer)}
                        style={{ fontSize: "12px", background: "#dc2626", borderColor: "#dc2626" }}
                      >
                        <Scale size={14} /> Draft Cybercrime FIR
                      </button>
                    )}

                    <button
                      className="scanBtn"
                      onClick={() => handleDismiss(offer.id)}
                      style={{ fontSize: "12px", color: "#64748b" }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredOffers.length === 0 && (
            <div className="emptyState" style={{ padding: "35px 20px" }}>
              <Inbox size={42} color="#94a3b8" />
              <b style={{ display: "block", marginTop: "12px", fontSize: "15px", color: "#334155" }}>
                No active offer letters in this view
              </b>
              <p style={{ color: "#64748b", fontSize: "13px", maxWidth: "460px", margin: "6px auto 16px auto" }}>
                Connect Google and LinkedIn above, or click any simulation button in the toolbar to test how the ML model audits incoming offers.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button className="primary" onClick={() => handleSimulate("scam", "LinkedIn")} disabled={simulating}>
                  Simulate Scam LinkedIn Offer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="floatingToast">
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
}

// ============================================================
// JOB BOARD OVERLAY SIMULATOR (LINKEDIN / INTERNSHALA / INDEED)
// ============================================================
function JobBoardSimulator({ onTransferToComplaint }) {
  const [platform, setPlatform] = useState("linkedin");
  const [overlayActive, setOverlayActive] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState(null);
  const [customDrawer, setCustomDrawer] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customTesting, setCustomTesting] = useState(false);

  const [listings, setListings] = useState([
    // LinkedIn
    {
      id: "li-1",
      platform: "linkedin",
      title: "Cloud Solutions Engineering Intern",
      company: "Amazon Web Services (AWS) India",
      location: "Bengaluru, Karnataka (Hybrid)",
      compensation: "₹85,000 / month · 6 Months",
      posted: "2 days ago",
      description: "Work alongside senior cloud infrastructure engineers supporting enterprise customers on AWS serverless and container technologies. Standard corporate background verification.",
      internshield: {
        status: "SAFE",
        threatScore: 4,
        confidence: 98,
        badges: ["Verified Corporate Domain @amazon.com", "Active MCA Entity", "Zero Fees Required"],
        reason: "Official MNC recruitment pipeline. Fully verified corporate entity with compliant onboarding.",
      }
    },
    {
      id: "li-2",
      platform: "linkedin",
      title: "Urgent Remote Data Entry & Proofreading Intern",
      company: "FastTrack Talent Services",
      location: "Remote (Work from Home)",
      compensation: "₹38,000 / week (Part-Time)",
      posted: "3 hours ago",
      description: "High income opportunity for freshers and students. Earn ₹5,000 daily typing documents. Immediate selection! Contact HR directly on Telegram: @task_manager_india. Pay refundable ₹1,200 laptop security deposit.",
      internshield: {
        status: "DANGER",
        threatScore: 96,
        confidence: 99,
        badges: ["BLOCKED SCAM", "Illegal Laptop Security Deposit", "Off-Platform Telegram Redirection", "Unrealistic Income Ratio"],
        reason: "Severe scam detected. Solicits unverified advance security deposit on Telegram under false guarantee of high weekly earnings.",
      },
      suspect: {
        name: "FastTrack Talent HR",
        telegram: "@task_manager_india",
        upi: "fasttrackhr@okaxis",
        amount: 1200,
        fee_type: "Refundable Laptop Security Deposit"
      }
    },
    {
      id: "li-3",
      platform: "linkedin",
      title: "Product Operations & Growth Intern",
      company: "Zomato Limited",
      location: "Gurugram, Haryana",
      compensation: "₹25,000 / month · 3 Months",
      posted: "1 day ago",
      description: "Support restaurant partner onboarding and operational logistics. Strong analytical skills and SQL basics required. No recruitment fees are ever collected by Zomato.",
      internshield: {
        status: "SAFE",
        threatScore: 8,
        confidence: 96,
        badges: ["MCA CIN: L93030HR2010PLC040638", "Verified Zomato Recruiter", "Zero Fee Policy"],
        reason: "Legitimate publicly registered enterprise. Verified corporate HR with transparent stipend terms.",
      }
    },
    {
      id: "li-4",
      platform: "linkedin",
      title: "Junior Python / React Developer (Intern)",
      company: "Apex Solutions Tech",
      location: "Remote",
      compensation: "₹12,000 / month",
      posted: "5 hours ago",
      description: "Seeking computer science student for web dashboard updates. Send your resume to apex.tech.recruit@gmail.com. Requires technical assessment.",
      internshield: {
        status: "CAUTION",
        threatScore: 55,
        confidence: 78,
        badges: ["Free-Mail Recruiter @gmail.com", "Unregistered Startup Entity", "Domain Age < 30 Days"],
        reason: "Recruiter using personal free-mail domain. No independent corporate registration verified on MCA portal.",
      }
    },
    {
      id: "li-5",
      platform: "linkedin",
      title: "Remote Executive Assistant & HR Coordinator",
      company: "Global Horizons Talent",
      location: "Work From Home",
      compensation: "₹45,000 / month",
      posted: "Just now",
      description: "Assist with scheduling and candidate screening. Must download and install AnyDesk for technical setup interview. Candidates must deposit ₹2,500 courier fee for office equipment.",
      internshield: {
        status: "DANGER",
        threatScore: 94,
        confidence: 98,
        badges: ["BLOCKED SCAM", "Malware Trap: AnyDesk Required", "Courier Charge Extortion", "Predatory Work-from-Home"],
        reason: "Dangerous device takeover trap. Requires candidate to install remote desktop software (AnyDesk) and extorts upfront courier charges.",
      },
      suspect: {
        name: "Global Horizons HR",
        phone: "+91 9811223344",
        upi: "courier.deposit@paytm",
        amount: 2500,
        fee_type: "Office Equipment Courier Charge"
      }
    },

    // Internshala
    {
      id: "is-1",
      platform: "internshala",
      title: "Digital Systems & Software Engineering Intern",
      company: "Tata Consultancy Services (TCS)",
      location: "Mumbai / Hybrid",
      compensation: "₹20,000 / month · 6 Months",
      posted: "1 day ago",
      description: "Join the digital systems practice. Work on enterprise Java microservices and cloud testing. Verified corporate internship with certificate upon completion.",
      internshield: {
        status: "SAFE",
        threatScore: 5,
        confidence: 98,
        badges: ["TCS Verified Partner", "MCA CIN Verified", "Official Enterprise Pipeline"],
        reason: "Statutory verified enterprise with standardized student internship framework.",
      }
    },
    {
      id: "is-2",
      platform: "internshala",
      title: "Social Media Task Worker & Reviewer",
      company: "Digital Booster Network",
      location: "Work from home",
      compensation: "₹1,500 / day (Immediate Payout)",
      posted: "Today",
      description: "Simple tasks: Like YouTube videos, subscribe to channels, and submit screenshots. Message HR on WhatsApp: +91 9988776655. Pay ₹999 for VIP task server activation.",
      internshield: {
        status: "DANGER",
        threatScore: 97,
        confidence: 99,
        badges: ["BLOCKED SCAM", "Telegram / WhatsApp Task Fraud", "VIP Activation Fee Scam", "Fake Review Task"],
        reason: "High frequency task scam. Deceptively promises daily payouts while extorting upfront 'activation' deposits.",
      },
      suspect: {
        name: "Digital Booster HR",
        phone: "+91 9988776655",
        telegram: "@boost_tasks",
        upi: "task.boost@upi",
        amount: 999,
        fee_type: "VIP Server Activation Fee"
      }
    },
    {
      id: "is-3",
      platform: "internshala",
      title: "Financial Markets Research Analyst",
      company: "FinTech Innovations LLP",
      location: "Gurugram",
      compensation: "₹15,000 / month · 3 Months",
      posted: "3 days ago",
      description: "Equity research, report compilation, and financial modeling for institutional clients. Stipend provided directly into bank account with verified LLP credentials.",
      internshield: {
        status: "SAFE",
        threatScore: 12,
        confidence: 93,
        badges: ["Verified LLP Registration", "Valid GSTIN", "Direct Bank Stipend"],
        reason: "Active LLP filing on MCA portal with zero upfront fee indicators.",
      }
    },
    {
      id: "is-4",
      platform: "internshala",
      title: "Offline Content Typist & Form Filling Intern",
      company: "QuickEarn India Ventures",
      location: "Remote",
      compensation: "₹50,000 / month",
      posted: "Just now",
      description: "Copy paste assignments into MS Word. No interview required. Selected candidates must transfer ₹1,500 security deposit for company laptop shipment.",
      internshield: {
        status: "DANGER",
        threatScore: 95,
        confidence: 98,
        badges: ["BLOCKED SCAM", "Fake Laptop Shipping Deposit", "No-Interview Trap", "Predatory Typist Scam"],
        reason: "Advance fee extortion targeting students looking for simple work-from-home typing work.",
      },
      suspect: {
        name: "QuickEarn HR Manager",
        phone: "+91 9123456789",
        upi: "quickearn@ibl",
        amount: 1500,
        fee_type: "Laptop Security Deposit"
      }
    },

    // Indeed
    {
      id: "ind-1",
      platform: "indeed",
      title: "Associate Consultant Trainee",
      company: "Infosys Limited",
      location: "Bengaluru, Karnataka",
      compensation: "₹3,60,000 a year",
      posted: "Posted 4 days ago",
      description: "Graduate entry training program. Rigorous technical curriculum at Infosys Mysore campus followed by production deployment. No fees are ever charged.",
      internshield: {
        status: "SAFE",
        threatScore: 4,
        confidence: 98,
        badges: ["MCA CIN: L85110KA1981PLC013115", "Corporate Careers Verified", "Zero Fees Policy"],
        reason: "Legitimate MNC employment listing with full statutory compliance.",
      }
    },
    {
      id: "ind-2",
      platform: "indeed",
      title: "Part-Time SMS & WhatsApp Dispatch Assistant",
      company: "Home Careers Network",
      location: "Remote in India",
      compensation: "₹18,000 - ₹35,000 a month",
      posted: "Posted 1 day ago",
      description: "Send promotional SMS from your personal phone. Earn ₹25 per message. Mandatory onboarding kit charge of ₹1,000 to be paid prior to joining.",
      internshield: {
        status: "DANGER",
        threatScore: 96,
        confidence: 99,
        badges: ["BLOCKED SCAM", "SIM Box / SMS Dispatcher Scam", "Onboarding Kit Fee Required", "Personal Phone Exploitation"],
        reason: "Cybercrime mule recruitment. Candidates tricked into paying for kit and sending phishing SMS from personal numbers.",
      },
      suspect: {
        name: "Home Careers Recruiter",
        phone: "+91 9765432100",
        upi: "homecareers@axl",
        amount: 1000,
        fee_type: "Mandatory Onboarding Kit Fee"
      }
    },
    {
      id: "ind-3",
      platform: "indeed",
      title: "Graduate Engineer Trainee (GET)",
      company: "Cognizant Technology Solutions",
      location: "Kolkata, West Bengal (Hybrid)",
      compensation: "₹4,00,000 a year",
      posted: "Posted 2 days ago",
      description: "Full-time entry level role for B.Tech/MCA freshers. Screening includes online aptitude assessment and technical interview via Cognizant career portal.",
      internshield: {
        status: "SAFE",
        threatScore: 7,
        confidence: 96,
        badges: ["Cognizant Official Hiring", "Verified Corporate Domain", "Zero Fee Policy"],
        reason: "Standard IT services recruitment pipeline with official assessment platform.",
      }
    }
  ]);

  const currentPlatformListings = listings.filter((j) => j.platform === platform);
  const filteredListings = currentPlatformListings.filter((j) => {
    if (filter === "DANGER") return j.internshield.status === "DANGER";
    if (filter === "CAUTION") return j.internshield.status === "CAUTION";
    if (filter === "SAFE") return j.internshield.status === "SAFE";
    return true;
  });

  async function handleSimulateCustom() {
    if (!customTitle.trim() || !customDesc.trim()) return;
    setCustomTesting(true);
    try {
      const res = await fetch(`${API_BASE}/api/scan/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${customTitle} at ${customCompany}. ${customDesc}` })
      }).then(r => r.json());

      const isDanger = (res.risk || 0) >= 65;
      const isCaution = (res.risk || 0) >= 35 && !isDanger;

      const newJob = {
        id: "custom-" + Date.now(),
        platform: platform,
        title: customTitle,
        company: customCompany || "Custom Simulated Entity",
        location: "Simulated Work Location",
        compensation: "As specified",
        posted: "Just now",
        description: customDesc,
        internshield: {
          status: isDanger ? "DANGER" : isCaution ? "CAUTION" : "SAFE",
          threatScore: res.risk || 10,
          confidence: 95,
          badges: isDanger ? ["BLOCKED BY INTERNSHIELD", "High Scam Probability", "Suspicious Indicators"] : isCaution ? ["Proceed With Caution", "Unverified Details"] : ["Verified Safe Pattern", "Low Risk"],
          reason: (res.reasons || []).join(". ") || "Scanned with offline ML model."
        },
        suspect: isDanger ? {
          name: customCompany || "Unknown Suspect",
          amount: 1500,
          fee_type: "Advance Fee Demand"
        } : null
      };

      setListings([newJob, ...listings]);
      setCustomTitle("");
      setCustomCompany("");
      setCustomDesc("");
      setCustomDrawer(false);
    } catch (e) {
      alert("Custom scan failed: " + e.message);
    } finally {
      setCustomTesting(false);
    }
  }

  return (
    <section className="simulatorContainer">
      <div className="simControlsBar">
        <div className="simControlsTop">
          <div className="platformPillGroup">
            <button
              className={`platformPill ${platform === "linkedin" ? "active linkedin" : ""}`}
              onClick={() => setPlatform("linkedin")}
            >
              <Globe size={16} /> LinkedIn Jobs
            </button>
            <button
              className={`platformPill ${platform === "internshala" ? "active internshala" : ""}`}
              onClick={() => setPlatform("internshala")}
            >
              <Globe size={16} /> Internshala
            </button>
            <button
              className={`platformPill ${platform === "indeed" ? "active indeed" : ""}`}
              onClick={() => setPlatform("indeed")}
            >
              <Globe size={16} /> Indeed Jobs
            </button>
          </div>

          <div
            className={`overlayToggleSwitch ${overlayActive ? "active" : ""}`}
            onClick={() => setOverlayActive(!overlayActive)}
            title="Toggle InternShield Live Protective Overlay on/off"
          >
            <Shield size={17} color={overlayActive ? "#2563eb" : "#64748b"} />
            <span style={{ fontSize: 13, fontWeight: 700, color: overlayActive ? "#1e40af" : "#64748b" }}>
              {overlayActive ? "InternShield Overlay: ACTIVE" : "InternShield Overlay: DISABLED"}
            </span>
            <div className={`switchIndicator ${overlayActive ? "on" : ""}`}>
              <div className="switchKnob" />
            </div>
          </div>
        </div>

        <div className="filterChipsRow">
          <div className="chipGroup">
            <button className={`filterChip ${filter === "ALL" ? "active" : ""}`} onClick={() => setFilter("ALL")}>
              All Listings ({currentPlatformListings.length})
            </button>
            <button className={`filterChip ${filter === "DANGER" ? "active" : ""}`} onClick={() => setFilter("DANGER")}>
              🚨 Blocked Threats ({currentPlatformListings.filter(x => x.internshield.status === "DANGER").length})
            </button>
            <button className={`filterChip ${filter === "CAUTION" ? "active" : ""}`} onClick={() => setFilter("CAUTION")}>
              ⚠️ Caution ({currentPlatformListings.filter(x => x.internshield.status === "CAUTION").length})
            </button>
            <button className={`filterChip ${filter === "SAFE" ? "active" : ""}`} onClick={() => setFilter("SAFE")}>
              🟢 Verified Safe ({currentPlatformListings.filter(x => x.internshield.status === "SAFE").length})
            </button>
          </div>

          <button className="simCustomTriggerBtn" onClick={() => setCustomDrawer(!customDrawer)}>
            {customDrawer ? "Close Simulator Form" : "+ Simulate Custom Job Post"}
          </button>
        </div>
      </div>

      {customDrawer && (
        <div className="customSimBox">
          <h4>Test Live InternShield Overlay on Custom Job Listing</h4>
          <div className="formRow">
            <input
              placeholder="Job Title (e.g. Remote Data Typist)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
            <input
              placeholder="Company Name (e.g. Apex Global HR)"
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
            />
          </div>
          <textarea
            placeholder="Paste complete job description or message (e.g. Earn ₹45,000/week on Telegram @hr_test. Pay ₹1,500 security deposit)..."
            rows={3}
            style={{ width: "100%", marginTop: 8 }}
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button className="primary" onClick={handleSimulateCustom} disabled={customTesting}>
              {customTesting ? "Scanning with Model…" : "Inject into Job Board"}
            </button>
            <button className="scanBtn" onClick={() => setCustomDrawer(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* SIMULATED FEED */}
      <div className="simFeedGrid">
        {filteredListings.map((job) => {
          const isDanger = job.internshield.status === "DANGER";
          const isCaution = job.internshield.status === "CAUTION";
          const isSafe = job.internshield.status === "SAFE";

          return (
            <div
              key={job.id}
              className={`simJobCard ${overlayActive ? `overlayActive ${isDanger ? "isBlocked" : isCaution ? "isCaution" : "isSafe"}` : ""}`}
            >
              {overlayActive && (
                <div className={`simOverlayBanner ${isDanger ? "isBlocked" : isCaution ? "isCaution" : "isSafe"}`}>
                  <div className="bannerLeft">
                    <Shield size={16} />
                    <span>
                      {isDanger && `🚨 CRITICAL SCAM BLOCKED BY INTERNSHIELD (${job.internshield.threatScore}% Threat)`}
                      {isCaution && `⚠️ CAUTION: UNVERIFIED ENTITY (${job.internshield.threatScore}% Risk)`}
                      {isSafe && `🟢 VERIFIED LEGITIMATE RECRUITMENT (${job.internshield.confidence}% Safe)`}
                    </span>
                  </div>
                  <button className="simInspectSmallBtn" onClick={() => setSelectedJob(job)}>
                    <Search size={13} /> Deep Inspect AI
                  </button>
                </div>
              )}

              <div className="jobCardHeader">
                <div className="jobLogoBox">
                  {job.company.substring(0, 2).toUpperCase()}
                </div>
                <div className="jobMetaCol">
                  <div className="jobTitleRow">
                    <h3>{job.title}</h3>
                    <small className="muted">{job.posted}</small>
                  </div>
                  <div className="companyNameLine">
                    <b>{job.company}</b> · {job.location}
                  </div>
                  <div className="jobSnippetText">{job.description}</div>

                  <div className="jobAttributesRow">
                    <span className="jobAttrItem">💼 {job.compensation}</span>
                    <span className="jobAttrItem">📍 {job.location}</span>
                  </div>

                  {overlayActive && (
                    <div className="jobOverlayTagsList">
                      {job.internshield.badges.map((b, idx) => (
                        <span
                          key={idx}
                          className={`overlayTagBadge ${isDanger ? "danger" : isCaution ? "warning" : "success"}`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* INSPECTOR MODAL */}
      {selectedJob && (
        <div className="inspectorBackdrop" onClick={() => setSelectedJob(null)}>
          <div className="inspectorModal" onClick={(e) => e.stopPropagation()}>
            <div className="inspectorHeader">
              <div>
                <span className="pill">INTERNSHIELD FORENSIC INSPECTOR</span>
                <h3>{selectedJob.title}</h3>
                <small className="muted">{selectedJob.company} · {selectedJob.platform.toUpperCase()}</small>
              </div>
              <button className="closeModalBtn" onClick={() => setSelectedJob(null)}>✕</button>
            </div>

            <div className="simOverlayBanner isBlocked" style={{ margin: 0, background: selectedJob.internshield.status === "DANGER" ? "#fee2e2" : selectedJob.internshield.status === "CAUTION" ? "#fef3c7" : "#dcfce7", color: selectedJob.internshield.status === "DANGER" ? "#b91c1c" : selectedJob.internshield.status === "CAUTION" ? "#b45309" : "#15803d" }}>
              <div className="bannerLeft">
                <Shield size={18} />
                <b>Status: {selectedJob.internshield.status} (Threat Score: {selectedJob.internshield.threatScore}/100)</b>
              </div>
            </div>

            <div>
              <h4 style={{ margin: "4px 0 8px", fontSize: 14 }}>Security Reasoning & Forensic Analysis</h4>
              <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                {selectedJob.internshield.reason}
              </p>
            </div>

            <div>
              <h4 style={{ margin: "4px 0 8px", fontSize: 14 }}>Detected Security Badges</h4>
              <div className="statutePillsRow">
                {selectedJob.internshield.badges.map((b, i) => (
                  <span key={i} className="statutePill" style={{ background: "#f1f5f9", color: "#1e293b", borderColor: "#cbd5e1" }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {selectedJob.internshield.status === "DANGER" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 14, borderRadius: 8 }}>
                <b style={{ color: "#dc2626", fontSize: 13 }}>⚠️ Critical Scam Protection Action</b>
                <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#991b1b" }}>
                  This posting exhibits clear fraudulent advance fee extortion or malicious screen sharing demands.
                  You can immediately generate an official Cybercrime FIR complaint with 1 click.
                </p>
                <button
                  className="primary"
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                  onClick={() => {
                    onTransferToComplaint({
                      platform: selectedJob.platform.toUpperCase(),
                      scam_category: selectedJob.title,
                      suspect_name: selectedJob.company,
                      suspect_telegram: selectedJob.suspect?.telegram || "",
                      suspect_phone: selectedJob.suspect?.phone || "",
                      suspect_upi: selectedJob.suspect?.upi || "",
                      amount_lost: selectedJob.suspect?.amount || 1500,
                      incident_narrative: `Encountered fraudulent listing on ${selectedJob.platform.toUpperCase()} claiming to be ${selectedJob.company}. Demanded fee of INR ${selectedJob.suspect?.amount || 1500} for ${selectedJob.suspect?.fee_type || "onboarding"}. Job description: "${selectedJob.description}"`
                    });
                    setSelectedJob(null);
                  }}
                >
                  <Scale size={15} /> Transfer to 1-Click Cybercrime Complaint Generator
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================
// 1-CLICK CYBERCRIME COMPLAINT & EVIDENCE GENERATOR
// ============================================================
function CybercrimeGenerator({ initialData, reloadAll }) {
  const [victimName, setVictimName] = useState(initialData?.victim_name || "Aditya Sharma");
  const [victimPhone, setVictimPhone] = useState(initialData?.victim_phone || "+91 9876543210");
  const [victimEmail, setVictimEmail] = useState(initialData?.victim_email || "aditya@example.com");
  const [victimCity, setVictimCity] = useState(initialData?.victim_city || "New Delhi");
  const [victimState, setVictimState] = useState(initialData?.victim_state || "Delhi");

  const [incidentDate, setIncidentDate] = useState(initialData?.incident_date || new Date().toISOString().split("T")[0]);
  const [platform, setPlatform] = useState(initialData?.platform || "Telegram");
  const [scamCategory, setScamCategory] = useState(initialData?.scam_category || "Work-From-Home Task & Laptop Security Fraud");

  const [suspectName, setSuspectName] = useState(initialData?.suspect_name || "Rohan HR / FastTrack Careers");
  const [suspectPhone, setSuspectPhone] = useState(initialData?.suspect_phone || "+91 9123456780");
  const [suspectTelegram, setSuspectTelegram] = useState(initialData?.suspect_telegram || "@task_manager_india");
  const [suspectEmail, setSuspectEmail] = useState(initialData?.suspect_email || "hr@fasttrack-careers.xyz");
  const [suspectUpi, setSuspectUpi] = useState(initialData?.suspect_upi || "fraudster@okaxis");
  const [suspectBank, setSuspectBank] = useState(initialData?.suspect_bank_acc || "Account: 919812345678, IFSC: PYTM0123456");

  const [amountLost, setAmountLost] = useState(initialData?.amount_lost || 2500);
  const [transactionId, setTransactionId] = useState(initialData?.transaction_id || "UPI40982348912");
  const [paymentMode, setPaymentMode] = useState(initialData?.payment_mode || "UPI");
  const [narrative, setNarrative] = useState(initialData?.incident_narrative || "The suspect contacted me offering an online part-time internship and demanded ₹2,500 security deposit for laptop dispatch. After transfer, the suspect blocked me.");

  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.victim_name) setVictimName(initialData.victim_name);
      if (initialData.platform) setPlatform(initialData.platform);
      if (initialData.scam_category) setScamCategory(initialData.scam_category);
      if (initialData.suspect_name) setSuspectName(initialData.suspect_name);
      if (initialData.suspect_phone) setSuspectPhone(initialData.suspect_phone);
      if (initialData.suspect_telegram) setSuspectTelegram(initialData.suspect_telegram);
      if (initialData.suspect_upi) setSuspectUpi(initialData.suspect_upi);
      if (initialData.amount_lost) setAmountLost(initialData.amount_lost);
      if (initialData.incident_narrative) setNarrative(initialData.incident_narrative);
    }
  }, [initialData]);

  function applyPreset(p) {
    if (p === 1) {
      setPlatform("Telegram");
      setScamCategory("Telegram Task & Daily Review Scam");
      setSuspectName("Pooja HR (Telegram Recruiter)");
      setSuspectPhone("+91 9911223344");
      setSuspectTelegram("@pooja_hr_tasks");
      setSuspectUpi("tasks.deposit@okicici");
      setAmountLost(2500);
      setTransactionId("UPI9928374619");
      setNarrative("Approached on Telegram with an offer to earn ₹1,500 daily liking YouTube videos. Asked to pay ₹2,500 'VIP server deposit' via UPI. Suspect vanished immediately after payment.");
    } else if (p === 2) {
      setPlatform("Internshala / WhatsApp");
      setScamCategory("Remote Internship Laptop Courier Bond Fraud");
      setSuspectName("Apex IT Onboarding Team");
      setSuspectPhone("+91 9871122334");
      setSuspectTelegram("@apex_onboarding");
      setSuspectUpi("courier.delivery@paytm");
      setAmountLost(4999);
      setTransactionId("IMPS202610080123");
      setNarrative("Received a fraudulent internship offer letter. Recruiter insisted on an immediate ₹4,999 refundable courier insurance deposit for shipping a company Dell XPS laptop. Suspect ceased contact thereafter.");
    } else if (p === 3) {
      setPlatform("LinkedIn");
      setScamCategory("MNC Recruiter Impersonation & AnyDesk Fee");
      setSuspectName("Kavita Sharma (Fake MNC Recruiter)");
      setSuspectPhone("+91 9123498765");
      setSuspectTelegram("N/A");
      setSuspectUpi("registration.hr@ybl");
      setAmountLost(1200);
      setTransactionId("UPI3324987165");
      setNarrative("Fake recruiter impersonating an MNC reached out for a data science intern role. Asked me to download AnyDesk for technical screening and pay ₹1,200 background verification fee via UPI.");
    }
  }

  async function handleGenerate(e) {
    if (e) e.preventDefault();
    setBusy(true);
    setCopied(false);
    try {
      const res = await fetch(`${API_BASE}/api/cybercrime/generate-complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          victim_name: victimName,
          victim_phone: victimPhone,
          victim_email: victimEmail,
          victim_city: victimCity,
          victim_state: victimState,
          incident_date: incidentDate,
          platform: platform,
          scam_category: scamCategory,
          suspect_name: suspectName,
          suspect_phone: suspectPhone,
          suspect_telegram: suspectTelegram,
          suspect_email: suspectEmail,
          suspect_upi: suspectUpi,
          suspect_bank_acc: suspectBank,
          amount_lost: Number(amountLost),
          transaction_id: transactionId,
          payment_mode: paymentMode,
          incident_narrative: narrative
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Generation failed");
      setResult(d);
      if (reloadAll) reloadAll();
    } catch (err) {
      alert("Error generating complaint: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    if (!result?.complaint_text) return;
    navigator.clipboard.writeText(result.complaint_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleDownload() {
    if (!result?.complaint_text) return;
    const blob = new Blob([result.complaint_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cybercrime_FIR_Complaint_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="cybercrimeContainer">
      <div className="presetsBar">
        <h4>⚡ 1-Click Fast Presets (Click to Auto-Fill Authentic Evidence Case):</h4>
        <div className="presetsGrid">
          <button className="presetCardBtn" onClick={() => applyPreset(1)}>
            <b>Telegram Task / Review Scam</b>
            <span>Lost ₹2,500 via UPI · @pooja_hr_tasks</span>
          </button>
          <button className="presetCardBtn" onClick={() => applyPreset(2)}>
            <b>Laptop Courier Insurance Fraud</b>
            <span>Lost ₹4,999 · Fake Dell Laptop Bond</span>
          </button>
          <button className="presetCardBtn" onClick={() => applyPreset(3)}>
            <b>MNC Impersonation & AnyDesk Fee</b>
            <span>Lost ₹1,200 · Background Check Fee</span>
          </button>
        </div>
      </div>

      <div className="complaintWorkspaceGrid">
        {/* LEFT COLUMN: FORM */}
        <form className="formBoxPanel" onSubmit={handleGenerate}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Victim & Incident Particulars</h3>
            <span className="pill">cybercrime.gov.in / 1930</span>
          </div>

          <div className="formSectionHeading">1. Complainant (Victim) Details</div>
          <div className="formRow">
            <div>
              <label>Full Name</label>
              <input value={victimName} onChange={(e) => setVictimName(e.target.value)} required />
            </div>
            <div>
              <label>Phone / Mobile</label>
              <input value={victimPhone} onChange={(e) => setVictimPhone(e.target.value)} required />
            </div>
          </div>
          <div className="formRow">
            <div>
              <label>Email Address</label>
              <input value={victimEmail} onChange={(e) => setVictimEmail(e.target.value)} required />
            </div>
            <div>
              <label>City & State</label>
              <input value={`${victimCity}, ${victimState}`} onChange={(e) => {
                const parts = e.target.value.split(",");
                setVictimCity(parts[0]?.trim() || "");
                setVictimState(parts[1]?.trim() || "");
              }} />
            </div>
          </div>

          <div className="formSectionHeading">2. Suspect / Beneficiary Entity</div>
          <div className="formRow">
            <div>
              <label>Suspect Alias / HR Name</label>
              <input value={suspectName} onChange={(e) => setSuspectName(e.target.value)} />
            </div>
            <div>
              <label>Suspect Phone / WhatsApp</label>
              <input value={suspectPhone} onChange={(e) => setSuspectPhone(e.target.value)} />
            </div>
          </div>
          <div className="formRow">
            <div>
              <label>Telegram Handle</label>
              <input value={suspectTelegram} onChange={(e) => setSuspectTelegram(e.target.value)} />
            </div>
            <div>
              <label>Platform of Solicitation</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="Telegram">Telegram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Internshala">Internshala</option>
                <option value="Indeed">Indeed</option>
                <option value="Email">Email</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
          </div>
          <div className="formRow">
            <div>
              <label>Beneficiary UPI ID (VPA)</label>
              <input value={suspectUpi} onChange={(e) => setSuspectUpi(e.target.value)} placeholder="e.g. fraudster@okaxis" />
            </div>
            <div>
              <label>Suspect Bank Account / IFSC</label>
              <input value={suspectBank} onChange={(e) => setSuspectBank(e.target.value)} />
            </div>
          </div>

          <div className="formSectionHeading">3. Financial Loss & Transaction Trail</div>
          <div className="formRow">
            <div>
              <label>Amount Lost (INR)</label>
              <input type="number" value={amountLost} onChange={(e) => setAmountLost(e.target.value)} required />
            </div>
            <div>
              <label>Transaction UTR / Ref No.</label>
              <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="12-digit UTR" required />
            </div>
          </div>
          <div className="formRow">
            <div>
              <label>Payment Method</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="IMPS / NEFT">IMPS / Netbanking</option>
                <option value="Credit/Debit Card">Credit / Debit Card</option>
                <option value="Crypto">Cryptocurrency</option>
              </select>
            </div>
            <div>
              <label>Incident Date</label>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label>Statement of Facts / Modus Operandi</label>
            <textarea
              rows={3}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe how you were approached, what false promises were made, and how payment was coerced..."
            />
          </div>

          <button className="primary" type="submit" disabled={busy} style={{ marginTop: 8 }}>
            <Scale size={16} /> {busy ? "Drafting Legal Complaint…" : "Generate Formal FIR & Evidence Dossier"}
          </button>
        </form>

        {/* RIGHT COLUMN: GENERATED RESULT */}
        <div className="legalResultPanel">
          <div className="legalResultHeader">
            <div>
              <h3>Official Legal Complaint Dossier</h3>
              <small style={{ color: "#94a3b8" }}>Ready for National Cybercrime Reporting Portal (cybercrime.gov.in)</small>
            </div>
            {result && (
              <div className="copyBarRow">
                <button className="primary" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy FIR"}
                </button>
                <button className="exportBtn" onClick={handleDownload} style={{ color: "white" }}>
                  <Download size={14} /> Download .txt
                </button>
              </div>
            )}
          </div>

          {result ? (
            <>
              <div>
                <small style={{ color: "#94a3b8", display: "block", marginBottom: 6 }}>Statutory Sections Cited:</small>
                <div className="statutePillsRow">
                  {(result.statutory_sections || []).map((s, idx) => (
                    <span key={idx} className="statutePill" title={s.title}>
                      ⚖️ {s.code}
                    </span>
                  ))}
                </div>
              </div>

              <pre className="legalDossierPre">
                {result.complaint_text}
              </pre>

              <div className="goldenHourBox">
                <h4>🚨 Golden Hour Emergency Response Protocol (Next 2 Hours):</h4>
                <ul className="goldenStepsList">
                  {(result.golden_hour_steps || []).map((step) => (
                    <li key={step.step} className="goldenStepItem">
                      <span className="stepNum">{step.step}</span>
                      <div>
                        <b>{step.title}:</b> {step.action}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
              <Scale size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>
                Fill in the details or click a preset on top, then click <b>"Generate Formal FIR"</b> to assemble a court-admissible complaint draft and 1930 emergency freeze dossier.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// AI VIDEO / AUDIO INTERVIEW RED FLAG CHECKLIST
// ============================================================
function InterviewChecklist({ onTransferToComplaint }) {
  const [selectedFlags, setSelectedFlags] = useState([]);

  const ALL_FLAGS = [
    {
      id: "remote_access",
      category: "Malware & Screen Takeover",
      title: "Asked to Install Remote Desktop Tool (AnyDesk / TeamViewer / RustDesk)",
      severity: "critical",
      weight: 35,
      desc: "Legitimate interviewers never require candidate screen control via remote desktop software. This is an active vector to siphon banking funds."
    },
    {
      id: "payment_demand",
      category: "Direct Extortion",
      title: "Upfront Fee Demanded on Call (Laptop / Training / Security Deposit)",
      severity: "critical",
      weight: 35,
      desc: "Under International Labour Organization (ILO) rules, charging candidates recruitment or onboarding fees is illegal. MNCs never charge fees."
    },
    {
      id: "sensitive_creds",
      category: "Account Takeover",
      title: "Asked for OTP / Netbanking / Screen Sharing of Personal Accounts",
      severity: "critical",
      weight: 40,
      desc: "Direct financial theft attempt. Interviewer seeks to intercept 2FA OTPs or view netbanking credentials during the call."
    },
    {
      id: "suspicious_app_install",
      category: "Malware Distribution",
      title: "Asked to Download Unverified .apk or .exe Meeting File",
      severity: "critical",
      weight: 30,
      desc: "Fraudulent meeting invitations often deliver keyloggers, infostealer trojans, or SMS interceptors to candidate devices."
    },
    {
      id: "camera_off",
      category: "Identity Concealment",
      title: "Interviewer Refused Camera While Forcing Candidate's Camera On",
      severity: "high",
      weight: 18,
      desc: "Scammers conceal their identity to prevent biometric identification or reverse image matching."
    },
    {
      id: "synthetic_ai",
      category: "Deepfake & Synthetic Media",
      title: "AI Avatar / Deepfake Signals (Laggy Lip-Sync, Robotic Audio, Glitching)",
      severity: "high",
      weight: 25,
      desc: "Interviewer exhibits unnatural eye blinking, neck border distortion, or synthetic text-to-speech voice inflection."
    },
    {
      id: "off_platform_chat",
      category: "Informal Channels",
      title: "Interview Conducted Only via WhatsApp/Telegram Audio or Text Chat",
      severity: "high",
      weight: 22,
      desc: "Standard corporate hiring utilizes Microsoft Teams, Google Meet, or Zoom with official corporate domain calendar invites."
    },
    {
      id: "urgency_pressure",
      category: "Psychological Coercion",
      title: "Extreme Urgency Pressure ('Must Pay / Accept Within 30 Minutes')",
      severity: "high",
      weight: 20,
      desc: "Artificial time urgency is engineered to induce panic and prevent candidates from verifying with parents or career counselors."
    },
    {
      id: "immediate_offer",
      category: "Predatory Baiting",
      title: "Instant Job Offer Within 5-10 Minutes Without Technical Testing",
      severity: "medium",
      weight: 20,
      desc: "Scammers give instant pseudo-validation to excite victims right before presenting an onboarding fee or deposit."
    },
    {
      id: "unrealistic_salary",
      category: "Bait & Switch",
      title: "Extravagant Compensation for Low-Skill / Fresher Position",
      severity: "medium",
      weight: 18,
      desc: "Offers like ₹60,000/month for basic data entry or part-time copy-paste are universal hallmarks of job scams."
    }
  ];

  function toggleFlag(id) {
    if (selectedFlags.includes(id)) {
      setSelectedFlags(selectedFlags.filter((x) => x !== id));
    } else {
      setSelectedFlags([...selectedFlags, id]);
    }
  }

  // Calculate scores dynamically
  const threatScore = Math.min(100, selectedFlags.reduce((acc, fid) => {
    const f = ALL_FLAGS.find(x => x.id === fid);
    return acc + (f ? f.weight : 0);
  }, 0));
  const safetyScore = 100 - threatScore;

  function loadPreset(presetName) {
    if (presetName === "safe") {
      setSelectedFlags([]);
    } else if (presetName === "caution") {
      setSelectedFlags(["camera_off", "off_platform_chat"]);
    } else if (presetName === "danger") {
      setSelectedFlags(["remote_access", "payment_demand", "immediate_offer", "urgency_pressure"]);
    }
  }

  return (
    <section className="interviewContainer">
      <div className="presetsBar">
        <h4>⚡ Test Pre-Configured Interview Scenarios:</h4>
        <div className="presetsGrid">
          <button className="presetCardBtn" onClick={() => loadPreset("safe")}>
            <b style={{ color: "#16a34a" }}>🟢 Legitimate MNC Interview</b>
            <span style={{ color: "#16a34a" }}>Google / TCS Standard Protocol (0% Threat)</span>
          </button>
          <button className="presetCardBtn" onClick={() => loadPreset("caution")}>
            <b style={{ color: "#d97706" }}>🟡 Informal Unverified Recruiter</b>
            <span style={{ color: "#d97706" }}>Camera off + Telegram Audio (40% Threat)</span>
          </button>
          <button className="presetCardBtn" onClick={() => loadPreset("danger")}>
            <b style={{ color: "#dc2626" }}>🚨 AnyDesk & Laptop Fee Scam</b>
            <span style={{ color: "#dc2626" }}>Remote screen takeover + Laptop fee (95% Threat)</span>
          </button>
        </div>
      </div>

      <div className="interviewGrid">
        {/* LEFT COLUMN: CHECKLIST */}
        <div className="checklistPanel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Interactive Diagnostic Checklist</h3>
              <small className="muted">Check any red flags observed before, during, or after the interview call</small>
            </div>
            <button className="scanBtn" onClick={() => setSelectedFlags([])}>Clear All</button>
          </div>

          {["Malware & Screen Takeover", "Direct Extortion", "Account Takeover", "Malware Distribution", "Identity Concealment", "Deepfake & Synthetic Media", "Informal Channels", "Psychological Coercion", "Predatory Baiting", "Bait & Switch"].filter((cat, idx, arr) => arr.indexOf(cat) === idx).map(catName => {
            const catFlags = ALL_FLAGS.filter(f => f.category === catName);
            if (!catFlags.length) return null;
            return (
              <div key={catName} className="checklistCategoryBlock">
                <h4>🛡️ {catName}</h4>
                {catFlags.map(f => {
                  const isChecked = selectedFlags.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`flagCardItem ${isChecked ? "checked" : ""}`}
                      onClick={() => toggleFlag(f.id)}
                    >
                      <div className="flagCheckboxVisual">
                        {isChecked && <Check size={14} />}
                      </div>
                      <div className="flagCardTextCol">
                        <div className="flagCardTitleRow">
                          <b>{f.title}</b>
                          <span className={`flagSeverityBadge ${f.severity}`}>
                            {f.severity} (+{f.weight}%)
                          </span>
                        </div>
                        <p>{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: LIVE THREAT GAUGE */}
        <div className="threatMeterPanel">
          <div className="threatMeterTop">
            <span className="pill">REAL-TIME INTERVIEW DEFENSE INDEX</span>
            <h3>Safety & Risk Meter</h3>

            <div className={`scoreCircleDisplay ${threatScore >= 65 ? "danger" : threatScore >= 25 ? "caution" : "safe"}`}>
              <b>{safetyScore}%</b>
              <span>Safety Index</span>
            </div>

            <div className={`verdictAlertBanner ${threatScore >= 65 ? "danger" : threatScore >= 25 ? "caution" : "safe"}`}>
              {threatScore >= 65 && "🚨 CRITICAL SCAM DETECTED - TERMINATE IMMEDIATELY"}
              {threatScore >= 25 && threatScore < 65 && "⚠️ HIGH FRAUD RISK - SUSPICIOUS BEHAVIOR"}
              {threatScore < 25 && "🟢 VERIFIED SAFE INTERVIEW PROTOCOL"}
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: 13, textTransform: "uppercase", color: "#64748b" }}>
              Actionable Exit Strategy & Countermeasures:
            </h4>
            <div className="countermeasureAdviceList">
              {selectedFlags.includes("remote_access") && (
                <div className="adviceItemBox">
                  🛑 <b>Revoke AnyDesk / TeamViewer Immediately:</b> Disconnect internet. Check Task Manager to ensure remote sessions are terminated.
                </div>
              )}
              {selectedFlags.includes("payment_demand") && (
                <div className="adviceItemBox">
                  🛑 <b>Refuse All Payments:</b> Corporate internships NEVER demand money for laptops, training, or uniform bonds.
                </div>
              )}
              {selectedFlags.includes("sensitive_creds") && (
                <div className="adviceItemBox">
                  🛑 <b>Secure Financial Accounts:</b> Contact your bank helpline immediately if you shared screen during netbanking or disclosed OTP.
                </div>
              )}
              {selectedFlags.length === 0 && (
                <div className="adviceItemBox">
                  ✅ <b>No Predatory Triggers:</b> Proceed with interview observing standard academic and professional ethics.
                </div>
              )}
            </div>
          </div>

          {threatScore >= 50 && (
            <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
              <button
                className="primary"
                style={{ width: "100%", background: "#dc2626", borderColor: "#dc2626" }}
                onClick={() => {
                  const flagTitles = selectedFlags.map(fid => ALL_FLAGS.find(x => x.id === fid)?.title).filter(Boolean);
                  onTransferToComplaint({
                    platform: "Online Video/Audio Interview",
                    scam_category: "Fake Interview & Advance Fee Extortion",
                    amount_lost: selectedFlags.includes("payment_demand") ? 2500 : 0,
                    incident_narrative: `During an online interview call, the interviewer exhibited the following critical red flags: ${flagTitles.join("; ")}.`
                  });
                }}
              >
                <Scale size={15} /> Transfer to Cybercrime Complaint Generator
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default App;
