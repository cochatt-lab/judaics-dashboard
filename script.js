// Simple CSV parser
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || "").trim());
    return row;
  });
}

const state = {
  data: {
    ChumashNEW: [],
    Navi: [],
    Talmud: [],
    Halacha: []
  },
  benchmarks: []
};

window.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadTextData("ChumashNEW"),   // from RShlomieVision Chumash sheet export[file:2]
    loadTextData("Navi"),
    loadTextData("Talmud"),
    loadTextData("Halacha"),
    loadBenchmarks()
  ]);

  document.getElementById("textType").addEventListener("change", updateBooks);
  document.getElementById("book").addEventListener("change", updateChapters);
  document.getElementById("chapter").addEventListener("change", updateVerses);
  document.getElementById("startVerse").addEventListener("change", updateEndVerses);

  document.getElementById("saveUnit").addEventListener("click", saveUnitAsJSON);
});

async function loadTextData(sheetName) {
  const res = await fetch(`data/${sheetName}.csv`);
  const text = await res.text();
  // expects: Subject,Key Chapter,StartVerse,EndVerse,Posnack Learning Goals (TBD)[file:2]
  const rows = parseCSV(text);
  state.data[sheetName] = rows;
}

async function loadBenchmarks() {
  const res = await fetch("data/BenchmarksJUDAICCURRICULUM.csv");
  const text = await res.text();
  // expects something like: Area,Code,Benchmark (you can adjust to actual headers)[file:1]
  const rows = parseCSV(text);
  state.benchmarks = rows;
  const select = document.getElementById("benchmark");
  rows.forEach(row => {
    const code = row.Code || row["Standard"] || "";
    const desc = row.Benchmark || row["Description"] || "";
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} – ${desc}`;
    select.appendChild(opt);
  });
}

function fillSelect(selectId, items) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Select...";
  select.appendChild(blank);
  items.forEach(item => {
    if (item === undefined || item === null || item === "") return;
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

function updateBooks() {
  const type = document.getElementById("textType").value;
  if (!type) return;
  const rows = state.data[type];
  const books = [...new Set(rows.map(r => r.Subject || r.Book))].sort();
  fillSelect("book", books);
  fillSelect("chapter", []);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

function updateChapters() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  if (!type || !book) return;
  const rows = state.data[type].filter(r => (r.Subject || r.Book) === book);
  const chapters = [...new Set(rows.map(r => r["Key Chapter"] || r.Chapter))]
    .sort((a, b) => Number(a) - Number(b));
  fillSelect("chapter", chapters);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

function updateVerses() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  const chapter = document.getElementById("chapter").value;
  if (!type || !book || !chapter) return;
  const rows = state.data[type].filter(r =>
    (r.Subject || r.Book) === book &&
    (r["Key Chapter"] || r.Chapter) === chapter
  );
  const startVerses = [...new Set(rows.map(r => r.StartVerse))]
    .sort((a, b) => Number(a) - Number(b));
  fillSelect("startVerse", startVerses);
  fillSelect("endVerse", []);
}

function updateEndVerses() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  const chapter = document.getElementById("chapter").value;
  const startVerse = document.getElementById("startVerse").value;
  if (!type || !book || !chapter || !startVerse) return;
  const rows = state.data[type].filter(r =>
    (r.Subject || r.Book) === book &&
    (r["Key Chapter"] || r.Chapter) === chapter &&
    String(r.StartVerse) === String(startVerse)
  );
  const endVerses = [...new Set(rows.map(r => r.EndVerse))]
    .sort((a, b) => Number(a) - Number(b));
  fillSelect("endVerse", endVerses);

  // Optional: auto-fill Posnack Learning Goals into Unit Aim
  if (rows.length === 1) {
    const goal = rows[0]["Posnack Learning Goals (TBD)"] || "";
    document.getElementById("unitAim").value = goal;
  }
}

// Save current unit as JSON download
function saveUnitAsJSON() {
  const unit = {
    textType: document.getElementById("textType").value,
    grade: document.getElementById("grade").value,
    book: document.getElementById("book").value,
    chapter: document.getElementById("chapter").value,
    startVerse: document.getElementById("startVerse").value,
    endVerse: document.getElementById("endVerse").value,
    benchmarkCode: document.getElementById("benchmark").value,
    unitAim: document.getElementById("unitAim").value,
    unitOutline: document.getElementById("unitOutline").value,
    unitKeywords: document.getElementById("unitKeywords").value,
    unitOutcomes: document.getElementById("unitOutcomes").value,
    unitSkills: document.getElementById("unitSkills").value,
    unitLevels: document.getElementById("unitLevels").value,
    unitHot: document.getElementById("unitHot").value,
    unitLifeLessons: document.getElementById("unitLifeLessons").value,
    unitResources: document.getElementById("unitResources").value,
    unitDiff: document.getElementById("unitDiff").value,
    unitLessons: document.getElementById("unitLessons").value,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(unit, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = `${unit.textType || "Unit"}-${unit.book || ""}-${unit.chapter || ""}`
    .replace(/[^a-z0-9\-]+/gi, "_");
  a.href = url;
  a.download = `${safeTitle || "unit"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
