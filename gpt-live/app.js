/* Router, language switch, sidebar, and every page. Text lives in content.js, session data in data.js. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NS = "http://www.w3.org/2000/svg";
const APP = { cleanups: [] };

const NAV = [
  ["start", ["", "intro"]],
  ["how", ["duplex", "split", "delegation", "filler", "memory", "turns", "tools", "transports"]],
  ["example", ["replay", "latency", "quiz"]],
];
const PAGES = NAV.flatMap(([, ids]) => ids);
const DOT = { "": "#7cc4ff", intro: "#7cc4ff", replay: "#f0c560", latency: "#f0c560", quiz: "#e05a8a" };
const COL = { user: "#2f8f6a", live: "#4a63c8", app: "#c8743a", be: "#8a55c4", relay: "#5b6475", filler: "#6f84e0", bad: "#e05a5a" };

/* ---------------------------------------------------------------- language */
let LANG = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "zh") return q;
  try { const s = localStorage.getItem("gptlive-lang"); if (s === "en" || s === "zh") return s; } catch (e) {}
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
})();
const T = () => TXT[LANG];
function setLang(l) {
  LANG = l;
  try { localStorage.setItem("gptlive-lang", l); } catch (e) {}
  route();
}
// [[m]] / [[d]] / [[i]] → source badges
function rich(html) {
  const u = T().ui;
  return String(html).replace(/\[\[(m|d|i)\]\]/g, (_, k) => `<span class="badge b-${k}" title="${esc(u.badgeHelp[k])}">${esc(u.badges[k])}</span>`);
}

/* ---------------------------------------------------------------- helpers */
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgText(parent, x, y, text, cls, anchor = "middle") {
  const t = el("text", { x, y, class: cls, "text-anchor": anchor }, parent);
  t.textContent = text;
  return t;
}
function arrowDefs(svg, id, color = "#7a849a") {
  const d = el("defs", {}, svg);
  const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, d);
  el("path", { d: "M0,0 L10,5 L0,10 z", fill: color }, m);
}
function table(head, rows, cls = "") {
  return `<div class="tablewrap"><table class="${cls}"><thead><tr>${head.map(h => `<th>${rich(h)}</th>`).join("")}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(c => `<td>${rich(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
}
const list = items => `<ul class="pts">${items.map(i => `<li>${rich(i)}</li>`).join("")}</ul>`;
const head = p => `<div class="kicker">${esc(p.kicker)}</div><h1>${esc(p.title)}</h1><p class="cap">${rich(p.cap)}</p>`;
function jsonHtml(obj) {
  return esc(JSON.stringify(obj, null, 2))
    .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="jk">$1</span>$2')
    .replace(/(:\s*)(&quot;.*?&quot;)/g, '$1<span class="js">$2</span>')
    .replace(/(:\s*)(-?\d+\.?\d*)/g, '$1<span class="jn">$2</span>');
}
function every(ms, fn) { const id = setInterval(fn, ms); APP.cleanups.push(() => clearInterval(id)); return id; }
function later(ms, fn) { const id = setTimeout(fn, ms); APP.cleanups.push(() => clearTimeout(id)); return id; }

/* ---------------------------------------------------------------- drawer */
function openDrawer(title, sub, bodyHtml) {
  const d = $("#drawer");
  d.innerHTML = `<button class="x" aria-label="${esc(T().ui.close)}">×</button><div class="kicker">${esc(sub)}</div><h2>${esc(title)}</h2>${bodyHtml}`;
  d.classList.add("open");
  d.querySelector(".x").onclick = closeDrawer;
}
function closeDrawer() { $("#drawer").classList.remove("open"); }
function openEvent(ev) {
  openDrawer(ev.name, `t = ${(ev.t - T0).toFixed(2)} s · ${ev.lane === "live" ? "Live ⇄ app" : "app ⇄ backend"}`, `<div class="kicker sub">${esc(T().ui.json)}</div><pre class="json">${jsonHtml(ev.json)}</pre>`);
}

/* ---------------------------------------------------------------- chrome */
function renderChrome(r) {
  const t = T();
  document.documentElement.lang = LANG === "zh" ? "zh-CN" : "en";
  document.title = t.ui.brand + (r ? " · " + t.nav.pages[r] : "");
  $("#brand").textContent = t.ui.brand;
  $("#hint").textContent = t.ui.hint;
  $("#lang").textContent = t.ui.lang;
  $("#lang").title = t.ui.langTitle;
  $("#prev").setAttribute("aria-label", t.ui.prevPage);
  $("#next").setAttribute("aria-label", t.ui.nextPage);
  $("#side").innerHTML = NAV.map(([sec, ids]) => `<div class="sec">${esc(t.nav.sections[sec])}</div>` +
    ids.map(id => `<a href="#${id}" class="${r === id ? "active" : ""}"><i style="background:${DOT[id] || "#56607a"}"></i>${esc(t.nav.pages[id])}</a>`).join("")).join("");
}
function pager(r) {
  const i = PAGES.indexOf(r), t = T().nav.pages;
  const p = PAGES[i - 1], n = PAGES[i + 1];
  return `<div class="pager">${p !== undefined ? `<a href="#${p}">← ${esc(t[p])}</a>` : "<span></span>"}${n !== undefined ? `<a href="#${n}">${esc(t[n])} →</a>` : ""}</div>`;
}

/* ================================================================ pages */

function pageHome(v) {
  const t = T(), h = t.home;
  v.innerHTML = `<div class="home"><h1>${esc(h.title)}</h1><p class="lead">${esc(h.lead)}</p>
    <p class="note">${esc(h.sources)} ${rich("[[m]] [[d]] [[i]]")}. ${esc(h.caveat)}</p>
    ${NAV.map(([sec, ids]) => `<div class="sec-h">${esc(t.nav.sections[sec])}</div><div class="cards">` +
      ids.filter(id => id).map(id => `<a href="#${id}"><div class="bar" style="background:${DOT[id] || "#56607a"}"></div><b>${esc(t.nav.pages[id])}</b><span>${esc(t.nav.blurbs[id])}</span></a>`).join("") + `</div>`).join("")}
    <a class="cta" href="#intro">${esc(h.start)}</a></div>`;
}

/* ---------------------------------------------------------------- intro */
let introMode = "live";
function introDiagram(host, mode) {
  const t = T().intro, n = t.nodes, e = t.edges;
  const W = 760, H = 270;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "diag-svg", role: "img" });
  arrowDefs(svg, "ia");
  const N = {
    relay: [["you", 90, 135, 120, n.you, "", COL.user], ["stt", 330, 50, 170, n.stt, "", COL.relay], ["llm", 600, 135, 160, n.llm, "", COL.relay], ["tts", 330, 220, 170, n.tts, "", COL.relay]],
    realtime: [["you", 110, 135, 120, n.you, "", COL.user], ["rt", 470, 135, 260, n.rt, n.rtSub, COL.live], ["tools", 470, 238, 140, n.tools, "", COL.relay]],
    live: [["you", 70, 135, 100, n.you, "", COL.user], ["live", 320, 135, 200, n.live, n.liveSub, COL.live], ["be", 650, 135, 180, n.be, n.beSub, COL.be]],
  }[mode];
  const E = {
    relay: [["you", "stt", ""], ["stt", "llm", e.text], ["llm", "tts", e.text], ["tts", "you", ""]],
    realtime: [["you", "rt", e.audio, -10], ["rt", "you", "", 10], ["rt", "tools", "", 0, true]],
    live: [["you", "live", e.audio, -10], ["live", "you", "", 10], ["live", "be", e.deleg, -10, true], ["be", "live", e.answer, 10, true]],
  }[mode];
  const by = {};
  N.forEach(([id, x, y, w, label, sub, c]) => { by[id] = { x, y, w, h: sub ? 58 : 44, label, sub, c }; });
  const edge = (a, b) => {
    const A = by[a], B = by[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const cut = N => { const tx = Math.abs(ux) > 1e-6 ? (N.w / 2) / Math.abs(ux) : 1e9, ty = Math.abs(uy) > 1e-6 ? (N.h / 2) / Math.abs(uy) : 1e9; return Math.min(tx, ty) + 4; };
    return [A.x + ux * cut(A), A.y + uy * cut(A), B.x - ux * cut(B), B.y - uy * cut(B), -uy, ux];
  };
  E.forEach(([a, b, label, off = 0, dashed], i) => {
    const [x1, y1, x2, y2, nx, ny] = edge(a, b);
    const ox = nx * off, oy = ny * off;
    const p = el("path", { id: "ie" + i, d: `M${x1 + ox},${y1 + oy} L${x2 + ox},${y2 + oy}`, class: "edge" + (dashed ? " dashed" : ""), "marker-end": "url(#ia)" }, svg);
    if (label) svgText(svg, (x1 + x2) / 2, (y1 + y2) / 2 + (off < 0 ? -18 : off > 0 ? 26 : -8), label, "edge-label");
    for (let k = 0; k < 2; k++) {
      const c = el("circle", { r: 4, fill: by[a].c, stroke: "#fff", "stroke-width": 1 }, svg);
      const am = el("animateMotion", { dur: "2.2s", repeatCount: "indefinite", begin: `-${k * 1.1}s` }, c);
      el("mpath", { href: "#ie" + i }, am);
    }
  });
  N.forEach(([id]) => {
    const b = by[id], g = el("g", { class: "inode" }, svg);
    el("rect", { x: b.x - b.w / 2, y: b.y - b.h / 2, width: b.w, height: b.h, rx: 10, fill: b.c }, g);
    svgText(g, b.x, b.sub ? b.y - 4 : b.y + 5, b.label, "nl");
    if (b.sub) svgText(g, b.x, b.y + 16, b.sub, "ns");
  });
  host.appendChild(svg);
}
function pageIntro(v) {
  const t = T().intro;
  const draw = () => {
    const m = t.modes[introMode];
    v.querySelector(".modes").innerHTML = Object.keys(t.modes).map(k => `<button data-m="${k}" class="${k === introMode ? "on" : ""}">${esc(t.modes[k].name)}</button>`).join("");
    v.querySelectorAll(".modes button").forEach(b => b.onclick = () => { introMode = b.dataset.m; APP.cleanups.forEach(f => f()); APP.cleanups = []; draw(); });
    v.querySelector(".mtext").innerHTML = `<div class="tag">${esc(m.tag)}</div><p class="analogy">${esc(m.analogy)}</p>${list(m.points)}`;
    const host = v.querySelector(".diag"); host.innerHTML = ""; introDiagram(host, introMode);
    playDialogue();
  };
  const playDialogue = () => {
    const box = v.querySelector(".dialogue"), lines = t.dialogue[introMode];
    box.innerHTML = "";
    let i = 0;
    const step = () => {
      if (i >= lines.length) return;
      const [who, text] = lines[i++];
      box.insertAdjacentHTML("beforeend", `<div class="bub ${who}">${who === "sys" ? "" : `<b>${esc(t.who[who])}</b>`}${esc(text)}</div>`);
      later(who === "sys" ? 1100 : 1600, step);
    };
    step();
  };
  v.innerHTML = `${head(t)}<div class="modes"></div>
    <div class="intro-grid"><div class="mtext"></div><div><div class="stage diag"></div>
      <div class="dialogue-wrap"><div class="dialogue"></div><button class="replay-d">${esc(T().ui.replay)}</button></div></div></div>
    ${table(t.tableHead, t.table)}<p class="callout">${rich(t.takeaway)}</p>${pager("intro")}`;
  v.querySelector(".replay-d").onclick = () => { APP.cleanups.forEach(f => f()); APP.cleanups = []; playDialogue(); };
  draw();
}

/* ---------------------------------------------------------------- duplex */
function laneChart(host, spec) {
  // spec: { dur, lanes: [{label, base: "stream"|"none", voice: [[a,b,col]], cut}], events: [[t, label, col]] }
  const W = 860, L = 130, R = 20, LH = 34, top = 14, evH = 74;
  const H = top + spec.lanes.length * LH + evH;
  const x = s => L + (s / spec.dur) * (W - L - R);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "lane-svg" });
  spec.lanes.forEach((ln, i) => {
    const y = top + i * LH;
    svgText(svg, L - 10, y + 20, ln.label, "lane-label", "end");
    if (ln.base === "stream") {
      for (let s = 0; s < spec.dur; s += 0.25) el("rect", { x: x(s) + 1, y: y + 13, width: x(0.25) - x(0) - 2, height: 6, rx: 2, class: "silence" }, svg);
    } else el("line", { x1: L, x2: W - R, y1: y + 16, y2: y + 16, class: "baseline" }, svg);
    ln.voice.forEach(([a, b, c]) => el("rect", { x: x(a), y: y + 5, width: x(b) - x(a), height: 22, rx: 5, fill: c }, svg));
  });
  const ey = top + spec.lanes.length * LH + 6;
  svgText(svg, L - 10, ey + 14, spec.evLabel, "lane-label", "end");
  spec.events.forEach(([s, label, c], i) => {
    const row = i % 3;
    el("line", { x1: x(s), x2: x(s), y1: top, y2: ey + 10 + row * 20, class: "evline", stroke: c }, svg);
    el("circle", { cx: x(s), cy: ey + 10 + row * 20, r: 4, fill: c }, svg);
    svgText(svg, x(s) + 7, ey + 14 + row * 20, label, "ev-label", "start");
  });
  const ph = el("line", { x1: L, x2: L, y1: top - 4, y2: H - 4, class: "playhead" }, svg);
  el("animateTransform", { attributeName: "transform", type: "translate", from: "0 0", to: `${W - L - R} 0`, dur: spec.dur * 0.9 + "s", repeatCount: "indefinite" }, ph);
  host.appendChild(svg);
}
function pageDuplex(v) {
  const t = T().duplex, ln = t.lanes, re = t.rtEvents, le = t.liveEvents;
  v.innerHTML = `${head(t)}
    <h3>${esc(t.rt)}</h3><div class="stage lanes" id="rt"></div>
    <h3>${esc(t.live)}</h3><div class="stage lanes" id="lv"></div>
    <div class="legend-row"><span style="--c:${COL.user}">${esc(t.legend.voice)}</span><span class="sil">${esc(t.legend.silence)}</span><span class="evl">${esc(t.legend.ev)}</span></div>
    ${list(t.points)}${pager("duplex")}`;
  laneChart($("#rt"), { dur: 12, evLabel: ln.ev,
    lanes: [{ label: ln.up, base: "stream", voice: [[0.5, 3.0, COL.user], [6.0, 7.6, COL.user]] },
            { label: ln.down, base: "none", voice: [[3.6, 6.3, COL.live], [8.3, 11.2, COL.live]] }],
    events: [[0.6, re[0], "#9aa3b5"], [3.1, re[1], "#9aa3b5"], [3.35, re[2], "#9aa3b5"], [6.1, re[3], COL.bad], [6.3, re[4], COL.bad], [8.2, re[5], "#9aa3b5"]] });
  laneChart($("#lv"), { dur: 12, evLabel: ln.ev,
    lanes: [{ label: ln.up, base: "stream", voice: [[0.5, 3.0, COL.user]] },
            { label: ln.down, base: "stream", voice: [[4.0, 5.3, COL.filler], [6.4, 9.6, COL.live]] }],
    events: [[1.0, le[0], "#9aa3b5"], [3.9, le[1], COL.app], [5.6, le[2], COL.app], [6.5, le[3], "#9aa3b5"]] });
}

/* ---------------------------------------------------------------- split */
function pageSplit(v) {
  const t = T().split;
  const cfg = jsonHtml(EVENTS[0].json).replace(/(<span class="jk">&quot;(instructions|delegation)&quot;<\/span>)/g, '<mark>$1</mark>');
  v.innerHTML = `${head(t)}
    <div class="two">
      <div class="card-col" style="--c:${COL.live}"><h3>${rich(t.front)}</h3>${list(t.frontList)}</div>
      <div class="card-col" style="--c:${COL.be}"><h3>${rich(t.back)}</h3>${list(t.backList)}</div>
    </div>
    <h2>${esc(t.configH)}</h2><p>${rich(t.configP)}</p><pre class="json">${cfg}</pre>
    <h2>${esc(t.targetsH)}</h2>${table(t.targetsHead, t.targets)}<p class="callout">${rich(t.tip)}</p>${pager("split")}`;
}

/* ---------------------------------------------------------------- delegation */
let delegMode = "client", delegStep = 0;
const DELEG_EXTRA = {
  client: {
    0: { type: "session.input_transcript.delta", start_ms: 5600, end_ms: 5800, delta: " two" },
    2: { type: "session.output_transcript.delta", start_ms: 6000, end_ms: 6200, delta: " Sure," },
    3: { input: "Conversation so far:\nuser: Hi, can you check the status of my order? The number is one zero four two\n\nAnswer the user's latest request." },
    7: { type: "session.output_transcript.delta", start_ms: 8000, end_ms: 8200, delta: " Your order" },
  },
  responses: { 1: { session: { delegation: { type: "responses", responses: { "…": "model, instructions, tools" } } } } },
};
function seqDiagram(host, steps, cur, lanes) {
  const t = T().delegation, AL = t.arrowLabels;
  const X = { u: 80, l: 300, a: 530, b: 750 }, W = 830, top = 56;
  const rows = [];
  let y = top + 20;
  steps.forEach((s, i) => { s.arrows.forEach(a => { rows.push({ i, a, y }); y += 40; }); y += 10; });
  const H = y + 10;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "seq-svg" });
  arrowDefs(svg, "sa", "#7a849a"); arrowDefs(svg, "sb", "#f0c560");
  const cols = [COL.user, COL.live, COL.app, COL.be];
  ["u", "l", "a", "b"].forEach((k, i) => {
    el("line", { x1: X[k], x2: X[k], y1: top, y2: H - 6, class: "lifeline" }, svg);
    el("rect", { x: X[k] - 78, y: 8, width: 156, height: 34, rx: 8, fill: cols[i], opacity: (delegMode === "responses" && k === "b") ? 0.6 : 1 }, svg);
    svgText(svg, X[k], 30, lanes[i], "nl small");
  });
  if (delegMode === "responses") {
    el("rect", { x: X.l - 92, y: top - 6, width: X.b - X.l + 184, height: H - top, rx: 12, class: "oai-box" }, svg);
  }
  rows.forEach(({ i, a, y }) => {
    const [pair, key] = a.split(":"), [f, to] = pair.split("-");
    const state = i === cur ? "cur" : i < cur ? "past" : "future";
    const g = el("g", { class: "msg " + state, "data-i": i }, svg);
    const def = { "u-l": AL.audio, "a-b": AL.post, "b-a": AL.reply, "a-a": AL.build, "b-l": AL.answer };
    const label = key ? AL[key] : def[pair];
    if (f === to) {
      const x0 = X[f];
      el("path", { d: `M${x0},${y - 8} h44 v18 h-40`, class: "arrow", "marker-end": `url(#${state === "cur" ? "sb" : "sa"})` }, g);
      svgText(g, x0 + 52, y + 5, label, "msg-label", "start");
    } else {
      const x1 = X[f] + (X[to] > X[f] ? 6 : -6), x2 = X[to] + (X[to] > X[f] ? -6 : 6);
      el("line", { x1, x2, y1: y, y2: y, class: "arrow", "marker-end": `url(#${state === "cur" ? "sb" : "sa"})` }, g);
      svgText(g, (x1 + x2) / 2, y - 7, label, "msg-label");
    }
    el("text", { x: 14, y: y + 4, class: "msg-n" }, g).textContent = i + 1;
    g.addEventListener("click", () => { delegStep = i; pageDelegation($("#view")); });
  });
  host.appendChild(svg);
}
function pageDelegation(v) {
  const t = T().delegation, steps = t.steps[delegMode], ui = T().ui;
  delegStep = Math.min(delegStep, steps.length - 1);
  const s = steps[delegStep];
  const json = s.ev != null && delegMode === "client" ? EVENTS[s.ev].json : (DELEG_EXTRA[delegMode][delegStep] || null);
  v.innerHTML = `${head(t)}
    <div class="modes">${Object.keys(t.modes).map(k => `<button data-m="${k}" class="${k === delegMode ? "on" : ""}">${esc(t.modes[k])}</button>`).join("")}</div>
    <div class="comp-layout">
      <div class="guide">
        <div class="stepnav"><button id="sb" ${delegStep === 0 ? "disabled" : ""}>${esc(ui.back)}</button><button id="sn" ${delegStep === steps.length - 1 ? "disabled" : ""}>${esc(ui.next)}</button><span class="tcount">${esc(ui.stepOf(delegStep + 1, steps.length))}</span></div>
        <ol class="steplist">${steps.map((x, i) => `<li class="${i === delegStep ? "on" : ""}"><button class="st" data-i="${i}"><span class="n">${i + 1}</span>${esc(x.t)}</button><p>${rich(x.b)}</p></li>`).join("")}</ol>
      </div>
      <div class="stagewrap"><div class="stage seq"></div>
        ${json ? `<div class="kicker sub">${esc(ui.json)}</div><pre class="json">${jsonHtml(json)}</pre>` : ""}</div>
    </div>
    <h2>${esc(t.neverH)}</h2>${list(t.never)}${pager("delegation")}`;
  seqDiagram(v.querySelector(".seq"), steps, delegStep, delegMode === "client" ? t.lanes : t.lanesResp);
  v.querySelectorAll(".modes button").forEach(b => b.onclick = () => { delegMode = b.dataset.m; delegStep = 0; pageDelegation(v); });
  v.querySelectorAll(".st").forEach(b => b.onclick = () => { delegStep = +b.dataset.i; pageDelegation(v); });
  $("#sb").onclick = () => { delegStep--; pageDelegation(v); };
  $("#sn").onclick = () => { delegStep++; pageDelegation(v); };
}

/* ---------------------------------------------------------------- gantt (filler + latency) */
// m: { detect, fillerStart, fillerEnd, wait, connect, backend, ack, speak, answer }  (seconds after the user stops)
function gantt(host, m) {
  const t = T().filler, rows = t.rows;
  const W = 860, L = 190, R = 20, RH = 30, top = 10, X0 = -1, X1 = 6.5;
  const H = top + rows.length * RH + 48;
  const x = s => L + ((Math.min(Math.max(s, X0), X1) - X0) / (X1 - X0)) * (W - L - R);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "gantt-svg" });
  const sent = m.detect + m.wait + m.connect + m.backend;
  const bars = [
    [0, X0, 0, COL.user], [1, 0, m.detect, "#3a4355"], [2, m.fillerStart, m.fillerEnd, COL.filler], [3, m.detect, m.detect + m.wait, COL.app],
    [4, m.detect + m.wait + m.connect, sent, COL.be], [5, sent, sent + m.ack + m.speak, "#3a4f8f"], [6, m.answer, X1, COL.live],
  ];
  for (let s = 0; s <= 6; s++) {
    el("line", { x1: x(s), x2: x(s), y1: top, y2: H - 40, class: "grid" }, svg);
    svgText(svg, x(s), H - 26, s + "s", "axis");
  }
  if (m.answer - m.fillerEnd > 0.6) {
    el("rect", { x: x(m.fillerEnd), y: top, width: x(m.answer) - x(m.fillerEnd), height: rows.length * RH, class: "deadair" }, svg);
  }
  rows.forEach((r, i) => svgText(svg, L - 10, top + i * RH + 20, r, "lane-label", "end"));
  bars.forEach(([i, a, b, c]) => {
    if (b <= a) return;
    el("rect", { x: x(a), y: top + i * RH + 6, width: Math.max(2, x(b) - x(a)), height: RH - 12, rx: 4, fill: c }, svg);
    if (i > 0 && i < 6) svgText(svg, x(b) + 5, top + i * RH + 20, (b - a).toFixed(2) + "s", "bar-label", "start");
  });
  el("line", { x1: x(0), x2: x(0), y1: top, y2: H - 40, class: "zero" }, svg);
  svgText(svg, (W + L) / 2, H - 4, t.xLabel, "axis");
  host.innerHTML = ""; host.appendChild(svg);
}
const FILLER_PRESETS = { t1: [1.6, 1.16, 0.25], t2: [1.15, 1.61, 0.25], slow: [1.3, 3.0, 0.25], fast: [1.3, 0.6, 0] };
let fillerVals = [...FILLER_PRESETS.t2];
function pageFiller(v) {
  const t = T().filler, sl = t.sliders;
  const slider = (i, key, min, max, stepv) => `<label>${esc(sl[key])} <b id="v${i}"></b><input type="range" id="r${i}" min="${min}" max="${max}" step="${stepv}" value="${fillerVals[i]}"></label>`;
  v.innerHTML = `${head(t)}<div class="formula">${esc(t.formula)}</div><p class="small-note">${rich(t.formulaNote)}</p>
    <div class="modes">${Object.keys(t.presets).map(k => `<button data-p="${k}">${esc(t.presets[k])}</button>`).join("")}</div>
    <div class="sliders">${slider(0, "filler", 0.4, 3, 0.05)}${slider(1, "backend", 0.2, 4, 0.05)}${slider(2, "wait", 0, 0.5, 0.01)}</div>
    <div class="stage"><div id="g"></div><p class="result" id="res"></p></div>
    <p>${rich(t.explain)}</p><h2>${esc(t.tipsH)}</h2>${list(t.tips)}${pager("filler")}`;
  const update = () => {
    const [f, b, w] = fillerVals, detect = 0.94, fs = 1.52, fe = fs + f, connect = 0.05;
    const sent = detect + w + connect + b, answer = Math.max(fe + 0.5, sent + 0.95);
    gantt($("#g"), { detect, fillerStart: fs, fillerEnd: fe, wait: w, connect, backend: b, ack: 0.75, speak: 0.2, answer });
    $("#v0").textContent = f.toFixed(2) + " s"; $("#v1").textContent = b.toFixed(2) + " s"; $("#v2").textContent = Math.round(w * 1000) + " ms";
    $("#res").innerHTML = t.res(fs.toFixed(2), answer.toFixed(2), +(answer - fe).toFixed(2)) + `<br><span class="muted">${esc(fe + 0.5 >= sent + 0.95 ? t.bound.filler : t.bound.backend)}</span>`;
  };
  [0, 1, 2].forEach(i => $("#r" + i).oninput = e => { fillerVals[i] = +e.target.value; update(); });
  v.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { fillerVals = [...FILLER_PRESETS[b.dataset.p]]; [0, 1, 2].forEach(i => $("#r" + i).value = fillerVals[i]); update(); });
  update();
}

/* ---------------------------------------------------------------- memory */
function pageMemory(v) {
  const t = T().memory, b = t.boxes;
  v.innerHTML = `${head(t)}<div class="stage" id="mem"></div>${list(t.points)}
    <h2>${esc(t.fillH)}</h2>
    <div class="stage"><div id="fill"></div><label class="sliders one">${esc(t.fillLabel)} <b id="mv"></b><input type="range" id="mr" min="0" max="60" step="0.5" value="20"></label></div>
    <p class="small-note">${rich(t.fillNote)}</p><p class="callout">${rich(t.after)}</p>
    <h2>${esc(t.pushH)}</h2>${table(t.pushHead, t.push.map(r => [`<code>${r[0]}</code>`, r[1], r[2]]))}<p>${rich(t.pushNote)}</p>
    <h2>${esc(t.stateH)}</h2>${table(t.stateHead, t.state)}<p class="callout">${rich(t.key)}</p>${pager("memory")}`;
  // the three memories
  const W = 860, H = 300, svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "diag-svg" });
  arrowDefs(svg, "ma");
  const box = (x, y, w, h, c, [title, sub]) => {
    el("rect", { x, y, width: w, height: h, rx: 12, fill: c }, svg);
    svgText(svg, x + w / 2, y + 26, title, "nl");
    const fo = el("foreignObject", { x: x + 12, y: y + 34, width: w - 24, height: h - 38 }, svg);
    fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" class="fo">${esc(sub)}</div>`;
  };
  box(140, 8, 580, 86, COL.live, b.live);
  box(240, 140, 380, 80, COL.app, b.app);
  box(330, 254, 200, 44, COL.be, [b.be[0], ""]);
  svgText(svg, 545, 282, b.be[1], "edge-label", "start");
  el("line", { x1: 430, x2: 430, y1: 96, y2: 136, class: "edge", "marker-end": "url(#ma)" }, svg);
  svgText(svg, 442, 122, t.arrows.deleg, "edge-label", "start");
  el("line", { x1: 430, x2: 430, y1: 222, y2: 250, class: "edge", "marker-end": "url(#ma)" }, svg);
  svgText(svg, 442, 241, t.arrows.prompt, "edge-label", "start");
  $("#mem").appendChild(svg);
  // context fill over a session (inferred rate)
  const RATE = 36, BASE = 1000, WIN = 128000, CARRY = 8192;
  const usage = min => { const tok = BASE + RATE * 60 * min, hand = (WIN * 0.9 - BASE) / (RATE * 60); return min < hand ? tok : CARRY + RATE * 60 * (min - hand); };
  const handMin = (WIN * 0.9 - BASE) / (RATE * 60);
  const draw = min => {
    const FW = 860, FH = 200, L = 60, R = 20, top = 14, bot = 30, xx = m => L + m / 60 * (FW - L - R), yy = r => top + (1 - r) * (FH - top - bot);
    const s = el("svg", { viewBox: `0 0 ${FW} ${FH}`, class: "fill-svg" });
    [0, 0.25, 0.5, 0.75, 1].forEach(r => { el("line", { x1: L, x2: FW - R, y1: yy(r), y2: yy(r), class: "grid" }, s); svgText(s, L - 8, yy(r) + 4, Math.round(r * 100) + "%", "axis", "end"); });
    [0, 10, 20, 30, 40, 50, 60].forEach(m => svgText(s, xx(m), FH - 10, m + "′", "axis"));
    el("line", { x1: L, x2: FW - R, y1: yy(0.9), y2: yy(0.9), class: "ninety" }, s);
    svgText(s, FW - R - 4, yy(0.9) - 6, t.handoff, "ev-label", "end");
    let d = "";
    for (let m = 0; m <= 60; m += 0.25) { const r = usage(m) / WIN; d += (d ? (Math.abs(m - handMin) < 0.25 ? " M" : " L") : "M") + xx(m).toFixed(1) + "," + yy(r).toFixed(1); }
    el("path", { d, class: "fill-line" }, s);
    const r = usage(min) / WIN;
    el("line", { x1: xx(min), x2: xx(min), y1: top, y2: FH - bot, class: "playhead static" }, s);
    el("circle", { cx: xx(min), cy: yy(r), r: 6, fill: "#f0c560" }, s);
    svgText(s, xx(min) + (min > 45 ? -10 : 10), yy(r) - 10, `${Math.round(usage(min)).toLocaleString()} tok · ${(r * 100).toFixed(1)}% ${t.used}`, "ev-label", min > 45 ? "end" : "start");
    $("#fill").innerHTML = ""; $("#fill").appendChild(s);
    $("#mv").textContent = min + "′";
  };
  $("#mr").oninput = e => draw(+e.target.value);
  draw(20);
}

/* ---------------------------------------------------------------- turns */
function groupBubbles(words, delegs) {
  const out = [];
  words.forEach(([, who, text, ms]) => {
    const last = out[out.length - 1];
    if (last && last.who === who && ms - last.end < 2000) { last.text += text; last.end = ms + 200; }
    else out.push({ who, text: text.trimStart(), start: ms, end: ms + 200, deleg: false });
  });
  delegs.forEach(d => { const b = out.find(x => x.who === "out" && x.start > d); if (b) b.deleg = true; });
  return out;
}
function pageTurns(v) {
  const t = T().turns, ui = T().ui;
  const delegs = EVENTS.filter(e => e.name === "session.delegation.created").map(e => e.json.offset_ms);
  v.innerHTML = `${head(t)}
    <div class="stepnav"><button id="tp">${esc(ui.play)}</button></div>
    <div class="two turns-demo"><div><div class="kicker sub">${esc(t.raw)}</div><div class="raw" id="raw"></div></div>
      <div><div class="kicker sub">${esc(t.grouped)}</div><div class="bubbles" id="bub"></div></div></div>
    <p class="callout">${rich(t.signal)}</p>
    ${table(t.tableHead, t.table)}
    <h2>${esc(t.sdkH)}</h2><p>${rich(t.sdkP)}</p>
    <pre class="code">import { TranscriptGrouper } from 'openai/helpers/live';

const transcript = new TranscriptGrouper();
transcript.on('segment.updated', (seg) => renderBubble(seg.id, seg.speaker, seg.text));
transcript.on('segment.closed', ({ segment, reason }) => finalizeBubble(segment.id, reason));

live.on('event', (event) => transcript.push(event)); // WebRTC: live.onEvent(...)</pre>${pager("turns")}`;
  let timer = null, n = 0;
  const render = () => {
    const shown = WORDS.slice(0, n);
    const lastMs = shown.length ? shown[shown.length - 1][3] : -1;
    const raw = [];
    shown.forEach(w => {
      raw.push(`<div class="rw ${w[1]}"><span>${w[3]}</span><code>${w[1] === "in" ? "input" : "output"}_transcript.delta</code> <q>${esc(w[2])}</q></div>`);
      if (w[1] === "in" && delegs.includes(w[3])) raw.push(`<div class="rw deleg"><span>${w[3]}</span><code>${esc(t.delegMark)}</code></div>`);
    });
    $("#raw").innerHTML = raw.join("");
    $("#raw").scrollTop = 1e6;
    $("#bub").innerHTML = groupBubbles(shown, delegs.filter(d => d <= lastMs)).map(b =>
      `${b.deleg ? `<div class="chip-d">${esc(t.delegMark)}</div>` : ""}<div class="bub ${b.who === "in" ? "user" : "agent"}"><b>${esc(b.who === "in" ? t.you : t.live)}</b>${esc(b.text)}<small>${b.start}–${b.end} ms</small></div>`).join("");
    $("#bub").scrollTop = 1e6;
  };
  const stop = () => { clearInterval(timer); timer = null; $("#tp").textContent = ui.play; };
  $("#tp").onclick = () => {
    if (timer) return stop();
    if (n >= WORDS.length) n = 0;
    $("#tp").textContent = ui.pause;
    timer = setInterval(() => { n++; render(); if (n >= WORDS.length) stop(); }, 140);
  };
  APP.cleanups.push(() => clearInterval(timer));
  n = 14; render();
}

/* ---------------------------------------------------------------- tools */
function pageTools(v) {
  const t = T().tools;
  v.innerHTML = `${head(t)}${table(t.head, t.rows, "cmp")}<p class="callout">${rich(t.point)}</p>${pager("tools")}`;
}

/* ---------------------------------------------------------------- transports */
function transportDiagram(host, kind) {
  const t = T().transports, n = t.nodes, e = t.edges;
  const W = 420, H = 230, svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "diag-svg" });
  arrowDefs(svg, "ta" + kind);
  const box = (x, y, w, label, c) => { el("rect", { x: x - w / 2, y: y - 20, width: w, height: 40, rx: 9, fill: c }, svg); svgText(svg, x, y + 5, label, "nl small"); };
  const line = (x1, y1, x2, y2, label, dashed, lx, ly, anchor = "middle") => {
    el("line", { x1, y1, x2, y2, class: "edge" + (dashed ? " dashed" : ""), "marker-end": `url(#ta${kind})`, "marker-start": `url(#ta${kind})` }, svg);
    svgText(svg, lx, ly, label, "edge-label", anchor);
  };
  if (kind === "ws") {
    box(80, 115, 130, n.server, COL.app); box(340, 115, 130, n.live, COL.live);
    line(150, 115, 270, 115, e.all, false, 210, 102);
  } else {
    box(80, 40, 120, n.browser, COL.user); box(80, 190, 120, n.backend, COL.app); box(340, 115, 120, n.live, COL.live);
    line(144, 50, 276, 100, e.media, false, 150, 26, "start");
    line(144, 180, 276, 132, e.side, false, 150, 222, "start");
    line(80, 64, 80, 166, e.sdp, true, 90, 118, "start");
  }
  host.appendChild(svg);
}
function pageTransports(v) {
  const t = T().transports;
  v.innerHTML = `${head(t)}<div class="two">
      <div class="stage"><h3>${esc(t.ws)}</h3><p class="muted">${esc(t.wsSub)}</p><div id="tws"></div></div>
      <div class="stage"><h3>${esc(t.rtc)}</h3><p class="muted">${esc(t.rtcSub)}</p><div id="trtc"></div></div></div>
    ${table(t.whenHead, t.when)}<h2>${esc(t.whyH)}</h2>${list(t.why)}<p class="small-note">${esc(t.sip)}</p>${pager("transports")}`;
  transportDiagram($("#tws"), "ws"); transportDiagram($("#trtc"), "rtc");
}

/* ---------------------------------------------------------------- replay */
function pageReplay(v) {
  const t = T().replay, ui = T().ui;
  const START = 20.6, END = 54.6, DUR = END - START;
  v.innerHTML = `${head(t)}
    <div class="stepnav replay-ctrl"><button id="pp">${esc(ui.play)}</button>
      <label>${esc(t.speed)} <select id="spd"><option value="1">1×</option><option value="2" selected>2×</option><option value="4">4×</option></select></label>
      <input type="range" id="scrub" min="${START}" max="${END}" step="0.01" value="${START}"><span class="tcount" id="tnow"></span></div>
    <div class="stage" id="tl"></div>
    <div class="kicker sub">${esc(t.heard)}</div><div class="captions" id="cap"></div>${pager("replay")}`;
  const W = 1000, L = 120, R = 16, LH = 40, top = 22, H = top + 4 * LH + 26;
  const x = w => L + ((w - START) / DUR) * (W - L - R);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "replay-svg" });
  for (let s = 0; s <= 33; s += 3) { el("line", { x1: x(T0 + s), x2: x(T0 + s), y1: top - 6, y2: H - 22, class: "grid" }, svg); svgText(svg, x(T0 + s), H - 8, s + "s", "axis"); }
  t.lanes.forEach((name, i) => svgText(svg, L - 10, top + i * LH + 22, name, "lane-label", "end"));
  const bar = (row, a, b, c, cls = "") => el("rect", { x: x(a), y: top + row * LH + 8, width: Math.max(2, x(b) - x(a)), height: LH - 16, rx: 4, fill: c, class: cls }, svg);
  // turn 2's dead air between the filler and the answer
  el("rect", { x: x(45.61), y: top - 6, width: x(46.823) - x(45.61), height: 4 * LH + 4, class: "deadair" }, svg);
  svgText(svg, x(46.2), top - 9, t.marks.dead, "ev-label bad");
  VOICE.user.forEach(([a, b]) => bar(0, a, b, COL.user));
  VOICE.live.forEach(([a, b], i) => bar(1, a, b, i === 0 || i === 3 ? COL.filler : COL.live));
  [[27.826, t.marks.filler], [29.925, t.marks.answer], [44.465, t.marks.filler], [46.823, t.marks.answer]].forEach(([w, s]) => svgText(svg, x(w) + 2, top + LH + 4, s, "ev-label", "start"));
  // backend round trips
  [[27.461, 28.665], [44.165, 45.857]].forEach(([a, b]) => bar(3, a, b, COL.be, "rt-bar"));
  EVENTS.forEach(ev => {
    const row = ev.lane === "live" ? 2 : 3, cy = top + row * LH + LH / 2;
    const g = el("g", { class: "evdot" + (ev.key ? " key" : ""), tabindex: 0 }, svg);
    el("circle", { cx: x(ev.t), cy, r: ev.key ? 7 : 5, fill: ev.key ? "#f0c560" : ev.dir === "up" ? COL.app : "#9cc3e8" }, g);
    el("title", {}, g).textContent = `${ev.name} · t=${(ev.t - T0).toFixed(2)}s`;
    g.addEventListener("click", () => openEvent(ev));
    g.addEventListener("keydown", k => { if (k.key === "Enter") openEvent(ev); });
  });
  const ph = el("line", { x1: x(START), x2: x(START), y1: top - 6, y2: H - 22, class: "playhead static" }, svg);
  $("#tl").appendChild(svg);

  let now = START, playing = false, last = 0, raf = 0;
  const show = () => {
    ph.setAttribute("x1", x(now)); ph.setAttribute("x2", x(now));
    $("#scrub").value = now;
    $("#tnow").textContent = `${t.now} ${(now - T0).toFixed(1)} s`;
    const lines = [];
    WORDS.filter(w => w[0] <= now).forEach(([, who, text]) => {
      const l = lines[lines.length - 1];
      if (l && l.who === who) l.text += text; else lines.push({ who, text: text.trimStart() });
    });
    const evs = EVENTS.filter(e => e.key && e.t <= now);
    $("#cap").innerHTML = lines.map(l => `<div class="bub ${l.who === "in" ? "user" : "agent"}"><b>${esc(l.who === "in" ? TXT[LANG].turns.you : TXT[LANG].turns.live)}</b>${esc(l.text)}</div>`).join("") +
      (evs.length ? `<div class="lastev">⚡ <code>${esc(evs[evs.length - 1].name)}</code></div>` : "");
    $("#cap").scrollTop = 1e6;
  };
  const tick = ts => {
    if (!playing) return;
    if (last) now += ((ts - last) / 1000) * +$("#spd").value;
    last = ts;
    if (now >= END) { now = END; playing = false; $("#pp").textContent = ui.replay; }
    show();
    if (playing) raf = requestAnimationFrame(tick);
  };
  $("#pp").onclick = () => {
    if (playing) { playing = false; $("#pp").textContent = ui.play; return; }
    if (now >= END) now = START;
    playing = true; last = 0; $("#pp").textContent = ui.pause; raf = requestAnimationFrame(tick);
  };
  $("#scrub").oninput = e => { now = +e.target.value; show(); };
  APP.cleanups.push(() => { playing = false; cancelAnimationFrame(raf); });
  show();
}

/* ---------------------------------------------------------------- latency */
function pageLatency(v) {
  const t = T().latency;
  v.innerHTML = `${head(t)}${TURNS.map(m => `<h3>${esc(t.turn(m.id))}</h3><div class="stage" id="lt${m.id}"></div>`).join("")}
    ${table(t.numsHead, t.nums)}
    <h2>${esc(t.paraH)}</h2>${table(t.paraHead, t.para, "para")}<p>${rich(t.paraNote)}</p>
    <h2>${esc(t.recH)}</h2><ol class="pts">${t.rec.map(r => `<li>${rich(r)}</li>`).join("")}</ol><p class="small-note">${esc(t.caveat)}</p>${pager("latency")}`;
  TURNS.forEach(m => gantt($("#lt" + m.id), { ...m, speak: 0.2 }));
}

/* ---------------------------------------------------------------- quiz */
function pageQuiz(v) {
  const t = T().quiz;
  const order = t.cards.map((c, i) => i).sort(() => Math.random() - 0.5);
  let next = 0, wrong = 0;
  v.innerHTML = `${head(t)}<div class="quiz">${order.map(i => `<button class="qcard" data-i="${i}">${esc(t.cards[i])}</button>`).join("")}</div>
    <p class="result" id="qr"></p><div id="qdone"></div>${pager("quiz")}`;
  v.querySelectorAll(".qcard").forEach(b => b.onclick = () => {
    if (b.classList.contains("ok")) return;
    if (+b.dataset.i === next) {
      next++; b.classList.add("ok"); b.insertAdjacentHTML("afterbegin", `<span class="n">${next}</span>`);
      $("#qr").textContent = t.right;
      if (next === t.cards.length) {
        $("#qr").textContent = t.done(wrong);
        $("#qdone").innerHTML = `<p class="callout">${rich(t.bonus)}</p><button id="qa">${esc(t.again)}</button>`;
        $("#qa").onclick = () => pageQuiz(v);
      }
    } else {
      wrong++; $("#qr").textContent = t.wrong;
      b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
    }
  });
}

/* ================================================================ router */
const ROUTES = { "": pageHome, intro: pageIntro, duplex: pageDuplex, split: pageSplit, delegation: pageDelegation, filler: pageFiller,
  memory: pageMemory, turns: pageTurns, tools: pageTools, transports: pageTransports, replay: pageReplay, latency: pageLatency, quiz: pageQuiz };
let lastRoute = null;
function route() {
  APP.cleanups.forEach(f => f()); APP.cleanups = [];
  closeDrawer();
  let r = location.hash.slice(1);
  if (!(r in ROUTES)) r = "";
  renderChrome(r);
  const v = $("#view");
  (ROUTES[r])(v);
  if (r !== lastRoute) window.scrollTo(0, 0);
  lastRoute = r;
}
function go(d) {
  const i = PAGES.indexOf(location.hash.slice(1) in ROUTES ? location.hash.slice(1) : "");
  const n = PAGES[i + d];
  if (n !== undefined) location.hash = n;
}
$("#prev").onclick = () => go(-1);
$("#next").onclick = () => go(1);
$("#lang").onclick = () => setLang(LANG === "en" ? "zh" : "en");
document.addEventListener("keydown", e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "Escape") closeDrawer();
});
window.addEventListener("hashchange", route);
route();
