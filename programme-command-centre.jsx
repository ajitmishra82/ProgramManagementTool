import { useState, useEffect, useCallback } from "react";

// ── DATA ─────────────────────────────────────────────────────────────────────
const PROJECTS = [
  { id:"P1", name:"CRM Platform Migration",    programme:"Digital Transformation",        lead:"Sarah Chen",      rag:"A", pred:"R", pct:52, budget:2400000, spent:1680000, risks:3, msTotal:8,  msDone:4, start:0, end:8,  deps:["P3"],        rationale:"3-week scope creep in data cleansing phase; resource contention with P8." },
  { id:"P2", name:"API Gateway Modernisation", programme:"Digital Transformation",        lead:"Marcus Johnson",  rag:"G", pred:"G", pct:65, budget:800000,  spent:480000,  risks:1, msTotal:5,  msDone:3, start:1, end:6,  deps:["P7"],        rationale:"On schedule; all milestones green; minor tech debt backlog." },
  { id:"P3", name:"Enterprise Data Lake",      programme:"Infrastructure Modernisation",  lead:"Priya Sharma",    rag:"R", pred:"R", pct:40, budget:3200000, spent:2560000, risks:7, msTotal:10, msDone:3, start:0, end:7,  deps:[],            rationale:"Critical: 80% budget consumed at 40% completion. Vendor delivery failure." },
  { id:"P4", name:"Cloud Migration Wave 2",    programme:"Infrastructure Modernisation",  lead:"Tom Williams",    rag:"A", pred:"A", pct:28, budget:5600000, spent:1400000, risks:4, msTotal:12, msDone:3, start:2, end:11, deps:["P7"],        rationale:"IAM dependency blocks 4 workstreams. Timeline pressure Q4." },
  { id:"P5", name:"Customer Mobile App",       programme:"Customer Experience",           lead:"Aisha Patel",     rag:"G", pred:"G", pct:55, budget:1200000, spent:600000,  risks:2, msTotal:7,  msDone:4, start:1, end:7,  deps:["P2"],        rationale:"Strong delivery cadence; UX sign-off ahead of schedule." },
  { id:"P6", name:"Analytics & BI Platform",  programme:"Customer Experience",           lead:"James Liu",       rag:"A", pred:"R", pct:20, budget:900000,  spent:270000,  risks:5, msTotal:6,  msDone:1, start:2, end:9,  deps:["P3","P1"],   rationale:"Dual dependency on RED Data Lake. Stakeholder alignment gap emerging." },
  { id:"P7", name:"Identity & Access Mgmt",   programme:"Infrastructure Modernisation",  lead:"Rachel Green",    rag:"G", pred:"G", pct:85, budget:650000,  spent:520000,  risks:1, msTotal:6,  msDone:5, start:0, end:5,  deps:[],            rationale:"Near completion; only pen-test and sign-off remaining." },
  { id:"P8", name:"Payment Gateway Upgrade",  programme:"Digital Transformation",        lead:"David Kim",       rag:"R", pred:"R", pct:35, budget:1800000, spent:900000,  risks:8, msTotal:9,  msDone:2, start:1, end:8,  deps:["P7","P2"],   rationale:"PCI-DSS compliance gap identified. Security review mandated. 8 open risks." },
];

const DEPS = [
  { from:"P7", to:"P2", label:"Auth layer" },
  { from:"P3", to:"P1", label:"Data source" },
  { from:"P3", to:"P6", label:"Data feed" },
  { from:"P1", to:"P6", label:"CRM data" },
  { from:"P2", to:"P8", label:"API layer" },
  { from:"P7", to:"P8", label:"IAM required" },
  { from:"P2", to:"P5", label:"API layer" },
  { from:"P7", to:"P4", label:"IAM required" },
];

const PROGRAMMES = [...new Set(PROJECTS.map(p => p.programme))];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TODAY_MONTH = 3; // April index

const RAG_COLOR  = { R:"#ef4444", A:"#f59e0b", G:"#22c55e" };
const RAG_BG     = { R:"rgba(239,68,68,0.12)", A:"rgba(245,158,11,0.12)", G:"rgba(34,197,94,0.12)" };
const RAG_LABEL  = { R:"RED", A:"AMBER", G:"GREEN" };
const fK = n => "£" + Math.round(n/1000).toLocaleString() + "k";
const fM = n => n >= 1e6 ? "£" + (n/1e6).toFixed(1) + "m" : "£" + Math.round(n/1e3) + "k";
const pmap = Object.fromEntries(PROJECTS.map(p => [p.id, p]));

// ── TESTING PHASES ─────────────────────────────────────────────────────────
const PHASES = [
  { name: "Analysis", pct: 10, color: "#3b82f6" },
  { name: "Dev", pct: 40, color: "#1d4ed8" },
  { name: "CIT", pct: 15, color: "#10b981" },
  { name: "SIT", pct: 15, color: "#f97316" },
  { name: "UAT", pct: 15, color: "#a855f7" },
  { name: "Integration", pct: 5, color: "#6b7280" },
];

function calculatePhaseProgress(projectPct) {
  const phasesWithProgress = [];
  let cumulativePct = 0;
  
  for (const phase of PHASES) {
    const phaseStart = cumulativePct;
    const phaseEnd = cumulativePct + phase.pct;
    let status = "pending";
    
    if (projectPct >= phaseEnd) {
      status = "completed";
    } else if (projectPct > phaseStart) {
      status = "in-progress";
    }
    
    phasesWithProgress.push({
      ...phase,
      start: phaseStart,
      end: phaseEnd,
      status,
    });
    
    cumulativePct = phaseEnd;
  }
  return phasesWithProgress;
}

function getDownstream(id) {
  const visited = new Set();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    DEPS.filter(d => d.from === cur).forEach(d => {
      if (!visited.has(d.to)) { visited.add(d.to); queue.push(d.to); }
    });
  }
  visited.delete(id);
  return visited;
}
function getUpstream(id) {
  return new Set(DEPS.filter(d => d.to === id).map(d => d.from));
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily:"'DM Mono', 'Fira Mono', monospace", background:"#0b0f14", minHeight:"100vh", color:"#c9d1d9", fontSize:13 },
  header: { background:"#0d1117", borderBottom:"1px solid #21262d", padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  nav: { display:"flex", background:"#0d1117", borderBottom:"1px solid #21262d", paddingLeft:24 },
  content: { padding:"20px 24px" },
  card: { background:"#0d1117", border:"1px solid #21262d", borderRadius:8, padding:16, marginBottom:16 },
  kpiGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:16 },
  kpi: { background:"#0d1117", border:"1px solid #21262d", borderRadius:8, padding:14 },
  kpiLabel: { fontSize:11, color:"#8b949e", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em" },
  kpiVal: { fontSize:26, fontWeight:700, lineHeight:1, marginBottom:2 },
  kpiSub: { fontSize:11, color:"#6e7681" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th: { textAlign:"left", padding:"8px 10px", fontSize:11, color:"#8b949e", borderBottom:"1px solid #21262d", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" },
  td: { padding:"9px 10px", borderBottom:"1px solid #161b22", verticalAlign:"middle" },
  badge: (r) => ({ display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:700, background:RAG_BG[r], color:RAG_COLOR[r], letterSpacing:"0.06em" }),
  dot: (r,sz=8) => ({ display:"inline-block", width:sz, height:sz, borderRadius:"50%", background:RAG_COLOR[r], flexShrink:0 }),
  pill: { padding:"4px 12px", borderRadius:4, fontSize:11, background:"#161b22", border:"1px solid #21262d", color:"#c9d1d9", cursor:"pointer", fontFamily:"inherit" },
  pillActive: { padding:"4px 12px", borderRadius:4, fontSize:11, background:"#1f6feb22", border:"1px solid #1f6feb", color:"#58a6ff", cursor:"pointer", fontFamily:"inherit" },
  btn: { padding:"6px 14px", borderRadius:6, fontSize:12, background:"#161b22", border:"1px solid #30363d", color:"#c9d1d9", cursor:"pointer", fontFamily:"inherit" },
  btnPrimary: { padding:"6px 14px", borderRadius:6, fontSize:12, background:"#1f6feb", border:"1px solid #1f6feb", color:"#fff", cursor:"pointer", fontFamily:"inherit" },
  sectionTitle: { fontSize:13, fontWeight:600, color:"#e6edf3", marginBottom:12, display:"flex", alignItems:"center", gap:8 },
  progBar: (pct,r) => ({ height:4, width:`${pct}%`, background:RAG_COLOR[r]||"#22c55e", borderRadius:2, transition:"width .4s" }),
  row: { display:"flex", gap:12, marginBottom:16 },
};

// ── NAV TAB ──────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"12px 18px", background:"none", border:"none", borderBottom: active?"2px solid #58a6ff":"2px solid transparent",
      color: active?"#58a6ff":"#8b949e", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight: active?600:400, letterSpacing:"0.04em"
    }}>{label}</button>
  );
}

// ── RAG BADGE ─────────────────────────────────────────────────────────────────
function RagBadge({ r }) {
  return <span style={S.badge(r)}>{RAG_LABEL[r]}</span>;
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgBar({ pct, rag }) {
  const c = rag ? RAG_COLOR[rag] : (pct>=70?"#22c55e":pct>=40?"#f59e0b":"#ef4444");
  return (
    <div style={{ background:"#161b22", borderRadius:2, height:4, width:"100%", minWidth:60 }}>
      <div style={{ height:4, width:`${pct}%`, background:c, borderRadius:2 }} />
    </div>
  );
}

// ── SPARK LINE (SVG mini trend) ───────────────────────────────────────────────
function Spark({ data, color }) {
  const w=60, h=20, mn=Math.min(...data), mx=Math.max(...data), range=mx-mn||1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h-((v-mn)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function Dashboard() {
  const R=PROJECTS.filter(p=>p.rag==="R"), A=PROJECTS.filter(p=>p.rag==="A"), G=PROJECTS.filter(p=>p.rag==="G");
  const tBudget=PROJECTS.reduce((s,p)=>s+p.budget,0), tSpent=PROJECTS.reduce((s,p)=>s+p.spent,0);
  const avgPct=Math.round(PROJECTS.reduce((s,p)=>s+p.pct,0)/PROJECTS.length);
  const worsening=PROJECTS.filter(p=>(p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R"));
  const totalRisks=PROJECTS.reduce((s,p)=>s+p.risks,0);

  return (
    <div>
      {/* KPI row */}
      <div style={S.kpiGrid}>
        {[
          { label:"Projects in flight", val:PROJECTS.length, sub:`${PROGRAMMES.length} programmes`, color:"#58a6ff" },
          { label:"RED", val:R.length, sub:R.map(p=>p.name).join(", "), color:"#ef4444" },
          { label:"AMBER", val:A.length, sub:A.map(p=>p.name.split(" ")[0]).join(", "), color:"#f59e0b" },
          { label:"GREEN", val:G.length, sub:"All milestones tracking", color:"#22c55e" },
          { label:"Portfolio budget", val:fM(tBudget), sub:`${fM(tSpent)} spent · ${Math.round(tSpent/tBudget*100)}% burn`, color:"#e6edf3" },
          { label:"Avg completion", val:avgPct+"%", sub:`${totalRisks} open risks`, color:"#e6edf3" },
          { label:"Predicted worsening", val:worsening.length, sub:worsening.map(p=>p.name.split(" ")[0]).join(", ")||"None", color:worsening.length?"#f59e0b":"#22c55e" },
        ].map((k,i) => (
          <div key={i} style={{ ...S.kpi, borderLeft:`3px solid ${k.color}` }}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiVal, color:k.color }}>{k.val}</div>
            <div style={S.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Programme health + Project cards */}
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, marginBottom:16 }}>
        <div style={S.card}>
          <div style={S.sectionTitle}>Programme health</div>
          {PROGRAMMES.map(pg => {
            const ps = PROJECTS.filter(p=>p.programme===pg);
            const aR=ps.filter(p=>p.rag==="R").length, aA=ps.filter(p=>p.rag==="A").length, aG=ps.filter(p=>p.rag==="G").length;
            const overall = aR>0?"R":aA>0?"A":"G";
            const avgC = Math.round(ps.reduce((s,p)=>s+p.pct,0)/ps.length);
            return (
              <div key={pg} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#e6edf3", fontWeight:500 }}>{pg.split(" ").slice(0,2).join(" ")}</span>
                  <RagBadge r={overall} />
                </div>
                <ProgBar pct={avgC} rag={overall} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ fontSize:10, color:"#6e7681" }}>{avgC}% avg · {ps.length} projects</span>
                  <span style={{ fontSize:10, color:"#6e7681" }}>{aR}R/{aA}A/{aG}G</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>All projects — live status</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
            {PROJECTS.map(p => {
              const burnPct = Math.round(p.spent/p.budget*100);
              const overBurn = burnPct > p.pct + 8;
              const worsens = (p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R");
              return (
                <div key={p.id} style={{ background:"#161b22", borderRadius:8, padding:12, border:`1px solid ${worsens?"#f59e0b33":"#21262d"}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#e6edf3", lineHeight:1.3, flex:1, marginRight:6 }}>{p.name}</span>
                    <RagBadge r={p.rag} />
                  </div>
                  <ProgBar pct={p.pct} rag={p.rag} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                    <span style={{ fontSize:11, color:"#6e7681" }}>{p.pct}% done</span>
                    <span style={{ fontSize:11, color:overBurn?"#ef4444":"#6e7681" }}>{burnPct}% burn</span>
                  </div>
                  <div style={{ fontSize:10, color:"#6e7681", marginTop:4 }}>{p.lead} · {p.risks} risks</div>
                  {worsens && (
                    <div style={{ marginTop:6, fontSize:10, color:"#f59e0b", display:"flex", alignItems:"center", gap:4 }}>
                      <span>▲</span> Predicted → <RagBadge r={p.pred} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk heat table */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Portfolio risk exposure</div>
        <div style={{ overflowX:"auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Project","Programme","Lead","RAG","Predicted","Progress","Milestones","Budget burn","Open risks","Alert"].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...PROJECTS].sort((a,b)=>({R:0,A:1,G:2})[a.rag]-({R:0,A:1,G:2})[b.rag]).map(p=>{
                const burn=Math.round(p.spent/p.budget*100);
                const overBurn=burn>p.pct+8;
                const worsens=(p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R");
                return (
                  <tr key={p.id} style={{ background:p.rag==="R"?"rgba(239,68,68,0.04)":p.rag==="A"?"rgba(245,158,11,0.03)":"transparent" }}>
                    <td style={S.td}><span style={{ fontWeight:600, color:"#e6edf3" }}>{p.name}</span></td>
                    <td style={S.td}><span style={{ color:"#8b949e", fontSize:11 }}>{p.programme.split(" ").slice(0,2).join(" ")}</span></td>
                    <td style={S.td}><span style={{ color:"#8b949e" }}>{p.lead}</span></td>
                    <td style={S.td}><RagBadge r={p.rag} /></td>
                    <td style={S.td}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <RagBadge r={p.pred} />
                        {worsens && <span style={{ fontSize:10, color:"#f59e0b" }}>▲</span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <div style={{ minWidth:80 }}>
                        <ProgBar pct={p.pct} rag={p.rag} />
                        <span style={{ fontSize:10, color:"#6e7681" }}>{p.pct}%</span>
                      </div>
                    </td>
                    <td style={S.td}><span style={{ color:"#8b949e" }}>{p.msDone}/{p.msTotal}</span></td>
                    <td style={S.td}>
                      <span style={{ color:overBurn?"#ef4444":"#8b949e" }}>{burn}%</span>
                      {overBurn && <span style={{ fontSize:10, color:"#ef4444", display:"block" }}>⚠ over-burn</span>}
                    </td>
                    <td style={S.td}>
                      <span style={{ color:p.risks>=6?"#ef4444":p.risks>=3?"#f59e0b":"#22c55e", fontWeight:700 }}>{p.risks}</span>
                    </td>
                    <td style={S.td}><span style={{ fontSize:11, color:"#6e7681" }}>{p.rationale.slice(0,48)}…</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── PROJECT REGISTER TAB ──────────────────────────────────────────────────────
function ProjectRegister() {
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const filtered = filter==="ALL" ? PROJECTS : PROJECTS.filter(p=>p.rag===filter);

  return (
    <div style={{ display:"grid", gridTemplateColumns: selected?"1fr 320px":"1fr", gap:16 }}>
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          {["ALL","R","A","G"].map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              style={filter===f ? S.pillActive : S.pill}>
              {f==="ALL"?"All":RAG_LABEL[f]}
              <span style={{ marginLeft:6, opacity:0.7 }}>
                {f==="ALL"?PROJECTS.length:PROJECTS.filter(p=>p.rag===f).length}
              </span>
            </button>
          ))}
        </div>
        <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["","Project","Programme","Lead","Timeline","Progress","Budget","Milestones","Risks","RAG","Predicted"].map((h,i)=>(
                    <th key={i} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const burn=Math.round(p.spent/p.budget*100);
                  const overBurn=burn>p.pct+8;
                  const worsens=(p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R");
                  const isSelected=selected===p.id;
                  return (
                    <tr key={p.id} onClick={()=>setSelected(isSelected?null:p.id)}
                      style={{ cursor:"pointer", background:isSelected?"#1c2128":p.rag==="R"?"rgba(239,68,68,0.04)":p.rag==="A"?"rgba(245,158,11,0.03)":"transparent" }}>
                      <td style={{ ...S.td, width:4, padding:"9px 4px 9px 12px" }}>
                        <div style={{ width:3, height:28, background:RAG_COLOR[p.rag], borderRadius:2 }} />
                      </td>
                      <td style={S.td}><span style={{ fontWeight:600, color:"#e6edf3" }}>{p.name}</span></td>
                      <td style={S.td}><span style={{ color:"#8b949e", fontSize:11 }}>{p.programme.split(" ").slice(0,2).join(" ")}</span></td>
                      <td style={S.td}><span style={{ color:"#8b949e" }}>{p.lead}</span></td>
                      <td style={S.td}><span style={{ color:"#8b949e", whiteSpace:"nowrap" }}>{MONTHS[p.start]}–{MONTHS[p.end]} '24</span></td>
                      <td style={S.td}>
                        <div style={{ minWidth:80 }}>
                          <ProgBar pct={p.pct} rag={p.rag} />
                          <span style={{ fontSize:10, color:"#6e7681" }}>{p.pct}%</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <div style={{ whiteSpace:"nowrap" }}>
                          <span style={{ color:overBurn?"#ef4444":"#8b949e" }}>{fK(p.spent)}</span>
                          <span style={{ color:"#6e7681" }}> / {fK(p.budget)}</span>
                        </div>
                        {overBurn&&<div style={{ fontSize:10, color:"#ef4444" }}>⚠ {burn}% burn</div>}
                      </td>
                      <td style={S.td}><span style={{ color:"#8b949e" }}>{p.msDone}/{p.msTotal}</span></td>
                      <td style={S.td}>
                        <span style={{ color:p.risks>=6?"#ef4444":p.risks>=3?"#f59e0b":"#22c55e", fontWeight:700 }}>{p.risks}</span>
                      </td>
                      <td style={S.td}><RagBadge r={p.rag} /></td>
                      <td style={S.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <RagBadge r={p.pred} />
                          {worsens&&<span style={{ color:"#f59e0b", fontSize:11 }}>▲</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (() => {
        const p = pmap[selected];
        const upstream = [...getUpstream(p.id)].map(id=>pmap[id]);
        const downstream = [...getDownstream(p.id)].map(id=>pmap[id]);
        const burn=Math.round(p.spent/p.budget*100);
        return (
          <div style={{ ...S.card, position:"sticky", top:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#e6edf3", marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:11, color:"#8b949e" }}>{p.programme}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ ...S.btn, padding:"2px 8px" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { l:"RAG", v:<RagBadge r={p.rag} /> },
                { l:"Predicted", v:<RagBadge r={p.pred} /> },
                { l:"Progress", v:`${p.pct}%` },
                { l:"Budget burn", v:`${burn}%` },
                { l:"Milestones", v:`${p.msDone}/${p.msTotal}` },
                { l:"Open risks", v:p.risks, c:p.risks>=6?"#ef4444":p.risks>=3?"#f59e0b":"#22c55e" },
              ].map((row,i)=>(
                <div key={i} style={{ background:"#161b22", borderRadius:6, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"#6e7681", textTransform:"uppercase", marginBottom:3 }}>{row.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:row.c||"#e6edf3" }}>{row.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:"#8b949e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Status rationale</div>
              <div style={{ fontSize:12, color:"#c9d1d9", lineHeight:1.6, background:"#161b22", padding:10, borderRadius:6 }}>{p.rationale}</div>
            </div>
            {upstream.length>0&&(
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#8b949e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Upstream dependencies ({upstream.length})</div>
                {upstream.map(u=>(
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid #161b22" }}>
                    <div style={S.dot(u.rag,7)} /><span style={{ fontSize:12, flex:1 }}>{u.name}</span><RagBadge r={u.rag} />
                  </div>
                ))}
              </div>
            )}
            {downstream.length>0&&(
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#8b949e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Downstream impact ({downstream.length})</div>
                {downstream.map(d=>(
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid #161b22" }}>
                    <div style={S.dot(d.rag,7)} /><span style={{ fontSize:12, flex:1 }}>{d.name}</span><RagBadge r={d.rag} />
                  </div>
                ))}
                <div style={{ marginTop:8, padding:10, background:"rgba(245,158,11,0.1)", borderRadius:6, border:"1px solid rgba(245,158,11,0.2)", fontSize:11, color:"#f59e0b" }}>
                  ⚠ Slippage in <strong>{p.name}</strong> cascades to {downstream.length} project{downstream.length>1?"s":""} — {fM(downstream.reduce((s,d)=>s+d.budget,0))} at risk.
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── DEPENDENCY MAP TAB ────────────────────────────────────────────────────────
const NODE_POS = {
  P7:{x:100,y:80}, P3:{x:400,y:80},
  P2:{x:220,y:210}, P1:{x:380,y:210},
  P4:{x:100,y:340}, P5:{x:220,y:340}, P8:{x:340,y:340}, P6:{x:480,y:340},
};

function DependencyMap() {
  const [hoverId, setHoverId] = useState(null);
  const downstream = hoverId ? getDownstream(hoverId) : new Set();
  const upstream = hoverId ? getUpstream(hoverId) : new Set();

  return (
    <div>
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={S.sectionTitle}>Interactive dependency network</div>
        <p style={{ fontSize:12, color:"#6e7681", marginBottom:16 }}>Hover any project node to highlight its upstream dependencies and downstream cascade impact. Arrow direction = dependency flow.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:16 }}>
          <div style={{ background:"#070b0f", borderRadius:8, padding:16, border:"1px solid #21262d", overflowX:"auto" }}>
            <svg viewBox="0 0 600 440" style={{ width:"100%", minWidth:400 }}>
              <defs>
                {["R","A","G","N"].map(k=>(
                  <marker key={k} id={`arrow${k}`} markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
                    <path d="M0,0 L0,6 L8,3z" fill={k==="R"?"#ef4444":k==="A"?"#f59e0b":k==="G"?"#22c55e":"#30363d"} />
                  </marker>
                ))}
              </defs>
              {/* edges */}
              {DEPS.map((d,i) => {
                const f=NODE_POS[d.from], t=NODE_POS[d.to];
                if(!f||!t) return null;
                const dx=t.x-f.x, dy=t.y-f.y, len=Math.sqrt(dx*dx+dy*dy)||1;
                const nx=dx/len, ny=dy/len;
                const NR=55;
                const sx=f.x+nx*NR, sy=f.y+ny*22, ex=t.x-nx*NR, ey=t.y-ny*22;
                const isActive=hoverId&&(d.from===hoverId||d.to===hoverId||(downstream.has(d.to)&&downstream.has(d.from))||upstream.has(d.from));
                const isDown=hoverId&&downstream.has(d.to)&&(d.from===hoverId||downstream.has(d.from));
                const isUp=hoverId&&upstream.has(d.from)&&d.to===hoverId;
                const col=!hoverId?"#30363d":isUp?"#f59e0b":isDown?"#ef4444":isActive?"#8b949e":"#1c2128";
                const mk=`url(#arrow${!hoverId?"N":isUp?"A":isDown?"R":isActive?"N":"N"})`;
                const mx=(sx+ex)/2, my=(sy+ey)/2;
                return (
                  <g key={i} opacity={hoverId&&!isActive&&!isDown&&!isUp?0.15:1}>
                    <line x1={sx.toFixed(1)} y1={sy.toFixed(1)} x2={ex.toFixed(1)} y2={ey.toFixed(1)}
                      stroke={col} strokeWidth={isActive?2:1.5} markerEnd={mk} />
                    {isActive&&<text x={mx.toFixed(0)} y={(my-7).toFixed(0)} fontSize={9} fill="#8b949e" textAnchor="middle" fontFamily="monospace">{d.label}</text>}
                  </g>
                );
              })}
              {/* nodes */}
              {PROJECTS.map(p => {
                const pos=NODE_POS[p.id];
                if(!pos) return null;
                const isHov=hoverId===p.id;
                const isDown=downstream.has(p.id);
                const isUp=upstream.has(p.id);
                const dimmed=hoverId&&!isHov&&!isDown&&!isUp;
                const borderCol=isHov?"#58a6ff":isDown?"#ef4444":isUp?"#f59e0b":RAG_COLOR[p.rag];
                const bgFill=isHov?"#1c2128":isDown?"rgba(239,68,68,0.08)":isUp?"rgba(245,158,11,0.08)":"#0d1117";
                return (
                  <g key={p.id} style={{ cursor:"pointer" }} opacity={dimmed?0.2:1}
                    onMouseEnter={()=>setHoverId(p.id)} onMouseLeave={()=>setHoverId(null)}>
                    <rect x={pos.x-55} y={pos.y-22} width={110} height={44} rx={6}
                      fill={bgFill} stroke={borderCol} strokeWidth={isHov?2:1.5} />
                    <text x={pos.x} y={pos.y-6} fontSize={11} fontWeight={600} fill="#e6edf3" textAnchor="middle" fontFamily="monospace">
                      {p.name.length>15?p.name.slice(0,14)+"…":p.name}
                    </text>
                    <text x={pos.x} y={pos.y+10} fontSize={9} fill={RAG_COLOR[p.rag]} textAnchor="middle" fontFamily="monospace">
                      {RAG_LABEL[p.rag]} · {p.pct}% · {p.risks} risks
                    </text>
                  </g>
                );
              })}
              {/* layer labels */}
              {[{y:60,l:"LAYER 1 — FOUNDATIONS"},{y:188,l:"LAYER 2 — PLATFORMS"},{y:318,l:"LAYER 3 — PRODUCTS"}].map(lbl=>(
                <text key={lbl.l} x={8} y={lbl.y} fontSize={8} fill="#30363d" fontFamily="monospace" textAnchor="start">{lbl.l}</text>
              ))}
            </svg>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#8b949e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
              {hoverId ? `Impact analysis — ${pmap[hoverId].name}` : "Hover to analyse"}
            </div>
            {!hoverId ? (
              <div style={{ fontSize:12, color:"#6e7681", lineHeight:1.7 }}>
                <p>Hover a project node to see:</p>
                <ul style={{ paddingLeft:16, margin:"8px 0" }}>
                  <li>Upstream blockers</li>
                  <li>Downstream cascade chain</li>
                  <li>At-risk budget exposure</li>
                </ul>
                <div style={{ marginTop:12, padding:10, background:"rgba(239,68,68,0.1)", borderRadius:6, border:"1px solid rgba(239,68,68,0.2)", fontSize:11, color:"#ef4444" }}>
                  ⚠ Data Lake (RED) has 2 direct dependants — high cascade risk.
                </div>
              </div>
            ) : (() => {
              const p=pmap[hoverId];
              const ups=[...getUpstream(p.id)].map(id=>pmap[id]);
              const downs=[...getDownstream(p.id)].map(id=>pmap[id]);
              const atRisk=downs.reduce((s,d)=>s+d.budget,0);
              return (
                <div>
                  <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                    <RagBadge r={p.rag} />
                    <span style={{ fontSize:11, color:"#8b949e" }}>→ predicted</span>
                    <RagBadge r={p.pred} />
                  </div>
                  {ups.length>0&&(
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:10, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Depends on ↑</div>
                      {ups.map(u=>(
                        <div key={u.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0", fontSize:12 }}>
                          <div style={S.dot(u.rag,7)} />{u.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {downs.length>0&&(
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:10, color:"#ef4444", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Downstream cascade ↓ ({downs.length})</div>
                      {downs.map(d=>(
                        <div key={d.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0", fontSize:12 }}>
                          <div style={S.dot(d.rag,7)} />{d.name}
                        </div>
                      ))}
                      <div style={{ marginTop:8, padding:10, background:"rgba(239,68,68,0.1)", borderRadius:6, border:"1px solid rgba(239,68,68,0.2)", fontSize:11, color:"#ef4444", lineHeight:1.6 }}>
                        Any slippage cascades to <strong>{downs.length}</strong> project{downs.length>1?"s":""}<br/><strong>{fM(atRisk)}</strong> downstream budget at risk
                      </div>
                    </div>
                  )}
                  {downs.length===0&&(
                    <div style={{ padding:10, background:"rgba(34,197,94,0.1)", borderRadius:6, border:"1px solid rgba(34,197,94,0.2)", fontSize:11, color:"#22c55e" }}>
                      ✓ No downstream dependants — zero cascade risk
                    </div>
                  )}
                  <div style={{ marginTop:10, fontSize:11, color:"#6e7681", lineHeight:1.6 }}>{p.rationale}</div>
                </div>
              );
            })()}
          </div>
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap" }}>
          {[
            { col:"#ef4444", label:"RED project / cascaded impact" },
            { col:"#f59e0b", label:"AMBER / upstream dependency" },
            { col:"#58a6ff", label:"Selected node" },
            { col:"#30363d", label:"No dependency active" },
          ].map((l,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#6e7681" }}>
              <div style={{ width:20, height:2, background:l.col }} />{l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Cascade impact table */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Knock-on impact registry — what breaks if X slips?</div>
        <table style={S.table}>
          <thead>
            <tr>{["If this project slips…","…these projects are impacted","Impact count","At-risk budget","Cascaded RAG exposure"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {PROJECTS.filter(p=>getDownstream(p.id).size>0).sort((a,b)=>getDownstream(b.id).size-getDownstream(a.id).size).map(p=>{
              const downs=[...getDownstream(p.id)].map(id=>pmap[id]);
              const atRisk=downs.reduce((s,d)=>s+d.budget,0);
              return (
                <tr key={p.id}>
                  <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={S.dot(p.rag,8)} /><span style={{ fontWeight:600, color:"#e6edf3" }}>{p.name}</span><RagBadge r={p.rag} /></div></td>
                  <td style={S.td}><div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{downs.map(d=><RagBadge key={d.id} r={d.rag} />)}</div><div style={{ fontSize:11, color:"#6e7681", marginTop:3 }}>{downs.map(d=>d.name.split(" ")[0]).join(", ")}</div></td>
                  <td style={S.td}><span style={{ color:downs.length>=3?"#ef4444":downs.length>=2?"#f59e0b":"#22c55e", fontWeight:700, fontSize:16 }}>{downs.length}</span></td>
                  <td style={S.td}><span style={{ color:"#e6edf3" }}>{fM(atRisk)}</span></td>
                  <td style={S.td}>
                    <div style={{ display:"flex", gap:4 }}>
                      {["R","A","G"].map(r=>{ const c=downs.filter(d=>d.rag===r).length; return c?<span key={r} style={{ ...S.badge(r) }}>{c} {r}</span>:null; })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TIMELINE TAB ─────────────────────────────────────────────────────────────
function Timeline() {
  return (
    <div>
      <div style={S.card}>
        <div style={S.sectionTitle}>Portfolio Gantt — 2024 (FY) with Testing Phases</div>
        <div style={{ overflowX:"auto" }}>
          <div style={{ minWidth:700 }}>
            {/* Month header */}
            <div style={{ display:"flex", paddingBottom:8, borderBottom:"1px solid #21262d", marginBottom:8 }}>
              <div style={{ width:200, flexShrink:0 }} />
              <div style={{ flex:1, display:"flex" }}>
                {MONTHS.map((m,i)=>(
                  <div key={m} style={{ flex:1, textAlign:"center", fontSize:10, fontWeight:i===TODAY_MONTH?700:400, color:i===TODAY_MONTH?"#58a6ff":"#6e7681" }}>{m}</div>
                ))}
              </div>
            </div>
            {/* Programme groups */}
            {PROGRAMMES.map(pg => (
              <div key={pg} style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#8b949e", textTransform:"uppercase", letterSpacing:"0.08em", padding:"4px 0 8px", borderBottom:"1px solid #161b22" }}>{pg}</div>
                {PROJECTS.filter(p=>p.programme===pg).map(p => (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", marginBottom:6 }}>
                    <div style={{ width:200, flexShrink:0, display:"flex", alignItems:"center", gap:6, paddingRight:10 }}>
                      <div style={S.dot(p.rag,6)} />
                      <span style={{ fontSize:12, color:"#c9d1d9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:170 }}>{p.name}</span>
                    </div>
                    <div style={{ flex:1, position:"relative", height:28, background:"#161b22", borderRadius:3, display:"flex", alignItems:"center" }}>
                      {/* planned bar background */}
                      <div style={{ position:"absolute", left:`${(p.start/12)*100}%`, width:`${((p.end-p.start+1)/12)*100}%`, height:"100%", background:RAG_COLOR[p.rag]+"15", borderRadius:3, zIndex:0 }} />
                      
                      {/* phase segments */}
                      {calculatePhaseProgress(p.pct).map((phase, idx) => {
                        const barStartPct = (p.start/12)*100;
                        const barWidthPct = ((p.end-p.start+1)/12)*100;
                        const phaseStartPct = (phase.start / 100) * barWidthPct;
                        const phaseWidthPct = (phase.pct / 100) * barWidthPct;
                        const opacity = phase.status === "completed" ? 0.95 : phase.status === "in-progress" ? 0.9 : 0.25;
                        
                        return (
                          <div key={`${p.id}-${idx}`} style={{
                            position: "absolute",
                            left: `calc(${barStartPct}% + ${(phaseStartPct/100)*100}px)`,
                            width: `calc(${phaseWidthPct}% * ${barWidthPct / 100})`,
                            height: "100%",
                            background: phase.color,
                            opacity,
                            borderRight: phase.status !== "in-progress" ? "1px solid rgba(0,0,0,0.15)" : "none",
                            transition: "opacity 0.3s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }} 
                          title={`${phase.name}: ${phase.status} (${phase.pct}%)`}
                          />
                        );
                      })}
                      
                      {/* label overlay */}
                      <span style={{ position:"absolute", left:`${(p.start/12)*100+1}%`, top:"50%", transform:"translateY(-50%)", fontSize:9, color:"#e6edf3", fontWeight:600, whiteSpace:"nowrap", zIndex:10 }}>
                        {p.pct}% · ends {MONTHS[p.end]}
                      </span>
                      
                      {/* today line */}
                      <div style={{ position:"absolute", left:`${(TODAY_MONTH/12)*100}%`, width:2, height:"100%", background:"#58a6ff", top:0, zIndex:20, boxShadow:"0 0 4px #58a6ff" }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {/* Phase legend */}
            <div style={{ display:"flex", gap:16, paddingTop:12, borderTop:"1px solid #21262d", flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ fontSize:11, color:"#8b949e", fontWeight:600, marginRight:8 }}>Testing phases:</div>
              {PHASES.map(ph => (
                <div key={ph.name} style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#6e7681" }}>
                  <div style={{ width:14, height:6, background:ph.color, borderRadius:2, opacity:0.7 }} />
                  <span>{ph.name}</span>
                </div>
              ))}
              <div style={{ flexGrow: 1 }} />
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#6e7681" }}>
                <div style={{ width:2, height:12, background:"#58a6ff", boxShadow:"0 0 3px #58a6ff" }} />
                <span>Today ({MONTHS[TODAY_MONTH]})</span>
              </div>
            </div>
            
            {/* Phase status legend */}
            <div style={{ display:"flex", gap:12, marginTop:8, fontSize:10, color:"#6e7681", flexWrap:"wrap" }}>
              <span>
                <span style={{ display:"inline-block", width:12, height:4, background:"#3b82f6", opacity:1, borderRadius:1, marginRight:4 }} />
                Full opacity = Complete/Active
              </span>
              <span>
                <span style={{ display:"inline-block", width:12, height:4, background:"#3b82f6", opacity:0.25, borderRadius:1, marginRight:4 }} />
                Low opacity = Pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget burn vs progress scatter */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Budget burn vs delivery completion</div>
        <p style={{ fontSize:12, color:"#6e7681", marginBottom:16 }}>Points above the diagonal = budget being consumed faster than work progresses (over-burn). Points on the diagonal = healthy pacing.</p>
        <div style={{ position:"relative", height:280, background:"#070b0f", borderRadius:8, padding:"16px 20px", border:"1px solid #21262d" }}>
          {/* Grid lines */}
          {[0,25,50,75,100].map(v=>(
            <div key={v}>
              <div style={{ position:"absolute", left:`calc(${v}% + 20px)`, top:16, bottom:32, width:1, background:"#21262d", pointerEvents:"none" }} />
              <div style={{ position:"absolute", right:0, left:20, top:`calc(${(100-v)/100*(280-48)+16}px)`, height:1, background:"#21262d", pointerEvents:"none" }} />
              <span style={{ position:"absolute", bottom:8, left:`calc(${v}% + 20px)`, fontSize:9, color:"#6e7681", transform:"translateX(-50%)" }}>{v}%</span>
              <span style={{ position:"absolute", top:`calc(${(100-v)/100*(280-48)+16}px - 7px)`, left:2, fontSize:9, color:"#6e7681" }}>{v}</span>
            </div>
          ))}
          {/* Diagonal */}
          <svg style={{ position:"absolute", left:20, top:16, right:0, bottom:32, width:"calc(100% - 20px)", height:"calc(100% - 48px)", pointerEvents:"none" }}>
            <line x1="0%" y1="100%" x2="100%" y2="0%" stroke="#30363d" strokeWidth={1} strokeDasharray="4 3" />
          </svg>
          {/* Data points */}
          {PROJECTS.map(p=>{
            const bx=Math.round(p.spent/p.budget*100), by=p.pct;
            return (
              <div key={p.id} title={`${p.name}\nBurn: ${bx}% | Done: ${by}%`}
                style={{ position:"absolute", left:`calc(${bx}% + 20px - 7px)`, bottom:`calc(${by/100*(280-48)+32}px - 7px)`, width:14, height:14, borderRadius:"50%", background:RAG_COLOR[p.rag], border:"1px solid #0b0f14", cursor:"help", zIndex:3 }}>
                <span style={{ position:"absolute", left:16, top:-3, fontSize:9, color:"#8b949e", whiteSpace:"nowrap" }}>{p.name.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:10, flexWrap:"wrap" }}>
          {["R","A","G"].map(r=>(
            <div key={r} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#6e7681" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:RAG_COLOR[r] }} />{RAG_LABEL[r]}
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#6e7681" }}>
            <div style={{ width:20, height:0, borderTop:"1px dashed #30363d" }} />Ideal (burn = completion)
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CIO REPORT TAB ─────────────────────────────────────────────────────────────
function CIOReport() {
  const [scope, setScope] = useState("ALL");
  const [fmt, setFmt] = useState("standard");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    const ps = scope==="ALL" ? PROJECTS : PROJECTS.filter(p=>p.programme===scope);
    const R=ps.filter(p=>p.rag==="R"), A=ps.filter(p=>p.rag==="A"), G=ps.filter(p=>p.rag==="G");
    const worsening=ps.filter(p=>(p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R"));
    const tB=ps.reduce((s,p)=>s+p.budget,0), tS=ps.reduce((s,p)=>s+p.spent,0);
    const depRisks = DEPS.filter(d=>ps.find(p=>p.id===d.from)&&ps.find(p=>p.id===d.to))
      .map(d=>`${pmap[d.to].name} depends on ${pmap[d.from].name} (${d.label})`).join("\n");

    const projectList = ps.map(p =>
      `• [${p.id}] ${p.name} | Programme: ${p.programme} | RAG: ${p.rag} | Predicted: ${p.pred} | ${p.pct}% complete | Budget: ${fK(p.spent)}/${fK(p.budget)} | Risks: ${p.risks} | Milestones: ${p.msDone}/${p.msTotal} | Lead: ${p.lead} | Note: ${p.rationale}`
    ).join("\n");

    const fmtInstructions = {
      standard: "Structure: 1.Executive Summary (3–4 sentences max). 2.Portfolio RAG Status table. 3.Critical Issues & Risks (top 4, bullet points). 4.RAG Trajectory & Predictions. 5.Recommended Actions (4 specific, numbered). 6.Next Steps & Governance. Use UK English. Professional CxO tone.",
      brief: "One page maximum. Structure: 1.One paragraph executive summary. 2.Three critical issues. 3.Three immediate actions required. Tight, punchy, CxO-ready. UK English.",
      deep: "Full diagnostic report. Structure: 1.Executive Summary. 2.Programme-by-programme breakdown. 3.Dependency cascade risk analysis. 4.Budget performance analysis (over-burn identification). 5.Risk register highlights & escalation flags. 6.Strategic recommendations. 7.Governance & escalation actions. UK English.",
    }[fmt];

    const prompt = `You are the Head of Programme Management preparing a formal CIO portfolio status report. Date: April 2024.

PORTFOLIO SCOPE: ${scope==="ALL"?"All Programmes":scope}
TOTAL BUDGET: ${fM(tB)} | SPENT: ${fM(tS)} (${Math.round(tS/tB*100)}% burn)
STATUS: ${R.length} RED | ${A.length} AMBER | ${G.length} GREEN | ${worsening.length} predicted to worsen

PROJECTS:
${projectList}

DEPENDENCY RISKS:
${depRisks}

PREDICTED STATUS CHANGES: ${worsening.map(p=>`${p.name} (${p.rag}→${p.pred})`).join(", ")||"None"}

FORMAT INSTRUCTIONS:
${fmtInstructions}

Write in a data-driven, professional tone appropriate for C-suite and CIO reporting. Flag escalations and governance decisions clearly. Be specific — use project names, numbers, and £ figures throughout.`;

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content:prompt }] })
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text;
      if (!text) throw new Error("No response content returned.");
      setReport(text);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const R2=PROJECTS.filter(p=>p.rag==="R"), A2=PROJECTS.filter(p=>p.rag==="A"), G2=PROJECTS.filter(p=>p.rag==="G");

  return (
    <div>
      {/* Control panel */}
      <div style={S.card}>
        <div style={S.sectionTitle}>CIO / Management report generator</div>
        <p style={{ fontSize:12, color:"#6e7681", marginBottom:16 }}>AI-powered report built from live portfolio data. Configure scope and format, then generate. Copy or export for board / CIO packs.</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:"#8b949e", marginBottom:4 }}>Scope</div>
            <select value={scope} onChange={e=>setScope(e.target.value)}
              style={{ ...S.pill, paddingTop:6, paddingBottom:6 }}>
              <option value="ALL">All Programmes</option>
              {PROGRAMMES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#8b949e", marginBottom:4 }}>Format</div>
            <select value={fmt} onChange={e=>setFmt(e.target.value)}
              style={{ ...S.pill, paddingTop:6, paddingBottom:6 }}>
              <option value="standard">Standard report</option>
              <option value="brief">Brief (1-page)</option>
              <option value="deep">Deep analysis</option>
            </select>
          </div>
          <div style={{ alignSelf:"flex-end" }}>
            <button onClick={generateReport} disabled={loading}
              style={{ ...S.btnPrimary, opacity:loading?0.6:1, padding:"8px 20px" }}>
              {loading ? "⏳ Generating…" : "Generate Report ↗"}
            </button>
          </div>
        </div>
        {/* Quick metrics for report context */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, padding:"12px 0", borderTop:"1px solid #21262d" }}>
          {[
            { l:"RED", v:R2.length, c:"#ef4444" },
            { l:"AMBER", v:A2.length, c:"#f59e0b" },
            { l:"GREEN", v:G2.length, c:"#22c55e" },
            { l:"Worsening", v:PROJECTS.filter(p=>(p.rag==="G"&&p.pred!=="G")||(p.rag==="A"&&p.pred==="R")).length, c:"#f59e0b" },
            { l:"Over-burn", v:PROJECTS.filter(p=>Math.round(p.spent/p.budget*100)>p.pct+8).length, c:"#ef4444" },
            { l:"Total budget", v:fM(PROJECTS.reduce((s,p)=>s+p.budget,0)), c:"#e6edf3" },
          ].map((m,i)=>(
            <div key={i} style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:700, color:m.c }}>{m.v}</div>
              <div style={{ fontSize:10, color:"#6e7681", textTransform:"uppercase" }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report output */}
      {error && (
        <div style={{ ...S.card, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.05)" }}>
          <div style={{ color:"#ef4444", fontSize:13 }}>⚠ {error}</div>
        </div>
      )}
      {!report && !loading && (
        <div style={{ ...S.card, textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40, opacity:0.15, marginBottom:16 }}>📋</div>
          <div style={{ fontSize:14, color:"#8b949e", marginBottom:8 }}>No report generated yet</div>
          <div style={{ fontSize:12, color:"#6e7681" }}>Select scope and format above, then click Generate Report</div>
        </div>
      )}
      {report && (
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", gap:8 }}>
              {[`Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}`, scope==="ALL"?"All Programmes":scope, {standard:"Standard",brief:"Brief",deep:"Deep"}[fmt]].map(tag=>(
                <span key={tag} style={{ padding:"3px 10px", background:"#161b22", borderRadius:4, fontSize:11, color:"#8b949e" }}>{tag}</span>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>navigator.clipboard?.writeText(report)} style={S.btn}>Copy</button>
              <button onClick={generateReport} style={S.btn}>Regenerate ↗</button>
            </div>
          </div>
          <div style={{ background:"#070b0f", borderRadius:8, padding:20, border:"1px solid #21262d", fontSize:13, lineHeight:1.9, color:"#c9d1d9", whiteSpace:"pre-wrap" }}>
            {report}
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const TABS = [
    { id:"dashboard", label:"Dashboard" },
    { id:"register", label:"Project Register" },
    { id:"dependencies", label:"Dependency Map" },
    { id:"timeline", label:"Timeline & Burn" },
    { id:"report", label:"CIO Report" },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#e6edf3", letterSpacing:"0.02em" }}>
            <span style={{ color:"#58a6ff" }}>▣</span> Programme Management Command Centre
          </div>
          <div style={{ fontSize:11, color:"#6e7681", marginTop:2 }}>
            {PROJECTS.length} projects · {PROGRAMMES.length} programmes · AI-powered RAG prediction & dependency impact
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e" }} />
          <span style={{ fontSize:11, color:"#6e7681" }}>Live · April 2024</span>
        </div>
      </div>
      <div style={S.nav}>
        {TABS.map(t=><Tab key={t.id} label={t.label} active={tab===t.id} onClick={()=>setTab(t.id)} />)}
      </div>
      <div style={S.content}>
        {tab==="dashboard"     && <Dashboard />}
        {tab==="register"      && <ProjectRegister />}
        {tab==="dependencies"  && <DependencyMap />}
        {tab==="timeline"      && <Timeline />}
        {tab==="report"        && <CIOReport />}
      </div>
    </div>
  );
}
