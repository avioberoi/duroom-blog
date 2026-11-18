(async () => {
  const figure = document.querySelector("#fig-code-fit figure");
  if (!figure) return;
  const script = [...document.scripts].find((s) => s.src.endsWith("/direction-demo.js"));
  const base = new URL(".", script.src);
  try {
    let placeLabel2 = function(label, anchor, preferred) {
      if (!label) return;
      label.setAttribute("text-anchor", "middle");
      const glyph = label.getBBox(), width = glyph.width, height = glyph.height;
      const intersects = (box, a, b) => {
        let low = 0, high = 1;
        for (let i = 0; i < 2; i++) {
          const delta = b[i] - a[i], min = i ? box.y : box.x, max = min + (i ? box.height : box.width);
          if (Math.abs(delta) < 1e-9) {
            if (a[i] < min || a[i] > max) return false;
          } else {
            const ends = [(min - a[i]) / delta, (max - a[i]) / delta].sort((x, y) => x - y);
            low = Math.max(low, ends[0]);
            high = Math.min(high, ends[1]);
            if (low > high) return false;
          }
        }
        return true;
      };
      const segments = [...drawing.querySelectorAll("line")].map((l) => [[l.x1.baseVal.value, l.y1.baseVal.value], [l.x2.baseVal.value, l.y2.baseVal.value]]);
      if (step > 0) segments.push([[point(d.average)[0], point(d.average)[1] + 8], [100, 302]]);
      const obstacles = [...drawing.querySelectorAll("circle,text")].filter((e) => e !== label).map((e) => e.getBBox());
      const angles = [preferred, preferred + Math.PI, ...Array.from({ length: 24 }, (_, i) => i * Math.PI / 12)];
      for (const extra of [12, 28, 48, 72, 105, 150]) for (const a of angles) {
        const radius = 12 + Math.abs(Math.cos(a)) * width / 2 + Math.abs(Math.sin(a)) * height / 2 + extra;
        const cx = anchor[0] + radius * Math.cos(a), cy = anchor[1] + radius * Math.sin(a);
        const box = { x: cx - width / 2 - 5, y: cy - height / 2 - 5, width: width + 10, height: height + 10 };
        if (box.x < 8 || box.x + box.width > 552 || box.y < 35 || box.y + box.height > 310) continue;
        if (segments.some(([a2, b]) => intersects(box, a2, b))) continue;
        if (obstacles.some((b) => box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y)) continue;
        label.setAttribute("x", cx);
        label.setAttribute("y", cy - height / 2 - glyph.y + Number(label.getAttribute("y")));
        label.dataset.clear = "true";
        return;
      }
      label.dataset.clear = "false";
    }, render2 = function() {
      const compare = step === 5, pixels = step === 4;
      host.querySelector(".direction-scope").textContent = compare ? "Measured CLIP results. The same held-out works are tested against two bases." : pixels ? "Fit on one half of an image, then reconstruct the unseen half." : "Two-coordinate teaching geometry, not the measured encoding of an artwork.";
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === step));
        tab.tabIndex = i === step ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", tabs[step].id);
      imageWrapper.hidden = !compare;
      imageWrapper.style.display = compare ? "" : "none";
      panel.hidden = compare || pixels;
      pixelPanel.hidden = !pixels;
      if (compare || pixels) return;
      const rad = angle * Math.PI / 180, u = [Math.cos(rad), Math.sin(rad)];
      const score = dot(d.offset, u), kept = scale(u, score), shadow = add(d.average, kept), residual = sub(d.offset, kept);
      const keptShare = dot(kept, kept) / dot(d.offset, d.offset), missedShare = 1 - keptShare;
      host.querySelector(".direction-explain").textContent = explanations[step];
      host.querySelector(".direction-equation").textContent = [
        `Work x = ${pair(d.work)}`,
        `Work ${pair(d.work)}
− Average ${pair(d.average)}
= Offset ${pair(d.offset)}`,
        `Unit direction u = ${pair(u)}`,
        `Offset · direction = ${fmt(score)}`
      ][step];
      host.querySelector(".direction-controls").hidden = step < 2;
      host.querySelector("#direction-angle-value").textContent = `${Math.round(angle)}°`;
      range.value = angle;
      host.querySelector(".direction-result").textContent = step === 3 ? `Kept ${Math.round(100 * keptShare)}% · missed ${Math.round(100 * missedShare)}% of squared distance in this example` : "";
      host.querySelector(".direction-share").hidden = step !== 3;
      host.querySelector(".direction-kept").style.width = `${100 * keptShare}%`;
      host.querySelector(".direction-missed").style.width = `${100 * missedShare}%`;
      host.querySelector(".direction-meaning").textContent = [
        `The real CLIP vector has ${d.encoder_dimensions} coordinates, not just these two. A coordinate is not a pixel or a named style.`,
        "The average is an average of vectors. It is not an “average painting” that we can display.",
        "Turn the axis: the artwork stays put. “Follow the sample’s spread” fits the leading direction to the grey sample points shown here.",
        "The shadow is a reduced vector, not a blurred or reconstructed image. A basis with more directions keeps more components."
      ][step];
      host.querySelector(".direction-next").textContent = step === 3 ? "See the reconstruction in pixels →" : "Next step →";
      const origin = step === 0 ? [0, 0] : d.average;
      let svg = `<defs><marker id="direction-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>`;
      if (step < 2) {
        svg += line([-0.3, origin[1]], [1.08, origin[1]], "guide");
        svg += line([origin[0], -0.08], [origin[0], 0.7], "guide");
      }
      if (step > 0) d.samples.forEach((p) => {
        svg += circle(p, "sample", 3);
      });
      if (step === 0) {
        svg += line([d.work[0], 0], d.work, "construction") + line([0, d.work[1]], d.work, "construction");
        svg += text([d.work[0], 0], fmt(d.work[0]), "muted", -12, 23) + text([0, d.work[1]], fmt(d.work[1]), "muted", -38, 5);
        svg += text([0, 0], "Origin", "muted", -48, 24);
      }
      if (step >= 2) {
        let lo = -0.65, hi = 1.15;
        [[-0.32, 1.16], [-0.08, 0.73]].forEach(([lower, upper], i) => {
          if (Math.abs(u[i]) > 1e-9) {
            const ends = [(lower - d.average[i]) / u[i], (upper - d.average[i]) / u[i]].sort((a, b) => a - b);
            lo = Math.max(lo, ends[0]);
            hi = Math.min(hi, ends[1]);
          }
        });
        svg += line(add(d.average, scale(u, lo)), add(d.average, scale(u, hi)), "axis", true);
        svg += `<text x="22" y="24" class="accent">Direction through the average</text>`;
      }
      svg += line(origin, d.work, "offset", true);
      if (step === 3) {
        svg += line(d.average, shadow, "kept", true) + line(shadow, d.work, "missed");
        svg += circle(shadow, "shadow", 6);
        const len = Math.sqrt(dot(residual, residual));
        if (len > 0.025 && Math.abs(score) > 0.025) {
          const back = scale(u, -Math.sign(score) * 0.035), across = scale(residual, 0.035 / len);
          svg += line(add(shadow, back), add(add(shadow, back), across), "right-angle") + line(add(add(shadow, back), across), add(shadow, across), "right-angle");
        }
        if (Math.sqrt(dot(residual, residual)) > 1e-3) svg += text(shadow, "Shadow", "muted shadow-label", 8, 22);
      }
      svg += circle(origin, step === 0 ? "sample" : "average", 5) + circle(d.work, "work", 6);
      svg += text(d.work, step === 3 && Math.sqrt(dot(residual, residual)) <= 1e-3 ? "Work = shadow" : "Work", "work-label", 10, -10);
      if (step > 0) {
        const averagePoint = point(d.average);
        svg += `<path d="M ${averagePoint[0]} ${averagePoint[1] + 8} L 100 302" class="average-leader"/>`;
        svg += '<text x="22" y="330" class="accent group-average-label">Group average</text>';
      }
      if (step === 1) svg += text(scale(add(d.average, d.work), 0.5), "Offset", "offset-label", 10, -12);
      drawing.innerHTML = svg;
      placeLabel2(drawing.querySelector(".work-label"), point(d.work), -Math.PI / 4);
      placeLabel2(drawing.querySelector(".offset-label"), point(scale(add(d.average, d.work), 0.5)), -Math.PI / 2);
      const away = Math.atan2(u[0], u[1]);
      const normal = [Math.sin(rad), Math.cos(rad)];
      placeLabel2(drawing.querySelector(".shadow-label"), point(shadow), away + (normal[0] * residual[0] - normal[1] * residual[1] > 0 ? Math.PI : 0));
      drawing.setAttribute("aria-label", `Step ${step + 1}. ${explanations[step]} Work ${pair(d.work)}, average ${pair(d.average)}.${step >= 2 ? ` Direction ${Math.round(angle)} degrees.` : ""}${step === 3 ? ` ${Math.round(100 * keptShare)} percent kept.` : ""}`);
    };
    var placeLabel = placeLabel2, render = render2;
    const response = await fetch(new URL("data/direction_demo.json", base));
    if (!response.ok) throw new Error("Direction illustration data unavailable");
    const d = await response.json();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("direction-demo.css", base);
    document.head.append(css);
    const host = document.createElement("div");
    host.className = "direction-demo";
    host.innerHTML = `
      <div class="direction-heading">What does a basis keep?</div>
      <p class="direction-scope">An image reconstruction in pixels, with a vector walkthrough. The CLIP results are separate.</p>
      <div class="direction-tabs" role="tablist" aria-label="Steps from vector to shadow and reconstruction">
        ${["Vector", "Subtract average", "Choose direction", "Project", "See it in pixels", "Compare bases"].map((label, i) => `<button type="button" id="direction-tab-${i}" role="tab" aria-selected="false" aria-controls="direction-panel" data-step="${i}" tabindex="-1">${label}</button>`).join("")}
      </div>
      <div id="direction-panel" role="tabpanel" tabindex="0">
        <div class="direction-worked">
          <div class="direction-explanation"><p class="direction-explain"></p><div class="direction-equation"></div></div>
        </div>
        <svg class="direction-drawing" viewBox="0 0 560 340" role="img" aria-label=""></svg>
        <div class="direction-controls">
          <label for="direction-angle">Turn the direction <output id="direction-angle-value"></output></label>
          <input id="direction-angle" type="range" min="${d.min_angle}" max="${d.max_angle}" step="${d.step_angle}" value="${d.initial_angle}">
          <div class="direction-presets"><button type="button" data-angle="fit">Follow the sample’s spread</button><button type="button" data-angle="work">Aim at this work</button><button type="button" data-angle="across">Turn across it</button></div>
        </div>
        <div class="direction-result" aria-live="polite"></div>
        <div class="direction-share" aria-hidden="true"><span class="direction-kept"></span><span class="direction-missed"></span></div>
        <p class="direction-meaning"></p>
        <button class="direction-next" type="button">Next step →</button>
      </div>`;
    const picture = figure.querySelector("picture") || figure.querySelector("img");
    const imageWrapper = document.createElement("div");
    imageWrapper.id = "direction-comparison";
    imageWrapper.setAttribute("role", "tabpanel");
    imageWrapper.setAttribute("aria-labelledby", "direction-tab-5");
    imageWrapper.tabIndex = 0;
    picture.before(imageWrapper);
    imageWrapper.append(picture);
    imageWrapper.before(host);
    const drawing = host.querySelector("svg");
    const panel = host.querySelector("[role=tabpanel]");
    const tabs = [...host.querySelectorAll("[role=tab]")];
    tabs[5].setAttribute("aria-controls", "direction-comparison");
    const pixelPanel = document.createElement("div");
    pixelPanel.id = "direction-pixels";
    pixelPanel.setAttribute("role", "tabpanel");
    pixelPanel.setAttribute("aria-labelledby", "direction-tab-4");
    pixelPanel.tabIndex = 0;
    pixelPanel.hidden = true;
    host.append(pixelPanel);
    tabs[4].setAttribute("aria-controls", pixelPanel.id);
    const range = host.querySelector("input");
    let step = 0, angle = d.initial_angle;
    const fmt = (x) => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(2).replace("-", "−");
    const pair = (p) => `(${p.map(fmt).join(", ")})`;
    const add = (a, b) => a.map((x, i) => x + b[i]);
    const sub = (a, b) => a.map((x, i) => x - b[i]);
    const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const scale = (a, k) => a.map((x) => x * k);
    const point = (p) => [140 + p[0] * 340, 265 - p[1] * 340];
    const line = (a, b, cls, arrow = false) => {
      const p = point(a), q = point(b);
      return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" class="${cls}" ${arrow ? 'marker-end="url(#direction-arrow)"' : ""}/>`;
    };
    const circle = (p, cls, r = 5) => {
      const q = point(p);
      return `<circle cx="${q[0]}" cy="${q[1]}" r="${r}" class="${cls}"/>`;
    };
    const text = (p, label, cls = "", dx = 0, dy = 0) => {
      const q = point(p);
      return `<text x="${q[0] + dx}" y="${q[1] + dy}" class="${cls}">${label}</text>`;
    };
    const explanations = [
      "An encoder turns the image into a list of coordinates. Each coordinate is a number; the list locates a point. Here we draw just two.",
      "Subtract the basis group’s average, coordinate by coordinate. The arrow now starts at that average. It describes how this work differs from the group.",
      "A direction is a unit arrow through the average. It mixes the coordinates into one axis. A fitted basis chooses axes along which its training works vary most.",
      "Project onto the direction: drop a perpendicular from the work to the axis. Its shadow is the part kept; the dashed remainder is missed. Their squared lengths add to the offset’s squared length."
    ];
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        step = i;
        render2();
      });
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (step + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (step + tabs.length - 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next !== void 0) {
          event.preventDefault();
          step = next;
          render2();
          tabs[step].focus();
        }
      });
    });
    host.querySelector(".direction-next").addEventListener("click", () => {
      step++;
      render2();
      tabs[step].focus();
    });
    range.addEventListener("input", () => {
      angle = Number(range.value);
      render2();
    });
    host.querySelectorAll("[data-angle]").forEach((button) => button.addEventListener("click", () => {
      const toward = Math.atan2(d.offset[1], d.offset[0]) * 180 / Math.PI;
      angle = button.dataset.angle === "fit" ? d.fitted_angle : button.dataset.angle === "work" ? toward : toward - 90;
      render2();
    }));
    await window.DuroomPixels.mountBasis(pixelPanel, () => {
      step = 5;
      render2();
      tabs[5].focus();
    });
    render2();
    host.dataset.ready = "true";
  } catch (error) {
    console.warn("Using static basis illustration:", error);
  }
})();
