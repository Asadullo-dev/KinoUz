// ===== Sozlamalar =====
const API = "https://dummyjson.com/c/522f-65ae-47d1-80ea";
const MOVIES_KEY = "kinouz_movies";
const ADMIN_PASSWORD = "1234";

// ===== Holat =====
let movies = [];
let editId = null;

// ===== Elementlar =====
const list = document.querySelector("#list");

function $(selector) {
  return document.querySelector(selector);
}

// ===== Yordamchi funksiyalar =====
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function normalizeList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (data && Array.isArray(data.movies)) arr = data.movies;
  else if (data && Array.isArray(data.data)) arr = data.data;

  return arr.map(function (m, i) {
    return {
      id: m.id != null ? m.id : "m" + i,
      title: String(m.title || m.name || ""),
      year: m.year || "",
      genre: m.genre || "",
      rating: Number(m.rating) || 0,
      img: m.img || m.poster || m.image || "",
      video: m.video || "",
      preview: m.preview || ""
    };
  });
}

function readLocalMovies() {
  try {
    const raw = localStorage.getItem(MOVIES_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch (err) {
    return null;
  }
}

function persist() {
  try {
    localStorage.setItem(MOVIES_KEY, JSON.stringify(movies));
  } catch (err) {
    alert("Saqlashda xato: " + err.message);
  }
}

function sameId(a, b) {
  return String(a) === String(b);
}

// ===== Login =====
function login() {
  const password = $("#password").value;

  if (password === ADMIN_PASSWORD) {
    $("#loginBox").style.display = "none";
    $("#adminBox").style.display = "block";
    $("#error").textContent = "";
    loadMovies();
  } else {
    $("#error").textContent = "Parol xato!";
  }
}

// ===== Ma'lumotni yuklash =====
async function loadMovies() {
  const local = readLocalMovies();
  if (local) {
    movies = normalizeList(local);
    showList();
    return;
  }

  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    movies = normalizeList(await res.json());
  } catch (err) {
    console.error("Yuklashda xato:", err);
    movies = [];
    alert("Serverdan ma'lumot olinmadi: " + err.message);
  }

  showList();
}

// ===== Ro'yxatni chiqarish =====
function showList() {
  if (movies.length === 0) {
    list.innerHTML = "<p>Kinolar yo'q</p>";
    return;
  }

  list.innerHTML = movies.map(function (m) {
    return `
      <div class="movie-row">
        <img src="${esc(m.img)}" alt="">
        <span>${esc(m.title)} (${esc(m.year)})</span>
        <div>
          <button class="edit-btn" type="button" data-action="edit" data-id="${esc(m.id)}">Tahrirlash</button>
          <button type="button" data-action="delete" data-id="${esc(m.id)}">O'chirish</button>
        </div>
      </div>
    `;
  }).join("");
}

list.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.dataset.action === "edit") editMovie(id);
  if (btn.dataset.action === "delete") deleteMovie(id);
});

// ===== Formadan ma'lumot olish va tekshirish =====
function getForm() {
  const preview = $("#preview");

  return {
    title: $("#title").value.trim(),
    year: Number($("#year").value),
    genre: $("#genre").value.trim(),
    rating: Number($("#rating").value),
    img: $("#img").value.trim(),
    video: $("#video").value.trim(),
    preview: preview ? preview.value.trim() : ""
  };
}

function validate(data) {
  if (!data.title) return "Kino nomini kiriting";
  if (!data.year) return "Yilni kiriting";
  if (!data.genre) return "Janrini kiriting";
  if (data.rating < 0 || data.rating > 10) return "Reyting 0 dan 10 gacha bo'lishi kerak";
  if (!data.img) return "Rasm linkini kiriting";
  return null;
}

// ===== Qo'shish yoki saqlash =====
function saveMovie() {
  const data = getForm();
  const error = validate(data);

  if (error) {
    alert(error);
    return;
  }

  if (editId === null) {
    movies.push(Object.assign({ id: Date.now() }, data));
    alert("Yangi kino qo'shildi ✅");
  } else {
    movies = movies.map(function (m) {
      return sameId(m.id, editId) ? Object.assign({}, m, data, { id: m.id }) : m;
    });
    alert("Kino saqlandi ✅");
  }

  persist();
  clearForm();
  showList();
}

// ===== Tahrirlash uchun formani to'ldirish =====
function editMovie(id) {
  const movie = movies.find(function (m) {
    return sameId(m.id, id);
  });
  if (!movie) return;

  $("#title").value = movie.title;
  $("#year").value = movie.year;
  $("#genre").value = movie.genre;
  $("#rating").value = movie.rating;
  $("#img").value = movie.img;
  $("#video").value = movie.video;

  const preview = $("#preview");
  if (preview) preview.value = movie.preview || "";

  editId = movie.id;
  $("#formTitle").textContent = "Kinoni tahrirlash";
  $("#saveBtn").textContent = "Saqlash";
  $("#cancelBtn").style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== O'chirish =====
function deleteMovie(id) {
  if (!confirm("Kinoni o'chirasizmi?")) return;

  movies = movies.filter(function (m) {
    return !sameId(m.id, id);
  });

  if (editId !== null && sameId(editId, id)) {
    clearForm();
  }

  persist();
  showList();
}

// ===== Formani tozalash =====
function clearForm() {
  $("#title").value = "";
  $("#year").value = "";
  $("#genre").value = "";
  $("#rating").value = "";
  $("#img").value = "";
  $("#video").value = "";

  const preview = $("#preview");
  if (preview) preview.value = "";

  editId = null;
  $("#formTitle").textContent = "Yangi kino qo'shish";
  $("#saveBtn").textContent = "Qo'shish";
  $("#cancelBtn").style.display = "none";
}

// ===== Qayta yuklash =====
function resetMovies() {
  if (!confirm("Lokal o'zgarishlar o'chirilib, serverdagi ro'yxat yuklansinmi?")) return;

  try {
    localStorage.removeItem(MOVIES_KEY);
  } catch (err) {
    console.error(err);
  }

  clearForm();
  loadMovies();
}

// ===== Ishga tushirish =====
if (window.AOS) AOS.init();

$("#password").addEventListener("keydown", function (e) {
  if (e.key === "Enter") login();
});