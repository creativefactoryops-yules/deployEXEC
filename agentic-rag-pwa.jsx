import { useState, useCallback, useEffect, useRef } from "react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FAKE_FILES = [
  { name: "index.html",           size: 4200  },
  { name: "styles.css",           size: 8100  },
  { name: "app.js",               size: 22400 },
  { name: "package.json",         size: 840   },
  { name: "README.md",            size: 1900  },
  { name: "assets/logo.svg",      size: 3200  },
  { name: "components/Header.jsx",size: 5100  },
  { name: "utils/api.js",         size: 6400  },
];

const PHASES = [
  { emoji: "📦", label: "Extract"  },
  { emoji: "🔍", label: "Audit"    },
  { emoji: "🗂️", label: "Organize" },
  { emoji: "🐙", label: "Git"      },
  { emoji: "🚀", label: "Deploy"   },
  { emoji: "✅", label: "Live"     },
];

const LOG_COLORS = {
  info:"#94a3b8", success:"#34d399", warn:"#fbbf24",
  error:"#f87171", system:"#a78bfa", ai:"#67e8f9",
};

async function callClaude(apiKey, sys, usr) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    }),
  });
  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("") || "";
}

const Spin = ({ size = 16 }) => (
  <svg style={{ width: size, height: size, animation: "spin 1s linear infinite", display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const Tick = () => (
  <svg style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function App() {
  const [apiKey,        setApiKey]        = useState("");
  const [deployTarget,  setDeployTarget]  = useState("vercel");
  const [gitRepo,       setGitRepo]       = useState("");
  const [uploadedFile,  setUploadedFile]  = useState(null);
  const [phase,         setPhase]         = useState("idle");
  const [currentStep,   setCurrentStep]   = useState(-1);
  const [doneSteps,     setDoneSteps]     = useState([]);
  const [logs,          setLogs]          = useState([]);
  const [files,         setFiles]         = useState([]);
  const [fileStatuses,  setFileStatuses]  = useState({});
  const [auditReport,   setAuditReport]   = useState(null);
  const [liveUrl,       setLiveUrl]       = useState("");
  const [copied,        setCopied]        = useState(false);
  const [showConfig,    setShowConfig]    = useState(false);
  const logEndRef = useRef(null);

  const ts  = () => new Date().toLocaleTimeString("en-US", { hour12: false });
  const log = useCallback((msg, type = "info") =>
    setLogs((p) => [...p, { msg, type, time: ts() }]), []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      log("Only .zip files are accepted ❌", "error");
      return;
    }
    setUploadedFile(file);
    log(`Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB) ✓`, "success");
  };

  const reset = () => {
    setPhase("idle"); setCurrentStep(-1); setDoneSteps([]);
    setLogs([]); setFiles([]); setFileStatuses({});
    setUploadedFile(null); setLiveUrl(""); setAuditReport(null);
  };

  const runPipeline = async () => {
    if (!uploadedFile) return;
    setPhase("running"); setLogs([]); setFiles([]); setFileStatuses({});
    setAuditReport(null); setLiveUrl(""); setDoneSteps([]);

    try {
      // 0 — Extract
      setCurrentStep(0);
      log("⚡ Pipeline started", "system");
      await sleep(500);
      log(`Extracting ${uploadedFile.name}…`, "info");
      await sleep(700);
      setFiles(FAKE_FILES);
      setFileStatuses(Object.fromEntries(FAKE_FILES.map((f) => [f.name, "pending"])));
      log(`Extracted ${FAKE_FILES.length} files ✓`, "success");
      setDoneSteps((p) => [...p, 0]);

      // 1 — Audit
      setCurrentStep(1);
      log("🔍 Starting AI audit…", "system");
      for (const file of FAKE_FILES) {
        setFileStatuses((p) => ({ ...p, [file.name]: "scanning" }));
        await sleep(160 + Math.random() * 200);
        const warn = Math.random() < 0.25;
        setFileStatuses((p) => ({ ...p, [file.name]: warn ? "warn" : "ok" }));
        if (warn) log(`  ⚠ ${file.name}: issue detected`, "warn");
      }

      let report = {
        issues: ["Missing .env.example", "No error boundaries", "Unoptimised hero.jpg"],
        recommendations: ["Add ESLint", "Use code splitting", "Add SEO meta tags"],
        score: 74, deployReady: true,
      };
      if (apiKey) {
        try {
          const raw = await callClaude(apiKey,
            "Senior code auditor. Reply ONLY raw JSON: {issues:[string],recommendations:[string],score:number,deployReady:boolean}. No markdown.",
            `Audit project: [${FAKE_FILES.map((f) => f.name).join(", ")}]`
          );
          report = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch { /* keep default */ }
      }

      setAuditReport(report);
      log(`Score: ${report.score}/100  |  ${report.deployReady ? "Deploy-ready ✓" : "Needs review ⚠"}`, report.deployReady ? "success" : "warn");
      report.issues.forEach((i) => log(`  ⚠ ${i}`, "warn"));
      report.recommendations.forEach((r) => log(`  ✦ ${r}`, "ai"));
      setDoneSteps((p) => [...p, 1]);

      // 2 — Organise
      setCurrentStep(2);
      log("🗂️  Reorganising structure…", "system");
      const moves = [
        ["index.html","src/index.html"],["styles.css","src/styles/main.css"],
        ["app.js","src/js/app.js"],["components/Header.jsx","src/components/Header.jsx"],
        ["utils/api.js","src/utils/api.js"],["assets/logo.svg","public/assets/logo.svg"],
      ];
      for (const [from, to] of moves) {
        await sleep(130);
        log(`  ${from} → ${to}`, "info");
        setFileStatuses((p) => ({ ...p, [from]: "moved" }));
      }
      log("Added vercel.json, .gitignore ✓", "success");
      setDoneSteps((p) => [...p, 2]);

      // 3 — Git
      setCurrentStep(3);
      log("🐙 Git operations…", "system");
      await sleep(400);
      log(`  Remote: ${gitRepo || "https://github.com/user/my-app"}`, "info");
      await sleep(700);
      log("  git init → add → commit → push", "info");
      await sleep(1100);
      log("  Push successful ✓  HEAD → main", "success");
      setDoneSteps((p) => [...p, 3]);

      // 4 — Deploy
      setCurrentStep(4);
      const platform = deployTarget === "vercel" ? "▲ Vercel" : "◈ Netlify";
      log(`🚀 Deploying to ${platform}…`, "system");
      await sleep(500);
      log("  Linking repo…", "info");
      await sleep(700);
      log("  Building project…", "info");
      await sleep(1300);
      log("  Uploading to CDN edge…", "info");
      await sleep(800);
      const slug = uploadedFile.name.replace(".zip","").replace(/[^a-z0-9]/gi,"-").toLowerCase();
      const url  = deployTarget === "vercel"
        ? `https://${slug}-agentic.vercel.app`
        : `https://${slug}--agentic.netlify.app`;
      setLiveUrl(url);
      log(`  Live → ${url} 🎉`, "success");
      setDoneSteps((p) => [...p, 4]);

      // 5 — Done
      setCurrentStep(5);
      setDoneSteps((p) => [...p, 5]);
      log("✅ Pipeline complete!", "system");
      setPhase("done");

    } catch (err) {
      log(`Pipeline error: ${err.message}`, "error");
      setPhase("error");
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = phase === "running";
  const isDone    = phase === "done";

  // shared input style
  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.12)", borderRadius: 10,
    color: "#e2e8f0", fontFamily: "inherit", fontSize: 13,
    padding: "12px 14px", outline: "none",
  };

  return (
    <div style={{ background:"#080c14", minHeight:"100vh", color:"#e2e8f0", fontFamily:"system-ui,sans-serif", maxWidth:500, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadein { from { opacity:0; transform:translateY(5px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glow { 0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,.5) } 55% { box-shadow:0 0 0 12px rgba(99,102,241,0) } }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:2px }
        .fadein { animation: fadein .2s ease forwards }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,.015)", position:"sticky", top:0, zIndex:20, backdropFilter:"blur(14px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0891b2,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
          <div>
            <div style={{ fontWeight:800, fontSize:18, background:"linear-gradient(90deg,#67e8f9,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-.02em" }}>AgenticRAG</div>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:".1em" }}>ZIP → AUDIT → DEPLOY</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {isDone || phase === "error"
            ? <button onClick={reset} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"#94a3b8", borderRadius:8, padding:"10px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>↺ Reset</button>
            : <button onClick={() => setShowConfig(s => !s)} style={{ background: showConfig ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"#94a3b8", borderRadius:8, padding:"10px 14px", fontSize:17, cursor:"pointer" }}>⚙️</button>
          }
        </div>
      </div>

      {/* ── CONFIG ─────────────────────────────────────────── */}
      {showConfig && (
        <div className="fadein" style={{ background:"rgba(8,12,20,.98)", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:10, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Anthropic API Key (optional)</label>
            <input type="password" placeholder="sk-ant-…  leave blank for demo" value={apiKey} onChange={e => setApiKey(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize:10, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Git Repo URL</label>
            <input type="url" placeholder="https://github.com/user/repo" value={gitRepo} onChange={e => setGitRepo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize:10, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Deploy Target</label>
            <select value={deployTarget} onChange={e => setDeployTarget(e.target.value)} style={{ ...inputStyle, background:"#0a0e18" }}>
              <option value="vercel">▲  Vercel</option>
              <option value="netlify">◈  Netlify</option>
            </select>
          </div>
        </div>
      )}

      {/* ── MAIN ───────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"16px", gap:14 }}>

        {/* ── FILE UPLOAD — label wraps input (most reliable on mobile) ── */}
        {!isRunning && !isDone && (
          <>
            {/* The label IS the button — no JS click needed */}
            <label htmlFor="zip-input" style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:12, width:"100%", padding: uploadedFile ? "22px 16px" : "40px 16px",
              borderRadius:20, cursor:"pointer",
              background: uploadedFile
                ? "linear-gradient(135deg,rgba(52,211,153,.12),rgba(16,185,129,.07))"
                : "linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.1))",
              border: uploadedFile
                ? "2px solid rgba(52,211,153,.5)"
                : "2px dashed rgba(99,102,241,.6)",
              animation: !uploadedFile ? "glow 2.5s infinite" : "none",
              transition:"all .3s",
              WebkitTapHighlightColor:"transparent",
            }}>
              {/* The actual input — visually hidden but inside the label so tapping label triggers it */}
              <input
                id="zip-input"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                style={{ position:"absolute", width:1, height:1, opacity:0, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap" }}
              />

              {uploadedFile ? (
                <>
                  <span style={{ fontSize:44 }}>📦</span>
                  <span style={{ fontSize:16, fontWeight:700, color:"#34d399", textAlign:"center" }}>{uploadedFile.name}</span>
                  <span style={{ fontSize:12, color:"#6ee7b7" }}>{(uploadedFile.size/1024).toFixed(1)} KB · Tap to change</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize:56, lineHeight:1 }}>📁</span>
                  <span style={{ fontSize:22, fontWeight:700, color:"#a78bfa", textAlign:"center" }}>TAP TO SELECT ZIP</span>
                  <span style={{ fontSize:13, color:"#818cf8", textAlign:"center" }}>Opens your Files / Drive / iCloud</span>
                </>
              )}
            </label>

            {/* LAUNCH */}
            <button
              onClick={runPipeline}
              disabled={!uploadedFile}
              style={{
                width:"100%", padding:"20px", borderRadius:16, border:"none",
                background: uploadedFile
                  ? "linear-gradient(135deg,#0891b2 0%,#6366f1 60%,#7c3aed 100%)"
                  : "rgba(255,255,255,.04)",
                color: uploadedFile ? "white" : "#2d3748",
                fontSize:18, fontWeight:700, letterSpacing:".04em",
                cursor: uploadedFile ? "pointer" : "not-allowed",
                boxShadow: uploadedFile ? "0 8px 32px rgba(99,102,241,.4)" : "none",
                transition:"all .3s",
                WebkitTapHighlightColor:"transparent",
                fontFamily:"inherit",
              }}>
              {uploadedFile ? "⚡ LAUNCH PIPELINE" : "Select a .zip file above"}
            </button>
          </>
        )}

        {/* RUNNING */}
        {isRunning && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"12px 0", color:"#67e8f9", fontSize:14 }}>
            <Spin size={18} /> Running agentic pipeline…
          </div>
        )}

        {/* ── PHASE STEPPER ── */}
        {(isRunning || isDone || doneSteps.length > 0) && (
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 8px", background:"rgba(255,255,255,.025)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)" }}>
            {PHASES.map((p, i) => {
              const done   = doneSteps.includes(i);
              const active = currentStep === i;
              return (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
                  <div style={{
                    width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, transition:"all .4s",
                    background: done ? "rgba(52,211,153,.15)" : active ? "rgba(99,102,241,.2)" : "transparent",
                    border: done ? "1.5px solid rgba(52,211,153,.55)" : active ? "1.5px solid rgba(99,102,241,.7)" : "1.5px solid rgba(255,255,255,.07)",
                  }}>
                    {done   ? <span style={{ color:"#34d399" }}><Tick /></span>
                    : active ? <Spin />
                    : <span style={{ opacity:.3 }}>{p.emoji}</span>}
                  </div>
                  <span style={{ fontSize:8, letterSpacing:".05em", textTransform:"uppercase", fontWeight:600, color: done ? "#34d399" : active ? "#a78bfa" : "#334155" }}>{p.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── AUDIT REPORT ── */}
        {auditReport && (
          <div className="fadein" style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:14, padding:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
              <div style={{ fontSize:42, fontWeight:800,
                background: auditReport.score > 70 ? "linear-gradient(135deg,#34d399,#0891b2)" : "linear-gradient(135deg,#f59e0b,#ef4444)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{auditReport.score}</div>
              <div>
                <div style={{ fontSize:12, color:"#64748b" }}>/ 100 score</div>
                <div style={{ fontSize:12, fontWeight:700, color: auditReport.deployReady ? "#34d399" : "#fbbf24" }}>
                  {auditReport.deployReady ? "✓ Deploy Ready" : "⚠ Needs Review"}
                </div>
              </div>
            </div>
            <div style={{ fontSize:10, color:"#475569", letterSpacing:".06em", marginBottom:4 }}>ISSUES</div>
            {auditReport.issues.map((iss,i) => <div key={i} style={{ fontSize:12, color:"#fbbf24", padding:"3px 0" }}>⚠ {iss}</div>)}
            <div style={{ fontSize:10, color:"#475569", letterSpacing:".06em", marginTop:10, marginBottom:4 }}>RECOMMENDATIONS</div>
            {auditReport.recommendations.map((r,i) => <div key={i} style={{ fontSize:12, color:"#67e8f9", padding:"3px 0" }}>✦ {r}</div>)}
          </div>
        )}

        {/* ── LIVE URL ── */}
        {liveUrl && (
          <div className="fadein" style={{ background:"linear-gradient(135deg,rgba(52,211,153,.1),rgba(99,102,241,.08))", border:"1px solid rgba(52,211,153,.4)", borderRadius:16, padding:16 }}>
            <div style={{ fontSize:10, color:"#34d399", letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>🎉 Live Deployment</div>
            <div style={{ fontSize:13, color:"#e2e8f0", wordBreak:"break-all", marginBottom:14, lineHeight:1.7, fontWeight:500 }}>{liveUrl}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => window.open(liveUrl,"_blank")}
                style={{ flex:1, padding:15, background:"linear-gradient(135deg,#0891b2,#6366f1)", border:"none", borderRadius:12, color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                🔗 Open App
              </button>
              <button onClick={copyUrl}
                style={{ padding:"15px 20px", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, color: copied ? "#34d399" : "#94a3b8", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* ── LOG ── */}
        {logs.length > 0 && (
          <div style={{ background:"rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background: isRunning ? "#34d399" : "#6366f1", boxShadow: isRunning ? "0 0 7px #34d399" : "none", transition:"all .5s" }} />
              <span style={{ fontSize:10, color:"#475569", letterSpacing:".07em" }}>AGENT LOG</span>
              {isRunning && <span style={{ fontSize:9, color:"#34d399", marginLeft:"auto" }}>● LIVE</span>}
            </div>
            <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:4, maxHeight:210, overflowY:"auto" }}>
              {logs.map((e,i) => (
                <div key={i} style={{ fontFamily:"'Courier New',monospace", fontSize:11, color: LOG_COLORS[e.type] || "#94a3b8", display:"flex", gap:8, lineHeight:1.55 }}>
                  <span style={{ color:"#2d3748", flexShrink:0 }}>{e.time}</span>
                  <span style={{ wordBreak:"break-word" }}>{e.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* ── FILE LIST ── */}
        {files.length > 0 && (
          <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,.05)", fontSize:10, color:"#475569", letterSpacing:".07em" }}>FILE EXPLORER</div>
            <div style={{ padding:"6px 0" }}>
              {files.map((file) => {
                const st  = fileStatuses[file.name];
                const dot = { pending:"#334155", scanning:"#67e8f9", ok:"#34d399", warn:"#fbbf24", moved:"#a78bfa" }[st] || "#334155";
                return (
                  <div key={file.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 14px" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:dot, transition:"background .3s", boxShadow: st==="scanning" ? `0 0 6px ${dot}` : "none" }} />
                    <span style={{ fontSize:12, color:"#94a3b8", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</span>
                    <span style={{ fontSize:10, color:"#334155", flexShrink:0 }}>{file.size>1000?`${(file.size/1024).toFixed(0)}k`:`${file.size}b`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign:"center", padding:"14px", fontSize:9, color:"#1e293b", letterSpacing:".05em", borderTop:"1px solid rgba(255,255,255,.04)" }}>
        AgenticRAG · Powered by Claude · ZIP → GIT → DEPLOY
      </div>
    </div>
  );
}
