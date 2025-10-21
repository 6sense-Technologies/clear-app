import React, { useEffect, useMemo, useState } from "react";

/**
 * Compliance Console – React + Tailwind (stable + Integrations)
 * - Dashboard • Frameworks • Assessments • Risks • Integrations
 * - Auto-generated Risks from Assessment answers
 * - Clause coverage with friendly section names (A.5–A.8)
 * - Provider integrations (HRMS, Accounting, IdP) → map fields → answers
 */

// ── Types ────────────────────────────────────────────────────────────────
 type Answer = "yes" | "no" | "partial" | "na" | "unsure";
 type Weight = 1 | 2 | 3; // Low=1, Med=2, High=3
 type Maturity = "Low" | "Medium" | "High";
 type Question = {
  id: string;
  text: string;
  group: string;           // UI section
  clause?: string;         // e.g., "A.5.1"
  weight?: Weight;         // control impact weight
  maturity?: Maturity;     // optional maturity target
  choices?: { value: Answer; label: string }[];
 };
 type Framework = {
  key: string;
  name: string;
  version?: string;
  questions: Question[];
 };
 type Risk = {
  id: string;
  title: string;
  description?: string;
  frameworkKey?: string;   // e.g., iso27001
  controlId?: string;      // link to question.id
  owner?: string;
  likelihood: 1|2|3|4|5;  // 1=rare, 5=almost certain
  impact: 1|2|3|4|5;       // 1=low, 5=severe
  status: "Open"|"Mitigating"|"Accepted"|"Closed";
 };

// ── Seed: ISO/IEC 27001:2022 (subset, with clauses & weights) ────────────
const ISO27001_2022: Framework = {
  key: "iso27001",
  name: "ISO/IEC 27001",
  version: "2022",
  questions: [
    // Company Profile (non‑scored intake, weight 1)
    { id: "company_name", text: "Company name available?", group: "Company Profile", weight: 1, choices: yn() },
    { id: "industry", text: "Industry identified?", group: "Company Profile", weight: 1, choices: yn() },
    { id: "team_size", text: "Team size recorded?", group: "Company Profile", weight: 1, choices: yn() },
    { id: "handles_customer_data", text: "Do you handle customer data?", group: "Company Profile", weight: 1, choices: ynu() },

    // Policies & Governance (examples with Annex A)
    { id: "info_sec_policy", text: "Written Information Security Policy exists?", group: "Policies & Governance", clause: "A.5.1", weight: 3, maturity: "High", choices: ynu() },
    { id: "access_control_policy", text: "Documented Access Control Policy?", group: "Policies & Governance", clause: "A.5.15", weight: 3, maturity: "High", choices: ynu() },
    { id: "change_mgmt_policy", text: "Change Management Policy for code/config?", group: "Policies & Governance", clause: "A.8.32", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "ir_plan", text: "Incident Response Plan documented?", group: "Policies & Governance", clause: "A.5.24", weight: 3, maturity: "High", choices: ynu() },
    { id: "vrm_policy", text: "Vendor Risk Management Policy?", group: "Policies & Governance", clause: "A.5.19", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "data_class_policy", text: "Data Classification Policy?", group: "Policies & Governance", clause: "A.5.12", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "bcp_drp", text: "Business Continuity / Disaster Recovery Policy?", group: "Policies & Governance", clause: "A.5.30", weight: 3, maturity: "High", choices: ynu() },

    // Technical Controls
    { id: "mfa_all", text: "All employees use MFA on company systems?", group: "Technical Controls", clause: "A.5.17", weight: 3, maturity: "High", choices: [{value:"yes",label:"All"},{value:"partial",label:"Some"},{value:"no",label:"None"},{value:"unsure",label:"Not sure"}] },
    { id: "sso_enforced", text: "SSO enforced across major tools?", group: "Technical Controls", clause: "A.5.17", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "password_policy", text: "Password requirements enforced?", group: "Technical Controls", clause: "A.8.2", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "encrypt_transit", text: "Data encrypted in transit (TLS/SSL)?", group: "Technical Controls", clause: "A.8.24", weight: 3, maturity: "High", choices: ynu() },
    { id: "encrypt_rest", text: "Data encrypted at rest (DB, file storage, backups)?", group: "Technical Controls", clause: "A.8.25", weight: 3, maturity: "High", choices: ynu() },
    { id: "network_security", text: "Firewalls and IDS/IPS maintained?", group: "Technical Controls", clause: "A.8.20", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "vuln_scans", text: "Regular vulnerability scans / penetration tests performed?", group: "Technical Controls", clause: "A.8.8", weight: 3, maturity: "High", choices: ynu() },
    { id: "log_reviews", text: "Access to critical systems logged & reviewed?", group: "Technical Controls", clause: "A.8.15", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "backups", text: "Backups and recovery process tested at least annually?", group: "Technical Controls", clause: "A.8.13", weight: 3, maturity: "High", choices: ynu() },

    // HR & Training
    { id: "background_checks", text: "Background checks performed for employees?", group: "HR & Training", clause: "A.6.1", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "security_training", text: "Security awareness training for new hires?", group: "HR & Training", clause: "A.6.3", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "offboarding", text: "Formal offboarding (access removal on exit)?", group: "HR & Training", clause: "A.6.8", weight: 3, maturity: "High", choices: ynu() },

    // Privacy & Confidentiality
    { id: "data_retention", text: "Data Retention Policy exists?", group: "Privacy & Confidentiality", clause: "A.5.34", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "deletion_process", text: "Process to delete customer data upon request?", group: "Privacy & Confidentiality", clause: "A.5.36", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "data_export", text: "Customers can access/export their data?", group: "Privacy & Confidentiality", clause: "A.5.36", weight: 1, maturity: "Low", choices: ynu() },
    { id: "pii_classification", text: "PII classified separately from non‑sensitive data?", group: "Privacy & Confidentiality", clause: "A.5.12", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "tokenization", text: "Encryption/tokenization for confidential data used?", group: "Privacy & Confidentiality", clause: "A.8.25", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "least_privilege", text: "Sensitive data access restricted to need‑to‑know?", group: "Privacy & Confidentiality", clause: "A.5.15", weight: 3, maturity: "High", choices: ynu() },
    { id: "ndas", text: "NDAs in place with employees & vendors?", group: "Privacy & Confidentiality", clause: "A.5.10", weight: 2, maturity: "Medium", choices: ynu() },

    // Audit Readiness
    { id: "produce_logs", text: "Can produce logs of critical systems on request?", group: "Audit Readiness", clause: "A.8.15", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "access_reviews", text: "Records of user access reviews maintained?", group: "Audit Readiness", clause: "A.5.18", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "ticketing", text: "Change management tickets/workflows used?", group: "Audit Readiness", clause: "A.8.32", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "training_evidence", text: "Evidence of employee security training maintained?", group: "Audit Readiness", clause: "A.6.3", weight: 1, maturity: "Low", choices: ynu() },
    { id: "ir_drills", text: "Incident response tests/drills recorded?", group: "Audit Readiness", clause: "A.5.24", weight: 2, maturity: "Medium", choices: ynu() },
    { id: "sla_tracking", text: "Service uptime/availability (SLAs) tracked & reported?", group: "Audit Readiness", clause: "A.8.4", weight: 1, maturity: "Low", choices: ynu() },
    { id: "internal_review", text: "Any internal compliance review in last 12 months?", group: "Audit Readiness", clause: "A.5.2", weight: 1, maturity: "Low", choices: ynu() },
    { id: "external_auditor", text: "Engaged an external auditor/consultant before?", group: "Audit Readiness", clause: "A.5.2", weight: 1, maturity: "Low", choices: ynu() },
  ],
};

function yn()  { return [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]; }
function ynu() { return [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]; }

// ── Helpers ──────────────────────────────────────────────────────────────
function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce((acc: Record<string, T[]>, item) => {
    const k = String(item[key]);
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}
function classNames(...s: (string | false | undefined)[]) {return s.filter(Boolean).join(" ");}
const Badge: React.FC<{ children: React.ReactNode }>=({ children })=> (
  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">{children}</span>
);

// Weighted completion calculation (answers + weights)
function computeWeightedCompletion(questions: Question[], answers: Record<string, Answer>) {
  let gained = 0; let max = 0;
  for (const q of questions) {
    const w = q.weight ?? 1;
    max += w;
    const a = answers[q.id];
    if (!a) continue;
    if (a === "yes") gained += w;
    else if (a === "partial") gained += w * 0.5;
  }
  const pct = max ? Math.round((gained / max) * 100) : 0;
  return { pct, gained, max };
}

function gradeFromPercent(p: number) {
  if (p >= 90) return "A"; if (p >= 80) return "B"; if (p >= 70) return "C"; if (p >= 60) return "D"; return "E";
}

// Map clause prefix → friendly section name (ISO 27001:2022 common ones)
function friendlyClauseSection(clause?: string) {
  if (!clause) return null;
  const m = clause.match(/^A\.(\d+)/);
  const sec = m ? Number(m[1]) : null;
  if (sec === 5) return "A.5 Organizational controls";
  if (sec === 6) return "A.6 People controls";
  if (sec === 7) return "A.7 Physical controls";
  if (sec === 8) return "A.8 Technological controls";
  return `A.${sec ?? "?"}`;
}

// Derive risks automatically from answers
function deriveRisks(frameworks: Framework[], activeFwKeys: string[], answersByFw: Record<string, Record<string, Answer>>): Risk[] {
  const out: Risk[] = [];
  for (const key of activeFwKeys) {
    const fw = frameworks.find(f=>f.key===key); if(!fw) continue;
    const ans = answersByFw[key] || {};
    for (const q of fw.questions) {
      const a = ans[q.id];
      if (!a) continue; // only create risks from explicit answers
      if (a === "yes") continue; // resolved
      const impact = q.weight === 3 ? 5 : q.weight === 2 ? 3 : 2;
      const likelihood: 1|2|3|4|5 = a === "partial" ? 2 : 3; // simple heuristic
      const status: Risk["status"] = a === "partial" ? "Mitigating" : "Open";
      out.push({
        id: `${key}:${q.id}`,
        title: q.text,
        description: friendlyClauseSection(q.clause) ? `Related section: ${friendlyClauseSection(q.clause)}` : undefined,
        frameworkKey: key,
        controlId: q.id,
        likelihood, impact, status,
      });
    }
  }
  return out.sort((a,b)=> (b.impact*b.likelihood) - (a.impact*a.likelihood));
}

// ── App ─────────────────────────────────────────────────────────────────
export default function ComplianceConsole() {
  const [route, setRoute] = useState<"dashboard" | "frameworks" | "assessments" | "risks" | "integrations">("dashboard");

  // Frameworks
  const [frameworks, setFrameworks] = useState<Framework[]>([
    ISO27001_2022,
    { key: "soc2", name: "SOC 2", version: "TSC", questions: [] },
    { key: "gdpr", name: "GDPR", questions: [] },
    { key: "hipaa", name: "HIPAA", questions: [] },
    { key: "fintrac", name: "FINTRAC", questions: [] },
    { key: "iso9001", name: "ISO 9001 (Quality)", questions: [] },
  ]);
  const [activeFwKeys, setActiveFwKeys] = useState<string[]>(["iso27001"]);

  // Answers/notes/AI per framework
  const [answersByFw, setAnswersByFw] = useState<Record<string, Record<string, Answer>>>({});
  const [notesByFw, setNotesByFw] = useState<Record<string, Record<string, string>>>({});
  const [aiByFw, setAiByFw] = useState<Record<string, string>>({});

  // Integrations state
  type ProviderKey = "okta" | "google_workspace" | "workday" | "bamboohr" | "netsuite" | "quickbooks";
  type ProviderConn = { connected: boolean; lastSync?: string; data?: Record<string, any> };
  const [connections, setConnections] = useState<Record<ProviderKey, ProviderConn>>({
    okta: { connected: false },
    google_workspace: { connected: false },
    workday: { connected: false },
    bamboohr: { connected: false },
    netsuite: { connected: false },
    quickbooks: { connected: false },
  });
  const [ingestOverwrite, setIngestOverwrite] = useState(false);
  const [ingestTargetFw, setIngestTargetFw] = useState<string>("iso27001");

  // UI state
  const [selectedFwKey, setSelectedFwKey] = useState<string>("iso27001");
  const [newFw, setNewFw] = useState({ name: "", version: "" });

  const selectedFw = useMemo(() => frameworks.find(f => f.key === selectedFwKey)!, [frameworks, selectedFwKey]);
  const answers = answersByFw[selectedFwKey] || {};
  const notes = notesByFw[selectedFwKey] || {};

  // Current framework stats (weighted)
  const totalQs = selectedFw.questions.length;
  const doneCount = Object.values(answers).filter(v => v === "yes").length;
  const partialCount = Object.values(answers).filter(v => v === "partial").length;
  const answered = Object.keys(answers).length;
  const leftCount = Math.max(totalQs - doneCount - partialCount, 0);
  const weighted = computeWeightedCompletion(selectedFw.questions, answers);
  const completion = weighted.pct;

  // Derived Risks (from answers)
  const derivedRisks = useMemo(() => deriveRisks(frameworks, activeFwKeys, answersByFw), [frameworks, activeFwKeys, answersByFw]);

  // Dashboard summaries (per active framework)
  const dashboardSummaries = useMemo(() => {
    return activeFwKeys.map(key => {
      const fw = frameworks.find(f => f.key === key);
      if (!fw) return null as any;
      const a = answersByFw[key] || {};
      const t = fw.questions.length;
      const d = Object.values(a).filter(v => v === "yes").length;
      const p = Object.values(a).filter(v => v === "partial").length;
      const l = Math.max(t - d - p, 0);
      const w = computeWeightedCompletion(fw.questions, a).pct;
      const g = gradeFromPercent(w);
      return { key, name: fw.name, version: fw.version, total: t, done: d, partial: p, left: l, completion: w, grade: g };
    }).filter(Boolean);
  }, [activeFwKeys, frameworks, answersByFw]);

  // Consolidated overall (average weighted across active frameworks, control‑weight weighted)
  const consolidated = useMemo(() => {
    let gained = 0, max = 0;
    for (const key of activeFwKeys) {
      const fw = frameworks.find(f => f.key === key); if (!fw) continue;
      const a = answersByFw[key] || {};
      const w = fw.questions.reduce((acc, q) => acc + (q.weight ?? 1), 0);
      const r = computeWeightedCompletion(fw.questions, a);
      gained += (r.pct/100) * w; // back‑calculate gained weight units
      max += w;
    }
    const pct = max ? Math.round((gained / max) * 100) : 0;
    return { pct, grade: gradeFromPercent(pct) };
  }, [activeFwKeys, frameworks, answersByFw]);

  // Section (clause) coverage for selected framework — simplified labels
  const sectionCoverage = useMemo(() => {
    const buckets: Record<string, { total: number; yes: number; partial: number }>= {};
    for (const q of selectedFw.questions) {
      const label = friendlyClauseSection(q.clause) || "Unmapped";
      if (!buckets[label]) buckets[label] = { total: 0, yes: 0, partial: 0 };
      buckets[label].total += 1;
      const a = answers[q.id];
      if (a === "yes") buckets[label].yes += 1; else if (a === "partial") buckets[label].partial += 1;
    }
    const rows = Object.entries(buckets).map(([k,v]) => ({ key: k, ...v, pct: v.total ? Math.round(((v.yes + v.partial*0.5)/v.total)*100) : 0 }));
    return rows.sort((a,b)=>a.key.localeCompare(b.key));
  }, [selectedFw, answers]);

  // Mutators
  function setAnswerForSelected(qid: string, v: Answer) {
    setAnswersByFw(prev => ({ ...prev, [selectedFwKey]: { ...(prev[selectedFwKey] || {}), [qid]: v } }));
  }
  function setNoteForSelected(qid: string, v: string) {
    setNotesByFw(prev => ({ ...prev, [selectedFwKey]: { ...(prev[selectedFwKey] || {}), [qid]: v } }));
  }
  function runAI() {
    const a = answersByFw[selectedFwKey] || {};
    const gaps: string[] = []; const needs: string[] = [];
    function need(id: string, label: string, rec: string) { const val = a[id]; if (!val || val === "no" || val === "unsure") { gaps.push(label); needs.push(`• ${rec}`); } }
    need("info_sec_policy", "Information Security Policy", "Draft, approve, and publish an IS Policy; review annually.");
    need("access_control_policy", "Access Control Policy", "Define JML flows; least privilege; quarterly access reviews.");
    need("mfa_all", "Multi‑Factor Authentication", "Enforce IdP MFA across all accounts; monitor exceptions.");
    need("encrypt_rest", "Encryption at Rest", "Enable storage‑level encryption with KMS & rotation.");
    need("vuln_scans", "Vulnerability Management", "Automate weekly scans with SLAs and Jira tracking.");
    need("ir_plan", "Incident Response Plan", "Create runbook; conduct tabletop twice/year.");
    need("bcp_drp", "BCP/DR", "Define RTO/RPO; run restore drills; capture evidence.");
    need("data_retention", "Data Retention", "Adopt retention schedule; automate purge jobs.");
    need("produce_logs", "Log Production", "Centralize logs/SIEM, define retention, on‑demand export.");
    const lines = [
      `AI Analysis — ${selectedFw.name} ${selectedFw.version ?? ""}`.trim(),
      `Weighted completion: ${completion}% (grade ${gradeFromPercent(completion)})`,
      gaps.length ? `\nKey gaps (${gaps.length}):\n- ${gaps.join("\n- ")}` : "\nNo major gaps detected.",
      needs.length ? `\nRecommended next actions:\n${needs.join("\n")}` : "",
    ];
    setAiByFw(prev => ({ ...prev, [selectedFwKey]: lines.filter(Boolean).join("\n") }));
  }
  function resetAssessment() {
    setAnswersByFw(prev => ({ ...prev, [selectedFwKey]: {} }));
    setNotesByFw(prev => ({ ...prev, [selectedFwKey]: {} }));
    setAiByFw(prev => ({ ...prev, [selectedFwKey]: "" }));
  }

  // ── Self‑tests ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const c = computeWeightedCompletion(
        [{id:"q",text:"t",group:"g",weight:3}], { q: "partial" as Answer }
      );
      console.assert(c.pct === 50, "weighted partial 3w should be 50% when only that q exists");
      console.assert(gradeFromPercent(85) === "B", "grade mapping");
      const rx: Risk = { id:"x", title:"t", likelihood:5, impact:4, status:"Open" };
      const score = rx.likelihood * rx.impact; console.assert(score === 20, "risk score math");
      const rlist = deriveRisks([{...ISO27001_2022, questions:[{id:"mfa_all",text:"MFA?",group:"t",weight:3}]}], ["iso27001"], { iso27001: { mfa_all: "no" } as Record<string, Answer>});
      console.assert(rlist.length === 1 && rlist[0].status === "Open", "auto-risk creation check");
      const rlist2 = deriveRisks([{...ISO27001_2022, questions:[{id:"mfa_all",text:"MFA?",group:"t",weight:3}]}], ["iso27001"], { iso27001: { mfa_all: "partial" } as Record<string, Answer>});
      console.assert(rlist2[0].status === "Mitigating", "partial should create Mitigating risk");
      const cov = computeSectionCoverageTest();
      console.assert(cov.find(x=>x.key.includes("A.5"))?.pct === 75, "coverage math check (Yes=1, Partial=0.5)");

      // Integration tests
      const sample = { mfa_enabled_all: true, sso_enforced: true, background_checks: false };
      const mapping: Record<string,string> = { mfa_enabled_all: "mfa_all", sso_enforced: "sso_enforced", background_checks: "background_checks" };
      const out1 = applyIntegrationsToAnswers({}, sample, mapping, false);
      console.assert(out1.mfa_all === "yes" && out1.sso_enforced === "yes" && out1.background_checks === "no", "ingest fill blanks");
      const out2 = applyIntegrationsToAnswers({ mfa_all: "no" as Answer }, { mfa_enabled_all: true }, { mfa_enabled_all: "mfa_all" }, false);
      console.assert(out2.mfa_all === "no", "no overwrite when disabled");
      const out3 = applyIntegrationsToAnswers({ mfa_all: "no" as Answer }, { mfa_enabled_all: true }, { mfa_enabled_all: "mfa_all" }, true);
      console.assert(out3.mfa_all === "yes", "overwrite when enabled");
    } catch (e) { console.warn("Self‑tests failed:", e); }
  }, []);

  function computeSectionCoverageTest() {
    const fw: Framework = {
      key: "t", name: "T", questions: [
        { id:"a", text:"A", group:"G", clause:"A.5.1", weight:1 },
        { id:"b", text:"B", group:"G", clause:"A.5.2", weight:1 },
        { id:"c", text:"C", group:"G", clause:"A.5.3", weight:1 },
        { id:"d", text:"D", group:"G", clause:"A.6.1", weight:1 },
      ]
    };
    const ans = { a: "yes", b: "partial" } as Record<string, Answer>;
    const buckets: Record<string, { total: number; yes: number; partial: number }>= {};
    for (const q of fw.questions) {
      const label = friendlyClauseSection(q.clause) || "Unmapped";
      if (!buckets[label]) buckets[label] = { total: 0, yes: 0, partial: 0 };
      buckets[label].total += 1;
      const a = ans[q.id as keyof typeof ans];
      if (a === "yes") buckets[label].yes += 1; else if (a === "partial") buckets[label].partial += 1;
    }
    return Object.entries(buckets).map(([k,v]) => ({ key: k, ...v, pct: v.total ? Math.round(((v.yes + v.partial*0.5)/v.total)*100) : 0 }));
  }

  // Ingest helpers
  function inferAnswerFromBool(v: any): Answer | undefined {
    if (v === true) return "yes"; if (v === false) return "no"; return undefined;
  }
  function applyIntegrationsToAnswers(base: Record<string, Answer>, providerData: Record<string, any>, mapping: Record<string,string>, overwrite: boolean) {
    const next = { ...base };
    for (const [providerField, qid] of Object.entries(mapping)) {
      const val = inferAnswerFromBool(providerData[providerField]);
      if (!val) continue;
      if (overwrite || !next[qid]) next[qid] = val;
    }
    return next;
  }

  const providerCatalog: Record<ProviderKey, { name: string; sample: Record<string, any>; mappings: Record<string, string> }> = {
    okta: { name: "Okta", sample: { mfa_enabled_all: true, sso_enforced: true, access_reviews_quarterly: true }, mappings: { mfa_enabled_all: "mfa_all", sso_enforced: "sso_enforced", access_reviews_quarterly: "access_reviews" } },
    google_workspace: { name: "Google Workspace", sample: { mfa_enabled_all: true, password_policy_enforced: true, log_export_available: true }, mappings: { mfa_enabled_all: "mfa_all", password_policy_enforced: "password_policy", log_export_available: "produce_logs" } },
    workday: { name: "Workday", sample: { background_checks: true, security_training: true, offboarding_flow: true }, mappings: { background_checks: "background_checks", security_training: "security_training", offboarding_flow: "offboarding" } },
    bamboohr: { name: "BambooHR", sample: { background_checks: false, security_training: true }, mappings: { background_checks: "background_checks", security_training: "security_training" } },
    netsuite: { name: "NetSuite", sample: { change_tickets_required: true }, mappings: { change_tickets_required: "ticketing" } },
    quickbooks: { name: "QuickBooks", sample: { sla_tracking: false }, mappings: { sla_tracking: "sla_tracking" } },
  };

  function connectProvider(key: ProviderKey) {
    setConnections(prev => ({ ...prev, [key]: { connected: true, lastSync: new Date().toISOString(), data: providerCatalog[key].sample } }));
  }
  function disconnectProvider(key: ProviderKey) {
    setConnections(prev => ({ ...prev, [key]: { connected: false } }));
  }
  function ingestNow() {
    const fwKey = ingestTargetFw;
    const base = answersByFw[fwKey] || {};
    let merged = { ...base };
    for (const key of Object.keys(connections) as ProviderKey[]) {
      const conn = connections[key];
      if (!conn.connected || !conn.data) continue;
      const map = providerCatalog[key].mappings;
      merged = applyIntegrationsToAnswers(merged, conn.data, map, ingestOverwrite);
    }
    setAnswersByFw(prev => ({ ...prev, [fwKey]: merged }));
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 border-r min-h-screen p-4 space-y-4">
          <div className="text-xl font-semibold">Compliance Console</div>
          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "frameworks", label: "Frameworks" },
              { id: "assessments", label: "Assessments" },
              { id: "risks", label: "Risks" },
              { id: "integrations", label: "Integrations" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setRoute(item.id as any)}
                className={classNames(
                  "w-full text-left px-3 py-2 rounded-lg transition",
                  route === item.id ? "bg-gray-900 text-white" : "hover:bg-gray-100"
                )}
              >{item.label}</button>
            ))}
          </nav>

          {/* Quick Stats for selected framework */}
          <div className="pt-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Quick Stats (Current)</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Answered</span><span>{answered}/{totalQs}</span></div>
              <div className="flex justify-between"><span>Done</span><span>{doneCount}</span></div>
              <div className="flex justify-between"><span>Left</span><span>{leftCount}</span></div>
              <div className="flex justify-between"><span>Weighted</span><span>{completion}%</span></div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {route === "dashboard" && (
            <DashboardMultiView summaries={dashboardSummaries} consolidated={consolidated} risks={derivedRisks} />
          )}

          {route === "frameworks" && (
            <FrameworksView
              frameworks={frameworks}
              activeFwKeys={activeFwKeys}
              onToggleActive={(key) => setActiveFwKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
              onAdd={() => {
                if (!newFw.name.trim()) return;
                const key = newFw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                setFrameworks(f => [...f, { key, name: newFw.name.trim(), version: newFw.version.trim(), questions: [] }]);
                setNewFw({ name: "", version: "" });
              }}
              newFw={newFw}
              setNewFw={setNewFw}
              selectedFwKey={selectedFwKey}
              setSelectedFwKey={setSelectedFwKey}
            />
          )}

          {route === "assessments" && (
            <AssessmentsView
              allFrameworks={frameworks}
              activeFwKeys={activeFwKeys}
              selectedFwKey={selectedFwKey}
              setSelectedFwKey={setSelectedFwKey}

              framework={selectedFw}
              answers={answers}
              notes={notes}
              onAnswer={setAnswerForSelected}
              onNote={setNoteForSelected}
              onReset={resetAssessment}
              onRunAI={runAI}
              aiOutput={aiByFw[selectedFwKey] || ""}
              completion={completion}
              sectionCoverage={sectionCoverage}
            />
          )}

          {route === "risks" && (
            <RisksView
              risks={derivedRisks}
              frameworks={frameworks}
              activeFwKeys={activeFwKeys}
            />
          )}

          {route === "integrations" && (
            <IntegrationsView
              providerCatalog={providerCatalog}
              connections={connections}
              onConnect={connectProvider}
              onDisconnect={disconnectProvider}
              ingestOverwrite={ingestOverwrite}
              setIngestOverwrite={setIngestOverwrite}
              ingestTargetFw={ingestTargetFw}
              setIngestTargetFw={setIngestTargetFw}
              frameworks={frameworks}
              onIngest={ingestNow}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard (multi + consolidated) ─────────────────────────────────────
const KPI: React.FC<{ title: string; value: string; sub?: string }>=({ title, value, sub })=> (
  <div className="rounded-2xl border p-4 shadow-sm">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

function DashboardMultiView({ summaries, consolidated, risks }:{
  summaries: { key: string; name: string; version?: string; total: number; done: number; partial: number; left: number; completion: number; grade: string; }[];
  consolidated: { pct: number; grade: string };
  risks: Risk[];
}) {
  const openRisks = risks.filter(r => r.status !== "Closed");
  const topRisks = [...openRisks].sort((a,b)=> (b.impact*b.likelihood)-(a.impact*a.likelihood)).slice(0,4);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Consolidated report */}
      <div className="rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Consolidated Report</div>
            <div className="text-3xl font-semibold">{consolidated.pct}%</div>
            <div className="text-xs text-gray-500">Overall weighted completion across Active frameworks — Grade {consolidated.grade}</div>
          </div>
          <Badge>Active: {summaries.length}</Badge>
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-gray-100">
          <div className="h-3 rounded-full bg-gray-900" style={{ width: `${consolidated.pct}%` }} />
        </div>
      </div>

      {/* Per‑framework cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summaries.map(s => (
          <div key={s.key} className="rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">{s.name} {s.version && <span className="text-gray-500">{s.version}</span>}</div>
                <div className="text-xs text-gray-500">Questions: {s.total}</div>
              </div>
              <Badge>{s.completion}% • {s.grade}</Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 mb-4">
              <div className="h-2 rounded-full bg-gray-900" style={{ width: `${s.completion}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KPI title="Done" value={`${s.done}`} />
              <KPI title="Partial" value={`${s.partial}`} />
              <KPI title="Left" value={`${s.left}`} />
            </div>
            <div className="text-xs text-gray-500 mt-3">Grade uses weighted controls (High=3, Med=2, Low=1).</div>
          </div>
        ))}
      </div>

      {/* Risk snapshot */}
      <div className="rounded-2xl border p-5 shadow-sm">
        <div className="font-medium mb-2">Top Open Risks (auto‑generated from answers)</div>
        {topRisks.length === 0 ? (
          <div className="text-sm text-gray-500">No open risks 🎉</div>
        ) : (
          <ul className="divide-y">
            {topRisks.map(r => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-gray-500">Score {r.likelihood*r.impact} • {r.status} {r.frameworkKey?`• ${r.frameworkKey}`:""}</div>
                </div>
                <Badge>L{r.likelihood}×I{r.impact}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Frameworks ──────────────────────────────────────────────────────────
function FrameworksView({ frameworks, activeFwKeys, onToggleActive, onAdd, newFw, setNewFw, selectedFwKey, setSelectedFwKey }: {
  frameworks: Framework[];
  activeFwKeys: string[];
  onToggleActive: (key: string) => void;
  onAdd: () => void;
  newFw: { name: string; version: string };
  setNewFw: (v: { name: string; version: string }) => void;
  selectedFwKey: string;
  setSelectedFwKey: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Frameworks</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium">Available Frameworks</div>
            <div className="text-xs text-gray-500">Toggle Active and Select one to edit</div>
          </div>
          <ul className="divide-y">
            {frameworks.map(fw => {
              const isActive = activeFwKeys.includes(fw.key);
              return (
                <li key={fw.key} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {fw.name} {fw.version && <span className="text-gray-500">{fw.version}</span>}
                      {isActive && <Badge>Active</Badge>}
                    </div>
                    <div className="text-xs text-gray-500">Questions: {fw.questions.length || 0}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onToggleActive(fw.key)} className={classNames("px-3 py-1.5 rounded-lg border", isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100")}>
                      {isActive ? "Active" : "Activate"}
                    </button>
                    <button onClick={() => setSelectedFwKey(fw.key)} className={classNames("px-3 py-1.5 rounded-lg border", selectedFwKey === fw.key ? "bg-gray-900 text-white" : "hover:bg-gray-100")}>
                      {selectedFwKey === fw.key ? "Selected" : "Select"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border p-5 shadow-sm">
          <div className="font-medium mb-3">Add Framework</div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="e.g., PCI DSS" value={newFw.name} onChange={e=>setNewFw({ ...newFw, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Version / Notes</label>
              <input className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="e.g., 4.0" value={newFw.version} onChange={e=>setNewFw({ ...newFw, version: e.target.value })} />
            </div>
            <button onClick={onAdd} className="w-full rounded-lg bg-gray-900 text-white px-4 py-2">Add</button>
            <div className="text-xs text-gray-500">Toggle multiple frameworks as Active to track them together on the Dashboard.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assessments (with clearer section coverage) ─────────────────────────
function AssessmentsView({ allFrameworks, activeFwKeys, selectedFwKey, setSelectedFwKey, framework, answers, notes, onAnswer, onNote, onReset, onRunAI, aiOutput, completion, sectionCoverage }:{
  allFrameworks: Framework[];
  activeFwKeys: string[];
  selectedFwKey: string;
  setSelectedFwKey: (k: string) => void;
  framework: Framework;
  answers: Record<string, Answer>;
  notes: Record<string, string>;
  onAnswer: (id: string, v: Answer) => void;
  onNote: (id: string, v: string) => void;
  onReset: () => void;
  onRunAI: () => void;
  aiOutput: string;
  completion: number;
  sectionCoverage: { key: string; total: number; yes: number; partial: number; pct: number; }[];
}) {
  const grouped = useMemo(() => groupBy(framework.questions, "group"), [framework]);
  const activeFrameworks = allFrameworks.filter(f => activeFwKeys.includes(f.key));
  const selectList = activeFrameworks.length ? activeFrameworks : allFrameworks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <div className="flex items-center gap-3">
          <select value={selectedFwKey} onChange={(e) => setSelectedFwKey(e.target.value)} className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            {selectList.map(fw => (
              <option key={fw.key} value={fw.key}>{fw.name} {fw.version ? `(${fw.version})` : ""}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Badge>{framework.name} {framework.version}</Badge>
            <div className="text-sm text-gray-500">Weighted: {completion}% (grade {gradeFromPercent(completion)})</div>
          </div>
        </div>
      </div>

      {/* Section coverage table (friendly labels) */}
      {sectionCoverage.length > 0 && (
        <div className="rounded-2xl border p-4 shadow-sm">
          <div className="font-medium mb-2">Coverage by Clause Section</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500"><th className="py-2 pr-4">Section</th><th className="py-2 pr-4">Yes</th><th className="py-2 pr-4">Partial</th><th className="py-2 pr-4">Total</th><th className="py-2">Coverage</th></tr>
              </thead>
              <tbody>
                {sectionCoverage.map(r => (
                  <tr key={r.key} className="border-t">
                    <td className="py-2 pr-4">{r.key}</td>
                    <td className="py-2 pr-4">{r.yes}</td>
                    <td className="py-2 pr-4">{r.partial}</td>
                    <td className="py-2 pr-4">{r.total}</td>
                    <td className="py-2"><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-gray-900 rounded-full" style={{width:`${r.pct}%`}}/></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-500 mt-2">Coverage = (Yes + 0.5 × Partial) ÷ Total.</div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-gray-900" style={{ width: `${completion}%` }} />
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([group, qs]) => (
          <div key={group} className="rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-medium">{group}</div>
            <div className="divide-y">
              {qs.map(q => (
                <div key={q.id} className="p-4 grid md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-6">
                    <div className="font-medium text-sm">{q.text}</div>
                    {q.clause && <div className="text-xs text-gray-500 mt-1">Section: {friendlyClauseSection(q.clause)} • Weight {q.weight ?? 1}{q.maturity ? ` • Maturity ${q.maturity}`: ""}</div>}
                  </div>
                  <div className="md:col-span-3">
                    <div className="flex flex-wrap gap-2">
                      {(q.choices || ynu()).map(c => (
                        <button key={c.value} onClick={() => onAnswer(q.id, c.value)} className={classNames("px-3 py-1.5 rounded-lg border text-sm", answers[q.id] === c.value ? "bg-gray-900 text-white" : "hover:bg-gray-100")}>{c.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Notes / evidence link" value={notes[q.id] || ""} onChange={e=>onNote(q.id, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onRunAI} className="rounded-lg bg-gray-900 text-white px-4 py-2">Run AI analysis</button>
        <button onClick={onReset} className="rounded-lg border px-4 py-2 hover:bg-gray-50">Reset answers</button>
        <span className="text-xs text-gray-500">Risks update automatically when you change answers.</span>
      </div>

      {aiOutput && (
        <div className="rounded-2xl border p-5 shadow-sm whitespace-pre-line">
          <div className="font-medium mb-2">AI Feedback & Suggestions</div>
          <pre className="text-sm leading-6 whitespace-pre-wrap">{aiOutput}</pre>
        </div>
      )}
    </div>
  );
}

// ── Risks (auto‑derived from answers) ───────────────────────────────────
function RisksView({ risks, frameworks, activeFwKeys }:{ risks: Risk[]; frameworks: Framework[]; activeFwKeys: string[]; }) {
  const [filterFw, setFilterFw] = useState<string>("all");
  const active = frameworks.filter(f=>activeFwKeys.includes(f.key));
  const list = risks.filter(r => filterFw === "all" ? true : r.frameworkKey === filterFw);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Risks</h1>
        <div className="flex items-center gap-2">
          <select value={filterFw} onChange={e=>setFilterFw(e.target.value)} className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All frameworks</option>
            {active.map(f=> <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Open" value={`${list.filter(r=>r.status!=="Closed" && r.status!=="Accepted").length}`} />
        <KPI title="Mitigating" value={`${list.filter(r=>r.status==="Mitigating").length}`} />
        <KPI title="Accepted/Closed" value={`${list.filter(r=>r.status==="Accepted"||r.status==="Closed").length}`} />
        <KPI title="Total" value={`${list.length}`} />
      </div>

      {/* Risk list (read‑only; managed via Assessments) */}
      <div className="rounded-2xl border p-5 shadow-sm">
        <div className="font-medium mb-3">Risk Register (auto‑generated from Assessments)</div>
        <div className="text-xs text-gray-500 mb-3">Update answers in Assessments to resolve/mitigate risks.</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Framework/Control</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">{r.title}</td>
                  <td className="py-2 pr-4">{r.likelihood*r.impact} <span className="text-gray-500">(L{r.likelihood}×I{r.impact})</span></td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4">{r.frameworkKey||"—"}{r.controlId?` • ${r.controlId}`:""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Integrations ───────────────────────────────────────────────────────
function IntegrationsView({ providerCatalog, connections, onConnect, onDisconnect, ingestOverwrite, setIngestOverwrite, ingestTargetFw, setIngestTargetFw, frameworks, onIngest }:{
  providerCatalog: Record<string, { name: string; sample: Record<string, any>; mappings: Record<string, string> }>;
  connections: Record<string, { connected: boolean; lastSync?: string; data?: Record<string, any> }>;
  onConnect: (k: any) => void;
  onDisconnect: (k: any) => void;
  ingestOverwrite: boolean;
  setIngestOverwrite: (v: boolean) => void;
  ingestTargetFw: string;
  setIngestTargetFw: (v: string) => void;
  frameworks: Framework[];
  onIngest: () => void;
}) {
  const providers = Object.entries(providerCatalog);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Integrations</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers list */}
        <div className="lg:col-span-2 rounded-2xl border p-5 shadow-sm">
          <div className="font-medium mb-3">Connect Providers</div>
          <ul className="divide-y">
            {providers.map(([key, meta]) => {
              const conn = connections[key as keyof typeof connections] || { connected: false };
              return (
                <li key={key} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">{meta.name} {conn.connected && <Badge>Connected</Badge>}</div>
                    <div className="text-xs text-gray-500">Maps to: {Object.values(meta.mappings).join(", ") || "(no mappings)"}</div>
                    {conn.connected && conn.data && (
                      <pre className="text-xs bg-gray-50 border rounded-lg p-2 mt-2 max-h-40 overflow-auto">{JSON.stringify(conn.data, null, 2)}</pre>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {conn.connected ? (
                      <button onClick={() => onDisconnect(key)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-100">Disconnect</button>
                    ) : (
                      <button onClick={() => onConnect(key)} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white">Connect</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ingest panel */}
        <div className="rounded-2xl border p-5 shadow-sm space-y-3">
          <div className="font-medium">Apply Data to Assessments</div>
          <label className="text-sm text-gray-600">Target framework</label>
          <select className="w-full rounded-lg border px-3 py-2" value={ingestTargetFw} onChange={e=>setIngestTargetFw(e.target.value)}>
            {frameworks.map(f=> <option key={f.key} value={f.key}>{f.name} {f.version||""}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ingestOverwrite} onChange={e=>setIngestOverwrite(e.target.checked)} />
            Overwrite existing answers (otherwise only fill blanks)
          </label>

          <button onClick={onIngest} className="w-full rounded-lg bg-gray-900 text-white px-4 py-2">Ingest from connected providers</button>
          <div className="text-xs text-gray-500">We infer Yes/No from provider booleans. You can adjust answers afterward in Assessments. Evidence links can go into Notes.</div>
        </div>
      </div>
    </div>
  );
}
