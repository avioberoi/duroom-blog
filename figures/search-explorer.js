(() => {
  "use strict";
  const base = new URL(".", document.currentScript.src);
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("search-explorer.css", base);
  document.head.append(style);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const asset = (p) => new URL(p, document.baseURI).href;
  const fmt = (n, d = 1) => n === null ? "—" : Number(n).toFixed(d).replace(/^-/, "−");
  const tokens = () => {
    const c = getComputedStyle(document.documentElement);
    return Object.fromEntries(["paper", "ink", "mute", "accent", "hair", "serif"].map((k) => [k, c.getPropertyValue("--" + k).trim()]));
  };
  function select(label, options, value = 0) {
    const l = document.createElement("label");
    l.textContent = label;
    const s = document.createElement("select");
    s.setAttribute("aria-label", label);
    options.forEach((text, i) => s.add(new Option(text, String(i))));
    s.value = String(value);
    l.append(s);
    return [l, s];
  }
  const nice = (lo, hi, n) => {
    const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map((m) => m * p).find((v) => v >= raw) || 10 * p;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
    return out;
  };
  function chart(series, { xmin = 0, xmax = 50, ymin = 0, ymax = 55, xlabel = "Requested angle (°)", ylabel = "Achieved angle (°)", reference = false, refLabel = "as asked" } = {}) {
    const mobile = innerWidth < 600;
    const t = tokens(), W = mobile ? 390 : 650, H = 230, L = mobile ? 48 : 60, R = mobile ? 104 : 150, T = 14, B = 45;
    const x = (v) => L + (v - xmin) / (xmax - xmin) * (W - L - R), y = (v) => H - B - (v - ymin) / (ymax - ymin) * (H - T - B);
    let s = `<svg class="search-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ylabel + " by " + xlabel)}">`;
    nice(ymin, ymax, 5).forEach((v) => {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${t.hair}"/><text x="${L - 8}" y="${y(v) + 5}" font-size="14" text-anchor="end">${fmt(v, 0)}</text>`;
    });
    nice(xmin, xmax, mobile ? 4 : 6).forEach((v) => {
      s += `<text x="${x(v)}" y="${H - B + 22}" font-size="14" text-anchor="middle">${fmt(v, 0)}</text>`;
    });
    const ends = [];
    if (reference) {
      const top = Math.min(xmax, ymax);
      s += `<path d="M${x(Math.max(xmin, ymin))},${y(Math.max(xmin, ymin))} L${x(top)},${y(top)}" fill="none" stroke="${t.mute}" stroke-width="1" stroke-dasharray="4 4"/>`;
      ends.push({ x: x(top), y: y(top), label: refLabel, color: t.mute });
    }
    series.forEach((line) => {
      const pts = line.points.filter((p) => p.y !== null && Number.isFinite(p.y)), c = line.color || t.accent;
      if (!pts.length) return;
      s += `<polyline points="${pts.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="${line.thin ? 1.4 : 2}"/>`;
      pts.forEach((p) => s += `<circle cx="${x(p.x)}" cy="${y(p.y)}" r="${line.thin ? 2.6 : 3.5}" fill="${line.thin ? t.paper : c}" stroke="${c}" stroke-width="1.4"><title>${esc(line.label)}: ${fmt(p.x)}°, ${fmt(p.y)}</title></circle>`);
      const e = pts[pts.length - 1];
      ends.push({ x: x(e.x), y: y(e.y), label: line.label, color: c });
    });
    const lx = W - R + (mobile ? 10 : 14), room = W - lx - 2, LH = 18;
    ends.forEach((e) => {
      e.lines = [e.label];
      if (e.label.length * 7.2 > room && e.label.includes(" ")) {
        const m = e.label.length / 2, sp = [...e.label].map((c, i) => c === " " ? i : -1).filter((i) => i > 0).sort((a, b) => Math.abs(a - m) - Math.abs(b - m))[0];
        e.lines = [e.label.slice(0, sp), e.label.slice(sp + 1)];
      }
      e.h = e.lines.length * LH;
    });
    const lo = T + 5, hi = H - B;
    ends.sort((a, b) => a.y - b.y);
    ends.forEach((e, i) => {
      e.ly = Math.max(e.y - (e.h - LH) / 2, i ? ends[i - 1].ly + ends[i - 1].h : lo);
    });
    for (let i = ends.length - 1; i >= 0; i--) {
      if (ends[i].ly + ends[i].h - LH > hi) ends[i].ly = hi - ends[i].h + LH;
      if (i < ends.length - 1 && ends[i].ly + ends[i].h > ends[i + 1].ly) ends[i].ly = ends[i + 1].ly - ends[i].h;
    }
    ends.forEach((e) => {
      const mid = e.ly + (e.h - LH) / 2;
      if (Math.abs(mid - e.y) > 2 || e.x < W - R - 1) s += `<line x1="${e.x + 5}" y1="${e.y}" x2="${lx - 3}" y2="${mid}" stroke="${e.color}" stroke-width="0.8"/>`;
      s += `<text x="${lx}" y="${e.ly + 5}" font-size="14" style="fill:${e.color}">${e.lines.map((l, k) => `<tspan x="${lx}" dy="${k ? LH : 0}">${esc(l)}</tspan>`).join("")}</text>`;
    });
    return s + `<text x="${(L + W - R) / 2}" y="${H - 2}" font-size="15" text-anchor="middle">${esc(xlabel)}</text><text transform="translate(14,${(T + H - B) / 2}) rotate(-90)" font-size="15" text-anchor="middle">${esc(ylabel)}</text></svg>`;
  }
  const dirName = (label) => String(label).replace(/^Past basis:/, "Basis from before 1900:");
  const familyColour = (key) => /^(shift|axis)/.test(key) ? tokens().accent : /^past/.test(key) ? "#2a6fc9" : /^random/.test(key) ? "#178a5f" : "#9a6a00";
  const WORDS = [
    [/Random fitness/g, "Random scores"],
    [/\bSeed (\d)/g, "Run $1"],
    [/\bseed (\d)/g, "run $1"],
    [/\bthree seeds\b/gi, (m) => m[0] === "T" ? "Three runs" : "three runs"],
    [/\bCandidates\b/g, "Pictures"],
    [/\bcandidates\b/g, "pictures"],
    [/\bCandidate\b/g, "Picture"],
    [/\bcandidate\b/g, "picture"]
  ];
  const say = (s) => WORDS.reduce((t, [re, to]) => t.replace(re, to), s);
  function relabel(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while (n = w.nextNode()) {
      if (/noise seed/i.test(n.textContent)) continue;
      const t = say(n.textContent);
      if (t !== n.textContent) n.textContent = t;
    }
    root.querySelectorAll("[aria-label]").forEach((e) => {
      const a = e.getAttribute("aria-label"), t = say(a);
      if (t !== a) e.setAttribute("aria-label", t);
    });
  }
  function keepRelabelled(host) {
    relabel(host);
    let busy = false;
    new MutationObserver(() => {
      if (busy) return;
      busy = true;
      relabel(host);
      busy = false;
    }).observe(host, { childList: true, subtree: true, characterData: true });
  }
  async function mount(id, file, build) {
    const figure = document.querySelector("#" + id + " > figure");
    if (!figure) return;
    try {
      const response = await fetch(new URL("data/search_" + file + ".json", base));
      if (!response.ok) throw new Error(response.status);
      const d = await response.json(), host = document.createElement("div");
      host.className = "search-explorer";
      const fallback = figure.querySelector("picture") || figure.querySelector("img");
      fallback.before(host);
      await build(host, d);
      keepRelabelled(host);
      fallback.classList.add("search-fallback");
      fallback.style.display = "none";
      host.dataset.ready = "true";
    } catch (error) {
      console.error("Figure " + id + " could not load", error);
    }
  }
  mount("fig-walk", "walk", (host, d) => {
    const controls = document.createElement("div");
    controls.className = "search-controls";
    const [sl, start] = select("Start work", d.starts.map((s) => `${s.artist} · ${s.title}, ${s.year}`), 1);
    const [dl, dir] = select("Direction", d.starts[0].directions.map((s) => dirName(s.label)));
    controls.append(sl, dl);
    const content = document.createElement("div");
    host.append(controls, content);
    let at = 4;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let playTimer = null, resumable = false;
    function stopPlay() {
      clearInterval(playTimer);
      playTimer = null;
    }
    function addPlay(direction) {
      if (reduced.matches) return;
      const slider = content.querySelector(".search-slider input"), label = content.querySelector(".search-slider");
      if (!slider || !label) return;
      const last = direction.frames.length - 1, row = document.createElement("div"), btn = document.createElement("button");
      row.className = "search-slider-row";
      btn.type = "button";
      btn.className = "search-play";
      btn.textContent = "Play";
      btn.setAttribute("aria-pressed", "false");
      const set = (i) => {
        slider.value = String(i);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const halt = () => {
        stopPlay();
        btn.textContent = "Play";
        btn.setAttribute("aria-pressed", "false");
      };
      btn.onclick = () => {
        if (playTimer) {
          halt();
          resumable = true;
          return;
        }
        if (!resumable || Number(slider.value) >= last) set(0);
        btn.textContent = "Pause";
        btn.setAttribute("aria-pressed", "true");
        playTimer = setInterval(() => {
          const i = Number(slider.value) + 1;
          set(i);
          if (i >= last) {
            halt();
            resumable = false;
          }
        }, 1200);
      };
      slider.addEventListener("input", (e) => {
        if (e.isTrusted) {
          halt();
          resumable = false;
        }
      });
      label.before(row);
      row.append(btn, label);
    }
    function render() {
      stopPlay();
      resumable = false;
      const s = d.starts[Number(start.value)], direction = s.directions[Number(dir.value)], f = direction.frames[at], z = direction.frames[0];
      const credit = `${s.artist}, ${s.title}, ${s.year}`;
      content.innerHTML = `<div class="search-image-pair"><figure><img src="${asset(z.image)}" alt="Start repainting derived from ${esc(credit)}"><figcaption>Start repainting · 0°</figcaption></figure><figure><img src="${asset(f.image)}" alt="Decoded image at ${f.angle} degrees along ${esc(dirName(direction.label))}"><figcaption>Decoded after a ${f.angle}° request</figcaption></figure></div><p class="search-credit">Decoded from ${esc(credit)}. These are model outputs, including the start.</p><label class="search-slider">Requested move: <output>${f.angle}°</output><input type="range" min="0" max="${direction.frames.length - 1}" step="1" value="${at}" aria-label="Requested move"></label><p class="search-metrics" aria-live="polite">${f.achieved === null ? "Start repainting" : `Moved ${fmt(f.achieved)}°`} · chord to the request ${fmt(f.chord, 2)}</p><div class="search-walk-chart"></div><p class="search-note">${esc(d.note)}</p>`;
      const median = d.curves.find((c) => c.key === direction.key);
      content.querySelector(".search-walk-chart").innerHTML = chart([{ label: "this start", color: familyColour(direction.key), points: direction.frames.map((p) => ({ x: p.angle, y: p.achieved })) }, { label: "median of six", color: tokens().ink, thin: true, points: median.points.map((p) => ({ x: p.angle, y: p.achieved })) }], { ymin: -10, ymax: 55, reference: true });
      content.querySelector("input").oninput = (e) => {
        at = Number(e.target.value);
        const frame = direction.frames[at];
        const image = content.querySelector(".search-image-pair figure:nth-child(2) img");
        image.src = asset(frame.image);
        image.alt = `Decoded image at ${frame.angle} degrees along ${dirName(direction.label)}`;
        content.querySelector(".search-image-pair figure:nth-child(2) figcaption").textContent = `Decoded after a ${frame.angle}° request`;
        content.querySelector("output").textContent = `${frame.angle}°`;
        content.querySelector(".search-metrics").textContent = `${frame.achieved === null ? "Start repainting" : `Moved ${fmt(frame.achieved)}°`} · chord to the request ${fmt(frame.chord, 2)}`;
      };
      try {
        addPlay(direction);
      } catch (error) {
        console.warn("Play control unavailable", error);
      }
    }
    start.onchange = dir.onchange = render;
    render();
  });
  mount("fig-trajectory", "trajectory", (host, d) => {
    host.classList.add("trajectory-player");
    const rounds = [...new Set(d.runs.flatMap((r) => r.points.map((p) => p.round)))].sort((a, b) => a - b);
    const first = rounds[0], last = rounds.at(-1), motion = matchMedia("(prefers-reduced-motion: reduce)");
    let round = last, timer = null;
    host.innerHTML = `<div class="trajectory-controls"><button type="button" data-play aria-pressed="false">Play from round ${first}</button><button type="button" data-reset>Reset</button><label>Round <output>${last}</output> / ${last}<input type="range" min="${first}" max="${last}" step="1" value="${last}" aria-label="Search round"></label><button type="button" data-step>Next round</button></div><p class="trajectory-motion" hidden>Reduced motion is on. Use the slider or Next round to inspect each measured round.</p><div class="trajectory-key"><span>Seed 1 ━</span><span>Seed 2 ┄</span><span>Seed 3 ┈</span></div><div class="trajectory-plots"></div><div class="trajectory-values"></div><p class="search-note">${esc(d.note)} Each step shows one measured round.</p>`;
    const play = host.querySelector("[data-play]"), slider = host.querySelector("input"), step = host.querySelector("[data-step]");
    const plots = host.querySelector(".trajectory-plots"), values = host.querySelector(".trajectory-values");
    function stop() {
      clearInterval(timer);
      timer = null;
      play.setAttribute("aria-pressed", "false");
      play.textContent = round === last ? `Play from round ${first}` : "Play";
    }
    function draw() {
      const t = tokens(), narrow = host.clientWidth < 480, W = narrow ? Math.max(280, host.clientWidth) : Math.max(240, (host.clientWidth - 24) / 2), H = 240;
      const L = 42, R = 15, T = 35, B = 42, x = (v) => L + (v - first) / (last - first) * (W - L - R), y = (v) => H - B - v / 100 * (H - T - B);
      plots.innerHTML = ["main", "rf"].map((family) => {
        const runs = d.runs.filter((r) => r.family === family), color = family === "main" ? t.accent : t.mute;
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${family === "main" ? "Search" : "Random fitness"}: mean request angles through round ${round}"><text x="${L}" y="18" fill="${color}" font-size="16">${family === "main" ? "Search" : "Random fitness"}</text>`;
        for (const v of [0, 30, 60, 90]) svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${t.hair}" stroke-dasharray="${v === 90 ? "4 3" : "none"}"/><text x="${L - 7}" y="${y(v) + 4}" text-anchor="end" font-size="13">${v}°</text>`;
        for (const v of [first, 20, 40, last]) svg += `<text x="${x(v)}" y="${H - B + 20}" text-anchor="middle" font-size="13">${v}</text>`;
        svg += `<text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" font-size="14">Round</text>`;
        for (const r of runs) {
          const points = r.points.filter((p2) => p2.round <= round), dash = ["none", "7 4", "2 4"][r.seed - 1];
          svg += `<polyline points="${points.map((p2) => `${x(p2.round)},${y(p2.angle)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-dasharray="${dash}"/>`;
          const p = points.at(-1);
          if (p) svg += `<circle cx="${x(p.round)}" cy="${y(p.angle)}" r="3" fill="${color}"><title>Run ${r.seed}, round ${p.round}: ${fmt(p.angle)}°</title></circle>`;
        }
        return svg + "</svg>";
      }).join("");
      values.innerHTML = "<p>Angle of the mean request from the start</p><table><thead><tr><th>Round " + round + "</th><th>Run 1</th><th>Run 2</th><th>Run 3</th></tr></thead><tbody>" + ["main", "rf"].map((f) => "<tr><th>" + (f === "main" ? "Search" : "Random fitness") + "</th>" + [1, 2, 3].map((s) => {
        const p = d.runs.find((r) => r.family === f && r.seed === s)?.points.find((p2) => p2.round === round);
        return `<td>${p ? fmt(p.angle) + "°" : "—"}</td>`;
      }).join("") + "</tr>").join("") + "</tbody></table>";
      slider.value = round;
      host.querySelector("output").textContent = round;
      step.disabled = round === last;
      host.dataset.round = round;
    }
    play.onclick = () => {
      if (timer) {
        stop();
        return;
      }
      if (motion.matches) return;
      if (round === last) round = first;
      draw();
      play.textContent = "Pause";
      play.setAttribute("aria-pressed", "true");
      timer = setInterval(() => {
        round = rounds.find((r) => r > round) ?? last;
        draw();
        if (round === last) stop();
      }, 250);
    };
    slider.oninput = () => {
      stop();
      round = Number(slider.value);
      draw();
    };
    host.querySelector("[data-reset]").onclick = () => {
      stop();
      round = first;
      draw();
    };
    step.onclick = () => {
      stop();
      round = rounds.find((r) => r > round) ?? last;
      draw();
    };
    function setMotion() {
      stop();
      play.disabled = motion.matches;
      host.querySelector(".trajectory-motion").hidden = !motion.matches;
    }
    motion.addEventListener("change", setMotion);
    setMotion();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
    addEventListener("beforeprint", stop);
    let width = 0;
    new ResizeObserver(() => {
      if (host.clientWidth !== width) {
        width = host.clientWidth;
        draw();
      }
    }).observe(host);
    draw();
  });
  mount("fig-retro", "retro", (host, d) => {
    const controls = document.createElement("div");
    controls.className = "search-controls";
    const [l, s] = select("Freeze the corpus at", d.cuts.map((c) => String(c.cutoff)), 2);
    controls.append(l);
    const panel = document.createElement("div");
    host.append(controls, panel);
    function render() {
      const c = d.cuts[Number(s.value)], rows = c.decades.filter((r) => r.decade < 2020);
      panel.innerHTML = chart([{ label: "99th-percentile bar", points: rows.map((p) => ({ x: p.decade, y: 100 * p.q99 })) }, { label: "95th-percentile bar", color: tokens().ink, thin: true, points: rows.map((p) => ({ x: p.decade, y: 100 * p.q95 })) }], { xmin: c.cutoff, xmax: 2010, ymin: 0, ymax: 100, xlabel: "Decade", ylabel: "Works above the bar (%)" }) + `<p class="search-summary">${c.n_past.toLocaleString()} earlier works; ${c.n_later.toLocaleString()} later works. Bar: ${fmt(c.bar99, 3)} (99th), ${fmt(c.bar95, 3)} (95th).</p><p class="search-note">${esc(d.note)}</p>`;
    }
    s.onchange = render;
    render();
  });
  mount("fig-far-faithful", "fidelity_v2", (host, d) => {
    const families = [["main", "Search"], ["rf", "Random fitness"], ["b0", "Random directions"], ["pos", "Real works 1900–1969, repainted"], ["P2", "Calibration: other pre-1900 works, repainted"]];
    const controls = document.createElement("div");
    controls.className = "search-controls";
    const [gl, group] = select("Experiment", families.map((f) => f[1]));
    const [sl, seed] = select("Run", ["All three seeds", "Seed 1", "Seed 2", "Seed 3"]);
    controls.append(gl, sl);
    const canvas = document.createElement("canvas");
    canvas.className = "search-canvas";
    canvas.setAttribute("role", "img");
    const details = document.createElement("div");
    host.append(controls, canvas, details);
    function render() {
      const key = families[Number(group.value)][0], control = ["pos", "P2"].includes(key);
      sl.hidden = control;
      const rows = control ? d.controls.filter((g) => g.key === key) : d.groups.filter((g) => g.family === key && (sl.hidden || seed.value === "0" || g.seed === Number(seed.value)));
      const points = rows.flatMap((g) => g.points), t = tokens(), W = Math.max(300, canvas.clientWidth), H = 320, scale = devicePixelRatio || 1;
      canvas.width = Math.round(W * scale);
      canvas.height = H * scale;
      const c = canvas.getContext("2d");
      c.scale(scale, scale);
      const L = 55, R = 15, T = 25, B = 50, x = (v) => L + v / 1.8 * (W - L - R), y = (v) => H - B - v / 1.4 * (H - T - B);
      c.font = `12px ${t.serif}`;
      c.lineWidth = 0.6;
      c.textAlign = "right";
      for (const v of [0, 0.25, 0.5, 0.75, 1, 1.25]) {
        c.strokeStyle = t.hair;
        c.beginPath();
        c.moveTo(L, y(v));
        c.lineTo(W - R, y(v));
        c.stroke();
        c.fillStyle = t.mute;
        c.fillText(v, L - 8, y(v) + 4);
      }
      c.textAlign = "center";
      for (const v of [0, 0.4, 0.8, 1.2, 1.6]) c.fillText(v, x(v), H - B + 20);
      c.save();
      c.beginPath();
      c.rect(L, T, W - L - R, H - T - B);
      c.clip();
      c.fillStyle = t.mute;
      c.globalAlpha = 0.12;
      for (const p of points) {
        if (p[2]) continue;
        c.beginPath();
        c.arc(x(p[0]), y(p[1]), 1.2, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      c.globalAlpha = 1;
      c.strokeStyle = t.mute;
      c.globalAlpha = 0.35;
      c.lineWidth = 0.4;
      for (const p of points) {
        if (!p[2] && p[1] > 1) {
          c.beginPath();
          c.arc(x(p[0]), y(p[1]), 2.8, 0, Math.PI * 2);
          c.stroke();
        }
      }
      c.fillStyle = t.accent;
      c.globalAlpha = 0.65;
      for (const p of points) {
        if (p[2]) {
          c.beginPath();
          c.arc(x(p[0]), y(p[1]), 1.7, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;
      for (const [v, dash] of [[d.bars.fid_exact, []], [1, [3, 4]]]) {
        c.strokeStyle = t.ink;
        c.setLineDash(dash);
        c.beginPath();
        c.moveTo(x(v), T);
        c.lineTo(x(v), H - B);
        c.stroke();
      }
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(L, y(1));
      c.lineTo(W - R, y(1));
      c.stroke();
      c.setLineDash([]);
      c.textAlign = "left";
      c.fillStyle = t.accent;
      c.fillText("Far and faithful", L + 4, 16);
      c.fillStyle = t.mute;
      c.textAlign = "center";
      c.fillText("Exact fidelity: chord to request (lower is closer)", (L + W - R) / 2, H - 3);
      c.save();
      c.translate(14, (T + H - B) / 2);
      c.rotate(-Math.PI / 2);
      c.fillText("Reference distance / bar (lower of two)", 0, 0);
      c.restore();
      const total = rows.reduce((s, g) => s + g.n, 0), accepted = rows.reduce((s, g) => s + (g.admitted ?? g.passes), 0), faithful = rows.reduce((s, g) => s + (g.faithful_admitted ?? g.faithful_passes), 0), verb = control ? "pass both reference bars" : "are admitted";
      details.innerHTML = `<div class="search-key"><span class="accent"><i></i>${control ? "Passes" : "Admitted"}</span><span><i></i>${control ? "Other control renders" : "Other candidates"}</span>${control ? "" : "<span>&#9675; Unadmitted above both reference bars</span>"}</div><p class="search-summary" aria-live="polite">${accepted.toLocaleString()} of ${total.toLocaleString()} ${verb}; ${faithful.toLocaleString()} are also faithful.</p><p class="search-note">Distance is to the reference alone: min(DINOv3 / ${fmt(d.bars.dinov3, 3)}, SigLIP / ${fmt(d.bars.siglip, 3)}). Above 1 clears both bars. ${control ? "This control has no archive." : "Admission also counts earlier finds among the neighbours; some points above 1 were crowded out."} Solid vertical: faithful ≤ ${fmt(d.bars.fid_exact, 3)}. Dashed vertical: unrelated level 1. Starts are excluded.</p>`;
      canvas.setAttribute("aria-label", `${families[Number(group.value)][1]}: ${accepted} of ${total} ${verb}; ${faithful} also faithful. Exact fidelity against distance divided by each observer bar.`);
    }
    group.onchange = seed.onchange = render;
    new ResizeObserver(render).observe(canvas);
    render();
  });
  mount("fig-sheets", "sheets", (host, d) => {
    const controls = document.createElement("div");
    controls.className = "search-controls";
    const run2 = Math.max(0, d.runs.findIndex((r) => r.label === "Search" && r.seed === 2));
    const [l, s] = select("Run", d.runs.map((r) => `${r.label} · run ${r.seed}`), run2);
    controls.append(l);
    const panel = document.createElement("div");
    host.append(controls, panel);
    let index = 0;
    function render() {
      const run = d.runs[Number(s.value)], cells = run.cells.slice(index * 6, index * 6 + 6);
      panel.innerHTML = `<p class="search-credit">Start repainting from ${esc(run.source_credit)}.</p><div class="search-gallery">${cells.map((c) => `<figure><img src="${asset(c.image)}" alt="${esc(c.credit)}"><figcaption>${c.start ? "Start repainting" : `Round ${c.round}`}<span class="search-credit">${esc(c.credit)}<br>Exact fidelity ${fmt(c.exact_fidelity, 2)} · requested ${fmt(c.angle, 0)}°</span></figcaption></figure>`).join("")}</div><div class="search-controls"><button type="button" data-prev ${index === 0 ? "disabled" : ""}>Previous images</button><span>${index * 6 + 1}–${Math.min((index + 1) * 6, run.cells.length)} of ${run.cells.length}</span><button type="button" data-next ${(index + 1) * 6 >= run.cells.length ? "disabled" : ""}>Next images</button></div><p class="search-note">${esc(d.note)}</p>`;
      panel.querySelector("[data-prev]").onclick = () => {
        index--;
        render();
      };
      panel.querySelector("[data-next]").onclick = () => {
        index++;
        render();
      };
    }
    s.onchange = () => {
      index = 0;
      render();
    };
    render();
  });
})();
