/* Router, language switch, sidebar, and every page. Text lives in content.js. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NS = "http://www.w3.org/2000/svg";
const APP = { cleanups: [] };

const NAV = [
  ["start", ["", "why", "axes"]],
  ["concepts", ["sft", "lora", "llama"]],
  ["practice", ["deploy", "combine"]],
];
const PAGES = NAV.flatMap(([, ids]) => ids);
const DOT = { "": "#7cc4ff", why: "#7cc4ff", axes: "#7cc4ff", sft: "#59c08f", lora: "#f0c560", llama: "#f0c560", deploy: "#8a55c4", combine: "#e05a8a" };
const COL = { base: "#4a63c8", frozen: "#3b4458", train: "#c8743a", sft: "#2f8f6a", data: "#8a55c4", bad: "#e05a5a", ok: "#59c08f", gold: "#f0c560", accent: "#7cc4ff" };

/* ---------------------------------------------------------------- language */
let LANG = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "zh") return q;
  try { const s = localStorage.getItem("ft-lang"); if (s === "en" || s === "zh") return s; } catch (e) {}
  return (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
})();
const T = () => TXT[LANG];
function setLang(l) {
  LANG = l;
  try { localStorage.setItem("ft-lang", l); } catch (e) {}
  route();
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
function dots(svg, pathId, color, n = 2, dur = 2.2) {
  for (let k = 0; k < n; k++) {
    const c = el("circle", { r: 4, fill: color, stroke: "#fff", "stroke-width": 1 }, svg);
    const am = el("animateMotion", { dur: dur + "s", repeatCount: "indefinite", begin: `-${k * dur / n}s` }, c);
    el("mpath", { href: "#" + pathId }, am);
  }
}
function box(svg, x, y, w, h, fill, label, sub, cls = "") {
  const g = el("g", { class: cls }, svg);
  el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 10, fill }, g);
  svgText(g, x, sub ? y - 4 : y + 5, label, "nl");
  if (sub) svgText(g, x, y + 15, sub, "ns");
  return g;
}
// endpoints of a straight edge between two boxes, trimmed to their borders
function edgeBetween(A, B) {
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const cut = N => Math.min(Math.abs(ux) > 1e-6 ? (N.w / 2) / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? (N.h / 2) / Math.abs(uy) : 1e9) + 4;
  return [A.x + ux * cut(A), A.y + uy * cut(A), B.x - ux * cut(B), B.y - uy * cut(B)];
}
function table(headRow, rows, cls = "") {
  return `<div class="tablewrap"><table class="${cls}"><thead><tr>${headRow.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
}
const list = items => `<ul class="pts">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
const head = p => `<div class="kicker">${esc(p.kicker)}</div><h1>${esc(p.title)}</h1><p class="cap">${p.cap}</p>`;
const fmt = n => n.toLocaleString(LANG === "zh" ? "zh-CN" : "en-US");
const pct = (x, d = 2) => (x * 100).toFixed(d) + "%";
function every(ms, fn) { const id = setInterval(fn, ms); APP.cleanups.push(() => clearInterval(id)); return id; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

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
  v.innerHTML = `<div class="home"><h1>${esc(h.title)}</h1><p class="lead">${esc(h.lead)}</p><p class="note">${esc(h.note)}</p>
    <div class="sec-h">${esc(h.seriesH)}</div>
    <div class="acards">${h.articles.map((a, i) => `<a class="art" href="${ARTICLE_URLS[i]}" target="_blank" rel="noopener">
      <div class="art-n">${i + 1}</div><div><div class="art-tag">${esc(a.tag)}</div><b>${esc(a.title)}</b><p>${a.text}</p><span class="art-go">${esc(t.ui.read)}</span></div></a>`).join("")}</div>
    <div class="sec-h">${esc(h.conceptsH)}</div>
    <div class="cards">${PAGES.filter(id => id).map(id => `<a href="#${id}"><div class="bar" style="background:${DOT[id]}"></div><b>${esc(t.nav.pages[id])}</b><span>${esc(t.nav.blurbs[id])}</span></a>`).join("")}</div>
    <a class="cta" href="#why">${esc(h.start)}</a></div>`;
}

/* ---------------------------------------------------------------- why */
function pageWhy(v) {
  const t = T().why, c = t.chef;
  v.innerHTML = `${head(t)}<div class="stage" id="chef"></div>
    <h2>${esc(t.reasonsH)}</h2>${list(t.reasons)}
    <h2>${esc(t.ragH)}</h2><p>${t.ragP}</p>${table(t.ragHead, t.rag, "cmp")}${pager("why")}`;
  const svg = el("svg", { viewBox: "0 0 760 200", role: "img" });
  arrowDefs(svg, "wa");
  const A = { x: 110, y: 130, w: 170, h: 58 }, D = { x: 380, y: 45, w: 170, h: 58 }, S = { x: 650, y: 130, w: 170, h: 58 };
  const [x1, y1, x2, y2] = edgeBetween(A, S);
  el("path", { id: "we0", d: `M${x1},${y1} L${x2},${y2}`, class: "edge", "marker-end": "url(#wa)" }, svg);
  el("path", { id: "we1", d: `M${D.x},${D.y + 33} L${D.x},${y1 - 6}`, class: "edge dashed", "marker-end": "url(#wa)" }, svg);
  svgText(svg, 380, 160, LANG === "zh" ? "微调" : "fine-tune", "edge-label");
  dots(svg, "we0", COL.base); dots(svg, "we1", COL.data, 1, 1.4);
  box(svg, A.x, A.y, A.w, A.h, COL.base, c.general, c.generalSub);
  box(svg, D.x, D.y, D.w, D.h, COL.data, c.data, c.dataSub);
  box(svg, S.x, S.y, S.w, S.h, COL.sft, c.special, c.specialSub);
  $("#chef").appendChild(svg);
}

/* ---------------------------------------------------------------- axes */
let axesSel = [0, 1];
// mini picture of which weights train: every cell (full) or a frozen grid plus a thin B·A strip (LoRA)
function paramIcon(lora) {
  let r = "";
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) r += `<rect x="${j * 7}" y="${i * 7}" width="6" height="6" rx="1" fill="${lora ? "#3b4458" : "#f0c560"}"/>`;
  if (lora) r += `<rect x="46" y="0" width="5" height="41" rx="1" fill="#f0c560"/><rect x="56" y="18" width="41" height="5" rx="1" fill="#f0c560"/>`;
  return `<svg class="picon" viewBox="0 0 ${lora ? 97 : 41} 41" width="${lora ? 70 : 30}" height="30">${r}</svg>`;
}
function pageAxes(v) {
  const t = T().axes;
  const draw = () => {
    const [r0, c0] = axesSel;
    v.querySelector(".matrix").innerHTML = `<div class="mx-corner"><span>${esc(t.yLabel)} ↓</span><span>${esc(t.xLabel)} →</span></div>` +
      t.cols.map((c, j) => `<div class="mx-col" style="--c:${j ? COL.gold : COL.frozen}">${paramIcon(j === 1)}${esc(c)}</div>`).join("") +
      t.rows.map((r, i) => `<div class="mx-row"><b>${esc(r)}</b><span>${esc(t.rowSub[i])}</span></div>` +
        t.cols.map((_, j) => `<button class="mx-cell ${i === r0 && j === c0 ? "on" : ""}" data-i="${i}" data-j="${j}">
          <span class="mx-tag">${esc(r)} + ${esc(t.cols[j])}</span>${i === 0 && j === 1 ? `<span class="mx-star">${esc(t.common)}</span>` : ""}</button>`).join("")).join("");
    v.querySelector("#mxout").innerHTML = `<b>${esc(t.rows[r0])} × ${esc(t.cols[c0])}</b> · ${t.cells[r0][c0]}`;
    v.querySelectorAll(".mx-cell").forEach(b => b.onclick = () => { axesSel = [+b.dataset.i, +b.dataset.j]; draw(); });
  };
  v.innerHTML = `${head(t)}<div class="matrix"></div><p class="callout" id="mxout"></p>
    <p class="cap" style="margin-top:22px">${t.takeaway}</p>${pager("axes")}`;
  draw();
}

/* ---------------------------------------------------------------- sft */
// [kind, text, p(before), p(after)]; kind: sp special, sys/usr prompt, ast answer
const SFT_TOKENS = [
  ["sp", "<|begin_of_text|>"], ["sp", "<|start_header_id|>"], ["sp", "system"], ["sp", "<|end_header_id|>"],
  ["sys", "Rewrite"], ["sys", "the"], ["sys", "sentence"], ["sys", "in"], ["sys", "future"], ["sys", "tense."], ["sp", "<|eot_id|>"],
  ["sp", "<|start_header_id|>"], ["sp", "user"], ["sp", "<|end_header_id|>"],
  ["usr", "She"], ["usr", "played"], ["usr", "the"], ["usr", "piano"], ["usr", "until"], ["usr", "midnight."], ["sp", "<|eot_id|>"],
  ["sp", "<|start_header_id|>"], ["sp", "assistant"], ["sp", "<|end_header_id|>"],
  ["ast", "She", .41, .96], ["ast", "will", .06, .93], ["ast", "play", .30, .95], ["ast", "the", .88, .98], ["ast", "piano", .83, .97],
  ["ast", "until", .79, .96], ["ast", "midnight.", .70, .95], ["ast", "<|eot_id|>", .18, .91],
];
const SFT_ROW = `<span class="pm">&lt;|begin_of_text|&gt;&lt;|start_header_id|&gt;system&lt;|end_header_id|&gt;</span>

<span class="ps">Based on the information provided, rewrite the sentence by changing its tense from past to future.</span><span class="pm">&lt;|eot_id|&gt;&lt;|start_header_id|&gt;user&lt;|end_header_id|&gt;</span>

<span class="pu">She played the piano beautifully for hours and then stopped as it was midnight.</span><span class="pm">&lt;|eot_id|&gt;&lt;|start_header_id|&gt;assistant&lt;|end_header_id|&gt;</span>

<span class="pa">She will play the piano beautifully for hours and then stop as it will be midnight.</span><span class="pa">&lt;|eot_id|&gt;</span>`;
const sftState = { after: false, all: false, cur: 25, playing: false };
function sftProb(i, after) {
  const tk = SFT_TOKENS[i];
  if (tk[0] === "ast") return after ? tk[3] : tk[2];
  // prompt tokens: special tokens are predictable, words are not (the question can't be guessed)
  const base = tk[0] === "sp" ? 0.9 : 0.12 + ((i * 37) % 40) / 100;
  return after ? Math.min(0.97, base + 0.12) : base;
}
function pageSft(v) {
  const t = T().sft, L = t.legend, u = T().ui;
  v.innerHTML = `${head(t)}
    <h2>${esc(t.dataH)}</h2><p>${t.dataP}</p><pre class="code prompt">${SFT_ROW}</pre>
    <div class="legend-row"><span style="--c:#35405a">${esc(L.special)}</span><span style="--c:${COL.base}">${esc(L.prompt)}</span><span style="--c:${COL.sft}">${esc(L.answer)}</span></div>
    <h2>${esc(t.trainH)}</h2><p>${t.trainP}</p>
    <div class="modes"><span id="m1"></span><span class="sep"></span><span id="m2"></span><span class="sep"></span><button id="play"></button></div>
    <div class="stage"><div class="legend-row"><span style="--c:${COL.ok}">loss ↓</span><span style="--c:${COL.bad}">loss ↑</span><span class="nol">${esc(L.noloss)}</span></div><div class="tokstrip" id="toks"></div><p class="result" id="ro"></p><p class="small-note" id="tot"></p></div>
    <p class="small-note">${esc(t.illus)}</p>
    ${list(t.notes)}
    <h2>${esc(t.pipeH)}</h2>
    <div class="pipe">${t.pipe.map((p, i) => `<div class="pipe-step ${i === 1 ? "on" : ""}"><b>${esc(p[0])}</b><span>${esc(p[1])}</span><small>${esc(p[2])}</small></div>`).join('<div class="pipe-arrow">→</div>')}</div>
    <p class="callout">${t.pipeYou}</p>
    <h2>${esc(t.limitH)}</h2><p>${t.limit}</p>${pager("sft")}`;
  const counted = i => i > 0 && (sftState.all || SFT_TOKENS[i][0] === "ast");
  const draw = () => {
    const s = sftState;
    $("#m1").innerHTML = ["before", "after"].map(k => `<button data-a="${k}" class="${(k === "after") === s.after ? "on" : ""}">${esc(t.modes[k])}</button>`).join(" ");
    $("#m2").innerHTML = [["ast", t.maskAst], ["all", t.maskAll]].map(([k, l]) => `<button data-k="${k}" class="${(k === "all") === s.all ? "on" : ""}">${esc(l)}</button>`).join(" ");
    $("#play").textContent = s.playing ? u.pause : u.play;
    let n = 0, sum = 0;
    $("#toks").innerHTML = SFT_TOKENS.map(([k, txt], i) => {
      const on = counted(i), p = sftProb(i, s.after), loss = -Math.log(p);
      if (on) { n++; sum += loss; }
      const hgt = on ? Math.max(3, Math.min(56, loss * 19)) : 0;
      const col = loss > 1.5 ? COL.bad : loss > 0.5 ? COL.gold : COL.ok;
      return `<button class="tok t-${k} ${on ? "" : "masked"} ${i === s.cur ? "cur" : ""}" data-i="${i}">
        <span class="tk">${esc(txt)}</span><span class="lb">${on ? `<i style="height:${hgt}px;background:${col}"></i>` : "<em></em>"}</span></button>`;
    }).join("");
    const i = s.cur, tk = SFT_TOKENS[i];
    if (counted(i)) {
      const p = sftProb(i, s.after);
      const ctx = SFT_TOKENS.slice(Math.max(0, i - 3), i).map(x => esc(x[1])).join(" ");
      $("#ro").innerHTML = t.readout(ctx, esc(tk[1]), p.toFixed(2), (-Math.log(p)).toFixed(2));
    } else $("#ro").innerHTML = t.readoutMasked(esc(tk[1]));
    $("#tot").textContent = t.total(n, (sum / n).toFixed(2));
    v.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { s.after = b.dataset.a === "after"; draw(); });
    v.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { s.all = b.dataset.k === "all"; draw(); });
    v.querySelectorAll(".tok").forEach(b => b.onclick = () => { s.cur = +b.dataset.i; draw(); });
  };
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; sftState.playing = false; };
  APP.cleanups.push(stop);
  $("#play").onclick = () => {
    if (sftState.playing) { stop(); draw(); return; }
    sftState.playing = true;
    timer = setInterval(() => {
      let i = sftState.cur;
      do { i = (i + 1) % SFT_TOKENS.length; } while (!counted(i));
      sftState.cur = i; draw();
    }, 750);
    draw();
  };
  draw();
}

/* ---------------------------------------------------------------- lora */
const R_VALUES = [1, 2, 4, 8, 16, 32, 64], D_VALUES = [1024, 4096];
const loraState = { mode: "train", ri: 4, di: 1, hr: 3 };
function matrixSvg(host) {
  const t = T().lora, lb = t.labels, s = loraState, r = R_VALUES[s.ri];
  const W = 860, H = 300, S = 170, top = 70, N = 10;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
  const rand = rng(7);
  const wv = Array.from({ length: N * N }, () => rand());
  const rv = Math.min(r, 3), Bv = [], Av = [];
  for (let i = 0; i < N; i++) for (let k = 0; k < rv; k++) Bv[i * rv + k] = rand() * 2 - 1;
  for (let k = 0; k < rv; k++) for (let j = 0; j < N; j++) Av[k * N + j] = rand() * 2 - 1;
  const ba = (i, j) => { let x = 0; for (let k = 0; k < rv; k++) x += Bv[i * rv + k] * Av[k * N + j]; return x / rv; };
  const cells = (x0, y0, w, h, nx, ny, fill) => {
    const g = el("g", {}, svg), cw = w / nx, ch = h / ny;
    for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) el("rect", { x: x0 + j * cw + .5, y: y0 + i * ch + .5, width: cw - 1, height: ch - 1, rx: 1.5, fill: fill(i, j) }, g);
    return g;
  };
  const wFill = (i, j) => `hsl(222, 14%, ${22 + wv[i * N + j] * 14}%)`;
  const gold = a => `rgba(240,197,96,${a.toFixed(2)})`;
  const tag = (x, y, text, cls) => svgText(svg, x, y, text, cls);
  const thick = Math.round(6 + r * 1.55);
  if (s.mode === "merge") {
    const x0 = W / 2 - S / 2;
    cells(x0, top, S, S, N, N, wFill);
    cells(x0, top, S, S, N, N, (i, j) => gold(Math.min(.75, Math.abs(ba(i, j)) * .9)));
    tag(W / 2, top - 30, "W′", "mx-name"); tag(W / 2, top - 12, lb.merged, "mx-lbl gold");
    tag(W / 2, top + S + 24, `${D_VALUES[s.di]} × ${D_VALUES[s.di]} · ${lb.noExtra}`, "mx-dim");
  } else {
    const xW = 20, xB = xW + S + 66, xA = xB + thick + 40, xR = xA + S + 50;
    cells(xW, top, S, S, N, N, wFill);
    tag(xW + S / 2, top - 30, "W", "mx-name"); tag(xW + S / 2, top - 12, lb.frozen, "mx-lbl");
    tag(xW + S / 2, top + S + 24, `d × d`, "mx-dim");
    svgText(svg, xW + S + 33, top + S / 2 + 6, "+", "mx-op");
    svgText(svg, xW + S + 33, top + S / 2 + 26, "α/r", "mx-dim");
    const init = s.mode === "init";
    const nb = Math.max(1, Math.min(rv, 3));
    cells(xB, top, thick, S, nb, N, (i, k) => init ? "#232a3a" : gold(.35 + Math.abs(Bv[i * rv + (k % rv)]) * .6));
    if (init) svgText(svg, xB + thick / 2, top + S / 2 + 5, "0", "mx-zero");
    tag(xB + thick / 2, top - 30, "B", "mx-name"); tag(xB + thick / 2, top - 12, init ? lb.zeros : lb.trainable, "mx-lbl gold");
    tag(xB + thick / 2, top + S + 24, `d × ${r}`, "mx-dim");
    svgText(svg, xA - 20, top + S / 2 + 6, "×", "mx-op");
    const yA = top + S / 2 - thick / 2;
    cells(xA, yA, S, thick, N, nb, (k, j) => gold(.35 + Math.abs(Av[(k % rv) * N + j]) * .6));
    tag(xA + S / 2, top - 30, "A", "mx-name"); tag(xA + S / 2, top - 12, init ? lb.random : lb.trainable, "mx-lbl gold");
    tag(xA + S / 2, top + S + 24, `${r} × d`, "mx-dim");
    if (xR + 60 < W) {
      svgText(svg, xR - 22, top + S / 2 + 6, "=", "mx-op");
      const s2 = 110, yR = top + (S - s2) / 2;
      cells(xR, yR, s2, s2, N, N, wFill);
      if (!init) cells(xR, yR, s2, s2, N, N, (i, j) => gold(Math.min(.75, Math.abs(ba(i, j)) * .9)));
      tag(xR + s2 / 2, yR - 12, init ? "W′ = W" : "W′", "mx-name");
    }
  }
  host.innerHTML = ""; host.appendChild(svg);
}
function flowSvg(host) {
  const f = T().lora.flow;
  const svg = el("svg", { viewBox: "0 0 860 210", role: "img" });
  arrowDefs(svg, "fa");
  const paths = [
    ["f0", "M70,105 C130,105 150,50 230,50"], ["f1", "M430,50 C560,50 590,105 640,105"],
    ["f2", "M70,105 C130,105 150,160 230,160"], ["f3", "M330,160 L390,160"], ["f4", "M490,160 C560,160 590,105 640,105"], ["f5", "M680,105 L740,105"],
  ];
  paths.forEach(([id, d]) => el("path", { id, d, class: "edge", "marker-end": "url(#fa)" }, svg));
  dots(svg, "f0", COL.accent); dots(svg, "f2", COL.gold); dots(svg, "f4", COL.gold);
  svgText(svg, 45, 110, f.x, "nl");
  box(svg, 330, 50, 200, 44, COL.frozen, f.w);
  el("polygon", { points: "232,140 330,152 330,168 232,180", fill: COL.train }, svg); svgText(svg, 268, 165, f.a, "nl");
  svgText(svg, 280, 198, f.down, "mx-dim");
  el("polygon", { points: "392,152 490,140 490,180 392,168", fill: COL.train }, svg); svgText(svg, 452, 165, f.b, "nl");
  svgText(svg, 440, 198, f.up, "mx-dim");
  el("circle", { cx: 660, cy: 105, r: 18, fill: "#262c3b", stroke: "#56607a" }, svg); svgText(svg, 660, 112, f.sum, "nl");
  svgText(svg, 750, 110, f.h, "ev-label", "start");
  host.innerHTML = ""; host.appendChild(svg);
}
// ΔW ≈ rank 3 + noise, and its truncated SVD (power iteration with deflation)
const HEAT = (() => {
  const n = 24, rand = rng(42), g = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return s - 3; };
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  [3, 1.8, 1.1].forEach(sv => {
    const u = Array.from({ length: n }, g), w = Array.from({ length: n }, g);
    const nu = Math.hypot(...u), nw = Math.hypot(...w);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) M[i][j] += sv * 4 * (u[i] / nu) * (w[j] / nw);
  });
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) M[i][j] += g() * 0.035;
  const R = M.map(r => r.slice()), comps = [];
  let total = 0; M.forEach(r => r.forEach(x => total += x * x));
  for (let k = 0; k < 10; k++) {
    let v = Array.from({ length: n }, () => rand() - .5), u = [], s = 0;
    for (let it = 0; it < 80; it++) {
      u = R.map(r => r.reduce((a, x, j) => a + x * v[j], 0)); const nu = Math.hypot(...u); u = u.map(x => x / nu);
      v = Array.from({ length: n }, (_, j) => R.reduce((a, r, i) => a + r[j] * u[i], 0)); s = Math.hypot(...v); v = v.map(x => x / s);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) R[i][j] -= s * u[i] * v[j];
    comps.push({ s, u, v });
  }
  return { n, M, comps, total };
})();
function heatSvg(host, r) {
  const t = T().lora.heat, { n, M, comps } = HEAT;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  comps.slice(0, r).forEach(({ s, u, v }) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] += s * u[i] * v[j]; });
  let max = 0; M.forEach(row => row.forEach(x => max = Math.max(max, Math.abs(x))));
  const c = 7.5, gap = 40, W = n * c * 3 + gap * 2, svg = el("svg", { viewBox: `0 0 ${W} ${n * c + 28}`, role: "img" });
  const color = x => { const a = Math.min(1, Math.abs(x) / max); return x >= 0 ? `rgba(240,197,96,${a.toFixed(2)})` : `rgba(124,196,255,${a.toFixed(2)})`; };
  [[M, t.target], [A, t.approx], [M.map((row, i) => row.map((x, j) => x - A[i][j])), t.resid]].forEach(([G, label], k) => {
    const x0 = k * (n * c + gap);
    el("rect", { x: x0 - 1, y: 21, width: n * c + 2, height: n * c + 2, fill: "#10141d", stroke: "#252b39" }, svg);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) el("rect", { x: x0 + j * c, y: 22 + i * c, width: c, height: c, fill: color(G[i][j]) }, svg);
    svgText(svg, x0 + n * c / 2, 14, label, "lane-label");
  });
  host.innerHTML = ""; host.appendChild(svg);
  const cap = comps.slice(0, r).reduce((a, { s }) => a + s * s, 0) / HEAT.total;
  return Math.min(1, cap);
}
function pageLora(v) {
  const t = T().lora, s = loraState;
  v.innerHTML = `${head(t)}
    <h2>${esc(t.probH)}</h2><p>${t.prob}</p>
    <h2>${esc(t.ideaH)}</h2><div class="formula">${esc(t.formula)}</div><p class="small-note">${esc(t.formulaNote)}</p>
    <div class="modes" id="lm"></div>
    <div class="sliders"><label>${esc(t.sl.r)} <b id="rv"></b><input type="range" id="rr" min="0" max="${R_VALUES.length - 1}" step="1" value="${s.ri}"></label>
      <label>${esc(t.sl.d)} <b id="dv"></b><input type="range" id="dr" min="0" max="${D_VALUES.length - 1}" step="1" value="${s.di}"></label></div>
    <div class="stage"><div id="mx"></div><p class="result" id="cnt"></p></div>
    <p class="callout" id="mnote"></p>
    <h2>${esc(t.flowH)}</h2><p>${esc(t.flowP)}</p><div class="stage" id="flow"></div>
    <h2>${esc(t.whyH)}</h2><p>${t.whyP}</p>
    <div class="sliders"><label>${esc(t.sl.r)} <b id="hv"></b><input type="range" id="hr" min="1" max="8" step="1" value="${s.hr}"></label></div>
    <div class="stage"><div id="heat"></div><p class="result" id="hcap"></p></div>
    <h2>${esc(t.qloraH)}</h2><p>${t.qlora}</p>${pager("lora")}`;
  const draw = () => {
    $("#lm").innerHTML = Object.keys(t.modes).map(k => `<button data-m="${k}" class="${k === s.mode ? "on" : ""}">${esc(t.modes[k])}</button>`).join("");
    v.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { s.mode = b.dataset.m; draw(); });
    const r = R_VALUES[s.ri], d = D_VALUES[s.di];
    $("#rv").textContent = r; $("#dv").textContent = fmt(d);
    matrixSvg($("#mx"));
    $("#cnt").innerHTML = t.count(fmt(d * d), fmt(2 * d * r), pct(2 * r / d));
    $("#mnote").innerHTML = t.modeNote[s.mode];
  };
  const drawHeat = () => { $("#hv").textContent = s.hr; $("#hcap").innerHTML = t.captured(s.hr, pct(heatSvg($("#heat"), s.hr), 1)); };
  $("#rr").oninput = e => { s.ri = +e.target.value; draw(); };
  $("#dr").oninput = e => { s.di = +e.target.value; draw(); };
  $("#hr").oninput = e => { s.hr = +e.target.value; drawHeat(); };
  flowSvg($("#flow"));
  draw(); drawHeat();
}

/* ---------------------------------------------------------------- llama */
// Llama 3.1 8B linear projections: [name, in, out, group]
const MODULES = [["q_proj", 4096, 4096, "attn"], ["k_proj", 4096, 1024, "attn"], ["v_proj", 4096, 1024, "attn"], ["o_proj", 4096, 4096, "attn"],
  ["gate_proj", 4096, 14336, "mlp"], ["up_proj", 4096, 14336, "mlp"], ["down_proj", 14336, 4096, "mlp"]];
const LAYERS = 32, BASE_PARAMS = 8030261248, LR_VALUES = [1, 2, 4, 8, 16, 32, 64, 128];
const LLAMA_PRESETS = { art: [4, [0, 1, 2, 3, 4, 5, 6]], qv: [3, [0, 2]], big: [6, [0, 1, 2, 3, 4, 5, 6]] };
const llamaState = { ri: 4, on: new Set([0, 1, 2, 3, 4, 5, 6]) };
function memSvg(host, trainable) {
  const m = T().llama.mem, G = 1e9;
  const rows = [[m.full, 16 * BASE_PARAMS / G, COL.bad], [m.lora, (2 * BASE_PARAMS + 16 * trainable) / G, COL.accent], [m.qlora, (0.5 * BASE_PARAMS + 16 * trainable) / G, COL.ok]];
  const W = 860, L = 200, R = 80, max = 135, x = gb => L + gb / max * (W - L - R), svg = el("svg", { viewBox: `0 0 ${W} 150`, role: "img" });
  el("line", { x1: x(15), x2: x(15), y1: 10, y2: 132, class: "ninety" }, svg);
  rows.forEach(([label, gb, c], i) => {
    const y = 20 + i * 38;
    svgText(svg, L - 12, y + 16, label, "lane-label", "end");
    el("rect", { x: L, y, width: Math.max(2, x(gb) - L), height: 24, rx: 5, fill: c }, svg);
    svgText(svg, x(gb) + 8, y + 17, gb.toFixed(1) + " GB", "bar-val", "start");
  });
  svgText(svg, x(15) + 6, 145, m.t4, "ev-label bad", "start");
  host.innerHTML = ""; host.appendChild(svg);
}
function pageLlama(v) {
  const t = T().llama, s = llamaState;
  const chip = i => { const [n, a, b] = MODULES[i]; return `<button class="mod ${s.on.has(i) ? "on" : ""}" data-i="${i}"><b>${n}</b><span>${fmt(a)} → ${fmt(b)}</span></button>`; };
  v.innerHTML = `${head(t)}
    <div class="modes">${Object.keys(t.presets).map(k => `<button data-p="${k}">${esc(t.presets[k])}</button>`).join("")}</div>
    <h3>${esc(t.modulesH)}</h3><div id="mods"></div>
    <div class="sliders"><label>r <b id="lrv"></b><input type="range" id="lrr" min="0" max="${LR_VALUES.length - 1}" step="1" value="${s.ri}"></label></div>
    <div class="formula">${esc(t.formula)}</div>
    <p class="result" id="lres"></p><p class="small-note">${t.check}</p>
    <h2>${esc(t.memH)}</h2><div class="stage" id="mem"></div><p class="small-note">${esc(t.memNote)}</p>${pager("llama")}`;
  const draw = () => {
    $("#mods").innerHTML = `<div class="modgrp"><span>${esc(t.attn)}</span>${[0, 1, 2, 3].map(chip).join("")}</div><div class="modgrp"><span>${esc(t.mlp)}</span>${[4, 5, 6].map(chip).join("")}</div>`;
    v.querySelectorAll(".mod").forEach(b => b.onclick = () => { const i = +b.dataset.i; s.on.has(i) ? s.on.delete(i) : s.on.add(i); draw(); });
    const r = LR_VALUES[s.ri];
    const tr = r * LAYERS * [...s.on].reduce((a, i) => a + MODULES[i][1] + MODULES[i][2], 0);
    $("#lrv").textContent = r;
    $("#lres").innerHTML = t.result(fmt(tr), pct(tr / (BASE_PARAMS + tr), 4));
    memSvg($("#mem"), tr);
  };
  $("#lrr").oninput = e => { s.ri = +e.target.value; draw(); };
  v.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    const [ri, mods] = LLAMA_PRESETS[b.dataset.p]; s.ri = ri; s.on = new Set(mods); $("#lrr").value = ri; draw();
  });
  draw();
}

/* ---------------------------------------------------------------- deploy */
let deployStep = 0;
// nodes: [x, y]; edges: [from, to, step]
const DEP_NODES = [[90, 50], [270, 50], [450, 50], [300, 150], [650, 50], [270, 250], [470, 250], [660, 250]];
const DEP_EDGES = [[0, 1, 0], [1, 2, 1], [3, 2, 2], [2, 4, 3], [4, 5, 4], [0, 5, 4], [5, 6, 5], [6, 7, 6]];
const DEP_NODE_STEP = [0, 0, 1, 2, 3, 4, 5, 6];
const DEP_COL = [COL.base, COL.frozen, COL.train, COL.data, COL.train, COL.base, COL.sft, "#c8743a"];
function deploySvg(host) {
  const names = T().deploy.nodes, cur = deployStep;
  const svg = el("svg", { viewBox: "0 0 760 300", role: "img" });
  arrowDefs(svg, "da"); arrowDefs(svg, "dag", COL.gold);
  const N = DEP_NODES.map(([x, y]) => ({ x, y, w: 140, h: 42 }));
  DEP_EDGES.forEach(([a, b, st], i) => {
    const [x1, y1, x2, y2] = edgeBetween(N[a], N[b]);
    const state = st === cur ? "cur" : st < cur ? "past" : "future";
    el("path", { id: "de" + i, d: `M${x1},${y1} L${x2},${y2}`, class: `edge dep-${state}`, "marker-end": `url(#${state === "cur" ? "dag" : "da"})` }, svg);
    if (state === "cur") dots(svg, "de" + i, COL.gold, 2, 1.6);
  });
  N.forEach((n, i) => {
    const st = DEP_NODE_STEP[i];
    box(svg, n.x, n.y, n.w, n.h, DEP_COL[i], names[i], "", `dep-node ${st > cur ? "future" : st === cur ? "cur" : ""}`);
  });
  host.innerHTML = ""; host.appendChild(svg);
}
function pageDeploy(v) {
  const t = T().deploy, u = T().ui, n = t.steps.length;
  v.innerHTML = `${head(t)}<div class="comp-layout"><div class="guide"><div class="stepnav"><button id="db">${esc(u.back)}</button><button id="dn">${esc(u.next)}</button><span class="tcount" id="dc"></span></div><ol class="steplist" id="dl"></ol></div>
    <div><div class="stage" id="dsvg"></div><pre class="code" id="dcode"></pre></div></div>
    <h2>${esc(t.shortcutH)}</h2><p class="callout">${t.shortcut}</p>${pager("deploy")}`;
  const draw = () => {
    $("#dl").innerHTML = t.steps.map((s, i) => `<li class="${i === deployStep ? "on" : ""}"><button class="st" data-i="${i}"><span class="n">${i + 1}</span>${esc(s.t)}</button><p>${s.p}</p></li>`).join("");
    v.querySelectorAll(".st").forEach(b => b.onclick = () => { deployStep = +b.dataset.i; draw(); });
    $("#dc").textContent = u.stepOf(deployStep + 1, n);
    $("#db").disabled = deployStep === 0; $("#dn").disabled = deployStep === n - 1;
    $("#dcode").textContent = t.steps[deployStep].code;
    deploySvg($("#dsvg"));
  };
  $("#db").onclick = () => { if (deployStep > 0) { deployStep--; draw(); } };
  $("#dn").onclick = () => { if (deployStep < n - 1) { deployStep++; draw(); } };
  draw();
}

/* ---------------------------------------------------------------- combine */
function pageCombine(v) {
  const t = T().combine;
  const code = `${esc(t.codeLora)}
<mark>model = FastLanguageModel.get_peft_model(model, r = 16, lora_alpha = 16, ...)</mark>

${esc(t.codeSft)}
<mark>trainer = SFTTrainer(model = model, train_dataset = dataset, ...)</mark>
trainer.train()`;
  v.innerHTML = `${head(t)}<pre class="code">${code}</pre><p class="small-note">${esc(t.codeNote)}</p>
    ${table(t.tableHead, t.table, "cmp")}
    <h2>${esc(t.analogyH)}</h2>
    <div class="two"><div class="card-col" style="--c:${COL.sft}"><p>${t.sftCard}</p></div><div class="card-col" style="--c:${COL.gold}"><p>${t.loraCard}</p></div></div>
    <p class="callout" style="margin-top:22px">${t.takeaway}</p>
    <a class="cta" href="#">${esc(t.back)}</a>${pager("combine")}`;
}

/* ================================================================ router */
const ROUTES = { "": pageHome, why: pageWhy, axes: pageAxes, sft: pageSft, lora: pageLora, llama: pageLlama, deploy: pageDeploy, combine: pageCombine };
let lastRoute = null;
function route() {
  APP.cleanups.forEach(f => f()); APP.cleanups = [];
  let r = location.hash.slice(1);
  if (!(r in ROUTES)) r = "";
  renderChrome(r);
  (ROUTES[r])($("#view"));
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
});
window.addEventListener("hashchange", route);
route();
