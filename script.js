// ========= CSV PARSER =========
function parseCSV(text) {
  const lines = text.trim().split("\n"); // real newlines
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").trim();
    });
    return row;
  });
}

// ========= GLOBAL STATE =========
const state = {
  data: {
    ChumashNEW: [],
    Navi: [],
    Talmud: [],
    Halacha: []
  },
  benchmarks: {
    ELA: [],
    HEB: [],
    JUD13: [],
    JUDBeliefs: [],
    JUDComm: [],
    JUDHisGeo: [],
    JUDMetacognition: [],
    JUDTxt: [],
    SS: []
  }
};

// ========= INITIAL LOAD =========
window.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadTextData("ChumashNEW"),
    loadTextData("Navi"),
    loadTextData("Talmud"),
    loadHalachaData(),
    loadBenchmarks()
  ]);

  document.getElementById("textType").addEventListener("change", updateBooks);
  document.getElementById("book").addEventListener("change", updateChapters);
  document.getElementById("chapter").addEventListener("change", updateVerses);
  document.getElementById("startVerse").addEventListener("change", updateEndVerses);

  document.getElementById("saveUnit").addEventListener("click", saveUnitAsJSON);

  console.log("Loaded text rows:", {
    ChumashNEW: state.data.ChumashNEW.length,
    Navi: state.data.Navi.length,
    Talmud: state.data.Talmud.length,
    Halacha: state.data.Halacha.length
  });
});

// ========= LOADERS =========

// Chumash / Navi / Talmud
async function loadTextData(sheetName) {
  const res = await fetch(`data/${sheetName}.csv`);
  if (!res.ok) {
    console.error("Failed to load text CSV:", sheetName, res.status);
    return;
  }
  const text = await res.text();
  // EXPECT: Subject,Key Chapter,StartVerse,EndVerse,Posnack Learning Goals (TBD)[file:2]
  const rows = parseCSV(text);
  state.data[sheetName] = rows;
}

// Halacha
async function loadHalachaData() {
  const res = await fetch("data/Halacha.csv");
  if (!res.ok) {
    console.error("Failed to load Halacha CSV:", res.status);
    return;
  }
  const text = await res.text();
  // EXPECT: Content / Allocation,Key Source / Unit,Key Concept / Theme[file:2]
  const rows = parseCSV(text);
  state.data.Halacha = rows;
}

// Benchmarks – one CSV per area
async function loadBenchmarks() {
  const configs = [
    {
      file: "BenchmarksJUDAICCURRICULUM - ELA.csv",
      selectId: "benchmarkELA",
      key: "ELA"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - HEB.csv",
      selectId: "benchmarkHEB",
      key: "HEB"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUD13.csv",
      selectId: "benchmarkJUD13",
      key: "JUD13"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUDBeliefs.csv",
      selectId: "benchmarkJUDBeliefs",
      key: "JUDBeliefs"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUDComm.csv",
      selectId: "benchmarkJUDComm",
      key: "JUDComm"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUDHisGeo.csv",
      selectId: "benchmarkJUDHisGeo",
      key: "JUDHisGeo"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUDMetacognition.csv",
      selectId: "benchmarkJUDMetacognition",
      key: "JUDMetacognition"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - JUDTxt.csv",
      selectId: "benchmarkJUDTxt",
      key: "JUDTxt"
    },
    {
      file: "BenchmarksJUDAICCURRICULUM - SS.csv",
      selectId: "benchmarkSS",
      key: "SS"
    }
  ];

  for (const cfg of configs) {
    const select = document.getElementById(cfg.selectId);
    // If you haven't created that dropdown yet, skip it.
    if (!select) continue;

    const res = await fetch(`data/${cfg.file}`);
    if (!res.ok) {
      console.warn("Could not load benchmarks file:", cfg.file, res.status);
      continue;
    }

    const text = await res.text();
    // EXPECT headers similar to: Code,Benchmark (or Standard,Description)[file:1]
    const rows = parseCSV(text);
    state.benchmarks[cfg.key] = rows;

    rows.forEach(row => {
      const code = row.Code || row["Standard"] || "";
      const desc = row.Benchmark || row["Description"] || "";
      if (!code && !desc) return;
      const opt = document.createElement("option");
      opt.value = code || desc;
      opt.textContent = code ? `${code} – ${desc}` : desc;
      select.appendChild(opt);
    });
  }

  console.log("Loaded benchmarks:", {
    ELA: state.benchmarks.ELA.length,
    HEB: state.benchmarks.HEB.length,
    JUD13: state.benchmarks.JUD13.length,
    JUDBeliefs: state.benchmarks.JUDBeliefs.length,
    JUDComm: state.benchmarks.JUDComm.length,
    JUDHisGeo: state.benchmarks.JUDHisGeo.length,
    JUDMetacognition: state.benchmarks.JUDMetacognition.length,
    JUDTxt: state.benchmarks.JUDTxt.length,
    SS: state.benchmarks.SS.length
  });
}

// ========= SELECT HELPERS =========
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

// ========= DROPDOWN CHAINING =========

// Book
function updateBooks() {
  const type = document.getElementById("textType").value;
  if (!type) return;
  const rows = state.data[type];

  let books;
  if (type === "Halacha") {
    books = [...new Set(rows.map(r => r["Content / Allocation"]))].sort();
  } else {
    books = [...new Set(rows.map(r => r.Subject))].sort();
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
    chapters = [...new Set(rows.map(r => r["Key Source / Unit"]))].sort();
  } else {
    chapters = [...new Set(rows.map(r => r["Key Chapter"]))]
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
    startValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();
  } else {
    startValues = [...new Set(rows.map(r => r.StartVerse))]
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
    endValues = [...new Set(rows.map(r => r["Key Concept / Theme"]))].sort();
  } else {
    endValues = [...new Set(rows.map(r => r.EndVerse))]
      .sort((a, b) => Number(a) - Number(b));
  }

  fillSelect("endVerse", endValues);

  if (type !== "Halacha" && rows.length === 1) {
    const goal = rows[0]["Posnack Learning Goals (TBD)"] || "";
    document.getElementById("unitAim").value = goal;
  }
}

// ========= SAVE UNIT =========
function saveUnitAsJSON() {
  const unit = {
    textType: document.getElementById("textType").value,
    grade: document.getElementById("grade").value,
    book: document.getElementById("book").value,
    chapter: document.getElementById("chapter").value,
    startVerse: document.getElementById("startVerse").value,
    endVerse: document.getElementById("endVerse").value,

    benchmarkELA: document.getElementById("benchmarkELA")?.value || "",
    benchmarkHEB: document.getElementById("benchmarkHEB")?.value || "",
    benchmarkJUD13: document.getElementById("benchmarkJUD13")?.value || "",
    benchmarkJUDBeliefs: document.getElementById("benchmarkJUDBeliefs")?.value || "",
    benchmarkJUDComm: document.getElementById("benchmarkJUDComm")?.value || "",
    benchmarkJUDHisGeo: document.getElementById("benchmarkJUDHisGeo")?.value || "",
    benchmarkJUDMetacognition: document.getElementById("benchmarkJUDMetacognition")?.value || "",
    benchmarkJUDTxt: document.getElementById("benchmarkJUDTxt")?.value || "",
    benchmarkSS: document.getElementById("benchmarkSS")?.value || "",

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
