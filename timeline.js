// timeline.js
(function () {
    async function fetchMemories() {
        const res = await fetch("/api/memories");
        return res.ok ? res.json() : [];
    }

    function renderTimeline(memories) {
        const list = document.getElementById("timeline-list");
        if (!list) return;
        const sorted = [...memories].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        list.innerHTML = sorted.map(mem => `
      <div class="timeline-card" data-memory-id="${mem.id}">
        ${mem.imageUrl ? `<img src="${mem.imageUrl}" class="timeline-thumb" alt="${mem.title}" />` : `<div class="timeline-thumb"></div>`}
        <div>
          <p class="eyebrow">${mem.date || "날짜 미정"}</p>
          <h4>${mem.title}</h4>
          <p class="sub">${mem.desc || mem.body || ""}</p>
          <div class="detail-tags">${(mem.tags || []).map(t => `<span class="tag-chip">#${t}</span>`).join("")}</div>
        </div>
        <button class="ghost-button view-detail">상세 보기</button>
      </div>
    `).join("");
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const memories = await fetchMemories();
        renderTimeline(memories);

        document.body.addEventListener("click", (e) => {
            const btn = e.target.closest(".view-detail");
            const card = e.target.closest(".timeline-card");
            const targetCard = btn || card;
            if (!targetCard) return;
            const id = targetCard.closest("[data-memory-id]")?.dataset.memoryId;
            if (id) window.location.href = `memory.html?id=${id}`;
        });
    });
})();
