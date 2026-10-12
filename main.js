const K = "tugas-saya-v1",
  PR = { Wajib: 0, Sedang: 1, Aman: 2 },
  $ = (id) => document.getElementById(id);
let T = [],
  editId = null;
const ymd = (x) =>
  x.getFullYear() +
  "-" +
  String(x.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(x.getDate()).padStart(2, "0");
const wk = (d) => {
  const x = new Date(d || Date.now());
  x.setHours(12);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return ymd(x);
};
const addW = (k, n) => {
  const x = new Date(k + "T12:00");
  x.setDate(x.getDate() + 7 * n);
  return ymd(x);
};
const esc = (s) =>
  String(s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const fmt = (d) => (d ? d.split("-").reverse().join("/") : "");
try {
  T = JSON.parse(localStorage.getItem(K) || "[]");
} catch (e) {
  T = [];
}
const store = () => {
  try {
    localStorage.setItem(K, JSON.stringify(T));
  } catch (e) {}
};
function rollover() {
  const cur = wk();
  T.forEach((t) => {
    if (t.type !== "weekly") return;
    t.hist = t.hist || {};
    if (!t.week) {
      t.week = cur;
      return;
    }
    if (t.week < cur) {
      t.hist[t.week] = t.status === "Selesai";
      let w = addW(t.week, 1);
      while (w < cur) {
        t.hist[w] = false;
        w = addW(w, 1);
      }
      t.week = cur;
      t.status = "Belum";
    }
  });
  store();
}
function openForm(id) {
  editId = id || null;
  const t = T.find((x) => x.id === id) || {
    type: "once",
    prio: "Wajib",
    status: "Belum",
  };
  $("dt").textContent = id ? "Edit tugas" : "Tugas baru";
  $("fTitle").value = t.title || "";
  $("fType").value = t.type;
  $("fCat").value = t.cat || "";
  $("fPrio").value = t.prio;
  $("fSt").value = t.status;
  $("fDue").value = t.due || "";
  $("fNote").value = t.note || "";
  $("dlg").showModal();
}
function save() {
  const title = $("fTitle").value.trim();
  if (!title) {
    $("fTitle").focus();
    return;
  }
  const d = {
    title,
    type: $("fType").value,
    cat: $("fCat").value.trim(),
    prio: $("fPrio").value,
    status: $("fSt").value,
    due: $("fDue").value,
    note: $("fNote").value.trim(),
  };
  if (editId) {
    const t = T.find((x) => x.id === editId);
    Object.assign(t, d);
    if (t.type === "weekly") {
      t.hist = t.hist || {};
      t.week = t.week || wk();
    }
  } else {
    T.push({
      id: Date.now().toString(36),
      hist: {},
      week: d.type === "weekly" ? wk() : null,
      ...d,
    });
  }
  store();
  $("dlg").close();
  render();
}
function del(id) {
  const t = T.find((x) => x.id === id);
  if (confirm('Hapus "' + t.title + '"? Riwayatnya ikut terhapus.')) {
    T = T.filter((x) => x.id !== id);
    store();
    render();
  }
}
function tog(id) {
  const t = T.find((x) => x.id === id);
  t.status = t.status === "Selesai" ? "Belum" : "Selesai";
  store();
  render();
}
function setSt(id, v) {
  T.find((x) => x.id === id).status = v;
  store();
  render();
}
function histHtml(t) {
  const cur = wk(),
    ks = [];
  for (let i = 7; i >= 0; i--) ks.push(addW(cur, -i));
  const first = (t.week && Object.keys(t.hist).sort()[0]) || cur;
  const done = Object.values(t.hist).filter(Boolean).length,
    tot = Object.keys(t.hist).length;
  const sq = ks
    .map((k) => {
      let c = "sq";
      if (k === cur) c += " c" + (t.status === "Selesai" ? " y" : "");
      else if (k in t.hist) c += t.hist[k] ? " y" : " n";
      return `<span class="${c}" title="Minggu ${fmt(k)}"></span>`;
    })
    .join("");
  return `<div class="hist">${sq}<span>&nbsp;Riwayat: ${done}/${tot} minggu selesai</span></div>`;
}
function render() {
  const cats = [...new Set(T.map((t) => t.cat).filter(Boolean))].sort();
  const fc = $("fC"),
    cv = fc.value;
  fc.innerHTML =
    '<option value="">Semua kategori</option>' +
    cats.map((c) => `<option>${esc(c)}</option>`).join("");
  fc.value = cats.includes(cv) ? cv : "";
  $("cats").innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join("");
  const today = ymd(new Date());
  let L = T.filter(
    (t) =>
      (!$("fT").value || t.type === $("fT").value) &&
      (!fc.value || t.cat === fc.value) &&
      (!$("fS").value || t.status === $("fS").value),
  );
  L.sort(
    (a, b) =>
      (a.status === "Selesai") - (b.status === "Selesai") ||
      PR[a.prio] - PR[b.prio] ||
      (a.due || "9").localeCompare(b.due || "9"),
  );
  const w = T.filter((t) => t.type === "weekly"),
    wd = w.filter((t) => t.status === "Selesai").length;
  $("sum").textContent =
    `Minggu ini (mulai ${fmt(wk())}): tugas mingguan ${wd}/${w.length} selesai · semua tugas ${T.filter((t) => t.status === "Selesai").length}/${T.length} selesai`;
  $("list").innerHTML = L.length
    ? L.map((t) => {
        const late = t.due && t.due < today && t.status !== "Selesai";
        return `<div class="card ${t.status === "Selesai" ? "done" : ""}"><input type="checkbox" ${t.status === "Selesai" ? "checked" : ""} onchange="tog('${t.id}')">
  <div class="body"><div class="t">${esc(t.title)}</div>
  <div class="tags"><span class="tag p-${t.prio}">${t.prio}</span><span class="tag">${t.type === "weekly" ? "🔁 Mingguan" : "1× Sekali"}</span>${t.cat ? `<span class="tag">${esc(t.cat)}</span>` : ""}${t.due ? `<span class="tag ${late ? "late" : ""}">⏰ ${fmt(t.due)}${late ? " (lewat)" : ""}</span>` : ""}
  <select onchange="setSt('${t.id}',this.value)" style="padding:1px 6px;font-size:12px">${["Belum", "Proses", "Diblokir", "Selesai"].map((s) => `<option ${s === t.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
  ${t.note ? `<div class="note">${esc(t.note)}</div>` : ""}${t.type === "weekly" ? histHtml(t) : ""}</div>
  <div class="acts"><button onclick="openForm('${t.id}')">Edit</button><button onclick="del('${t.id}')">Hapus</button></div></div>`;
      }).join("")
    : '<div class="empty">Belum ada tugas. Klik "+ Tambah tugas".</div>';
}
rollover();
render();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    rollover();
    render();
  }
});
function openBackup() {
  $("bk").value = "";
  $("bkMsg").textContent = "";
  $("dlg2").showModal();
}
function bkCopy() {
  const s = JSON.stringify(T);
  $("bk").value = s;
  $("bk").select();
  Promise.resolve()
    .then(() => navigator.clipboard.writeText(s))
    .then(() => {
      $("bkMsg").textContent = "Data disalin. Tempel di perangkat lain.";
    })
    .catch(() => {
      $("bkMsg").textContent =
        "Salin manual: tekan lama teks di kotak, pilih Pilih semua lalu Salin.";
    });
}
function bkLoad() {
  try {
    const a = JSON.parse($("bk").value.trim());
    if (!Array.isArray(a) || a.some((x) => !x || !x.title)) throw 0;
    if (
      !confirm(
        "Ganti semua tugas di perangkat ini dengan " +
          a.length +
          " tugas dari teks ini?",
      )
    )
      return;
    T = a;
    store();
    rollover();
    render();
    $("dlg2").close();
  } catch (e) {
    $("bkMsg").textContent =
      "Teks tidak valid. Pastikan disalin utuh, tanpa ada yang terpotong.";
  }
}
