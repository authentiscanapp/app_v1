/**
 * AuthentiScan Pro — embeddable verification widget.
 *
 * Partner sites include this script once, then either:
 *
 *   1) Declarative — drop a container with data attributes:
 *      <div class="authentiscan-widget"
 *           data-score="95"
 *           data-signals='[{"label":"Source","value":88},{"label":"Language","value":72},{"label":"Images","value":40}]'
 *           data-url="https://example.com/article"></div>
 *      <script src="https://app.authentiscanapp.com/widget.js" async></script>
 *
 *   2) Programmatic:
 *      AuthentiScan.render("#my-container", {
 *        score: 95,
 *        signals: [{label:"Source", value:88}, ...],
 *        url: "https://example.com/article"
 *      });
 *
 * The widget renders inside a Shadow DOM, so the host page's CSS never
 * affects it and vice-versa.
 */
(function () {
  "use strict";

  var APP_URL = "https://app.authentiscanapp.com";

  // Brand + state colors.
  var RED = "#FF4D4D",
    YELLOW = "#FFC53D",
    GREEN = "#3DD68C",
    LIME = "#C8FF00";

  var STYLES = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".card{width:100%;max-width:320px;",
    "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
    "background:#0E0E0E;border:1px solid #262626;border-radius:14px;padding:16px;",
    "color:#F2F3F0;line-height:1.4;-webkit-font-smoothing:antialiased}",
    ".head{display:flex;align-items:center;gap:7px;margin-bottom:14px}",
    ".head svg{display:block;flex:0 0 auto}",
    ".logo{font-size:13px;font-weight:600;letter-spacing:.01em}",
    ".logo b{color:" + LIME + ";font-weight:700}",
    ".top{display:flex;align-items:center;gap:14px;margin-bottom:15px}",
    ".gauge{width:66px;height:66px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;",
    "background:conic-gradient(var(--c) calc(var(--p)*3.6deg),#242424 0)}",
    ".gauge-in{width:52px;height:52px;border-radius:50%;background:#0E0E0E;",
    "display:flex;flex-direction:column;align-items:center;justify-content:center}",
    ".score{font-size:20px;font-weight:700;color:var(--c);line-height:1}",
    ".max{font-size:9px;color:#8A8A8A;margin-top:1px}",
    ".vwrap{min-width:0}",
    ".vlabel{font-size:9px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#8A8A8A;margin-bottom:3px}",
    ".verdict{font-size:16px;font-weight:700;color:var(--c);display:flex;align-items:center;gap:6px}",
    ".dot{width:8px;height:8px;border-radius:50%;background:var(--c);flex:0 0 auto}",
    ".signals{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}",
    ".sig-top{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:#B9BBB4;margin-bottom:4px}",
    ".sig-top b{color:#F2F3F0;font-weight:600}",
    ".sig-val{font-variant-numeric:tabular-nums;font-weight:600}",
    ".track{height:6px;border-radius:99px;background:#242424;overflow:hidden}",
    ".fill{height:100%;border-radius:99px;transition:width .5s ease}",
    ".link{display:block;text-align:center;font-size:12px;font-weight:700;color:#0A0A0A;",
    "background:" + LIME + ";border-radius:9px;padding:9px 10px;text-decoration:none;margin-bottom:11px}",
    ".link:hover{filter:brightness(1.06)}",
    ".foot{display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;color:#7A7A7A}",
    ".foot svg{display:block;flex:0 0 auto}",
  ].join("");

  var SHIELD =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 2l7 3v6c0 4.5-3 8-7 11-4-3-7-6.5-7-11V5l7-3z" fill="' + LIME + '"/>' +
    '<path d="M8.5 12l2.2 2.2L15.5 9.5" stroke="#0A0A0A" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var CHECK =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10" fill="#2A2A2A"/>' +
    '<path d="M8 12.2l2.6 2.6L16 9.5" stroke="' + LIME + '" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function num(v, d) {
    var n = parseFloat(v);
    return isNaN(n) ? d : n;
  }

  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // Risk axis: high score = high risk.
  function riskColor(v) {
    if (v >= 66) return RED;
    if (v >= 33) return YELLOW;
    return GREEN;
  }

  function verdictFor(score) {
    if (score >= 66) return { label: "High Risk", color: RED };
    if (score >= 33) return { label: "Verify", color: YELLOW };
    return { label: "Trustworthy", color: GREEN };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function signalRow(s) {
    var val = clamp(num(s.value, 0));
    var color = riskColor(val);
    return (
      '<div class="sig">' +
      '<div class="sig-top"><b>' + esc(s.label || "Signal") + '</b>' +
      '<span class="sig-val" style="color:' + color + '">' + val + "</span></div>" +
      '<div class="track"><div class="fill" style="width:' + val + "%;background:" + color + '"></div></div>' +
      "</div>"
    );
  }

  function cardHtml(score, verdict, signals, link) {
    var sigHtml = signals.length
      ? '<div class="signals">' + signals.map(signalRow).join("") + "</div>"
      : "";
    return (
      '<div class="card" style="--c:' + verdict.color + ";--p:" + score + '">' +
      '<div class="head">' + SHIELD + '<span class="logo">AuthentiScan <b>Pro</b></span></div>' +
      '<div class="top">' +
      '<div class="gauge"><div class="gauge-in">' +
      '<span class="score">' + score + '</span><span class="max">/100 risk</span></div></div>' +
      '<div class="vwrap"><div class="vlabel">Verdict</div>' +
      '<div class="verdict"><span class="dot"></span>' + esc(verdict.label) + "</div></div>" +
      "</div>" +
      sigHtml +
      '<a class="link" href="' + esc(link) + '" target="_blank" rel="noopener">View full analysis →</a>' +
      '<div class="foot">' + CHECK + "<span>Verified by AuthentiScan Pro</span></div>" +
      "</div>"
    );
  }

  function render(target, opts) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    opts = opts || {};

    var score = clamp(num(opts.score, 0));
    var verdict = opts.verdict
      ? { label: opts.verdict, color: verdictFor(score).color }
      : verdictFor(score);

    var signals = (Array.isArray(opts.signals) ? opts.signals : [])
      .slice(0, 3)
      .map(function (s) {
        return { label: s.label, value: s.value };
      });

    var link = APP_URL + "/?source=widget";
    if (opts.url) link += "&url=" + encodeURIComponent(opts.url);

    var root = el.shadowRoot || el.attachShadow({ mode: "open" });
    root.innerHTML = "<style>" + STYLES + "</style>" + cardHtml(score, verdict, signals, link);
    el.__asRendered = true;
    return el;
  }

  function parseEl(el) {
    var d = el.dataset || {};
    var opts = { score: d.score, verdict: d.verdict, url: d.url };
    if (d.signals) {
      try {
        opts.signals = JSON.parse(d.signals);
      } catch (e) {
        console.error("[AuthentiScan] invalid data-signals (JSON):", e);
      }
    }
    return opts;
  }

  function init(rootEl) {
    var scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
    var nodes = scope.querySelectorAll(
      "[data-authentiscan-widget],.authentiscan-widget"
    );
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__asRendered) return;
      render(el, parseEl(el));
    });
  }

  window.AuthentiScan = { render: render, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }
})();
