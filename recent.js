(function () {
    async function fetchActivity() {
        try {
            const res = await fetch("/api/activity");
            if (!res.ok) throw new Error("fail");
            const data = await res.json();
            return { data, error: false };
        } catch (e) {
            console.error(e);
            return { data: [], error: true };
        }
    }

    function renderActivity(list, errored) {
        const ul = document.querySelector(".activity-log");
        if (!ul) return;
        if (!list.length) {
            ul.innerHTML = `<li>${errored ? "활동을 불러오지 못했습니다." : "최근 활동이 없습니다."}</li>`;
            return;
        }
        ul.innerHTML = list.map(item => `<li>${item.message} (${item.date.slice(0,10)})</li>`).join("");
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const { data, error } = await fetchActivity();
        renderActivity(data, error);
    });
})();
