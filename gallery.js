// gallery.js
(function () {
    async function fetchMemories() {
        const res = await fetch("/api/memories");
        return res.ok ? res.json() : [];
    }

    function renderGallery(memories) {
        const grid = document.getElementById("gallery-grid");
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

    document.addEventListener("DOMContentLoaded", async () => {
        const memories = await fetchMemories();
        renderGallery(memories);

        document.body.addEventListener("click", (e) => {
            const card = e.target.closest(".gallery-card");
            if (!card) return;
            const id = card.dataset.memoryId;
            if (id) window.location.href = `memory.html?id=${id}`;
        });
    });
})();
