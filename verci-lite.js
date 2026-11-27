// verci-lite.js v2 — Spicetify extension: lyrics lit word by word over an animated space scene.
// Styles:      warp (default), stack, fisheye, code, constellation, branches, web
// Backgrounds: space (animated starfield), black, clear (dark glass)
// Keys:  Ctrl+Shift+L show/hide | S style | B background | M panel size | F full view
// Lyrics are fetched live from Spotify's own lyrics service for the playing track. Nothing is stored.

(function VerciLite() {
  const S = window.Spicetify;

  // On-screen status banner: shown BEFORE any checks, so you can tell the file is executing at all.
  let banner = document.getElementById("verci-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "verci-banner";
    banner.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;background:#7c3aed;color:#fff;padding:8px 16px;border-radius:999px;" +
      "font:14px sans-serif;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.5)";
    (document.body || document.documentElement).appendChild(banner);
    window.addEventListener("error", e => {
      banner.style.background = "#b91c1c";
      banner.textContent = "Spotify error: " + (e.message || "unknown");
      if (!banner.isConnected) (document.body || document.documentElement).appendChild(banner);
    });
  }
  if (!S || !S.Player) {
    banner.textContent = "Verci Lite v2.6 loaded - waiting for Spicetify" + (S ? ".Player" : "");
    setTimeout(VerciLite, 300);
    return;
  }
  banner.textContent = "Verci Lite v2.6 running";
  setTimeout(() => { if (banner.textContent === "Verci Lite v2.6 running") banner.remove(); }, 8000);
  console.log("[verci-lite] starting v2.6", { cosmos: !!S.CosmosAsync, uri: !!S.URI });

  const STYLES = ["warp", "stack", "fisheye", "code", "constellation", "branches", "web"];
  const SIZES = { small: [360, 190], medium: [460, 240], large: [640, 330] };
  const BGS = ["space", "black", "clear"];
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem("verci-lite:" + k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem("verci-lite:" + k, JSON.stringify(v)); } catch {} };

  let visible = load("visible", true);
  let style = load("style", "warp"); if (!STYLES.includes(style)) style = "warp";
  let bg = load("bg", "space");      if (!BGS.includes(bg)) bg = "space";
  let mode = load("mode", "panel");  if (mode !== "panel" && mode !== "full") mode = "panel";
  let pos = load("pos", null);       // dragged panel position {left, top}
  let size = load("size", "medium"); if (!SIZES[size]) size = "medium";
  let lines = [];                    // [{ start, end, words: [{ text, start, end }] }]
  let currentTrack = null;
  let lastKey = "";
  let lastLine = -2;
  let status = "";              // text shown when there are no lyrics (loading / why it failed)

  // ---------- overlay ----------
  const css = document.createElement("style");
  css.textContent = `
    #verci-lite { position: fixed; inset: 0; z-index: 9999; pointer-events: none; overflow: hidden;
      color: #fff; font-family: Georgia, serif; }
    #verci-lite.hidden { display: none; }
    #verci-lite.panel { inset: auto; right: 24px; bottom: 112px; width: 460px; height: 240px;
      border-radius: 16px; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 12px 40px rgba(0,0,0,.6);
      pointer-events: auto; cursor: grab; }
    #verci-lite.panel:active { cursor: grabbing; }
    #verci-lite.full { inset: 0; pointer-events: auto; }
    #verci-lite.bg-space { background:
      radial-gradient(ellipse at 18% 28%, rgba(88, 28, 135, .55), transparent 55%),
      radial-gradient(ellipse at 82% 72%, rgba(14, 116, 144, .45), transparent 55%), #02020a; }
    #verci-lite.bg-black { background: #000; }
    #verci-lite.bg-clear { background: rgba(6, 6, 14, .84); backdrop-filter: blur(18px); }
    #verci-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
    #verci-fg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      text-shadow: 0 0 28px rgba(140, 160, 255, .55), 0 2px 18px rgba(0, 0, 0, .7); }
    #verci-fg .vl-note { position: absolute; bottom: 24px; font: 14px sans-serif; opacity: .6; }

    .warp { text-align: center; width: 90%; }
    .warp .big { font-size: 9vw; font-weight: 700; letter-spacing: .02em;
      animation: vl-pop .45s cubic-bezier(.2, .9, .25, 1.2) both; }
    .warp .line { margin-top: 4vh; font-size: 2.2vw; line-height: 1.5; }
    .warp .line span { opacity: .28; }
    .warp .line span.on { opacity: .95; }
    @keyframes vl-pop {
      0%   { opacity: 0; transform: scale(.25); filter: blur(18px); }
      60%  { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: scale(1); }
    }

    .stack { text-align: center; line-height: 1.1; }
    .stack .w-prev, .stack .w-next { font-size: 2.2vw; opacity: .35; }
    .stack .w-cur { font-size: 6vw; font-weight: 700; animation: vl-pop .35s ease-out both; }

    .code { font-family: Consolas, monospace; font-size: 2.4vw; text-align: left; }
    .code .prev { opacity: .35; filter: blur(1.5px); margin-bottom: .4em; }
    .code .cursor { display: inline-block; width: .55em; height: 1em; background: #e5484d;
      vertical-align: -0.12em; margin-left: 2px; animation: vl-blink 1s steps(1) infinite; }
    @keyframes vl-blink { 50% { opacity: 0; } }

    .fish { text-align: center; line-height: 1; position: relative; padding: 2vw 6vw; }
    .fish::before { content: ""; position: absolute; inset: 0; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(255,255,255,.14), rgba(255,255,255,0) 72%); }
    .fish .fa, .fish .fc { position: relative; font-size: 3vw; opacity: .45; transform: scale(.85, .6); filter: blur(.7px); }
    .fish .fb { position: relative; font-size: 8vw; font-weight: 800; margin: .08em 0;
      animation: vl-pop .4s ease-out both; }

    .vl-fade { animation: vl-fade .35s ease-out both; }
    @keyframes vl-fade { from { opacity: 0; } to { opacity: 1; } }
    .vl-draw { stroke-dasharray: 100; animation: vl-draw .5s ease-out both; }
    @keyframes vl-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }

    #verci-fg svg { position: absolute; inset: 0; width: 100%; height: 100%; }

    /* compact sizes for the floating panel */
    #verci-lite.panel .warp .big { font-size: calc(38px * var(--ps, 1)); }
    #verci-lite.panel .warp .line { margin-top: calc(14px * var(--ps, 1)); font-size: calc(13px * var(--ps, 1)); padding: 0 14px; }
    #verci-lite.panel .stack .w-cur { font-size: calc(34px * var(--ps, 1)); }
    #verci-lite.panel .stack .w-prev, #verci-lite.panel .stack .w-next { font-size: calc(13px * var(--ps, 1)); }
    #verci-lite.panel .code { font-size: calc(14px * var(--ps, 1)); padding: 0 14px; }
    #verci-lite.panel .fish { padding: 6px 20px; }
    #verci-lite.panel .fish .fa, #verci-lite.panel .fish .fc { font-size: calc(13px * var(--ps, 1)); }
    #verci-lite.panel .fish .fb { font-size: calc(34px * var(--ps, 1)); }
    #verci-lite.panel #verci-fg .vl-note { bottom: 10px; font-size: 11px; padding: 0 10px; text-align: center; }
  `;
  document.head.appendChild(css);

  const root = document.createElement("div");
  root.id = "verci-lite";
  const cv = document.createElement("canvas");
  cv.id = "verci-bg";
  const fg = document.createElement("div");
  fg.id = "verci-fg";
  root.append(cv, fg);
  document.body.appendChild(root);

  const BG_INLINE = {
    space: "radial-gradient(ellipse at 18% 28%, rgba(88,28,135,.55), transparent 55%), radial-gradient(ellipse at 82% 72%, rgba(14,116,144,.45), transparent 55%), #02020a",
    black: "#000",
    clear: "rgba(6,6,14,.84)",
  };
  function applyRoot() {
    root.classList.toggle("hidden", !visible);
    root.classList.toggle("panel", mode === "panel");
    root.classList.toggle("full", mode === "full");
    BGS.forEach(b => root.classList.toggle("bg-" + b, b === bg));
    root.style.background = BG_INLINE[bg];
    root.style.display = visible ? "" : "none";
    root.style.setProperty("--ps", String(SIZES[size][0] / 460));
    if (mode === "panel") {
      root.style.width = SIZES[size][0] + "px"; root.style.height = SIZES[size][1] + "px";
    } else {
      root.style.width = root.style.height = "";
    }
    if (mode === "panel" && pos) {
      const l = Math.min(Math.max(0, pos.left), Math.max(0, window.innerWidth - SIZES[size][0]));
      const t = Math.min(Math.max(0, pos.top), Math.max(0, window.innerHeight - SIZES[size][1]));
      root.style.left = l + "px"; root.style.top = t + "px";
      root.style.right = "auto"; root.style.bottom = "auto";
    } else {
      root.style.left = root.style.top = root.style.right = root.style.bottom = "";
    }
  }
  applyRoot();

  function setMode(m) { mode = m; save("mode", m); applyRoot(); lastKey = ""; }

  // Drag the panel by clicking and holding it; double-click toggles panel <-> full view
  let drag = null;
  root.addEventListener("mousedown", e => {
    if (mode !== "panel") return;
    const r = root.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!drag) return;
    const l = Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - root.offsetWidth);
    const t = Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - root.offsetHeight);
    pos = { left: l, top: t };
    root.style.left = l + "px"; root.style.top = t + "px";
    root.style.right = "auto"; root.style.bottom = "auto";
  });
  window.addEventListener("mouseup", () => { if (drag) { drag = null; if (pos) save("pos", pos); } });
  root.addEventListener("dblclick", () => setMode(mode === "panel" ? "full" : "panel"));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && mode === "full") setMode("panel"); });

  // ---------- animated background ----------
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = window.devicePixelRatio || 1;
    W = cv.width = Math.max(1, Math.floor(root.clientWidth * DPR));
    H = cv.height = Math.max(1, Math.floor(root.clientHeight * DPR));
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  resize();

  const newStar = init => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1,
    z: init ? Math.random() : 1, pz: 1, hue: 200 + Math.random() * 80,
  });
  const stars = Array.from({ length: 320 }, () => newStar(true));
  let shooters = [];
  let boost = 0;               // briefly speeds the stars up each time a word changes

  function drawBg() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, k = Math.max(W, H) * 0.35;

    if (bg === "space") {
      const dz = 0.0008 + boost * 0.012;
      ctx.lineCap = "round";
      for (const s of stars) {
        s.pz = s.z;
        s.z -= dz;
        if (s.z <= 0.02) { Object.assign(s, newStar(false)); continue; }
        const sx = cx + (s.x / s.z) * k, sy = cy + (s.y / s.z) * k;
        const px = cx + (s.x / s.pz) * k, py = cy + (s.y / s.pz) * k;
        const a = Math.min(1, (1 - s.z) * 1.4 + 0.1);
        ctx.strokeStyle = `hsla(${s.hue}, 80%, 85%, ${a})`;
        ctx.lineWidth = (1 - s.z) * 2.4 * DPR + 0.3;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
      }
      if (Math.random() < 0.004) {
        shooters.push({
          x: Math.random() * W, y: Math.random() * H * 0.5,
          vx: (Math.random() < 0.5 ? 1 : -1) * (14 + Math.random() * 10) * DPR,
          vy: (6 + Math.random() * 6) * DPR, life: 1,
        });
      }
      shooters = shooters.filter(o => o.life > 0);
      for (const o of shooters) {
        const g = ctx.createLinearGradient(o.x, o.y, o.x - o.vx * 6, o.y - o.vy * 6);
        g.addColorStop(0, `rgba(255,255,255,${o.life})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 2 * DPR;
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - o.vx * 6, o.y - o.vy * 6); ctx.stroke();
        o.x += o.vx; o.y += o.vy; o.life -= 0.025;
      }
    } else if (bg === "black") {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.45);
      g.addColorStop(0, `rgba(120, 140, 255, ${0.05 + boost * 0.18})`);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    boost *= 0.92;
  }

  // ---------- lyrics ----------
  // Spotify gives line timings only, so each word's timing is estimated by spreading
  // the line's duration across its words in proportion to word length.
  function buildLines(raw) {
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const text = (raw[i].words || "").trim();
      if (!text) continue;
      const start = Number(raw[i].startTimeMs);
      let end = Number(raw[i].endTimeMs);
      if (!end || end <= start) end = raw[i + 1] ? Number(raw[i + 1].startTimeMs) : start + 4000;
      const parts = text.split(/\s+/);
      const total = parts.reduce((n, p) => n + p.length + 1, 0);
      let t = start;
      const words = parts.map(p => {
        const d = ((p.length + 1) / total) * (end - start);
        const w = { text: p, start: t, end: t + d };
        t += d;
        return w;
      });
      out.push({ start, end, words });
    }
    return out;
  }

  // Turn an LRC string ("[01:23.45] words") into the same shape Spotify's service returns.
  function parseLrc(lrc) {
    const raw = [];
    for (const row of String(lrc || "").split(/\r?\n/)) {
      const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
      if (m) raw.push({ startTimeMs: (Number(m[1]) * 60 + Number(m[2])) * 1000, words: m[3] });
    }
    return raw;
  }

  async function fromSpotify(track) {
    if (!S.CosmosAsync) throw new Error("CosmosAsync missing");
    const id = String(track.uri).split(":")[2];
    const base = "https://spclient.wg.spotify.com/color-lyrics/v2/track/" + id;
    const q = "?format=json&vocalRemoval=false&market=from_token";
    const img = track.metadata && track.metadata.image_url;   // e.g. spotify:image:abcd...
    const urls = (img ? [base + "/image/" + encodeURIComponent(img) + q] : []).concat([base + q]);
    let lastErr;
    for (const u of urls) {
      try {
        const res = await S.CosmosAsync.get(u);
        const L = res && res.lyrics;
        if (L && L.lines && L.lines.length && L.syncType !== "UNSYNCED") return L.lines;
        lastErr = new Error("not synced");
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("no response");
  }

  async function fromLrclib(track) {
    const md = track.metadata || {};
    const title = track.name || md.title;
    const artist = (track.artists && track.artists[0] && track.artists[0].name) || md.artist_name;
    const album = (track.album && track.album.name) || md.album_title || "";
    const dur = Math.round(Number((track.duration && track.duration.milliseconds) || md.duration || 0) / 1000);
    const qs = new URLSearchParams({ track_name: title || "", artist_name: artist || "", album_name: album });
    if (dur) qs.set("duration", String(dur));
    const res = await fetch("https://lrclib.net/api/get?" + qs.toString());
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    if (!j.syncedLyrics) throw new Error("no synced lyrics");
    return parseLrc(j.syncedLyrics);
  }

  async function fetchLyrics(track) {
    lines = [];
    status = "Loading lyrics...";
    lastKey = ""; lastLine = -2;
    const errs = [];
    for (const [name, fn] of [["Spotify", fromSpotify], ["LRCLIB", fromLrclib]]) {
      try {
        const raw = await fn(track);
        const built = buildLines(raw);
        if (built.length) {
          if (currentTrack !== track.uri) return;       // song changed while loading
          lines = built; status = ""; lastKey = ""; lastLine = -2;
          console.log("[verci-lite] lyrics from " + name + ":", built.length, "lines");
          return;
        }
        errs.push(name + ": empty");
      } catch (e) {
        errs.push(name + ": " + ((e && e.message) || e));
      }
    }
    if (currentTrack !== track.uri) return;
    status = "No lyrics found (" + errs.join("; ") + ")";
    console.warn("[verci-lite]", status);
    lastKey = ""; lastLine = -2;
  }

  // Different Spotify/Spicetify versions keep the playing track in different places.
  function currentItem() {
    const d = S.Player.data || {};
    const plat = S.Platform && S.Platform.PlayerAPI && S.Platform.PlayerAPI._state;
    return d.item || d.track || (plat && plat.item) || null;
  }

  function onSongChange() {
    const item = currentItem();
    if (!item || !item.uri || item.uri === currentTrack) return;
    currentTrack = item.uri;
    fetchLyrics(item);
  }
  S.Player.addEventListener("songchange", onSongChange);
  onSongChange();

  // ---------- rendering ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const seeded = n => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };

  function svgKit() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 60");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      svg.appendChild(n);
      return n;
    };
    return { svg, add, NS };
  }

  function render(li, wi) {
    fg.textContent = "";
    if (li < 0) {
      fg.appendChild(el("div", "vl-note", lines.length ? "" : (status || ("Verci Lite v2.6: no track detected. Player.data keys: " + Object.keys(S.Player.data || {}).join(",")))));
      return;
    }
    const line = lines[li], w = line.words;

    if (style === "warp") {
      const box = el("div", "warp");
      box.appendChild(el("div", "big", w[wi].text));
      const ln = el("div", "line");
      w.forEach((x, i) => ln.appendChild(el("span", i <= wi ? "on" : "", x.text + " ")));
      box.appendChild(ln);
      fg.appendChild(box);
    } else if (style === "stack") {
      const box = el("div", "stack");
      box.appendChild(el("div", "w-prev", w[wi - 1] ? w[wi - 1].text : "\u00a0"));
      box.appendChild(el("div", "w-cur", w[wi].text));
      box.appendChild(el("div", "w-next", w[wi + 1] ? w[wi + 1].text : "\u00a0"));
      fg.appendChild(box);
    } else if (style === "code") {
      const box = el("div", "code");
      if (lines[li - 1]) box.appendChild(el("div", "prev", lines[li - 1].words.map(x => x.text).join(".") + ";"));
      const cur = el("div", "cur", w.slice(0, wi + 1).map(x => x.text).join("."));
      cur.appendChild(el("span", "cursor"));
      box.appendChild(cur);
      fg.appendChild(box);
    } else if (style === "fisheye") {
      const box = el("div", "fish");
      box.appendChild(el("div", "fa", w[wi - 1] ? w[wi - 1].text : "\u00a0"));
      box.appendChild(el("div", "fb", w[wi].text));
      box.appendChild(el("div", "fc", w[wi + 1] ? w[wi + 1].text : "\u00a0"));
      fg.appendChild(box);
    } else if (style === "branches") {
      // a line draws itself across the panel; each word lights a node with a small twig
      const { svg, add } = svgKit();
      const n = w.length;
      const pts = w.map((_, i) => ({ x: 10 + (80 * i) / Math.max(1, n - 1), y: 30 + Math.sin(i * 1.25 + li) * 11 }));
      const seg = i => {
        const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2;
        return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
      };
      for (let i = 1; i < n; i++) add("path", { d: seg(i), fill: "none", stroke: "rgba(255,255,255,.12)", "stroke-width": ".3" });
      for (let i = 1; i <= wi; i++) {
        const path = add("path", { d: seg(i), fill: "none", stroke: "rgba(255,255,255,.85)",
          "stroke-width": ".4", "stroke-linecap": "round", pathLength: "100" });
        if (i === wi) path.setAttribute("class", "vl-draw");
      }
      for (let i = 0; i <= wi; i++) {
        const up = i % 2 === 0, p = pts[i], ty = p.y + (up ? -7 : 7), tx = p.x + 1.5;
        add("line", { x1: p.x, y1: p.y, x2: tx, y2: ty, stroke: "rgba(255,255,255,.5)", "stroke-width": ".25" });
        add("circle", { cx: p.x, cy: p.y, r: i === wi ? "1.3" : ".8", fill: "#fff" });
        add("text", { x: tx, y: ty + (up ? -1.5 : 3.5), "text-anchor": "middle", fill: "#fff",
          "font-size": i === wi ? "3.2" : "2", opacity: i === wi ? "1" : ".6" }, w[i].text);
      }
      fg.appendChild(svg);
    } else if (style === "web") {
      // An orb web: sagging silk rings, one glowing strand per word, dewdrops, and a spider that
      // walks out along the strand of the word being sung. The current word sits in the hub.
      const { svg, add, NS } = svgKit();
      const n = Math.max(8, w.length), cx = 50, cy = 30, R = 23;
      const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const P = (i, r) => ({ x: cx + Math.cos(ang(i)) * r, y: cy + Math.sin(ang(i)) * r });
      const lit = i => i <= wi && i < w.length;

      const defs = add("defs", {});
      const f = document.createElementNS(NS, "filter");
      f.setAttribute("id", "vlglow"); f.setAttribute("x", "-30%"); f.setAttribute("y", "-30%");
      f.setAttribute("width", "160%"); f.setAttribute("height", "160%");
      const blur = document.createElementNS(NS, "feGaussianBlur");
      blur.setAttribute("stdDeviation", ".7");
      f.appendChild(blur); defs.appendChild(f);

      const radii = [0.2, 0.38, 0.56, 0.76, 1].map(k => k * R);
      for (const r of radii) {
        for (let i = 0; i < n; i++) {
          const a = P(i, r), b = P((i + 1) % n, r);
          const m = P(i + 0.5, r * Math.cos(Math.PI / n) * 0.86);   // pulled inward so threads sag
          const on = lit(i);
          add("path", { d: `M ${a.x} ${a.y} Q ${m.x} ${m.y} ${b.x} ${b.y}`, fill: "none",
            stroke: on ? "rgba(190,205,255,.7)" : "rgba(255,255,255,.13)", "stroke-width": on ? ".3" : ".18" });
        }
      }
      for (let i = 0; i < n; i++) {
        const q = P(i, R);
        if (lit(i)) {
          add("line", { x1: cx, y1: cy, x2: q.x, y2: q.y, stroke: "#9db4ff", "stroke-width": "1.2",
            opacity: ".55", filter: "url(#vlglow)" });
          const ln = add("line", { x1: cx, y1: cy, x2: q.x, y2: q.y, stroke: "#fff", "stroke-width": ".4", pathLength: "100" });
          if (i === wi) ln.setAttribute("class", "vl-draw");
          for (const r of radii.slice(1)) {
            const d = P(i, r);
            add("circle", { cx: d.x, cy: d.y, r: ".4", fill: "#dbe4ff", opacity: ".85" });
          }
        } else {
          add("line", { x1: cx, y1: cy, x2: q.x, y2: q.y, stroke: "rgba(255,255,255,.2)", "stroke-width": ".2" });
        }
      }

      // the spider (an original design): dark body, outlined, eight jointed legs, two eyes
      if (wi < n) {
        const sp = P(wi, R * 0.6), deg = (ang(wi) * 180) / Math.PI;
        const wrap = add("g", { class: "vl-fade" });
        const inner = document.createElementNS(NS, "g");
        inner.setAttribute("transform", `translate(${sp.x} ${sp.y}) rotate(${deg})`);
        wrap.appendChild(inner);
        const ia = (tag, attrs) => {
          const el2 = document.createElementNS(NS, tag);
          for (const k in attrs) el2.setAttribute(k, attrs[k]);
          inner.appendChild(el2);
          return el2;
        };
        for (let k = 0; k < 4; k++) {
          const bx = -0.7 + k * 0.55, lean = (k - 1.5) * 0.9;
          for (const sgn of [-1, 1]) {
            ia("path", { d: `M ${bx} 0 L ${bx + lean} ${sgn * 2.1} L ${bx + lean * 1.9} ${sgn * 3.8}`,
              fill: "none", stroke: "#fff", "stroke-width": ".3", "stroke-linecap": "round", "stroke-linejoin": "round" });
          }
        }
        ia("ellipse", { cx: "-1.3", cy: "0", rx: "1.5", ry: "1.15", fill: "#0b0b18", stroke: "#fff", "stroke-width": ".3" });
        ia("circle", { cx: ".6", cy: "0", r: ".75", fill: "#0b0b18", stroke: "#fff", "stroke-width": ".3" });
        ia("circle", { cx: "1", cy: "-.3", r: ".15", fill: "#fff" });
        ia("circle", { cx: "1", cy: ".3", r: ".15", fill: "#fff" });
      }

      const halo = { stroke: "rgba(0,0,0,.75)", "stroke-width": "1.2", "paint-order": "stroke", fill: "#fff", "text-anchor": "middle" };
      for (let i = 0; i < wi && i < w.length; i++) {
        const q = P(i, R + 3.5);
        add("text", Object.assign({ x: q.x, y: q.y, "font-size": "2.2", opacity: ".7" }, halo, { "stroke-width": ".6" }), w[i].text);
      }
      const word = w[Math.min(wi, w.length - 1)].text;
      const fs = Math.min(6.2, 40 / (word.length * 0.58));
      add("text", Object.assign({ x: cx, y: cy + fs * 0.33, "font-size": String(fs), "font-weight": "700" }, halo), word);
      fg.appendChild(svg);
    } else {
      // constellation: each word is a star at a deterministic spot; lit stars are joined by lines
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 100 60");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const pts = w.map((_, i) => ({
        x: 12 + (76 * (i + seeded(li * 31 + i))) / w.length,
        y: 15 + seeded(li * 17 + i * 5) * 30,
      }));
      const add = (tag, attrs, text) => {
        const n = document.createElementNS(NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (text != null) n.textContent = text;
        svg.appendChild(n);
      };
      for (let i = 1; i <= wi; i++) {
        add("line", { x1: pts[i - 1].x, y1: pts[i - 1].y, x2: pts[i].x, y2: pts[i].y,
          stroke: "rgba(255,255,255,.45)", "stroke-width": ".15" });
      }
      for (let i = 0; i <= wi; i++) {
        add("circle", { cx: pts[i].x, cy: pts[i].y, r: i === wi ? ".9" : ".5", fill: "#fff" });
        add("text", { x: pts[i].x, y: pts[i].y - 2, "text-anchor": "middle", fill: "#fff",
          "font-size": i === wi ? "3" : "1.8", opacity: i === wi ? "1" : ".6" }, w[i].text);
      }
      fg.appendChild(svg);
    }
  }

  let frame = 0;
  function tick() {
    if ((frame++ % 60) === 0) onSongChange();
    if (visible) {
      drawBg();
      if (lines.length) {
        const p = S.Player.getProgress();
        let li = -1;
        for (let i = 0; i < lines.length; i++) { if (p >= lines[i].start) li = i; else break; }
        let wi = 0;
        if (li >= 0) {
          const ws = lines[li].words;
          for (let i = 0; i < ws.length; i++) { if (p >= ws[i].start) wi = i; else break; }
        }
        const key = `${style}:${li}:${wi}`;
        if (key !== lastKey) {
          lastKey = key;
          boost = li !== lastLine ? 1.6 : 1;   // bigger surge on a new line
          lastLine = li;
          render(li, wi);
        }
      } else if (!lines.length && lastKey !== "none:" + status) {
        lastKey = "none:" + status; render(-1, 0);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- controls ----------
  const notify = m => S.showNotification && S.showNotification(m);
  const setVisible = v => { visible = v; save("visible", v); applyRoot(); lastKey = ""; };
  const nextStyle = () => {
    style = STYLES[(STYLES.indexOf(style) + 1) % STYLES.length];
    save("style", style); lastKey = ""; notify("Lyric style: " + style);
  };
  const nextBg = () => {
    bg = BGS[(BGS.indexOf(bg) + 1) % BGS.length];
    save("bg", bg); applyRoot(); notify("Background: " + bg);
  };
  const nextSize = () => {
    const k = Object.keys(SIZES);
    size = k[(k.indexOf(size) + 1) % k.length];
    save("size", size); applyRoot(); notify("Panel size: " + size);
  };
  const toggleFullscreen = () => {
    if (mode === "full") {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setMode("panel");
    } else {
      setMode("full");
      const d = document.documentElement;
      if (d.requestFullscreen) d.requestFullscreen().catch(() => {});   // optional: also fill the screen
    }
  };

  document.addEventListener("keydown", e => {
    if (!(e.ctrlKey && e.shiftKey)) return;
    if (e.code === "KeyL") { e.preventDefault(); setVisible(!visible); }
    if (e.code === "KeyS") { e.preventDefault(); nextStyle(); }
    if (e.code === "KeyB") { e.preventDefault(); nextBg(); }
    if (e.code === "KeyF") { e.preventDefault(); toggleFullscreen(); }
    if (e.code === "KeyM") { e.preventDefault(); nextSize(); }
  });

  if (S.Topbar && S.Topbar.Button) {
    new S.Topbar.Button("Verci Lite lyrics", "lyrics", () => setVisible(!visible));
  }

  // Menu items (click your profile picture in Spotify) — no keyboard shortcuts needed
  if (S.Menu && S.Menu.Item) {
    new S.Menu.Item("Verci Lite: show/hide", false, () => setVisible(!visible));
    new S.Menu.Item("Verci Lite: next style", false, nextStyle);
    new S.Menu.Item("Verci Lite: next background", false, nextBg);
    new S.Menu.Item("Verci Lite: panel / full view", false, toggleFullscreen);
    new S.Menu.Item("Verci Lite: panel size", false, nextSize);
    new S.Menu.Item("Verci Lite: reset panel position", false, () => { pos = null; save("pos", null); applyRoot(); });
  }

  notify("Verci Lite v2.6 loaded");
  console.log("[verci-lite] v2.6 loaded", { style, bg, visible });
})();
