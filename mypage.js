const API_BASE = "";

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 1600);
}

function getUser() {
  const raw = localStorage.getItem("yb-user");
  return raw ? JSON.parse(raw) : null;
}

function renderList(targetId, memories) {
  const grid = document.getElementById(targetId);
  if (!grid) return;
  grid.innerHTML = memories.map(mem => `
    <article class="gallery-card" data-memory-id="${mem.id}">
      ${mem.imageUrl ? `<img src="${mem.imageUrl}" alt="${mem.title}" />` : `<div class="timeline-thumb"></div>`}
      <div class="gallery-info">
        <p><strong>${mem.title}</strong></p>
        <p class="sub">${mem.date || ""}</p>
      </div>
    </article>
  `).join("");
}

async function loadProfile(userId) {
  const res = await fetch(`${API_BASE}/api/me`, { headers: { "x-user-id": userId } });
  if (!res.ok) return null;
  return res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const data = await loadProfile(user.id);
  if (!data) {
    showToast("세션이 만료됐습니다");
    setTimeout(() => window.location.href = "login.html", 500);
    return;
  }

  document.getElementById("mypage-username").textContent = `${data.username} 님의 페이지`;
  document.getElementById("created-count").textContent = data.createdCount || 0;
  document.getElementById("tagged-count").textContent = data.taggedCount || 0;

  renderList("my-created", data.createdMemories || []);
  renderList("my-tagged", data.taggedMemories || []);

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("yb-user");
    window.location.href = "login.html";
  });

  document.body.addEventListener("click", (e) => {
    const card = e.target.closest(".gallery-card");
    if (!card) return;
    const id = card.dataset.memoryId;
    if (id) window.location.href = `memory.html?id=${id}`;
  });
});
