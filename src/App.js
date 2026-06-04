import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://lirxysrkgxjomhtfwkhf.supabase.co",
  "sb_publishable_tYywnMdzYCfyztss7eGwtw_4h2hwxP5"
);

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAzoAAAM+CAYAAADSIHSiAAEAAElEQVR4nOydd5hcZfn3v6dPn23ZdCCELkV6VTqCoNKkvCKKCD8QFEFsiCgWUAQVUTqCCgpKFBSpIiAoICCoFAUJIQmBhN1k25bdndk5c868f+ze3hOSnc3szGZ3k/N5noe8Sd9z9pyzn/N+f/d1S6lUKoVGSZIkAURRFNXy+kRD+5ns/Yn7EfdVbf+TPT/l4xqN0fZf7f3JPn/VmKj5q3a8U0W187cmC7uuS0RERBT2gj6MqTZyGwE8P8xk2tZ1iK+vqWcq7n8axlo7r6JBXr5PztNZO7U/b+W+R3uvoc+HRvn9nHKPTqOfKIZhGIaxtsBGbXMxVVdeUWkRRqFLmJ37ZAquu0wkBHTiTBwT4rNhgGM3V8lT2MDgWAiGFsN4AAAAIABJREFUIoJ9d+p5KhPqFPfVAg6dOq7B5WKgAQgUMedBGMcAAAAASUVORK5CYII=";

const BIANCA =
  "data:image/avif;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJYgCdAEO/gHOAAA=";

/* ── Design tokens ── */
const C = {
  bg: "#070a0f",
  panel: "#0d1117",
  card: "#131920",
  border: "rgba(255,255,255,0.07)",
  accent: "#c8ff00",
  accent2: "#00d4ff",
  danger: "#ff3b5c",
  warn: "#ffb340",
  safe: "#00e676",
  text: "#f0f4f8",
  muted: "#5a6475",
};

/* ── SVG icon paths ── */
const P = {
  scan: "M9 2H5C3.34 2 2 3.34 2 5v4h2V5c0-.55.45-1 1-1h4V2zm6 0v2h4c.55 0 1 .45 1 1v4h2V5c0-1.66-1.34-3-3-3h-4zm5 15h-2v4h-4v2h4c1.66 0 3-1.34 3-3v-4zM4 20v-4H2v4c0 1.66 1.34 3 3 3h4v-2H5c-.55 0-1-.45-1-1zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
  hist: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  prof: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
  result: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  eyeoff:
    "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
  user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  danger: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  warn: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  safe: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
  save: "M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z",
  share:
    "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
  micro:
    "M12 1c-1.66 0-3 1.34-3 3v8c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3zm5.91 9c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
  url: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  refresh: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
};

const stripCites = (text) => {
  if (!text) return text;
  return text
    .replace(/<cite[^>]*>/g, "")
    .replace(/<\/cite>/g, "")
    .replace(/&lt;cite[^&]*&gt;/g, "")
    .replace(/&lt;\/cite&gt;/g, "")
    .trim();
};

const Ico = ({ d, s = 22, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <path d={d} />
  </svg>
);

const AppLogo = ({ size = 40, glow = false }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #c8ff00 0%, #70d400 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: glow
        ? "0 0 20px rgba(200,255,0,0.6), 0 0 40px rgba(200,255,0,0.3)"
        : "0 0 12px rgba(200,255,0,0.3)",
    }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="#070a0f">
      <path d="M9 2H5C3.34 2 2 3.34 2 5v4h2V5c0-.55.45-1 1-1h4V2zm6 0v2h4c.55 0 1 .45 1 1v4h2V5c0-1.66-1.34-3-3-3h-4zm5 15h-2v4h-4v2h4c1.66 0 3-1.34 3-3v-4zM4 20v-4H2v4c0 1.66 1.34 3 3 3h4v-2H5c-.55 0-1-.45-1-1zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  </div>
);

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --font:'DM Sans',system-ui,sans-serif;
      --mono:'DM Mono',monospace;
      --bg:#070a0f;
      --panel:#0d1117;
      --border:rgba(255,255,255,0.07);
      --accent:#c8ff00;
      --accent2:#00d4ff;
    }
    html{
      -webkit-text-size-adjust:100%;
      -ms-text-size-adjust:100%;
    }
    body,#root{
      background:var(--bg);
      font-family:var(--font);
      color:#f0f4f8;
      -webkit-font-smoothing:antialiased;
      /* Fix iOS bottom safe area */
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    input,button,textarea,select{font-family:var(--font)}
    /* Prevent zoom on input focus iOS */
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="url"],
    textarea {
      font-size: 16px !important;
    }
    @media (min-width:430px){
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input[type="url"],
      textarea {
        font-size: 15px !important;
      }
    }
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
    textarea::placeholder,input::placeholder{color:#5a6475}
    .inp{
      width:100%;background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.09);
      border-radius:12px;color:#f0f4f8;font-size:15px;
      outline:none;transition:border-color .2s,box-shadow .2s;
    }
    .inp:focus{border-color:#c8ff00;box-shadow:0 0 0 3px rgba(200,255,0,0.1)}
    .btn-p{
      background:#c8ff00;color:#070a0f;border:none;border-radius:12px;
      font-weight:700;font-size:14px;cursor:pointer;
      -webkit-tap-highlight-color: transparent;
      transition:transform .15s,box-shadow .15s,opacity .15s;
    }
    /* Only apply hover on non-touch devices */
    @media(hover:hover) and (pointer:fine){
      .btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(200,255,0,0.35)}
    }
    .btn-p:active:not(:disabled){transform:scale(0.97)}
    .btn-p:disabled{opacity:.4;cursor:not-allowed}
    .btn-g{
      background:transparent;border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;color:#5a6475;cursor:pointer;font-size:14px;
      -webkit-tap-highlight-color: transparent;
      transition:border-color .2s,color .2s;
    }
    @media(hover:hover) and (pointer:fine){
      .btn-g:hover{border-color:rgba(255,255,255,0.22);color:#f0f4f8}
    }
    .btn-g:active{opacity:0.7}
    .card{background:#0d1117;border:1px solid rgba(255,255,255,0.07);border-radius:16px}
    .label{font-family:var(--mono);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#5a6475}
    /* iPad / tablet tweaks */
    @media(min-width:768px){
      .app-root{
        max-width:430px;
        margin:0 auto;
        box-shadow: 0 0 80px rgba(0,0,0,0.6);
      }
    }
    /* Smooth scrolling */
    *{-webkit-overflow-scrolling:touch}
  `}</style>
);

const Nav = ({ right, onBack }) => (
  <div
    style={{
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(7,10,15,0.95)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}
  >
    {onBack ? (
      <button
        onClick={onBack}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#5a6475",
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 500,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Ico d={P.back} s={14} c="#5a6475" /> Back
      </button>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppLogo size={28} />
        <span
          style={{
            fontFamily: "var(--font)",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.3,
            color: "#f0f4f8",
          }}
        >
          Authentiscan <span style={{ color: "#c8ff00" }}>Pro</span>
        </span>
      </div>
    )}
    {right && (
      <span
        className="label"
        style={{
          background: "rgba(0,212,255,0.08)",
          border: "1px solid rgba(0,212,255,0.18)",
          color: "#00d4ff",
          padding: "3px 10px",
          borderRadius: 100,
        }}
      >
        {right}
      </span>
    )}
  </div>
);

const BNav = ({ active, go, user }) => {
  const tabs = [
    { id: "scan", label: "Scan", d: P.scan },
    { id: "result", label: "Result", d: P.result },
    { id: "history", label: "History", d: P.hist },
    { id: "profile", label: "Profile", d: P.prof },
  ];
  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: "rgba(7,10,15,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        padding: "8px 12px",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom, 14px))",
        gap: 6,
        zIndex: 100,
      }}
    >
      {tabs.map((t) => {
        const on = active === t.id;
        const isProfile = t.id === "profile";
        return (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              background: on ? "rgba(200,255,0,0.08)" : "transparent",
              border: on
                ? "1px solid rgba(200,255,0,0.2)"
                : "1px solid transparent",
              borderRadius: 12,
              cursor: "pointer",
              padding: "8px 4px",
              color: on ? "#c8ff00" : "#5a6475",
              transition: "all .2s",
              WebkitTapHighlightColor: "transparent",
              minHeight: 54,
            }}
          >
            {isProfile && user ? (
              avatar ? (
                <img src={avatar} alt="" style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover", border: on ? "1.5px solid #c8ff00" : "1.5px solid rgba(255,255,255,0.2)" }} />
              ) : (
                <div style={{ width:22, height:22, borderRadius:"50%", background: on ? "rgba(200,255,0,0.2)" : "rgba(255,255,255,0.1)", border: on ? "1.5px solid #c8ff00" : "1.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color: on ? "#c8ff00" : "#f0f4f8" }}>
                  {initials}
                </div>
              )
            ) : (
              <Ico d={t.d} s={19} c={on ? "#c8ff00" : "#5a6475"} />
            )}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 8,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontWeight: on ? 600 : 400,
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const UpBanner = ({ msg }) => (
  <div
    style={{
      background:
        "linear-gradient(135deg,rgba(200,255,0,0.06),rgba(0,212,255,0.04))",
      border: "1px solid rgba(200,255,0,0.18)",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    }}
  >
    <div>
      <div
        style={{
          fontWeight: 700,
          color: "#c8ff00",
          fontSize: 13,
          marginBottom: 2,
        }}
      >
        Upgrade to Pro — $7.99/mo
      </div>
      <div style={{ fontSize: 12, color: "#5a6475", lineHeight: 1.5 }}>
        {msg}
      </div>
    </div>
    <button
      className="btn-p"
      onClick={() => window.open("https://www.authentiscanapp.com/", "_blank")}
      style={{
        padding: "9px 14px",
        whiteSpace: "nowrap",
        borderRadius: 10,
        fontSize: 12,
      }}
    >
      Upgrade
    </button>
  </div>
);

const RISK = {
  danger: {
    score: 87,
    title: "High Misinformation Risk",
    desc: "Multiple indicators of misinformation detected. Do not share without fact-checking from trusted sources.",
    signals: [
      { name: "Claim Accuracy", desc: "Unverified claims with sensational framing detected.", pct: "14%", col: "#ff3b5c", dot: "#ff3b5c" },
      { name: "Source Credibility", desc: "No credible source references found in this content.", pct: "N/A", col: "#5a6475", dot: "#5a6475" },
      { name: "Emotional Intensity", desc: "High-alarm language patterns indicative of manipulation.", pct: "22%", col: "#ff3b5c", dot: "#ff3b5c" },
      { name: "Context Completeness", desc: "Content lacks important context or omits key facts.", pct: "18%", col: "#ffb340", dot: "#ffb340" },
    ],
  },
  warn: {
    score: 52,
    title: "Requires Verification",
    desc: "Some claims appear unverified or lack supporting sources. Cross-check before sharing.",
    signals: [
      { name: "Claim Accuracy", desc: "Partial verification possible. Some claims are unconfirmed.", pct: "55%", col: "#ffb340", dot: "#ffb340" },
      { name: "Source Credibility", desc: "No source URL provided — credibility not evaluated.", pct: "N/A", col: "#5a6475", dot: "#5a6475" },
      { name: "Emotional Intensity", desc: "Moderate emotional language. Possible framing bias.", pct: "48%", col: "#ffb340", dot: "#ffb340" },
      { name: "Context Completeness", desc: "Content may be missing context. Further review advised.", pct: "50%", col: "#ffb340", dot: "#ffb340" },
    ],
  },
  safe: {
    score: 11,
    title: "Appears Credible",
    desc: "Content shows characteristics of credible reporting. Low risk of misinformation.",
    signals: [
      { name: "Claim Accuracy", desc: "No known false claims detected in this content.", pct: "91%", col: "#00e676", dot: "#00e676" },
      { name: "Source Credibility", desc: "No source URL provided — credibility not evaluated.", pct: "N/A", col: "#5a6475", dot: "#5a6475" },
      { name: "Emotional Intensity", desc: "Measured tone consistent with factual reporting.", pct: "88%", col: "#00e676", dot: "#00e676" },
      { name: "Context Completeness", desc: "Content appears complete with appropriate framing.", pct: "85%", col: "#00e676", dot: "#00e676" },
    ],
  },
};

/* ══════════════════════════════════════════
   SPLASH
══════════════════════════════════════════ */
function Splash({ onLogin, onRegister, onGuest }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#070a0f",
        position: "relative",
        overflow: "hidden",
        padding: "40px 28px",
        textAlign: "center",
      }}
    >
      <style>{`
        @keyframes spOrb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(28px,-18px) scale(1.09)}66%{transform:translate(-18px,14px) scale(0.94)}}
        @keyframes spOrb2{0%,100%{transform:translate(0,0)}40%{transform:translate(-22px,18px)}70%{transform:translate(18px,-10px)}}
        @keyframes spOrb3{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-22px)}}
        @keyframes spScanH{0%{top:-2px;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:102%;opacity:0}}
        @keyframes spRing{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.1);opacity:0}}
        @keyframes spSpin{to{transform:rotate(360deg)}}
        @keyframes spSpinR{to{transform:rotate(-360deg)}}
        @keyframes spUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .sp1{animation:spUp .6s ease both .1s}
        .sp2{animation:spUp .6s ease both .25s}
        .sp3{animation:spUp .6s ease both .4s}
        .sp4{animation:spUp .6s ease both .55s}
        .sp5{animation:spUp .6s ease both .7s}
      `}</style>

      {/* animated bg */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(200,255,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(200,255,0,0.025) 1px,transparent 1px)", backgroundSize:"44px 44px" }} />
        <div style={{ position:"absolute", top:"6%", left:"2%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(200,255,0,0.13) 0%,transparent 65%)", animation:"spOrb1 8s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"8%", right:"2%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,212,255,0.10) 0%,transparent 65%)", animation:"spOrb2 11s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"42%", right:"12%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(200,255,0,0.07) 0%,transparent 65%)", animation:"spOrb3 6s ease-in-out infinite" }} />
        <div style={{ position:"absolute", left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(200,255,0,0.5),transparent)", animation:"spScanH 7s ease-in-out infinite" }} />
      </div>

      {/* content */}
      <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center" }}>
        {/* logo rings */}
        <div className="sp1" style={{ position:"relative", width:148, height:148, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ position:"absolute", inset:0, borderRadius:"50%", border:"1px solid rgba(200,255,0,0.22)", animation:"spRing 3.2s ease-out infinite", animationDelay:`${i*1.07}s` }} />
          ))}
          <div style={{ position:"absolute", width:136, height:136, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(200,255,0,0.85)", borderRightColor:"rgba(200,255,0,0.18)", animation:"spSpin 3s linear infinite" }} />
          <div style={{ position:"absolute", width:112, height:112, borderRadius:"50%", border:"1.5px solid transparent", borderBottomColor:"rgba(0,212,255,0.6)", borderLeftColor:"rgba(0,212,255,0.12)", animation:"spSpinR 4.5s linear infinite" }} />
          <div style={{ width:84, height:84, borderRadius:"50%", zIndex:1, background:"rgba(200,255,0,0.07)", border:"1px solid rgba(200,255,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 40px rgba(200,255,0,0.12)" }}>
            <AppLogo size={58} glow={true} />
          </div>
        </div>

        <h1 className="sp2" style={{ fontFamily:"var(--font)", fontSize:30, fontWeight:800, color:"#f0f4f8", margin:"0 0 10px", letterSpacing:-1.2, lineHeight:1.12 }}>
          Detect <span style={{ color:"#c8ff00" }}>Misinformation</span>
          <br />& <span style={{ color:"#00d4ff" }}>AI Voice Fraud</span>
        </h1>

        <p className="sp3" style={{ fontSize:11, color:"rgba(240,244,248,0.38)", margin:"0 0 40px", fontFamily:"var(--mono)", letterSpacing:3, textTransform:"uppercase" }}>
          in real time
        </p>

        <button className="sp4 btn-p" onClick={onLogin}
          style={{ width:"100%", maxWidth:300, padding:"16px 0", marginBottom:10, fontSize:13, letterSpacing:0.5, borderRadius:14, boxShadow:"0 4px 28px rgba(200,255,0,0.25)" }}>
          Login
        </button>

        <button className="sp4 btn-g" onClick={onRegister}
          style={{ width:"100%", maxWidth:300, padding:"14px 0", marginBottom:14, fontSize:13, borderRadius:14 }}>
          Register
        </button>

        <span onClick={onGuest} style={{ fontSize:13, color:"#c8ff00", cursor:"pointer", fontWeight:500, textDecoration:"underline", textDecorationColor:"rgba(200,255,0,0.3)", WebkitTapHighlightColor:"transparent" }}>
          Continue as Guest
        </span>

        <p className="sp5" style={{ marginTop:32, fontSize:10, color:"rgba(240,244,248,0.18)", fontFamily:"var(--mono)", letterSpacing:1 }}>
          © 2025 Authentiscan Pro · Bianca Costa
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */
function LoginScreen({ onLogin, onGuest, goRegister }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focused, setFocused] = useState("");

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (e) {
      setError("Google sign-in failed. Try email/password or guest mode.");
      setGoogleLoading(false);
    }
  };

  const handle = async () => {
    setError("");
    if (!email || !pass) { setError("Please fill in all fields."); return; }
    setLoading(true);
    if (email.toLowerCase() === "user@test.com" && pass === "test123") {
      setLoading(false);
      onLogin(null);
      return;
    }
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (err) throw err;
      onLogin(data.user);
    } catch(e) {
      setError(e.message || "Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#070a0f" }}>
      <style>{`@keyframes lgSpin{to{transform:rotate(360deg)}}@keyframes lgUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.lg1{animation:lgUp .5s ease both .05s}.lg2{animation:lgUp .5s ease both .15s}.lg3{animation:lgUp .5s ease both .25s}`}</style>

      <div className="lg1" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:56, paddingBottom:24 }}>
        <AppLogo size={52} glow={true} />
        <div style={{ marginTop:12, fontSize:22, fontWeight:800, color:"#f0f4f8", letterSpacing:-0.8 }}>
          Authentiscan <span style={{ color:"#c8ff00" }}>Pro</span>
        </div>
        <div style={{ marginTop:4, fontSize:12, color:"#5a6475" }}>Detect misinformation in real time</div>
      </div>

      <div className="lg2" style={{ flex:1, padding:"0 22px 40px" }}>
        <div style={{ background:"rgba(13,17,23,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"24px 20px" }}>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading}
            style={{ width:"100%", padding:"14px 0", marginBottom:12, background: googleLoading ? "rgba(255,255,255,0.85)" : "#fff", border:"none", borderRadius:12, cursor: googleLoading ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:14, fontWeight:600, color:"#1f1f1f", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", opacity: googleLoading ? 0.8 : 1, WebkitTapHighlightColor:"transparent" }}>
            {googleLoading ? (
              <><span style={{ width:18, height:18, borderRadius:"50%", border:"2px solid #ddd", borderTopColor:"#333", display:"inline-block", animation:"lgSpin .8s linear infinite" }} />Redirecting...</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</>
            )}
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
            <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#5a6475", letterSpacing:2 }}>OR</span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
          </div>

          {/* Email */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }}>
              <Ico d={P.user} s={15} c={focused==="email" ? "#c8ff00" : "#5a6475"} />
            </div>
            <input className="inp" type="email" placeholder="Email address" value={email}
              onChange={e=>{ setEmail(e.target.value); setError(""); }}
              onFocus={()=>setFocused("email")} onBlur={()=>setFocused("")}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              style={{ padding:"13px 13px 13px 40px", borderColor: focused==="email" ? "#c8ff00" : "rgba(255,255,255,0.09)" }} />
          </div>

          {/* Password */}
          <div style={{ position:"relative", marginBottom:14 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }}>
              <Ico d={P.lock} s={15} c={focused==="pass" ? "#c8ff00" : "#5a6475"} />
            </div>
            <input className="inp" type={showPass?"text":"password"} placeholder="Password" value={pass}
              onChange={e=>{ setPass(e.target.value); setError(""); }}
              onFocus={()=>setFocused("pass")} onBlur={()=>setFocused("")}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              style={{ padding:"13px 42px 13px 40px", borderColor: focused==="pass" ? "#c8ff00" : "rgba(255,255,255,0.09)" }} />
            <button onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4, opacity:0.6, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={showPass?P.eyeoff:P.eye} s={17} c="#5a6475" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, background:"rgba(255,59,92,0.07)", border:"1px solid rgba(255,59,92,0.25)", borderRadius:10, padding:"9px 12px", marginBottom:12 }}>
              <Ico d={P.danger} s={14} c="#ff3b5c" />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:"#ff3b5c", fontWeight:600, lineHeight:1.4 }}>{error}</div>
              </div>
              <button onClick={()=>setError("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#ff3b5c", padding:0, flexShrink:0 }}>
                <Ico d={P.close} s={14} c="#ff3b5c" />
              </button>
            </div>
          )}

          <button className="btn-p" onClick={handle} disabled={loading}
            style={{ width:"100%", padding:"14px 0", fontSize:13, borderRadius:12, marginBottom:10, boxShadow: loading?"none":"0 4px 20px rgba(200,255,0,0.25)" }}>
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.2)", borderTopColor:"#070a0f", display:"inline-block", animation:"lgSpin .8s linear infinite" }} />
                Signing in...
              </span>
            ) : "Sign In with Email"}
          </button>

          <button className="btn-g" onClick={onGuest}
            style={{ width:"100%", padding:"13px 0", fontSize:12, borderRadius:12 }}>
            Continue as Guest · No Account Needed
          </button>

          <div style={{ marginTop:12, textAlign:"center", fontSize:13, color:"#5a6475" }}>
            Don't have an account?{" "}
            <span onClick={goRegister} style={{ color:"#c8ff00", fontWeight:600, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>Register Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   REGISTER
══════════════════════════════════════════ */
function RegisterScreen({ onLogin, onGuest, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (e) {
      setError("Google sign-up failed. Please try email.");
      setGoogleLoading(false);
    }
  };

  const handle = async () => {
    setError("");
    if (!name || !email || !pass) { setError("Please fill in all fields."); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name } }
      });
      if (err) throw err;
      if (data?.user) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (!signInErr && signInData?.user) {
          onLogin(signInData.user);
        } else {
          setShowConfirmModal(true);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      setError(e.message || "Registration failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#070a0f" }}>
      <style>{`@keyframes lgSpin{to{transform:rotate(360deg)}}@keyframes lgUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.rg1{animation:lgUp .5s ease both .05s}.rg2{animation:lgUp .5s ease both .15s}`}</style>

      {/* Email Confirm Modal */}
      {showConfirmModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
          <div style={{ background:"#0d1117", border:"1px solid rgba(200,255,0,0.25)", borderRadius:20, padding:"28px 24px", maxWidth:340, width:"100%", textAlign:"center", boxShadow:"0 0 40px rgba(200,255,0,0.08)" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(200,255,0,0.1)", border:"1.5px solid rgba(200,255,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c8ff00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:"#f0f4f8", marginBottom:8 }}>Check your email</div>
            <div style={{ fontSize:13, color:"#8a9ab5", lineHeight:1.6, marginBottom:6 }}>We sent a confirmation link to</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#c8ff00", marginBottom:16, wordBreak:"break-all" }}>{email}</div>
            <div style={{ fontSize:12, color:"#5a6475", lineHeight:1.6, marginBottom:24 }}>Click the link in the email to activate your account, then come back to sign in.</div>
            <button onClick={()=>{ setShowConfirmModal(false); goLogin(); }}
              style={{ width:"100%", padding:"13px 0", background:"#c8ff00", border:"none", borderRadius:12, fontSize:13, fontWeight:700, color:"#070a0f", cursor:"pointer", marginBottom:10, WebkitTapHighlightColor:"transparent" }}>
              Go to Login
            </button>
            <button onClick={()=>setShowConfirmModal(false)}
              style={{ width:"100%", padding:"11px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, fontSize:12, color:"#5a6475", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rg1" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:48, paddingBottom:20 }}>
        <AppLogo size={44} glow={true} />
        <div style={{ marginTop:10, fontSize:20, fontWeight:800, color:"#f0f4f8", letterSpacing:-0.8 }}>
          Hello! <span style={{ color:"#c8ff00" }}>Register</span> to get started
        </div>
      </div>

      <div className="rg2" style={{ flex:1, padding:"0 22px 40px" }}>
        <div style={{ background:"rgba(13,17,23,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"22px 20px" }}>

          {/* Name */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }}>
              <Ico d={P.user} s={15} c={focused==="name"?"#c8ff00":"#5a6475"} />
            </div>
            <input className="inp" type="text" placeholder="Full name" value={name}
              onChange={e=>{ setName(e.target.value); setError(""); }}
              onFocus={()=>setFocused("name")} onBlur={()=>setFocused("")}
              style={{ padding:"13px 13px 13px 40px", borderColor: focused==="name"?"#c8ff00":"rgba(255,255,255,0.09)" }} />
          </div>

          {/* Email */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }}>
              <Ico d={P.user} s={15} c={focused==="email"?"#c8ff00":"#5a6475"} />
            </div>
            <input className="inp" type="email" placeholder="Email address" value={email}
              onChange={e=>{ setEmail(e.target.value); setError(""); }}
              onFocus={()=>setFocused("email")} onBlur={()=>setFocused("")}
              style={{ padding:"13px 13px 13px 40px", borderColor: focused==="email"?"#c8ff00":"rgba(255,255,255,0.09)" }} />
          </div>

          {/* Password */}
          <div style={{ position:"relative", marginBottom:14 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", zIndex:1 }}>
              <Ico d={P.lock} s={15} c={focused==="pass"?"#c8ff00":"#5a6475"} />
            </div>
            <input className="inp" type={showPass?"text":"password"} placeholder="Password (min. 6 chars)" value={pass}
              onChange={e=>{ setPass(e.target.value); setError(""); }}
              onFocus={()=>setFocused("pass")} onBlur={()=>setFocused("")}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              style={{ padding:"13px 42px 13px 40px", borderColor: focused==="pass"?"#c8ff00":"rgba(255,255,255,0.09)" }} />
            <button onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4, opacity:0.6, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={showPass?P.eyeoff:P.eye} s={17} c="#5a6475" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, background:"rgba(255,59,92,0.07)", border:"1px solid rgba(255,59,92,0.25)", borderRadius:10, padding:"9px 12px", marginBottom:12 }}>
              <Ico d={P.danger} s={14} c="#ff3b5c" />
              <div style={{ flex:1, fontSize:12, color:"#ff3b5c", fontWeight:600, lineHeight:1.4 }}>{error}</div>
              <button onClick={()=>setError("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#ff3b5c", padding:0, flexShrink:0 }}>
                <Ico d={P.close} s={14} c="#ff3b5c" />
              </button>
            </div>
          )}

          <button className="btn-p" onClick={handle} disabled={loading}
            style={{ width:"100%", padding:"14px 0", fontSize:13, borderRadius:12, marginBottom:12, boxShadow: loading?"none":"0 4px 20px rgba(200,255,0,0.25)" }}>
            {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span style={{ width:10, height:10, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.2)", borderTopColor:"#070a0f", display:"inline-block", animation:"lgSpin .8s linear infinite" }} />Creating account...</span> : "Register"}
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
            <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"#5a6475", letterSpacing:2 }}>OR REGISTER WITH</span>
            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading}
            style={{ width:"100%", padding:"13px 0", marginBottom:12, background: googleLoading?"rgba(255,255,255,0.85)":"#fff", border:"none", borderRadius:12, cursor: googleLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:13, fontWeight:600, color:"#1f1f1f", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", opacity: googleLoading?0.8:1, WebkitTapHighlightColor:"transparent" }}>
            {googleLoading ? <><span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid #ddd", borderTopColor:"#333", display:"inline-block", animation:"lgSpin .8s linear infinite" }} />Redirecting...</> : <><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</>}
          </button>

          <button className="btn-g" onClick={onGuest} style={{ width:"100%", padding:"12px 0", fontSize:12, borderRadius:12, marginBottom:14 }}>
            Continue as Guest
          </button>

          <div style={{ textAlign:"center", fontSize:13, color:"#5a6475" }}>
            Already have an account?{" "}
            <span onClick={goLogin} style={{ color:"#c8ff00", fontWeight:600, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>Login Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SCAN
══════════════════════════════════════════ */
function ScanScreen({ go, setResult, scansUsed, setScansUsed, supaUser }) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [chips, setChips] = useState({ "Fact-Check": true, "Source Check": true, "Bias Detect": false, "Tone Analysis": false });
  const [step, setStep] = useState(-1);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const recordingTimerRef = useRef(null);
  const [audioName, setAudioName] = useState("");
  const [scanError, setScanError] = useState("");
  const mediaRef = useRef(null);
  const fileRef = useRef(null);
  const MAX_SCANS = 5;

  const STEPS = ["Parsing Content", "Cross-referencing Sources", "Analyzing Patterns", "Generating Report"];
  const API_URL = "/api/analyze";

  useEffect(() => {
    fetch(API_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ mode:"text", text:"ping" }) }).catch(()=>{});
  }, []);

  const analyzeLocally = (input) => {
    const t = input.toLowerCase();
    const hasURL = !!input.match(/https?:\/\//);
    const fakeWords = ["fake","hoax","false","fabricated","debunked","conspiracy","lie","lies","made up","not true","never happened","proven false"];
    const sourceWords = ["according to","reported by","study shows","researchers","scientists","experts","data shows","published","journal","university","reuters","bbc","cdc","who"];
    const fakeHits = fakeWords.filter(w=>t.includes(w)).length;
    const sourceHits = sourceWords.filter(w=>t.includes(w)).length;
    const factScore = Math.min(100,Math.max(0,fakeHits*22 - sourceHits*15 + (t.split(" ").length < 15 ? 30 : 0)));
    const alarmWords = ["shocking","outrage","unbelievable","explosive","bombshell","disgusting","terrifying","they don't want you to know","wake up","censored","suppressed","mainstream media","deep state","elite","agenda","viral","breaking","deleted"];
    const calmWords = ["analysis","however","although","evidence suggests","on the other hand","balanced","context","nuanced"];
    const alarmHits = alarmWords.filter(w=>t.includes(w)).length;
    const calmHits = calmWords.filter(w=>t.includes(w)).length;
    const emotionScore = Math.min(100,Math.max(0,alarmHits*18 - calmHits*12));
    const credibleDomains = ["reuters","bbc","npr","nature.com","pubmed","cdc.gov","who.int",".gov",".edu","nytimes","washingtonpost","guardian","apnews"];
    const suspectDomains = ["blogspot","wordpress.com","weebly","wixsite","xyz","viral","buzz"];
    const urlMatch = input.match(/https?:\/\/([^\s/]+)/g)||[];
    const domainStr = urlMatch.join(" ").toLowerCase();
    const credHits = credibleDomains.filter(d=>domainStr.includes(d)||t.includes(d)).length;
    const suspectHits = suspectDomains.filter(d=>domainStr.includes(d)).length;
    const sourceScore = hasURL ? Math.min(100,Math.max(0,suspectHits*25 - credHits*20)) : 50;
    const capsWords = (input.match(/\b[A-Z]{3,}\b/g)||[]).length;
    const excl = (input.match(/!/g)||[]).length;
    const styleScore = Math.min(100,Math.max(0,capsWords*8 + excl*10));
    const rawScore = Math.round(factScore*0.35 + emotionScore*0.25 + sourceScore*0.25 + styleScore*0.15);
    const score = Math.min(97,Math.max(4,rawScore));
    const type = score>=65?"danger":score>=35?"warn":"safe";
    const lvl = s=>s>=65?"danger":s>=35?"warn":"safe";
    return {
      type, score,
      title: type==="danger"?"High Misinformation Risk":type==="warn"?"Requires Verification":"Appears Credible",
      desc: type==="danger"?"Multiple misinformation indicators detected. Do not share without fact-checking.":type==="warn"?"Some claims unverified. Cross-check with trusted sources before sharing.":"Content shows characteristics of credible reporting.",
      verdict: type==="danger"?"fake":type==="warn"?"misleading":"real",
      summary: type==="danger"?"Strong indicators of misinformation detected in this content.":type==="warn"?"This content requires additional verification before sharing.":"Content appears credible based on available signals.",
      signals:[
        { name:"Claim Accuracy", desc:fakeHits>0?`${fakeHits} misinformation keyword(s) detected.`:sourceHits>0?`${sourceHits} credible source reference(s) found.`:"No explicit fact-check signals. Manual review advised.", pct:`${Math.round(100-factScore)}%`, col:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(factScore))], dot:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(factScore))] },
        { name:"Source Credibility", desc:!hasURL?"No source URL provided — credibility not evaluated for this scan.":credHits>0?`References to ${credHits} credible domain(s) found.`:"Source domain could not be verified.", pct:!hasURL?"N/A":`${Math.round(100-sourceScore)}%`, col:!hasURL?"#5a6475":["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(sourceScore))], dot:!hasURL?"#5a6475":["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(sourceScore))] },
        { name:"Emotional Intensity", desc:alarmHits>0?`${alarmHits} sensational phrase(s) detected.`:calmHits>0?"Balanced, measured language detected.":"Neutral tone with no strong emotional markers.", pct:`${Math.round(100-emotionScore)}%`, col:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(emotionScore))], dot:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(emotionScore))] },
        { name:"Writing Style", desc:capsWords>2||excl>2?`${capsWords} ALL-CAPS word(s) and ${excl} exclamation(s) — sensationalist pattern.`:"Writing style consistent with professional standards.", pct:`${Math.round(100-styleScore)}%`, col:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(styleScore))], dot:["#ff3b5c","#ffb340","#00e676"][["danger","warn","safe"].indexOf(lvl(styleScore))] },
      ]
    };
  };

  const finalize = (analysis, inputVal) => {
    const scanId = "#" + Math.random().toString(36).substr(2,6).toUpperCase();
    const timestamp = new Date().toLocaleString("en-US",{ month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    setScansUsed(n=>Math.min(n+1,MAX_SCANS));
    setResult({ ...analysis, input:inputVal, scanId, timestamp });
    go("result");
  };

  const runAnalysis = async (inputType, inputVal) => {
    if (scansUsed >= MAX_SCANS) {
      alert("Daily limit reached (5/5). Upgrade for unlimited scans.");
      return;
    }
    setStep(0);
    let idx = 0;
    const iv = setInterval(()=>{ idx=(idx+1)%STEPS.length; setStep(idx); }, 1800);

    if (inputType === "audio") {
      try {
        let audioB64 = null;
        if (audioBlobRef.current) {
          const buf = await audioBlobRef.current.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          const chunkSize = 8192;
          for (let i=0; i<bytes.length; i+=chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i,i+chunkSize));
          }
          audioB64 = btoa(binary);
        }
        const ctrl = new AbortController();
        const t = setTimeout(()=>ctrl.abort(),20000);
        const res = await fetch(API_URL,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ mode:"audio", audio:audioB64, audioMime:audioBlobRef.current?._mime||"audio/wav", audioExt:audioBlobRef.current?._ext||"wav" }), signal:ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          const d = await res.json();
          clearInterval(iv);
          setStep(3);
          setTimeout(()=>{ setStep(-1); finalize(d,"[Audio Recording]"); }, 400);
          return;
        }
      } catch(e){}
      clearInterval(iv);
      setStep(-1);
      setScanError("Analysis failed. Please check your connection and try again.");
      return;
    }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(),45000);
      const res = await fetch(API_URL,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ mode:inputType, text:inputVal }), signal:ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const d = await res.json();
        clearInterval(iv);
        setStep(3);
        setTimeout(()=>{ setStep(-1); finalize(d,inputVal); }, 400);
        return;
      }
    } catch(e){}
    clearInterval(iv);
    setStep(-1);
    setScanError("Analysis failed. Please check your connection and try again.");
  };

  const doScan = () => {
    setScanError("");
    if (mode === "audio") {
      if (!audioBlobRef.current && !audioName.includes("KB") && !audioName.includes("captured")) {
        setScanError("Please record audio or upload a file first.");
        return;
      }
      runAnalysis("audio", audioName);
      return;
    }
    const inp = mode==="text"?text.trim():url.trim();
    if (!inp) { setScanError(mode==="text"?"Please paste or type some text to analyze.":"Please enter a URL to scan."); return; }
    if (inp.length < 5) { setScanError("Content is too short to analyze."); return; }
    runAnalysis(mode, inp);
  };

  const chunksRef = useRef([]);
  const audioBlobRef = useRef(null);

  const toggleRecording = async () => {
    if (recording) {
      if (mediaRef.current) { mediaRef.current.stop(); mediaRef.current.stream?.getTracks().forEach(t=>t.stop()); }
      clearInterval(recordingTimerRef.current);
      setRecording(false);
      return;
    }
    try {
      chunksRef.current = [];
      audioBlobRef.current = null;
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream,{ mimeType:"audio/webm" });
      mr.ondataavailable = e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = ()=>{
        const blob = new Blob(chunksRef.current,{ type:"audio/webm" });
        audioBlobRef.current = blob;
        setAudioName(`Recording ready (${(blob.size/1024).toFixed(1)}KB)`);
        clearInterval(recordingTimerRef.current);
        setRecordingSecs(0);
      };
      mediaRef.current = mr;
      mr.start(100);
      setRecording(true);
      setRecordingSecs(0);
      setAudioName("");
      recordingTimerRef.current = setInterval(()=>{
        setRecordingSecs(s=>{
          if(s+1>=120){
            if(mediaRef.current){ mediaRef.current.stop(); mediaRef.current.stream?.getTracks().forEach(t=>t.stop()); }
            clearInterval(recordingTimerRef.current);
            setRecording(false);
            return 0;
          }
          return s+1;
        });
      },1000);
    } catch(e) {
      setAudioName("Mic access denied — using demo mode");
      setRecording(false);
    }
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (f) {
      audioBlobRef.current = f;
      audioBlobRef.current._mime = f.type||"audio/wav";
      audioBlobRef.current._ext = f.name.split(".").pop()||"wav";
      setAudioName(f.name);
    }
  };

  /* analyzing overlay */
  if (step >= 0) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:C.bg, gap:28, padding:40 }}>
      <style>{`@keyframes spinAnim{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:"relative", width:120, height:120 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2px solid ${C.border}` }} />
        <div style={{ position:"absolute", top:10, left:10, right:10, bottom:10, borderRadius:"50%", border:"1px solid rgba(200,255,0,0.3)", animation:"spinAnim 2.5s linear infinite" }} />
        <div style={{ position:"absolute", top:24, left:24, right:24, bottom:24, borderRadius:"50%", border:"2px solid #c8ff00", animation:"spinAnim 1.5s linear infinite reverse" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <AppLogo size={42} glow={true} />
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"var(--mono)", fontSize:10, letterSpacing:3, textTransform:"uppercase", color:C.accent, marginBottom:8 }}>Analyzing</div>
        <div style={{ fontSize:14, color:C.text, fontWeight:500 }}>{STEPS[step]}</div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {STEPS.map((_,i)=>(
          <div key={i} style={{ width:i===step?24:6, height:6, borderRadius:3, background:i===step?C.accent:i<step?"rgba(200,255,0,0.3)":C.border, transition:"all .4s" }} />
        ))}
      </div>
    </div>
  );

  const pct = Math.round((scansUsed/MAX_SCANS)*100);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
      <Nav right="SCAN" />
      <div style={{ padding:"18px 20px 110px" }}>
        {scansUsed >= MAX_SCANS && <UpBanner msg="You've used all 5 free scans today." />}

        {/* scan counter */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <span className="label">Daily Scans</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:100, height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:pct>=100?C.danger:pct>=70?C.warn:C.accent, borderRadius:2, transition:"width .5s" }} />
            </div>
            <span style={{ fontFamily:"var(--mono)", fontSize:11, color:pct>=100?C.danger:C.text, fontWeight:600 }}>
              {scansUsed}<span style={{ color:C.muted }}>/{MAX_SCANS}</span>
            </span>
          </div>
        </div>

        {/* mode tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:16, background:C.panel, borderRadius:12, padding:4, border:`1px solid ${C.border}` }}>
          {[{ id:"text", label:"Text", ico:P.scan },{ id:"url", label:"URL", ico:P.url },{ id:"audio", label:"Audio", ico:P.micro }].map(m=>(
            <button key={m.id} onClick={()=>{ setMode(m.id); setScanError(""); }}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", background:mode===m.id?"rgba(200,255,0,0.1)":"transparent", border:mode===m.id?"1px solid rgba(200,255,0,0.25)":"1px solid transparent", borderRadius:9, cursor:"pointer", color:mode===m.id?C.accent:C.muted, fontFamily:"var(--mono)", fontSize:10, letterSpacing:1, textTransform:"uppercase", transition:"all .2s", fontWeight:mode===m.id?600:400, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={m.ico} s={14} c={mode===m.id?C.accent:C.muted} />
              {m.label}
            </button>
          ))}
        </div>

        {/* input area */}
        {mode==="text" && (
          <textarea className="inp" placeholder="Paste news article, social media post, or any content to analyze..." value={text}
            onChange={e=>{ setText(e.target.value.slice(0,5000)); setScanError(""); }}
            style={{ padding:"14px 16px", minHeight:160, resize:"vertical", lineHeight:1.6, fontSize:14 }} />
        )}
        {mode==="url" && (
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}>
              <Ico d={P.url} s={16} c={C.muted} />
            </div>
            <input className="inp" type="url" placeholder="https://example.com/article" value={url}
              onChange={e=>{ setUrl(e.target.value); setScanError(""); }}
              style={{ padding:"14px 14px 14px 44px" }} />
          </div>
        )}
        {mode==="audio" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={toggleRecording}
              style={{ padding:"18px", background:recording?"rgba(255,59,92,0.1)":"rgba(200,255,0,0.06)", border:`1px solid ${recording?C.danger:"rgba(200,255,0,0.2)"}`, borderRadius:12, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, color:recording?C.danger:C.accent, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={P.micro} s={28} c={recording?C.danger:C.accent} />
              <span style={{ fontFamily:"var(--mono)", fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>
                {recording?"● Recording — Tap to Stop":"Tap to Record"}
              </span>
              {recording && (
                <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:13, color:C.danger, letterSpacing:1 }}>
                    {Math.floor(recordingSecs/60).toString().padStart(2,"0")}:{(recordingSecs%60).toString().padStart(2,"0")}
                  </span>
                  <div style={{ width:"100%", height:4, background:"rgba(255,59,92,0.15)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min((recordingSecs/120)*100,100)}%`, background:C.danger, borderRadius:4, transition:"width 1s linear", boxShadow:`0 0 8px ${C.danger}` }} />
                  </div>
                  <span style={{ fontFamily:"var(--mono)", fontSize:8, color:"rgba(255,59,92,0.5)", letterSpacing:1 }}>MAX 2:00</span>
                </div>
              )}
            </button>
            <button onClick={()=>fileRef.current?.click()}
              style={{ padding:"14px", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:C.muted, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={P.upload} s={18} c={C.muted} />
              <span style={{ fontFamily:"var(--mono)", fontSize:10, letterSpacing:1, textTransform:"uppercase" }}>Upload Audio File</span>
            </button>
            <input ref={fileRef} type="file" accept="audio/*" style={{ display:"none" }} onChange={handleFileUpload} />
            {audioName && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(200,255,0,0.05)", border:"1px solid rgba(200,255,0,0.2)", borderRadius:10 }}>
                <Ico d={P.check} s={14} c={C.accent} />
                <span style={{ fontSize:12, color:C.accent, fontFamily:"var(--mono)" }}>{audioName}</span>
              </div>
            )}
          </div>
        )}

        {/* analysis chips */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:14, marginBottom:16 }}>
          {Object.entries(chips).map(([label,on])=>(
            <button key={label} onClick={()=>setChips(c=>({ ...c, [label]:!c[label] }))}
              style={{ padding:"6px 12px", borderRadius:100, cursor:"pointer", background:on?"rgba(200,255,0,0.08)":"transparent", border:`1px solid ${on?"rgba(200,255,0,0.3)":C.border}`, color:on?C.accent:C.muted, fontFamily:"var(--mono)", fontSize:9, letterSpacing:1.5, textTransform:"uppercase", transition:"all .2s", WebkitTapHighlightColor:"transparent" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ERROR — improved with dismiss */}
        {scanError && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", marginBottom:14, borderRadius:12, background:"rgba(255,59,92,0.07)", border:"1px solid rgba(255,59,92,0.25)" }}>
            <div style={{ flexShrink:0, marginTop:1 }}>
              <Ico d={P.danger} s={16} c="#ff3b5c" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:"#ff3b5c", fontWeight:600, marginBottom:2 }}>Analysis Failed</div>
              <div style={{ fontSize:12, color:"rgba(255,59,92,0.75)", lineHeight:1.5 }}>{scanError}</div>
              <button onClick={()=>setScanError("")}
                style={{ marginTop:8, fontSize:11, color:"#ff3b5c", background:"none", border:"1px solid rgba(255,59,92,0.3)", borderRadius:6, padding:"4px 10px", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                Dismiss
              </button>
            </div>
            <button onClick={()=>setScanError("")}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#ff3b5c", padding:0, flexShrink:0, WebkitTapHighlightColor:"transparent" }}>
              <Ico d={P.close} s={16} c="rgba(255,59,92,0.6)" />
            </button>
          </div>
        )}

        <button onClick={doScan} disabled={scansUsed>=MAX_SCANS} className="btn-p"
          style={{ width:"100%", padding:"17px 0", fontSize:14, letterSpacing:0.5, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:scansUsed>=MAX_SCANS?"none":"0 4px 24px rgba(200,255,0,0.25)" }}>
          <Ico d={P.scan} s={18} c={scansUsed>=MAX_SCANS?"#5a6475":"#070a0f"} />
          {scansUsed>=MAX_SCANS?"Limit Reached — Upgrade":"Scan Now"}
        </button>
      </div>
      <BNav active="scan" go={go} user={supaUser} />
    </div>
  );
}

/* ══════════════════════════════════════════
   RESULT
══════════════════════════════════════════ */
function ResultScreen({ result, go, supaUser }) {
  const type = result?.type||"warn";
  const color = type==="danger"?C.danger:type==="warn"?C.warn:C.safe;
  const bg = type==="danger"?"rgba(255,59,92,0.07)":type==="warn"?"rgba(255,179,64,0.07)":"rgba(0,230,118,0.07)";
  const brd = type==="danger"?"rgba(255,59,92,0.25)":type==="warn"?"rgba(255,179,64,0.25)":"rgba(0,230,118,0.25)";
  const fallback = RISK[type];
  const score = result?.score??fallback.score;
  const title = result?.title||fallback.title;
  const desc = result?.desc||fallback.desc;
  const isAI = !!(result?.title && result?.signals?.length);
  const hasURL = !!(result?.input && result.input.match(/https?:\/\//));
  const rawSignals = result?.signals?.length ? result.signals : fallback.signals;
  const signals = rawSignals.map(s=>{
    const isSrc = s.name?.toLowerCase().includes("source")||s.name?.toLowerCase().includes("credibility");
    if(isSrc && !hasURL && (!s.pct||s.pct==="N/A"))
      return { ...s, desc:"No source URL provided — credibility not evaluated for this scan.", pct:"N/A", col:C.muted, dot:C.muted };
    return s;
  });

  const scanId = result?.scanId||"#DEMO01";
  const scanTime = result?.timestamp||new Date().toLocaleString("en-US",{ month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });

  const [filled, setFilled] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setFilled(true),200); return ()=>clearTimeout(t); },[result]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
      <Nav onBack={()=>go("scan")} right="RESULT" />
      <div style={{ padding:"18px 20px 110px" }}>

        {/* badges */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          {isAI && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 11px", borderRadius:100, background:"rgba(0,212,255,0.08)", border:"1px solid rgba(0,212,255,0.2)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:C.accent2 }} />
              <span style={{ fontFamily:"var(--mono)", fontSize:8, letterSpacing:2, textTransform:"uppercase", color:C.accent2 }}>AuthentiScan Analysis Engine</span>
            </div>
          )}
          {result?.verdict && (
            <div style={{ padding:"5px 11px", borderRadius:100, fontFamily:"var(--mono)", fontSize:9, letterSpacing:2, textTransform:"uppercase", fontWeight:700, background:result.verdict==="fake"?"rgba(255,59,92,0.1)":result.verdict==="real"?"rgba(0,230,118,0.1)":"rgba(255,179,64,0.1)", border:`1px solid ${result.verdict==="fake"?"rgba(255,59,92,0.3)":result.verdict==="real"?"rgba(0,230,118,0.3)":"rgba(255,179,64,0.3)"}`, color:result.verdict==="fake"?C.danger:result.verdict==="real"?C.safe:C.warn }}>
              {result.verdict==="fake"?"⚠ FAKE":result.verdict==="real"?"✓ VERIFIED":result.verdict==="misleading"?"⚡ MISLEADING":"? UNVERIFIED"}
            </div>
          )}
        </div>

        {/* metadata */}
        <div style={{ display:"flex", marginBottom:14, background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          {[["SCAN ID",scanId],["TIME",scanTime],["ENGINE","v2.0"]].map(([l,v],i)=>(
            <div key={i} style={{ flex:1, padding:"10px 12px", borderRight:i<2?`1px solid ${C.border}`:"none" }}>
              <div className="label" style={{ marginBottom:3 }}>{l}</div>
              <div style={{ fontFamily:"var(--mono)", fontSize:10, fontWeight:700, color:C.accent, letterSpacing:0.5 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* main score card */}
        <div style={{ background:bg, border:`1px solid ${brd}`, borderRadius:14, padding:18, marginBottom:12, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:4, height:"100%", background:color, borderRadius:"2px 0 0 2px" }} />
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ico d={P[type]} s={22} c={color} />
              </div>
              <div>
                <div className="label" style={{ marginBottom:3 }}>Risk Assessment</div>
                <div style={{ fontSize:17, fontWeight:700, color, lineHeight:1.2 }}>{title}</div>
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:48, fontWeight:800, color, lineHeight:1, fontFamily:"var(--font)" }}>{score}</div>
              <div className="label">Risk Index</div>
            </div>
          </div>
          {result?.summary && (
            <div style={{ background:"rgba(200,255,0,0.04)", border:"1px solid rgba(200,255,0,0.1)", borderRadius:8, padding:"10px 12px", marginBottom:12, fontSize:12, color:"rgba(240,244,248,0.75)", lineHeight:1.6, fontStyle:"italic" }}>
              "{stripCites(result.summary)}"
            </div>
          )}
          <p style={{ fontSize:13, lineHeight:1.8, color:"rgba(240,244,248,0.75)", marginBottom:14 }}>
            {stripCites(desc)}
          </p>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span className="label">Low Risk</span>
            <span className="label">High Risk</span>
          </div>
          <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:filled?`${score}%`:"0%", background:color, borderRadius:2, transition:"width 1.2s ease" }} />
          </div>
        </div>

        {/* why this score */}
        <button onClick={()=>setShowMethod(m=>!m)}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", marginBottom:10, background:"rgba(200,255,0,0.04)", border:"1px solid rgba(200,255,0,0.1)", borderRadius:10, cursor:"pointer", color:C.text, WebkitTapHighlightColor:"transparent" }}>
          <span style={{ fontFamily:"var(--mono)", fontSize:9, letterSpacing:2, textTransform:"uppercase", color:C.accent }}>⚙ Why this score?</span>
          <span style={{ color:C.muted, fontSize:11 }}>{showMethod?"▲":"▼"}</span>
        </button>
        {showMethod && (
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", marginBottom:10, fontSize:12, color:C.muted, lineHeight:1.8 }}>
            <div className="label" style={{ color:C.accent2, marginBottom:8 }}>Composite Risk Index Methodology</div>
            <div style={{ marginBottom:8 }}>Weighted average of {signals.length} signal categories:</div>
            {(()=>{
              const rawWeights = signals.map(s=>s.pct==="N/A"?0.5:1);
              const total = rawWeights.reduce((a,b)=>a+b,0);
              return signals.map((sig,i)=>{
                const pct = Math.round((rawWeights[i]/total)*100);
                return (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                    <span style={{ color:sig.pct==="N/A"?C.muted:C.accent, fontFamily:"var(--mono)", fontSize:10, fontWeight:700, flexShrink:0, minWidth:30 }}>{pct}%</span>
                    <span><span style={{ color:C.text }}>{sig.name}</span> — {stripCites(sig.desc)||"Analyzed for this scan."}</span>
                  </div>
                );
              });
            })()}
            <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${C.border}`, fontFamily:"var(--mono)", fontSize:8, letterSpacing:1, color:"rgba(200,255,0,0.4)" }}>
              ≥65 HIGH RISK · 35–64 VERIFY · &lt;35 LOW RISK
            </div>
          </div>
        )}

        {/* signals */}
        <div className="label" style={{ marginBottom:8 }}>Analysis Signals</div>
        {signals.map((sig,i)=>(
          <div key={i} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 15px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:sig.dot||sig.col||C.muted, marginTop:4, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:9, letterSpacing:1, textTransform:"uppercase", color:C.text, marginBottom:3 }}>{sig.name}</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{stripCites(sig.desc)}</div>
            </div>
            <div style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:700, color:sig.pct==="N/A"?C.muted:sig.col||C.muted, flexShrink:0, background:sig.pct==="N/A"?"rgba(90,100,117,0.15)":"transparent", padding:sig.pct==="N/A"?"2px 7px":"0", borderRadius:sig.pct==="N/A"?4:0, border:sig.pct==="N/A"?`1px solid rgba(90,100,117,0.25)`:"none" }}>
              {sig.pct}
            </div>
          </div>
        ))}

        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button onClick={()=>go("history")}
            style={{ flex:1, padding:14, background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, color:C.text, fontFamily:"var(--mono)", fontSize:9, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, WebkitTapHighlightColor:"transparent" }}>
            <Ico d={P.save} s={14} c={C.accent} /> Save
          </button>
          <button
            style={{ flex:1, padding:14, background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, color:C.text, fontFamily:"var(--mono)", fontSize:9, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, WebkitTapHighlightColor:"transparent" }}>
            <Ico d={P.share} s={14} c={C.accent} /> Share
          </button>
        </div>
      </div>
      <BNav active="result" go={go} user={supaUser} />
    </div>
  );
}

/* ══════════════════════════════════════════
   HISTORY — with improved empty state
══════════════════════════════════════════ */
function HistoryScreen({ go, history, supaUser }) {
  const icons = { danger:P.danger, warn:P.warn, safe:P.safe };
  const colors = { danger:C.danger, warn:C.warn, safe:C.safe };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
      <Nav right="HISTORY" />
      <div style={{ padding:"18px 20px 110px" }}>

        {history.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", textAlign:"center" }}>
            {/* icon circle */}
            <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(200,255,0,0.06)", border:"1px solid rgba(200,255,0,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <Ico d={P.hist} s={34} c="rgba(200,255,0,0.35)" />
            </div>

            {/* title */}
            <div style={{ fontFamily:"var(--mono)", fontSize:11, letterSpacing:2.5, textTransform:"uppercase", color:C.accent, marginBottom:10 }}>
              No Scans Yet
            </div>

            {/* subtitle */}
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.7, maxWidth:260, marginBottom:28 }}>
              Your scan history will appear here after you analyze your first piece of content.
            </div>

            {/* tip card */}
            <div style={{ width:"100%", maxWidth:320, background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:24, textAlign:"left" }}>
              <div className="label" style={{ color:C.accent2, marginBottom:8 }}>Quick Tips</div>
              {[
                "Paste a news article or social post",
                "Enter a URL to scan a webpage",
                "Record audio to detect AI voice fraud",
              ].map((tip,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom: i<2?8:0 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:C.accent, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{tip}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button className="btn-p" onClick={()=>go("scan")}
              style={{ padding:"14px 36px", fontSize:13, borderRadius:12, boxShadow:"0 4px 20px rgba(200,255,0,0.25)", display:"flex", alignItems:"center", gap:8 }}>
              <Ico d={P.scan} s={16} c="#070a0f" />
              Start Scanning
            </button>
          </div>
        ) : (
          /* ── HISTORY ITEMS ── */
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div className="label">{history.length} Scan{history.length!==1?"s":""}</div>
              <div style={{ fontFamily:"var(--mono)", fontSize:9, color:C.muted, letterSpacing:1 }}>RECENT FIRST</div>
            </div>
            {history.map((item,i)=>{
              const col = colors[item.type]||C.warn;
              return (
                <div key={i} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:`${col}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ico d={icons[item.type]||P.warn} s={18} c={col} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
                      {item.text}
                    </div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:C.muted, letterSpacing:1 }}>
                      {item.time} · Score {item.score}
                    </div>
                  </div>
                  <div style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:700, color:col }}>
                    {item.score}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      <BNav active="history" go={go} user={supaUser} />
    </div>
  );
}

/* ══════════════════════════════════════════
   PROFILE
══════════════════════════════════════════ */
function ProfileScreen({ go, onLogout, scansUsed, history, supaUser }) {
  const user = supaUser;
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";
  const email = user?.email || "guest@authentiscanapp.com";
  const avatar = user?.user_metadata?.avatar_url || null;
  const initials = name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)||"G";

  const [stats, setStats] = useState({ scans:0, flags:0, days:0 });

  useEffect(()=>{
    if (!user) return;
    supabase.from("scans").select("result_type, created_at").eq("user_id",user.id)
      .then(({ data })=>{
        if (!data) return;
        const flags = data.filter(r=>r.result_type==="danger"||r.result_type==="warn").length;
        const days = new Set(data.map(r=>r.created_at?.slice(0,10))).size;
        setStats({ scans:data.length, flags, days });
      });
  },[user]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:C.bg }}>
      <Nav right="PROFILE" />
      <div style={{ padding:"18px 20px 110px" }}>

        {/* profile header */}
        <div style={{ display:"flex", alignItems:"center", gap:16, padding:"20px", background:C.panel, border:`1px solid ${C.border}`, borderRadius:16, marginBottom:16 }}>
          <div style={{ position:"relative" }}>
            {avatar ? (
              <img src={avatar} alt="Profile" style={{ width:68, height:68, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.accent}`, boxShadow:`0 0 16px rgba(200,255,0,0.2)` }} />
            ) : (
              <div style={{ width:68, height:68, borderRadius:"50%", background:"rgba(200,255,0,0.12)", border:`2px solid ${C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:C.accent }}>
                {initials}
              </div>
            )}
            <div style={{ position:"absolute", bottom:2, right:2, width:14, height:14, borderRadius:"50%", background:C.safe, border:`2px solid ${C.panel}` }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:2 }}>{name}</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>{email}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:100, background:"rgba(200,255,0,0.08)", border:"1px solid rgba(200,255,0,0.2)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:C.accent }} />
              <span style={{ fontFamily:"var(--mono)", fontSize:8, letterSpacing:2, textTransform:"uppercase", color:C.accent }}>Free Plan</span>
            </div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
          {[[String(stats.scans),"Scans Done"],[String(stats.flags),"Flags Found"],[String(stats.days),"Days Active"]].map(([v,l])=>(
            <div key={l} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:800, color:C.accent, lineHeight:1, marginBottom:4 }}>{v}</div>
              <div className="label">{l}</div>
            </div>
          ))}
        </div>

        {/* plan */}
        <div style={{ background:"linear-gradient(135deg,rgba(200,255,0,0.06),rgba(0,212,255,0.04))", border:"1px solid rgba(200,255,0,0.15)", borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ fontWeight:700, color:C.accent, fontSize:14 }}>Free Plan</div>
            <div className="label" style={{ color:C.accent2 }}>Active</div>
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.6 }}>{scansUsed}/5 scans used today</div>
          <button className="btn-p" onClick={()=>window.open("https://www.authentiscanapp.com/","_blank")}
            style={{ width:"100%", padding:"12px 0", fontSize:13, letterSpacing:0.5, borderRadius:12 }}>
            Upgrade to Pro — $7.99/mo
          </button>
        </div>

        {/* logout */}
        <button onClick={onLogout}
          style={{ width:"100%", padding:"13px", background:"transparent", border:"1px solid rgba(255,59,92,0.2)", borderRadius:12, color:"rgba(255,59,92,0.7)", fontFamily:"var(--font)", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all .2s", WebkitTapHighlightColor:"transparent" }}>
          Sign Out
        </button>
      </div>
      <BNav active="profile" go={go} user={supaUser} />
    </div>
  );
}

/* ══════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [loggedIn, setLoggedIn] = useState(false);
  const [supaUser, setSupaUser] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [scansUsed, setScansUsed] = useState(0);

  const go = (s) => setScreen(s);

  useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } })=>{
      if (session?.user) {
        setLoggedIn(true);
        setSupaUser(session.user);
        if (screen==="splash"||screen==="login"||screen==="register") setScreen("scan");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event,session)=>{
      if (session?.user) {
        setLoggedIn(true);
        setSupaUser(session.user);
        if (event==="SIGNED_IN") setScreen("scan");
      } else if (event==="SIGNED_OUT") {
        setSupaUser(null);
        setLoggedIn(false);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if (!supaUser) return;
    supabase.from("scans").select("*").eq("user_id",supaUser.id).order("created_at",{ ascending:false }).limit(50)
      .then(({ data, error })=>{
        if (error||!data) return;
        setHistory(data.map(row=>({
          text: row.input_text||"Scan result",
          type: row.result_type,
          score: row.score,
          time: new Date(row.created_at).toLocaleString("en-US",{ month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
        })));
        setScansUsed(data.length);
      });
  },[supaUser]);

  const handleResult = async (r) => {
    setResult(r);
    const item = {
      text: r.input?.slice(0,60)||"Scan result",
      type: r.type,
      score: r.score,
      time: r.timestamp||new Date().toLocaleString("en-US",{ month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })
    };
    setHistory(h=>[item,...h.slice(0,49)]);
    setScansUsed(n=>n+1);

    if (supaUser) {
      const { error: insertError } = await supabase.from("scans").insert({
        user_id: supaUser.id,
        input_text: r.input?.slice(0,60)||"Scan result",
        scan_type: r.scanType||"text",
        result_type: r.type,
        score: r.score,
        verdict: r.verdict||"",
      });
      if (insertError) console.warn("Scan save failed:",insertError.code);
    }

    go("result");
  };

  return (
    <>
      <GlobalStyles />
      <div className="app-root" style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:C.bg, position:"relative" }}>
        {screen==="splash" && (
          <Splash
            onLogin={()=>go("login")}
            onRegister={()=>go("register")}
            onGuest={()=>{ supabase.auth.signOut(); setSupaUser(null); setLoggedIn(false); go("scan"); }}
          />
        )}
        {screen==="login" && (
          <LoginScreen
            onLogin={user=>{ setLoggedIn(true); if(user) setSupaUser(user); go("scan"); }}
            onGuest={()=>{ supabase.auth.signOut(); setSupaUser(null); setLoggedIn(false); go("scan"); }}
            goRegister={()=>go("register")}
          />
        )}
        {screen==="register" && (
          <RegisterScreen
            onLogin={user=>{ setLoggedIn(true); if(user) setSupaUser(user); go("scan"); }}
            onGuest={()=>{ supabase.auth.signOut(); setSupaUser(null); setLoggedIn(false); go("scan"); }}
            goLogin={()=>go("login")}
          />
        )}
        {screen==="scan" && (
          <ScanScreen
            go={go}
            setResult={handleResult}
            scansUsed={scansUsed}
            setScansUsed={setScansUsed}
            supaUser={supaUser}
          />
        )}
        {screen==="result" && <ResultScreen result={result} go={go} supaUser={supaUser} />}
        {screen==="history" && <HistoryScreen go={go} history={history} supaUser={supaUser} />}
        {screen==="profile" && (
          <ProfileScreen
            go={go}
            onLogout={()=>{ setLoggedIn(false); supabase.auth.signOut(); go("splash"); }}
            scansUsed={scansUsed}
            history={history}
            supaUser={supaUser}
          />
        )}
      </div>
    </>
  );
}
