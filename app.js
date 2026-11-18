// Fabric Check — app logic

let rowCount = 0;

function detectCurrency() {
  const lang = navigator.language || "en-GB";
  const region = (lang.split("-")[1] || "").toUpperCase();
  const map = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", AE: "AED",
    FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
    IE: "EUR", PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
  };
  return map[region] || "GBP";
}

function fibreOptionsHTML(selectedKey) {
  return Object.keys(FIBRES).map((key) => {
    const f = FIBRES[key];
    const sel = key === selectedKey ? "selected" : "";
    return `<option value="${key}" ${sel}>${f.name}</option>`;
  }).join("");
}

function buildForm() {
  const app = document.getElementById("app");
  const detectedCurrency = detectCurrency();

  app.innerHTML = `
    <div class="card" id="form-card">
      <label class="field">
        <span>Currency</span>
        <select id="currency-select">
          ${Object.keys(CURRENCIES).map((code) => {
            const sel = code === detectedCurrency ? "selected" : "";
            return `<option value="${code}" ${sel}>${code} ${CURRENCIES[code].symbol}</option>`;
          }).join("")}
        </select>
      </label>

      <label class="field">
        <span>Garment type</span>
        <select id="garment-select">
          ${Object.keys(GARMENT_BASE_PRICE).map((g) => `<option value="${g}">${g}</option>`).join("")}
        </select>
      </label>

      <label class="field">
        <span>Price</span>
        <input type="number" id="price-input" min="0" step="0.01" placeholder="e.g. 90">
      </label>

      <div id="fabric-rows"></div>

      <button type="button" id="add-fabric-btn" class="secondary-btn">+ Add fabric</button>

      <div id="pct-message" class="pct-message"></div>

      <div class="scan-row">
        <button type="button" id="scan-btn" class="secondary-btn">📷 Scan</button>
        <button type="button" id="upload-btn" class="secondary-btn">📁 Upload</button>
      </div>
      <input type="file" id="scan-input" accept="image/*" capture="environment" style="display:none;">
      <input type="file" id="upload-input" accept="image/*" style="display:none;">
      <div id="scan-status" class="scan-status"></div>

      <button type="button" id="submit-btn" class="primary-btn">Is it worth it? 💸</button>
    </div>

    <div id="result-area"></div>
  `;

  addFabricRow();

  document.getElementById("add-fabric-btn").addEventListener("click", () => addFabricRow());
  document.getElementById("submit-btn").addEventListener("click", onSubmit);
  document.getElementById("scan-btn").addEventListener("click", () => {
    document.getElementById("scan-input").click();
  });
  document.getElementById("upload-btn").addEventListener("click", () => {
    document.getElementById("upload-input").click();
  });
  document.getElementById("scan-input").addEventListener("change", onScanFile);
  document.getElementById("upload-input").addEventListener("change", onScanFile);
}

function addFabricRow(fibreKey, pct) {
  rowCount++;
  const id = `fabric-row-${rowCount}`;
  const container = document.getElementById("fabric-rows");
  const row = document.createElement("div");
  row.className = "fabric-row";
  row.id = id;
  row.innerHTML = `
    <select class="fibre-select">${fibreOptionsHTML(fibreKey || "cotton")}</select>
    <input type="number" class="pct-input" min="0" max="100" step="1" value="${pct != null ? pct : ""}" placeholder="%">
    <button type="button" class="remove-row-btn" title="Remove">✕</button>
  `;
  container.appendChild(row);

  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    row.remove();
    checkPercentages();
  });
  row.querySelector(".pct-input").addEventListener("input", checkPercentages);
  checkPercentages();
}

function getFabricRows() {
  const rows = [];
  document.querySelectorAll(".fabric-row").forEach((rowEl) => {
    const fibreKey = rowEl.querySelector(".fibre-select").value;
    const pct = parseFloat(rowEl.querySelector(".pct-input").value) || 0;
    if (pct > 0) rows.push({ fibreKey, pct });
  });
  return rows;
}

function checkPercentages() {
  const rows = getFabricRows();
  const total = rows.reduce((s, r) => s + r.pct, 0);
  const msg = document.getElementById("pct-message");
  if (total === 0) {
    msg.textContent = "";
    return;
  }
  if (total < 98 || total > 102) {
    msg.textContent = `Your percentages add up to ${total}%. Double-check the label 👀`;
    msg.classList.add("visible");
  } else {
    msg.textContent = "";
    msg.classList.remove("visible");
  }
}

// ---------- The hidden maths ----------

function computeBlendScore(rows) {
  let elastanePct = 0;
  const others = [];
  rows.forEach((r) => {
    if (r.fibreKey === "elastane") elastanePct += r.pct;
    else others.push(r);
  });

  let effectiveRows;
  if (elastanePct <= 5) {
    const otherSum = others.reduce((s, r) => s + r.pct, 0);
    effectiveRows = otherSum > 0 ? others.map((r) => ({ ...r, effPct: (r.pct / otherSum) * 100 })) : [];
  } else {
    const elastaneRow = { fibreKey: "elastane", effPct: elastanePct, scoreOverride: 3 };
    effectiveRows = [...others.map((r) => ({ ...r, effPct: r.pct })), elastaneRow];
  }

  let blendScore = 0;
  effectiveRows.forEach((r) => {
    const fibre = FIBRES[r.fibreKey];
    const score = r.scoreOverride !== undefined ? r.scoreOverride : (fibre && fibre.score != null ? fibre.score : 4);
    blendScore += (r.effPct / 100) * score;
  });

  return blendScore;
}

function fairPriceRange(garmentType, blendScore, currencyCode) {
  const basePriceGBP = GARMENT_BASE_PRICE[garmentType];
  const fairMidGBP = basePriceGBP * Math.pow(1.4, blendScore - 3);
  const fairLowGBP = fairMidGBP * 0.75;
  const fairHighGBP = fairMidGBP * 1.25;

  const cur = CURRENCIES[currencyCode];
  const roundTo = cur.round;

  function convert(gbp) {
    const val = gbp * cur.rate;
    const rounded = Math.round(val / roundTo) * roundTo;
    return Math.max(rounded, roundTo);
  }

  return { low: convert(fairLowGBP), high: convert(fairHighGBP) };
}

function getVerdict(price, fairHigh) {
  if (price <= fairHigh) return "worthIt";
  if (price <= fairHigh * 1.5) return "bitPricey";
  return "label";
}

function computeWarnings(rows, garmentType) {
  const warnings = [];
  const pctOf = (keys) => rows.filter((r) => keys.includes(r.fibreKey)).reduce((s, r) => s + r.pct, 0);

  const polyesterPct = pctOf(["polyester"]);
  const acrylicPct = pctOf(["acrylic"]);
  const nylonPct = pctOf(["nylon"]);
  const elastanePct = pctOf(["elastane"]);
  const viscosePct = pctOf(["viscose"]);
  const syntheticPct = polyesterPct + acrylicPct + nylonPct;

  if (polyesterPct > 50 && ["Jumper/Cardigan", "Dress", "Top/Blouse"].includes(garmentType)) {
    warnings.push("Can feel sweaty and build up static");
  }
  if (syntheticPct > 50) {
    warnings.push("Sheds microplastics in the wash");
  }
  if (acrylicPct > 30) {
    warnings.push("Likely to pill (those little bobbles) quickly");
  }
  ["cashmere", "alpaca", "mohair"].forEach((key) => {
    const row = rows.find((r) => r.fibreKey === key);
    if (row && row.pct > 0 && row.pct < 15) {
      warnings.push(`Only ${row.pct}% ${FIBRES[key].name}. It's mainly there to sound fancy on the label`);
    }
  });
  if (viscosePct > 50) {
    warnings.push("Can shrink and is weak when wet. Wash carefully");
  }
  if (elastanePct > 5 && garmentType === "Jumper/Cardigan") {
    warnings.push("Might stretch out and lose shape over time");
  }

  const hasSynthetic = rows.some((r) => ["polyester", "acrylic", "nylon", "elastane"].includes(r.fibreKey) && r.pct > 0);
  const isAllNatural = !hasSynthetic && rows.length > 0;

  return { warnings, isAllNatural };
}

function getCareText(rows) {
  let best = null;
  rows.forEach((r) => {
    const f = FIBRES[r.fibreKey];
    if (f && f.careRank != null && r.pct > 0) {
      if (best === null || f.careRank < best.careRank) best = f;
    }
  });
  return best ? best.care : "Check the label";
}

function buildExplanation(rows, garmentType, price, verdict, fairLow, fairHigh, symbol) {
  const sorted = [...rows].sort((a, b) => b.pct - a.pct);
  const top = sorted[0];
  const topFibre = FIBRES[top.fibreKey] || { name: top.fibreKey, oneLiner: "an unrecognised fabric", tier: "Okay" };

  let sentence1;
  if (rows.length === 1) {
    sentence1 = `This ${garmentType.toLowerCase()} is 100% ${topFibre.name}, ${topFibre.oneLiner}.`;
  } else {
    const second = sorted[1];
    const secondFibre = second ? (FIBRES[second.fibreKey] || { name: second.fibreKey }) : null;
    sentence1 = secondFibre
      ? `This ${garmentType.toLowerCase()} is mostly ${topFibre.name} (${top.pct}%) with ${secondFibre.name} (${second.pct}%).`
      : `This ${garmentType.toLowerCase()} is mostly ${topFibre.name} (${top.pct}%).`;
  }

  let sentence2;
  if (verdict === "worthIt") {
    sentence2 = `${symbol}${price} is a solid price for this fabric.`;
  } else if (verdict === "bitPricey") {
    sentence2 = `It's decent fabric, but ${symbol}${price} is a little high. Some of that is brand tax.`;
  } else {
    sentence2 = `At ${symbol}${price}, you're mostly paying for the brand name, not the fabric.`;
  }

  let sentence3 = "";
  if (verdict === "label" && topFibre.tier === "Budget") {
    sentence3 = " For this price you could get wool or even cashmere.";
  }

  return sentence1 + " " + sentence2 + sentence3;
}

function onSubmit() {
  const rows = getFabricRows();
  if (rows.length === 0) {
    alert("Add at least one fabric first 🙂");
    return;
  }

  const garmentType = document.getElementById("garment-select").value;
  const currencyCode = document.getElementById("currency-select").value;
  const priceRaw = parseFloat(document.getElementById("price-input").value);
  if (!priceRaw || priceRaw <= 0) {
    alert("Pop in the price first 🙂");
    return;
  }

  const symbol = CURRENCIES[currencyCode].symbol;
  const blendScore = computeBlendScore(rows);
  const { low: fairLow, high: fairHigh } = fairPriceRange(garmentType, blendScore, currencyCode);
  const verdict = getVerdict(priceRaw, fairHigh);
  const { warnings, isAllNatural } = computeWarnings(rows, garmentType);
  const care = getCareText(rows);
  const explanation = buildExplanation(rows, garmentType, priceRaw, verdict, fairLow, fairHigh, symbol);

  renderResult({ rows, garmentType, price: priceRaw, symbol, verdict, warnings, isAllNatural, care, explanation, fairLow, fairHigh });
}

const VERDICT_LABELS = {
  worthIt: "✨ Worth it",
  bitPricey: "🤔 A bit pricey",
  label: "🚩 You're paying for the label",
};

function renderResult(data) {
  const { rows, garmentType, price, symbol, verdict, warnings, isAllNatural, care, explanation, fairLow, fairHigh } = data;

  const barSegments = rows.map((r) => {
    const fibre = FIBRES[r.fibreKey] || { name: r.fibreKey, tier: "Okay" };
    const color = TIER_COLORS[fibre.tier] || TIER_COLORS.Okay;
    return `<div class="bar-segment" style="width:${r.pct}%; background:${color};" title="${fibre.name} ${r.pct}%"></div>`;
  }).join("");

  const legend = rows.map((r) => {
    const fibre = FIBRES[r.fibreKey] || { name: r.fibreKey, tier: "Okay", oneLiner: "an unrecognised fabric" };
    const emoji = TIER_EMOJI[fibre.tier] || "⬜";
    return `<div class="legend-row"><span>${emoji} ${fibre.name} — ${r.pct}%</span><span class="legend-note">${fibre.oneLiner}</span></div>`;
  }).join("");

  const warningsHTML = warnings.length
    ? `<div class="warnings"><strong>⚠️ Heads up</strong><ul>${warnings.map((w) => `<li>${w}</li>`).join("")}</ul></div>`
    : "";
  const naturalHTML = isAllNatural ? `<div class="all-natural">✅ 100% natural fibres</div>` : "";

  const resultArea = document.getElementById("result-area");
  resultArea.innerHTML = `
    <div class="card result-card" id="result-card">
      <div class="result-title">💸 ${symbol}${price} ${garmentType.toUpperCase()}</div>

      <div class="bar">${barSegments}</div>
      <div class="legend">${legend}</div>

      <div class="verdict v-${verdict}">${VERDICT_LABELS[verdict]}</div>
      <p class="explanation">${explanation}</p>

      ${naturalHTML}
      ${warningsHTML}

      <div class="care">🧺 Care: ${care}</div>
      <div class="fair-price">💡 Fair price for this fabric: ${symbol}${fairLow}–${symbol}${fairHigh}</div>
    </div>

    <div class="result-actions">
      <button type="button" id="reset-btn" class="secondary-btn">Check another</button>
      <button type="button" id="save-image-btn" class="secondary-btn">📥 Save as image</button>
    </div>
  `;

  document.getElementById("reset-btn").addEventListener("click", buildForm);
  document.getElementById("save-image-btn").addEventListener("click", saveResultAsImage);

  resultArea.scrollIntoView({ behavior: "smooth" });
}

function saveResultAsImage() {
  const node = document.getElementById("result-card");
  if (!node || typeof html2canvas === "undefined") return;
  html2canvas(node, { backgroundColor: "#ffffff", scale: 2 }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "fabric-check.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

// ---------- Scan the tag ----------

function onScanFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const status = document.getElementById("scan-status");
  status.textContent = "Reading your tag… 🔍";

  if (typeof Tesseract === "undefined") {
    status.textContent = "Couldn't read that one 😅 Try a clearer photo or type it in.";
    return;
  }

  Tesseract.recognize(file, "eng")
    .then(({ data: { text } }) => {
      const { rows: found, skippedSecondary } = parseFabricText(text);
      if (found.length === 0) {
        status.textContent = "Couldn't read that one 😅 Try a clearer photo or type it in.";
        return;
      }

      document.getElementById("fabric-rows").innerHTML = "";
      found.forEach((f) => addFabricRow(f.fibreKey, f.pct));
      const foundList = found.map((f) => `${f.pct}% ${FIBRES[f.fibreKey].name}`).join(", ");
      const note = skippedSecondary ? " (ignored the lining — that's not what you're paying for)" : "";
      status.textContent = `Found: ${foundList}.${note} Check it looks right 👀`;
    })
    .catch(() => {
      status.textContent = "Couldn't read that one 😅 Try a clearer photo or type it in.";
    });
}

// Tags often list more than one fabric section (e.g. "Shell: ..." and "Lining: ...").
// Each section is its own 100% — they must not be merged into one blend.
const PRIMARY_SECTION_LABELS = [/\bshell\b\s*:?/gi, /\bouter\s*(?:shell|fabric)?\b\s*:?/gi, /\bface\s*fabric\b\s*:?/gi, /\bmain\s*fabric\b\s*:?/gi, /\bbody\b\s*:?/gi];
const SECONDARY_SECTION_LABELS = [/\blining\b\s*:?/gi, /\bfilling\b\s*:?/gi, /\bpadding\b\s*:?/gi, /\bwadding\b\s*:?/gi, /\binterlining\b\s*:?/gi, /\bpocket(?:ing)?\b\s*:?/gi, /\btrim\b\s*:?/gi];

function findSectionLabels(text) {
  const matches = [];
  PRIMARY_SECTION_LABELS.forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) matches.push({ index: m.index, end: m.index + m[0].length, type: "primary" });
  });
  SECONDARY_SECTION_LABELS.forEach((re) => {
    let m;
    while ((m = re.exec(text)) !== null) matches.push({ index: m.index, end: m.index + m[0].length, type: "secondary" });
  });
  matches.sort((a, b) => a.index - b.index);
  return matches;
}

// Returns { text, skippedSecondary } — the text to actually read fibres from.
function extractPrimaryFabricText(text) {
  const labels = findSectionLabels(text);
  if (labels.length === 0) return { text, skippedSecondary: false };

  const segments = labels.map((label, i) => ({
    type: label.type,
    text: text.slice(label.end, i + 1 < labels.length ? labels[i + 1].index : text.length),
  }));

  const primarySegments = segments.filter((s) => s.type === "primary");
  const hasSecondary = segments.some((s) => s.type === "secondary");

  if (primarySegments.length > 0) {
    return { text: primarySegments.map((s) => s.text).join(" "), skippedSecondary: hasSecondary };
  }

  // No section is explicitly labelled "Shell"/"Outer"/etc, but a secondary one exists —
  // assume whatever comes before it is the main fabric.
  const firstSecondary = labels.find((l) => l.type === "secondary");
  return { text: text.slice(0, firstSecondary.index), skippedSecondary: true };
}

function parseFabricText(rawText) {
  const { text, skippedSecondary } = extractPrimaryFabricText(rawText);
  const found = [];
  const seenKeys = new Set();

  Object.keys(FIBRES).forEach((key) => {
    const fibre = FIBRES[key];
    fibre.aliases.forEach((alias) => {
      if (seenKeys.has(key)) return;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Matches "80% cotton", "cotton 80%", "80 % COTTON"
      const patterns = [
        new RegExp(`(\\d{1,3})\\s*%\\s*${escaped}\\b`, "i"),
        new RegExp(`\\b${escaped}\\s*(\\d{1,3})\\s*%`, "i"),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const pct = parseInt(match[1], 10);
          if (pct > 0 && pct <= 100) {
            found.push({ fibreKey: key, pct });
            seenKeys.add(key);
          }
          break;
        }
      }
    });
  });

  return { rows: found, skippedSecondary };
}

// ---------- Boot ----------

buildForm();
