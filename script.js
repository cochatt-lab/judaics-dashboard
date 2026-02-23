// -------- CSV PARSER --------
function parseCSV(text) {
  const lines = text.trim().split("\n");        // split on real newlines
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || "").trim());
    return row;
  });
}

// -------- GLOBAL STATE --------
const state = {
  data: {
    ChumashNEW: [],
    Navi: [],
    Talmud: [],
    Halacha: []
  },
  benchmarks: []
};

// -------- INITIAL LOAD --------
window.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadTextData("ChumashNEW"),   // Subject,Key Chapter,StartVerse,EndVerse,Posnack Learning Goals (TBD)[file:2]
    loadTextData("Navi"),
    loadTextData("Talmud"),
    loadHalachaData(),           // Content / Allocation,Key Source / Unit,Key Concept / Theme[file:2]
    loadBenchmarks()
  ]);

  document.getElementById("textType").addEventListener("change", updateBooks);
  document.getElementById("book").addEventListener("change", updateChapters);
  document.getElementById("chapter").addEventListener("change", updateVerses);
  document.getElementById("startVerse").addEventListener("change", updateEndVerses);

  document.getElementById("saveUnit").addEventListener("click", saveUnitAsJSON);

  // OPTIONAL: quick debug
  console.log("Loaded data:", {
    ChumashNEW: state.data.ChumashNEW.length,
    Navi: state.data.Navi.length,
    Talmud: state.data.Talmud.length,
    Halacha: state.data.Halacha.length,
    Benchmarks: state.benchmarks.length
  });
});

// -------- LOADERS --------
async function loadTextData(sheetName) {
  const res = await fetch(`data/${sheetName}.csv`);
  const text = await res.text();
  // EXPECT headers: Subject,Key Chapter,StartVerse,EndVerse,Posnack Learning Goals (TBD)[file:2]
  const rows = parseCSV(text);
  state.data[sheetName] = rows;
}

async function loadHalachaData() {
  const res = await fetch("data/Halacha.csv");
  const text = await res.text();
  // EXPECT headers: Content / Allocation,Key Source / Unit,Key Concept / Theme[file:2]
  const rows = parseCSV(text);
  state.data.Halacha = rows;
}

async function loadBenchmarks() {
  const res = await fetch("data/BenchmarksJUDAICCURRICULUM.csv");
  const text = await res.text();
  // Recommended headers: Code,Benchmark[file:1]
  const rows = parseCSV(text);
  state.benchmarks = rows;

  const select = document.getElementById("benchmark");
  rows.forEach(row => {
    const code = row.Code || "";
    const desc = row.Benchmark || "";
    if (!code && !desc) return;
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code ? `${code} – ${desc}` : desc;
    select.appendChild(opt);
  });
}

// -------- SELECT HELPERS --------
function fillSelect(selectId, items) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Select...";
  select.appendChild(blank);
  items.forEach(item => {
    if (!item) return;
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

// -------- DROPDOWN CHAINING --------

// Book
function updateBooks() {
  const type = document.getElementById("textType").value;
  if (!type) return;
  const rows = state.data[type];

  let books;
  if (type === "Halacha") {
    books = [...new Set(rows.map(r => r["Content / Allocation"]))].sort();      // Halacha[file:2]
  } else {
    books = [...new Set(rows.map(r => r.Subject))].sort();                      // Chumash/Navi/Talmud[file:2]
  }

  fillSelect("book", books);
  fillSelect("chapter", []);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

// Chapter
function updateChapters() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  if (!type || !book) return;

  const rows = state.data[type].filter(r =>
    type === "Halacha"
      ? r["Content / Allocation"] === book
      : r.Subject === book
  );

  let chapters;
  if (type === "Halacha") {
    chapters = [...new Set(rows.map(r => r["Key Source / Unit"]))].sort();     // Halacha[file:2]
  } else {
    chapters = [...new Set(rows.map(r => r["Key Chapter"]))]                   // Chumash/Navi/Talmud[file:2]
      .sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("chapter", chapters);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

// StartVerse
function updateVerses() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  const chapter = document.getElementById("chapter").value;
  if (!type || !book || !chapter) return;

  const rows = state.data[type].filter(r => {
    if (type === "Halacha") {
      return r["Content / Allocation"] === book &&
             r["Key Source / Unit"] === chapter;
    } else {
      return r.Subject === book &&
             String(r["Key Chapter"]) === String(chapter);
    }
  });

  let startValues;
  if (type === "Halacha") {
    startValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();   // Halacha[file:2]
  } else {
    startValues = [...new Set(rows.map(r => r.StartVerse))]                        // Chumash/Navi/Talmud[file:2]
      .sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("startVerse", startValues);
  fillSelect("endVerse", []);
}

// EndVerse + auto‑fill Posnack goals
function updateEndVerses() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  const chapter = document.getElementById("chapter").value;
  const startVal = document.getElementById("startVerse").value;
  if (!type || !book || !chapter || !startVal) return;

  const rows = state.data[type].filter(r => {
    if (type === "Halacha") {
      return r["Content / Allocation"] === book &&
             r["Key Source / Unit"] === chapter &&
             r["Key Concept / Theme"] === startVal;
    } else {
      return r.Subject === book &&
             String(r["Key Chapter"]) === String(chapter) &&
             String(r.StartVerse) === String(startVal);
    }
  });

  let endValues;
  if (type === "Halacha") {
    endValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();    // reuse concept[file:2]
  } else {
    endValues = [...new Set(rows.map(r => r.EndVerse))]                           // Chumash/Navi/Talmud[file:2]
      .sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("endVerse", endValues);

  if (type !== "Halacha" && rows.length === 1) {
    const goal = rows[0]["Posnack Learning Goals (TBD)"] || "";                  // column E[file:2]
    document.getElementById("unitAim").value = goal;
  }
}

// -------- SAVE UNIT --------
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
