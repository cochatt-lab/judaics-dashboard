// Simple CSV parser: returns array of objects keyed by header row
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
});

async function loadTextData(sheetName) {
  const res = await fetch(`data/${sheetName}.csv`);
  const text = await res.text();
  // EXPECT: Subject,Key Chapter,StartVerse,EndVerse,Posnack Learning Goals (TBD)[file:2]
  const rows = parseCSV(text);
  state.data[sheetName] = rows;
}

async function loadHalachaData() {
  const res = await fetch("data/Halacha.csv");
  const text = await res.text();
  // EXPECT: Content / Allocation,Key Source / Unit,Key Concept / Theme[file:2]
  const rows = parseCSV(text);
  state.data.Halacha = rows;
}

async function loadBenchmarks() {
  const res = await fetch("data/BenchmarksJUDAICCURRICULUM.csv");
  const text = await res.text();
  // Recommended: Code,Benchmark (rename headers in Excel if needed)[file:1]
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

// Utility to fill a <select>
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

// Dropdown 4: Book
function updateBooks() {
  const type = document.getElementById("textType").value;
  if (!type) return;
  const rows = state.data[type];

  let books;
  if (type === "Halacha") {
    // Use Content / Allocation as "Book"[file:2]
    books = [...new Set(rows.map(r => r["Content / Allocation"]))].sort();
  } else {
    // Chumash/Navi/Talmud: Subject as Book[file:2]
    books = [...new Set(rows.map(r => r.Subject))].sort();
  }

  fillSelect("book", books);
  fillSelect("chapter", []);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

// Dropdown 5: Chapter
function updateChapters() {
  const type = document.getElementById("textType").value;
  const book = document.getElementById("book").value;
  if (!type || !book) return;

  const rows = state.data[type].filter(r => {
    if (type === "Halacha") {
      return r["Content / Allocation"] === book;
    } else {
      return r.Subject === book;
    }
  });

  let chapters;
  if (type === "Halacha") {
    // Use Key Source / Unit as "Chapter"[file:2]
    chapters = [...new Set(rows.map(r => r["Key Source / Unit"]))].sort();
  } else {
    // Use Key Chapter as Chapter[file:2]
    chapters = [...new Set(rows.map(r => r["Key Chapter"]))].sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("chapter", chapters);
  fillSelect("startVerse", []);
  fillSelect("endVerse", []);
}

// Dropdown 6: StartVerse
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
    // Use Key Concept / Theme as StartVerse equivalent[file:2]
    startValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();
  } else {
    startValues = [...new Set(rows.map(r => r.StartVerse))].sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("startVerse", startValues);
  fillSelect("endVerse", []);
}

// Dropdown 7: EndVerse, plus Posnack Learning Goals autofill for Chumash/Navi/Talmud
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
    // No separate EndVerse; reuse Key Concept / Theme or keep single choice[file:2]
    endValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();
  } else {
    endValues = [...new Set(rows.map(r => r.EndVerse))].sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("endVerse", endValues);

  // Only Chumash/Navi/Talmud have Posnack Learning Goals column E in these sheets[file:2]
  if (type !== "Halacha" && rows.length === 1) {
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
