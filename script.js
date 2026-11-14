// ===== Sozlamalar =====
const API = "https://dummyjson.com/c/522f-65ae-47d1-80ea";
const MOVIES_KEY = "kinouz_movies";
const LIKES_KEY = "kinouz_likes";
const DEMO_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";
const PREVIEW_MS = 5000;

// ===== Holat =====
let movies = [];
let likes = readLikes();
let popularAll = false;
let allAll = false;
let hls = null;
let loadFailed = false;

// ===== HTML elementlar =====
const search = document.querySelector("#search");
const popularBox = document.querySelector("#popularBox");
const allBox = document.querySelector("#allBox");
const btnPopular = document.querySelector("#btnPopular");
const btnAll = document.querySelector("#btnAll");
const modal = document.querySelector("#modal");
const player = document.querySelector("#player");
const ytPlayer = document.querySelector("#ytPlayer");

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
      title: String(m.title || m.name || "Nomsiz"),
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

function readLikes() {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch (err) {
    return [];
  }
}

function saveLikes() {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
  } catch (err) {
    console.error("Sevimlilarni saqlab bo'lmadi:", err);
  }
}

function isLiked(id) {
  return likes.includes(String(id));
}

function findMovie(id) {
  return movies.find(function (m) {
    return String(m.id) === String(id);
  });
}

function getYoutubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getVideoType(url) {
  if (getYoutubeId(url)) return "youtube";
  if (/\.m3u8(\?|$)/i.test(url)) return "hls";
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return "file";
  return "iframe";
}

// ===== Serverdan yoki lokal saqlashdan kinolarni olish =====
async function loadMovies() {
  const local = readLocalMovies();
  if (local) {
    movies = normalizeList(local);
    loadFailed = false;
    return;
  }

  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    movies = normalizeList(data);
    loadFailed = false;
    console.log("Kinolar soni:", movies.length);
  } catch (err) {
    console.error("Kinolarni yuklashda xato:", err);
    movies = [];
    loadFailed = true;
  }
}

// ===== Kartalarni chizish =====
function makeCard(movie) {
  const heart = isLiked(movie.id) ? "❤️" : "🤍";

  return `
    <div class="card" data-aos="fade-up" data-id="${esc(movie.id)}">
      <div class="poster">
        <img class="poster-img" src="${esc(movie.img)}" alt="${esc(movie.title)}">
        <video class="preview" muted playsinline preload="none"></video>
      </div>
      <button class="like" type="button">${heart}</button>
      <h3>${esc(movie.title)}</h3>
      <p>${esc(movie.year)} | ${esc(movie.genre)}</p>
      <p>⭐ ${esc(movie.rating)}</p>
      <button class="watch-btn" type="button">▶ Ko'rish</button>
    </div>
  `;
}

function drawList(list, box, seeAll) {
  if (list.length === 0) {
    box.innerHTML = "<p>Kino topilmadi</p>";
    return;
  }

  const count = seeAll ? list.length : Math.min(4, list.length);
  box.innerHTML = list.slice(0, count).map(makeCard).join("");

  box.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("mouseenter", function () {
      startPreview(card);
    });
    card.addEventListener("mouseleave", function () {
      stopPreview(card);
    });
  });
}

function renderAll() {
  const text = search.value.trim().toLowerCase();

  const found = movies.filter(function (m) {
    return m.title.toLowerCase().includes(text);
  });
  const popular = found.filter(function (m) {
    return m.rating >= 8;
  });

  drawList(popular, popularBox, popularAll);
  drawList(found, allBox, allAll);

  if (loadFailed) {
    const msg = "<p>Serverdan ma'lumot olinmadi. F12 → Console'ni tekshiring.</p>";
    popularBox.innerHTML = msg;
    allBox.innerHTML = msg;
  }

  btnPopular.textContent = popularAll ? "Yopish" : "Hammasini ko'rish";
  btnAll.textContent = allAll ? "Yopish" : "Hammasini ko'rish";

  if (window.AOS) AOS.refreshHard();
}

// ===== Tugmalar va qidiruv =====
function seeAllPopular() {
  popularAll = !popularAll;
  renderAll();
}

function seeAllMovies() {
  allAll = !allAll;
  renderAll();
}

function likeMovie(id) {
  const key = String(id);
  likes = isLiked(key)
    ? likes.filter(function (x) { return x !== key; })
    : likes.concat(key);
  saveLikes();
  renderAll();
}

function onCardClick(e) {
  const card = e.target.closest(".card");
  if (!card) return;

  const id = card.dataset.id;

  if (e.target.closest(".like")) {
    likeMovie(id);
  } else if (e.target.closest(".watch-btn, .poster-img")) {
    watchMovie(id);
  }
}

// ===== Hover preview (5 sekund) =====
function startPreview(card) {
  const movie = findMovie(card.dataset.id);
  if (!movie) return;

  let src = movie.preview || movie.video;
  const ytId = src ? getYoutubeId(src) : null;

  // oldingi previewni tozalaymiz
  stopPreview(card);

  if (ytId) {
    // YouTube: 0–5 soniya oralig'ida, ovozsiz, boshqaruvsiz iframe
    const frame = document.createElement("iframe");
    frame.className = "preview playing";
    frame.allow = "autoplay; encrypted-media";
    frame.style.border = "0";
    frame.src = "https://www.youtube.com/embed/" + ytId +
      "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&playsinline=1&start=0&end=5";
    card.querySelector(".poster").appendChild(frame);
  } else {
    // mp4/webm/ogg fayl yoki demo video
    if (!src || getVideoType(src) !== "file") {
      src = DEMO_VIDEO;
    }

    const video = card.querySelector("video.preview");
    if (!video) return;

    video.src = src;
    video.classList.add("playing");
    video.play().catch(function () {});
  }

  // 5 soniyadan keyin avtomatik to'xtatish (zaxira)
  card._previewTimer = setTimeout(function () {
    stopPreview(card);
  }, PREVIEW_MS);
}

function stopPreview(card) {
  clearTimeout(card._previewTimer);

  // YouTube iframe ni olib tashlaymiz
  const frame = card.querySelector("iframe.preview");
  if (frame) frame.remove();

  // video elementni tozalaymiz
  const video = card.querySelector("video.preview");
  if (video) {
    video.pause();
    video.classList.remove("playing");
    video.removeAttribute("src");
    video.load();
  }
}

// ===== Modal pleyer =====
function stopPlayers() {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  player.pause();
  player.removeAttribute("src");
  player.load();
  player.style.display = "none";

  ytPlayer.removeAttribute("src");
  ytPlayer.style.display = "none";
}

function watchMovie(id) {
  const movie = findMovie(id);
  if (!movie) return;

  const link = movie.video || DEMO_VIDEO;
  const type = getVideoType(link);

  stopPlayers();

  if (type === "youtube") {
    ytPlayer.src = "https://www.youtube.com/embed/" + getYoutubeId(link) + "?autoplay=1";
    ytPlayer.style.display = "block";
  } else if (type === "iframe") {
    window.open(link, "_blank");
    return;
  } else {
    player.style.display = "block";

    if (type === "hls" && window.Hls && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(link);
      hls.attachMedia(player);
    } else {
      player.src = link;
    }
    player.play().catch(function () {});
  }

  document.querySelector("#movieTitle").textContent = movie.title;
  document.querySelector("#movieInfo").textContent =
    movie.year + " | " + movie.genre + " | ⭐ " + movie.rating;

  modal.style.display = "flex";
}

function closeMovie() {
  stopPlayers();
  modal.style.display = "none";
}

// ===== Hodisalar =====
search.addEventListener("input", renderAll);
popularBox.addEventListener("click", onCardClick);
allBox.addEventListener("click", onCardClick);

modal.addEventListener("click", function (e) {
  if (e.target === modal) closeMovie();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && modal.style.display === "flex") closeMovie();
});

// ===== Ishga tushirish =====
async function init() {
  if (window.AOS) AOS.init();
  await loadMovies();
  renderAll();
}

init();