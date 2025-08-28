
document.addEventListener("DOMContentLoaded", () => {
  // history neutralized
  const pushHistory = (..._args) => {};
  const renderHistory = (..._args) => {};
  // === CONFIG ===
  const COMMISSION_RATE = 0.30;        // 30 % z netto tržby
  const BASE_FULL_SHIFT = 1000;        // fix pro plnou směnu
  const BASE_HALF_SHIFT = 500;         // fix pro 1/2 směnu
  const THRESHOLD_FULL = 3330;         // hranice, od které se jede % (plná)
  const THRESHOLD_HALF = THRESHOLD_FULL / 2; // hranice pro 1/2 směnu
  const MIN_TRZBA_PER_KM = 15;         // minimum Kč/km

  // === ELEMENTS ===
  const form = document.getElementById("calcForm");
  const output = document.getElementById("output");
  const actions = document.getElementById("actions");
  const historyBox = document.getElementById("history");
  const historyList = document.getElementById("historyList") || (historyBox && historyBox.querySelector("#historyList"));

  const resetBtn = document.getElementById("resetBtn");
  const pdfBtn = document.getElementById("pdfExport");
  const shareBtn = document.getElementById("shareBtn");
  const newShiftBtn = document.getElementById("newShiftBtn");
  const themeToggle = document.getElementById("themeToggle");

  
  // === AUTO KM CALC ===
  const kmStartEl = document.getElementById("kmStart");
  const kmEndEl = document.getElementById("kmEnd");
  const kmRealEl = document.getElementById("kmReal");
  const kmEl = document.getElementById("km");
  const rzEl = document.getElementById("rz");

  function syncKm() {
    const s = parseFloat((kmStartEl?.value || "0").replace(",", ".")) || 0;
    const e = parseFloat((kmEndEl?.value || "0").replace(",", ".")) || 0;
    const real = Math.max(0, e - s);
    if (kmRealEl) kmRealEl.value = real;
    if (kmEl) kmEl.value = real;
  }
  kmStartEl && kmStartEl.addEventListener("input", syncKm);
  kmEndEl && kmEndEl.addEventListener("input", syncKm);
// === HELPERS ===
  function getValue(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }
  function getNumber(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const raw = (el.value || "").trim().replace(",", ".");
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  // === THEME (persist + system default) ===
  (function initTheme(){
    const key = "rbTheme";
    let saved = localStorage.getItem(key);
    if (!saved) {
      try {
        saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      } catch (_e) { saved = 'dark'; }
      localStorage.setItem(key, saved);
    }
    if (saved === "light") document.body.classList.add("light-mode");
    updateThemeLabel();
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        localStorage.setItem(key, document.body.classList.contains("light-mode") ? "light" : "dark");
        updateThemeLabel();
        // history removed
      });
    }
  })();

  function updateThemeLabel(){
    const light = document.body.classList.contains("light-mode");
    const ico = light ? '#icon-sun' : '#icon-moon';
    const label = light ? 'Světlý režim' : 'Tmavý režim';
    const el = document.getElementById("themeToggle");
    if (el) el.innerHTML = '<svg class="icon"><use href="'+ico+'"/></svg> ' + label;
  }

  // === HISTORY REMOVED ===

// === SUBMIT ===
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const driver = getValue("driverName");
      const shift = getValue("shiftType");
      const shiftLabelMap = { den: "Denní", noc: "Noční", odpo: "Odpolední", pul: "1/2 směna" };
      const shiftLabel = shiftLabelMap[shift] || shift;
      const kmStart = getNumber("kmStart");
      const kmEnd = getNumber("kmEnd");
      const kmReal = Math.max(0, kmEnd - kmStart);
      const km = kmReal;
      const rz = getValue("rz");
      const trzba = getNumber("trzba");
      const pristavne = getNumber("pristavne");
      const palivo = getNumber("palivo");
      const myti = getNumber("myti");
      const kartou = getNumber("kartou");
      const fakturou = getNumber("fakturou");
      const jine = getNumber("jine");

      const netto = trzba - pristavne;
      const minTrzba = km * MIN_TRZBA_PER_KM;
      const nedoplatek = trzba < minTrzba;
      const doplatek = nedoplatek ? (minTrzba - trzba) : 0;

      const isHalf = (shift === "pul");
      const threshold = isHalf ? THRESHOLD_HALF : THRESHOLD_FULL;
      let vyplata = (netto > threshold) ? (netto * COMMISSION_RATE) : (isHalf ? BASE_HALF_SHIFT : BASE_FULL_SHIFT);
      vyplata = Math.round(vyplata * 100) / 100;

      const kOdevzdani = (trzba - palivo - myti - kartou - fakturou - jine - vyplata);
// kOdevzdani will be computed after vyplata is known
      const datum = new Date().toLocaleString("cs-CZ");
      
      const html = `
        <div class="title"><svg class="icon"><use href="#icon-doc"/></svg> Výčetka řidiče</div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-clock"/></svg></span> Datum:</div><div class="val">${datum}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-user"/></svg></span> Řidič:</div><div class="val">${driver}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Směna:</div><div class="val">${shiftLabel}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-car"/></svg></span> RZ:</div><div class="val">${rz || "-"}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km začátek:</div><div class="val">${kmStart}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km konec:</div><div class="val">${kmEnd}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-road"/></svg></span> Najeté km:</div><div class="val">${km}</div></div>
        <div class="hr"></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-cash"/></svg></span> Tržba:</div><div class="val">${trzba} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-fuel"/></svg></span> Palivo:</div><div class="val">${palivo} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-wash"/></svg></span> Mytí:</div><div class="val">${myti} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-card"/></svg></span> Kartou:</div><div class="val">${kartou} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-doc"/></svg></span> Faktura:</div><div class="val">${fakturou} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Přístavné:</div><div class="val">${pristavne} Kč</div></div>
        <div class="hr"></div>
        <div class="row"><div class="key">K odevzdání:</div><div class="val money-blue">${kOdevzdani.toFixed(2)} Kč</div></div>
        <div class="row"><div class="key">Výplata:</div><div class="val money-green">${vyplata.toFixed(2)} Kč</div></div>
        ${nedoplatek ? `<div class="row"><div class="key">Doplatek řidiče na KM:</div><div class="val money-red">${doplatek.toFixed(2)} Kč</div></div>
        <div class="row"><div class="key">K odevzdání celkem (s doplatkem)</div><div class="val money-blue">${(kOdevzdani + doplatek).toFixed(2)} Kč</div></div>
        ` : ``}
      `;
// Inject RZ + KM rows right after the title
      try {
        const hdr = `<div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-car"/></svg></span> RZ:</div><div class="val">${rz || "-"}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-road"/></svg></span> Najeté km:</div><div class="val">${km}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km začátek:</div><div class="val">${kmStart}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km konec:</div><div class="val">${kmEnd}</div></div>
        <div class="hr"></div>`;
        html = html.replace('Výčetka řidiče</div>', 'Výčetka řidiče</div>' + hdr);
      } catch(_e) {}

      output.innerHTML = html;
// Add accent classes to key rows based on their label text
try {
  output.querySelectorAll('.row .key').forEach(k => {
    const t = (k.textContent || '').trim();
    if (t.startsWith('K odevzdání')) k.parentElement?.classList.add('accent-odev');
    if (t.startsWith('Výplata')) k.parentElement?.classList.add('accent-pay');
    if (t.startsWith('Doplatek řidiče na KM')) k.parentElement?.classList.add('accent-doplatek');
  });
} catch(_e) {}

      output.classList.remove("hidden");
      if (actions) actions.classList.remove("hidden");

      try {
        pushHistory({driver, shift, km, trzba, pristavne, palivo, myti, kartou, fakturou, jine, kOdevzdani, vyplata, datum});
        renderHistory();
      } catch(_e){}
    });
  }

  // === BUTTONS ===

// === SHARE AS IMAGE (non-blocking) ===
(function(){
  const btn = document.getElementById('shareImgBtn');
  const output = document.getElementById('output') || document.querySelector('.output') || document.body;
  if (!btn || !output) return;
  btn.addEventListener('click', async () => {
    try {
      // ensure visible and up to date before capture
      if (typeof computeAndRender === 'function') { try { computeAndRender(); } catch(_e){} }
      const scale = Math.max(2, Math.floor(window.devicePixelRatio || 2));
      const canvas = await html2canvas(output, { scale, backgroundColor: null, useCORS: true });
      await new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            if (!blob) return reject(new Error("Nepodařilo se vytvořit obrázek."));
            const file = new File([blob], "vypocet-vycetky.png", { type: "image/png" });

            // 1) Native share with file (https / supported UA)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: "Výčetka řidiče", text: "Výčetka řidiče (PNG)" });
              return resolve();
            }

            // 2) Clipboard as image (some Chromium builds)
            if (navigator.clipboard && window.ClipboardItem) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                alert("Obrázek výčetky byl zkopírován do schránky.");
                return resolve();
              } catch(_e) {}
            }

            // 3) Download fallback
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "vypocet-vycetky.png";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            resolve();
          } catch(err) {
            reject(err);
          }
        }, "image/png");
      });
    } catch (e) {
      alert("Sdílení obrázku selhalo: " + (e && e.message ? e.message : e));
    }
  });
})();

  if (resetBtn) resetBtn.addEventListener("click", () => {
    const keepName = document.getElementById("driverName")?.value || "";
    form?.reset();
    if (keepName) document.getElementById("driverName").value = keepName;
    output?.classList.add("hidden");
    actions?.classList.add("hidden");
  });

  if (newShiftBtn) newShiftBtn.addEventListener("click", () => {
    const keepName = document.getElementById("driverName")?.value || "";
    form?.reset();
    if (keepName) document.getElementById("driverName").value = keepName;
    const note = document.getElementById("note");
    if (note) note.value = "";
    output?.classList.add("hidden");
    actions?.classList.add("hidden");
  });

  if (shareBtn) shareBtn.addEventListener("click", async () => {
    try {
      const text = (output && !output.classList.contains("hidden")) ? output.innerText.trim() : "";
      if (!text) { alert("Nejprve vypočítejte výčetku."); return; }
      if (navigator.share) {
        await navigator.share({ title: "Výčetka řidiče", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("Zkopírováno do schránky.");
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        alert("Zkopírováno do schránky.");
      }
    } catch(e) {
      alert("Sdílení selhalo: " + (e && e.message ? e.message : e));
    }
  });

  if (pdfBtn) pdfBtn.addEventListener("click", () => {
    const node = output;
    if (!node || node.classList.contains("hidden")) { alert("Nejprve vypočítejte výčetku."); return; }
    html2canvas(node, { scale: 2, useCORS: true }).then(canvas => {
      const img = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { alert("Chybí jsPDF knihovna."); return; }
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 28;
      const w = pageWidth - margin*2;
      const h = canvas.height * (w / canvas.width);
      pdf.addImage(img, "PNG", margin, margin, w, h, undefined, "FAST");
      pdf.save("RB-TAXI-vycetka.pdf");
    }).catch(e => alert("Export do PDF selhal: " + (e && e.message ? e.message : e)));
  });

  // === SERVICE WORKER (https only) ===
  if ((location.protocol.startsWith("http")) && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js?v=v13_hardfix_20250821103429").catch(console.warn);
    });
  }
});
