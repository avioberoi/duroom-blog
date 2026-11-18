document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("section#footnotes");
  if (!section) return;
  const heading = section.querySelector("h2");
  const details = document.createElement("details");
  details.className = "footnotes-collapsible";
  const summary = document.createElement("summary");
  summary.textContent = heading ? heading.textContent : "Footnotes";
  details.appendChild(summary);
  [...section.childNodes].forEach((node) => {
    if (node !== heading) details.appendChild(node);
  });
  if (heading) heading.remove();
  section.appendChild(details);
  const openFor = (href) => {
    if (!href) return;
    try {
      const target = new URL(href, location.href);
      if (target.origin !== location.origin || target.pathname !== location.pathname) return;
      const note = document.getElementById(decodeURIComponent(target.hash.slice(1)));
      if (note && section.contains(note)) details.open = true;
    } catch {
    }
  };
  document.querySelectorAll('a.footnote-ref, a[href^="#fn"]').forEach((a) => a.addEventListener("click", () => openFor(a.getAttribute("href"))));
  openFor(location.hash);
  window.addEventListener("hashchange", () => openFor(location.hash));
});
