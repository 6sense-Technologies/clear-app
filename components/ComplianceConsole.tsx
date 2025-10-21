
"use client";
import React, { useMemo, useState } from "react";

type Answer = "yes" | "no" | "partial" | "unsure";
type Weight = 1 | 2 | 3;
type Question = { id: string; text: string; group: string; clause?: string; weight?: Weight; choices?: { value: Answer; label: string }[] };
type Framework = { key: string; name: string; version?: string; questions: Question[] };
type Risk = { id: string; title: string; frameworkKey?: string; likelihood: 1|2|3|4|5; impact: 1|2|3|4|5; status: "Open"|"Mitigating"|"Accepted"|"Closed" };

function cls(...s: (string|false|undefined)[]) { return s.filter(Boolean).join(" "); }
const Badge: React.FC<{children: React.ReactNode}> = ({children}) => <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">{children}</span>;

const ISO27001: Framework = {
  key: "iso27001",
  name: "ISO/IEC 27001",
  version: "2022",
  questions: [
    { id: "info_sec_policy", text: "Information Security Policy exists?", group: "Policies", clause: "A.5.1", weight: 3, choices: [{value:"yes",label:"Yes"},{value:"no",label:"No"},{value:"partial",label:"Partial"},{value:"unsure",label:"Not sure"}]},
    { id: "mfa_all", text: "MFA enforced for all?", group: "Technical", clause: "A.5.17", weight: 3, choices: [{value:"yes",label:"Yes"},{value:"no",label:"No"},{value:"partial",label:"Partial"},{value:"unsure",label:"Not sure"}]},
    { id: "encrypt_rest", text: "Encryption at rest enabled?", group: "Technical", clause: "A.8.25", weight: 3, choices: [{value:"yes",label:"Yes"},{value:"no",label:"No"},{value:"partial",label:"Partial"},{value:"unsure",label:"Not sure"}]},
    { id: "training", text: "Security awareness training?", group: "People", clause: "A.6.3", weight: 2, choices: [{value:"yes",label:"Yes"},{value:"no",label:"No"},{value:"partial",label:"Partial"},{value:"unsure",label:"Not sure"}]},
  ]
};

function weightedCompletion(qs: Question[], a: Record<string, Answer>) {
  let g=0,m=0;
  for (const q of qs){ const w=q.weight??1; m+=w; const v=a[q.id]; if(!v) continue; if(v==="yes") g+=w; else if(v==="partial") g+=w*0.5; }
  const pct = m? Math.round((g/m)*100):0; return {pct};
}
function grade(p:number){ if(p>=90) return "A"; if(p>=80) return "B"; if(p>=70) return "C"; if(p>=60) return "D"; return "E"; }

export default function ComplianceConsole(){
  const [route,setRoute]=useState<"dashboard"|"frameworks"|"assessments"|"risks"|"integrations">("dashboard");
  const [frameworks,setFrameworks]=useState<Framework[]>([ISO27001, {key:"soc2",name:"SOC 2",version:"TSC",questions:[]}]);
  const [active,setActive]=useState<string[]>(["iso27001"]);
  const [selected,setSelected]=useState<string>("iso27001");
  const [answersByFw,setAnswersByFw]=useState<Record<string,Record<string,Answer>>>({});
  const selectedFw = useMemo(()=>frameworks.find(f=>f.key===selected)!,[frameworks,selected]);
  const answers = answersByFw[selected]||{};
  const completion = weightedCompletion(selectedFw.questions, answers).pct;

  const risks: Risk[] = useMemo(()=>{
    const fwKey = selected;
    const fw = frameworks.find(f=>f.key===fwKey); if(!fw) return [];
    const ans = answersByFw[fwKey]||{};
    return fw.questions.flatMap(q=>{
      const a = ans[q.id];
      if(!a || a==="yes") return [];
      const status = a==="partial" ? "Mitigating" : "Open";
      const impact = q.weight===3?5:q.weight===2?3:2;
      return [{ id: fwKey+":"+q.id, title:q.text, frameworkKey: fwKey, likelihood: 3, impact, status } as Risk];
    }).sort((x,y)=> (y.impact*y.likelihood)-(x.impact*x.likelihood));
  },[answersByFw,frameworks,selected]);

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 border-r p-4 space-y-4">
        <div className="text-xl font-semibold">Compliance Console</div>
        <nav className="space-y-1">
          {["dashboard","frameworks","assessments","risks","integrations"].map(k=>(
            <button key={k} onClick={()=>setRoute(k as any)}
              className={cls("w-full text-left px-3 py-2 rounded-lg transition", route===k? "bg-gray-900 text-white":"hover:bg-gray-100")}>
              {k[0].upper()+k.slice(1)}
            </button>
          ))}
        </nav>
        <div className="pt-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Quick Stats</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Weighted</span><span>{completion}%</span></div>
            <div className="flex justify-between"><span>Active FWs</span><span>{active.length}</span></div>
            <div className="flex justify-between"><span>Open Risks</span><span>{risks.filter(r=>r.status!=='Closed').length}</span></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 space-y-6">
        {route==="dashboard" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Consolidated Report</div>
                  <div className="text-3xl font-semibold">{completion}%</div>
                  <div className="text-xs text-gray-500">Grade {grade(completion)}</div>
                </div>
                <Badge>Active: {active.length}</Badge>
              </div>
              <div className="mt-4 h-3 w-full rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-gray-900" style={{width:`${completion}%`}}/>
              </div>
            </div>

            <div className="rounded-2xl border p-5 shadow-sm">
              <div className="font-medium mb-2">Top Open Risks</div>
              {risks.length===0? <div className="text-sm text-gray-500">No open risks 🎉</div> : (
                <ul className="divide-y">
                  {risks.slice(0,4).map(r=> (
                    <li key={r.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-gray-500">Score {r.impact*r.likelihood} • {r.status}</div>
                      </div>
                      <Badge>L{r.likelihood}×I{r.impact}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {route==="frameworks" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Frameworks</h1>
            <div className="rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-500">Available</div>
                <div className="text-xs text-gray-500">Toggle Active and Select to edit</div>
              </div>
              <ul className="divide-y">
                {frameworks.map(f=>{
                  const isActive = active.includes(f.key);
                  return (
                    <li key={f.key} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {f.name} {f.version && <span className="text-gray-500">{f.version}</span>}
                          {isActive && <Badge>Active</Badge>}
                        </div>
                        <div className="text-xs text-gray-500">Questions: {f.questions.length}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=> setActive(prev=> prev.includes(f.key)? prev.filter(k=>k!==f.key): [...prev,f.key])}
                          className={cls("px-3 py-1.5 rounded-lg border", isActive? "bg-gray-900 text-white":"hover:bg-gray-100")}>
                          {isActive ? "Active" : "Activate"}
                        </button>
                        <button onClick={()=> setSelected(f.key)}
                          className={cls("px-3 py-1.5 rounded-lg border", selected===f.key? "bg-gray-900 text-white":"hover:bg-gray-100")}>
                          {selected===f.key ? "Selected" : "Select"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {route==="assessments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="text-2xl font-semibold">Assessments</h1>
              <div className="flex items-center gap-3">
                <select className="rounded-lg border px-3 py-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}>
                  {frameworks.filter(f=>active.includes(f.key)).map(f=>(<option key={f.key} value={f.key}>{f.name} {f.version?`(${f.version})`:""}</option>))}
                </select>
                <Badge>{selectedFw.name} {selectedFw.version}</Badge>
                <div className="text-sm text-gray-500">Weighted: {completion}% (grade {grade(completion)})</div>
              </div>
            </div>
            {selectedFw.questions.length===0? (
              <div className="rounded-2xl border p-4 shadow-sm text-sm text-gray-600">No questions added for this framework.</div>
            ) : (
              <div className="space-y-4">
                {selectedFw.questions.map(q=> (
                  <div key={q.id} className="rounded-2xl border p-4 shadow-sm">
                    <div className="font-medium">{q.text}</div>
                    <div className="text-xs text-gray-500 mb-2">{q.clause ? `Clause ${q.clause}` : ""}</div>
                    <div className="flex flex-wrap gap-2">
                      {q.choices?.map(c=>{
                        const curr = answers[c.value];
                        return (
                          <button key={c.value} onClick={()=>{
                            const current = answersByFw[selected]||{};
                            const next = { **current, [q.id]: c.value } as Record<string,Answer>;
                            setAnswersByFw(prev=> ({ **prev, [selected]: next }));
                          }}
                            className={cls("px-3 py-1.5 rounded-lg border text-sm",
                              (answersByFw[selected]||{})[q.id]===c.value? "bg-gray-900 text-white":"hover:bg-gray-100")}>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {route==="risks" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Risks</h1>
            <div className="rounded-2xl border p-5 shadow-sm">
              {risks.length===0? <div className="text-sm text-gray-500">No risks yet.</div> : (
                <ul className="divide-y">
                  {risks.map(r=> (
                    <li key={r.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-gray-500">Score {r.impact*r.likelihood} • {r.status}</div>
                      </div>
                      <Badge>{r.frameworkKey}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {route==="integrations" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <div className="rounded-2xl border p-5 shadow-sm text-sm text-gray-700">
              Connect HRMS/Accounting/IdP providers and map fields to answers. (Demo placeholder)
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

declare global { interface String { upper(): string } }
// tiny helper
// eslint-disable-next-line no-extend-native
String.prototype.upper = function(){ return this.toUpperCase(); };
