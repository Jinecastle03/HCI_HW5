// main.js - frontend interactions + API integration

const API_BASE = "";
let currentFriends = [];
let currentMemories = [];
let selectedMemoryId = null;

// ================= HELPERS =================
async function fetchJson(path, fallback = []) {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) {
            const msg = `${res.status} ${res.statusText}`;
            showToast(msg);
            throw new Error(msg);
        }
        return await res.json();
    } catch (e) {
        console.error(`API fetch failed for ${path}`, e);
        showToast("데이터를 불러오지 못했습니다");
        return fallback;
    }
}
async function fetchAi(url, payload) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("AI server error");
    return res.json();
}
async function handleAiSuggestForForm() {
    // ✅ main.html 실제 id로 맞춤
    const titleInput = document.getElementById("mem-title");
    const bodyInput = document.getElementById("mem-body");
    const tagsInput = document.getElementById("mem-tags");

    // (디버그용) 버튼 눌렸는지 바로 확인 가능
    // console.log("AI suggest clicked", { titleInput, bodyInput, tagsInput });

    if (!titleInput || !bodyInput) return;

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    const friendNames = (currentFriends || []).map(f => f.name);

    try {
        const out = await fetchAi("http://127.0.0.1:5000/ai/suggest", {
            title,
            body,
            friendNames
        });
        const chipOut = document.getElementById("ai-tag-chips");
        if (chipOut) renderAiTagChips((out && out.tags) || [], tagsInput, chipOut);

        // ✅ mentions → 칩 추가
        (((out && out.mentions) || [])).forEach(name => addMentionChip(name));

        showToast("AI가 태그/멘션을 추천했어요");
    } catch (e) {
        console.error(e);
        showToast("AI 추천 실패 (ai_server 실행/주소 확인)");
    }
}


function setupFriendMentions(friends) {
    const input = document.getElementById("mem-friends");
    if (!input) return;

    // 추천 박스 만들기
    const box = document.createElement("div");
    box.className = "mention-suggest hidden";
    document.body.appendChild(box);

    let activeIndex = -1;
    let currentItems = [];

    function closeBox() {
        box.classList.add("hidden");
        box.innerHTML = "";
        activeIndex = -1;
        currentItems = [];
    }

    function positionBox() {
        const r = input.getBoundingClientRect();
        box.style.left = `${r.left}px`;
        box.style.top = `${r.bottom + 6}px`;
        box.style.width = `${r.width}px`;
    }

    function getTokens(value) {
        // 쉼표 기준 토큰화 (공백 제거)
        return value.split(",").map(t => t.trim()).filter(Boolean);
    }

    function getEditingToken(value) {
        // "마지막 토큰"만 자동완성 대상으로
        const parts = value.split(",");
        return (parts[parts.length - 1] || "").trim();
    }

    function setTokenToValue(selectedName) {
        const raw = input.value;
        const parts = raw.split(",");
        // 마지막 토큰만 교체
        parts[parts.length - 1] = ` @${selectedName}`; // 앞에 공백 한 칸 주면 보기 좋음

        // 전체 정리 + 중복 제거
        const tokens = parts
            .join(",")
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

        const dedup = [];
        const seen = new Set();
        for (const t of tokens) {
            const key = t.replace(/^@/, "").trim();
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            dedup.push(`@${key}`);
        }

        input.value = dedup.join(", ") + ", ";
        input.focus();
        closeBox();
    }

    function renderBox(items) {
        currentItems = items;
        activeIndex = -1;

        if (!items.length) {
            closeBox();
            return;
        }

        positionBox();
        box.classList.remove("hidden");
        box.innerHTML = items
            .map((f, idx) => {
                return `
          <button type="button" class="mention-item" data-idx="${idx}">
            <span class="mention-name">@${f.name}</span>
            <span class="mention-sub">${f.role || ""}</span>
          </button>
        `;
            })
            .join("");

        // 클릭으로 선택
        box.querySelectorAll(".mention-item").forEach(btn => {
            btn.addEventListener("mousedown", (e) => {
                // blur로 닫히기 전에 먼저 선택되게 mousedown 사용
                e.preventDefault();
                const idx = Number(btn.dataset.idx);
                const f = currentItems[idx];
                if (f) setTokenToValue(f.name);
            });
        });
    }

    function updateSuggestions() {
        const token = getEditingToken(input.value);

        // token이 비어있으면 닫기
        if (!token) {
            closeBox();
            return;
        }

        // "@""로 시작하면 멘션 검색, 아니면 그냥 이름 검색으로도 허용
        const q = token.replace(/^@/, "").trim().toLowerCase();
        if (!q) {
            // "@"만 입력했을 때는 전체 보여주기(너무 많으면 slice)
            renderBox(friends.slice(0, 8));
            return;
        }

        const tokens = getTokens(input.value).map(t => t.replace(/^@/, "").trim());
        const used = new Set(tokens.map(x => x.toLowerCase()));

        const filtered = friends
            .filter(f => f.name.toLowerCase().includes(q))
            .filter(f => !used.has(f.name.toLowerCase()))
            .slice(0, 8);

        renderBox(filtered);
    }

    // 입력할 때마다 추천 업데이트
    input.addEventListener("input", updateSuggestions);

    // 키보드 네비게이션(↑↓ Enter)
    input.addEventListener("keydown", (e) => {
        if (box.classList.contains("hidden")) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
        } else if (e.key === "Enter") {
            // 폼 제출 막고 현재 선택 항목 선택
            if (activeIndex >= 0 && currentItems[activeIndex]) {
                e.preventDefault();
                setTokenToValue(currentItems[activeIndex].name);
            }
        } else if (e.key === "Escape") {
            closeBox();
        }

        // 활성 표시
        const nodes = box.querySelectorAll(".mention-item");
        nodes.forEach((n, i) => n.classList.toggle("active", i === activeIndex));
    });

    // 포커스/스크롤 변화에도 위치 업데이트
    window.addEventListener("scroll", () => {
        if (!box.classList.contains("hidden")) positionBox();
    }, true);
    window.addEventListener("resize", () => {
        if (!box.classList.contains("hidden")) positionBox();
    });

    // 바깥 클릭/blur 시 닫기
    input.addEventListener("blur", () => setTimeout(closeBox, 120));
}


function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 1800);
}

// ================= RENDERING =================
function renderFriends(list) {
    const container = document.querySelector(".friends-scroll");
    if (!container) return;
    container.innerHTML = "";

    list.forEach(friend => {
        const card = document.createElement("article");
        card.className = "friend-card";
        card.innerHTML = `
            <div class="friend-top">
              <div class="friend-avatar">${friend.name?.[0] || "친"}</div>
              <div>
                <p class="friend-role">${friend.role}</p>
                <h4 class="friend-name">${friend.name}</h4>
                <p class="friend-detail">${friend.detail}</p>
              </div>
            </div>
            <div class="friend-tags">
              ${(friend.tags || []).map(tag => `<span class="tag-chip">#${tag}</span>`).join("")}
            </div>
        `;
        container.appendChild(card);
    });
}

async function updateHighlights(memories, friends) {
    const photoCard = document.getElementById("highlight-photo");
    const friendCard = document.getElementById("highlight-friend");
    const popularCard = document.getElementById("highlight-popular");

    if (!memories || !memories.length) return;

    const user = (typeof getUser === "function") ? getUser() : null;

    // ✅ 로그인 안 했으면: 랜덤 사진만 보여주고, 나머지 2개는 숨김
    if (!user) {
        if (friendCard) friendCard.classList.add("hidden");
        if (popularCard) popularCard.classList.add("hidden");

        const randomMemory = memories[Math.floor(Math.random() * memories.length)];
        if (photoCard) {
            const thumb = photoCard.querySelector(".highlight-thumbnail span");
            const img = photoCard.querySelector(".highlight-image");
            const caption = photoCard.querySelector(".highlight-caption");
            photoCard.dataset.memoryId = randomMemory.id;
            if (thumb) thumb.textContent = randomMemory.title || "제목 없음";
            if (caption) caption.textContent = randomMemory.desc || "";
            if (img) {
                if (randomMemory.imageUrl) { img.src = randomMemory.imageUrl; img.classList.remove("hidden"); }
                else img.classList.add("hidden");
            }
        }
        const wrap = document.querySelector(".highlights");
        if (wrap) wrap.classList.add("one-only");
        return;
    }

    const wrap = document.querySelector(".highlights");
    if (wrap) wrap.classList.remove("one-only");

    // ✅ 로그인 했으면: 숨겼던 카드 다시 보여주기
    if (friendCard) friendCard.classList.remove("hidden");
    if (popularCard) popularCard.classList.remove("hidden");

    const normalize = (s) => String(s || "").replace(/^@/, "").trim();
    const myName = normalize(user.username);

    // ✅ "내 관련 추억"만 필터: (내가 올렸거나) (friends 멘션에 내가 들어간 것)
    const myMemories = memories.filter(m => {
        const isMine = Number(m.authorId) === Number(user.id);
        const fs = Array.isArray(m.friends) ? m.friends.map(normalize) : [];
        const taggedMe = fs.includes(myName);
        return isMine || taggedMe;
    });

    const pool = myMemories.length ? myMemories : memories; // 혹시 비어있으면 전체로 fallback

    // ---------- 1) 오늘의 사진 (랜덤: 내 관련 추억 기준) ----------
    const randomMemory = pool[Math.floor(Math.random() * pool.length)];
    if (photoCard) {
        const thumb = photoCard.querySelector(".highlight-thumbnail span");
        const img = photoCard.querySelector(".highlight-image");
        const caption = photoCard.querySelector(".highlight-caption");
        photoCard.dataset.memoryId = randomMemory.id;
        if (thumb) thumb.textContent = randomMemory.title || "제목 없음";
        if (caption) caption.textContent = randomMemory.desc || "";
        if (img) {
            if (randomMemory.imageUrl) { img.src = randomMemory.imageUrl; img.classList.remove("hidden"); }
            else img.classList.add("hidden");
        }
    }

    // ---------- 2) 함께 많이 찍힌 친구 (내 관련 추억의 friends 집계) ----------
    const friendNameSet = new Set((friends || []).map(f => normalize(f.name)));
    const counts = new Map(); // name -> count

    for (const mem of pool) {
        const arr = Array.isArray(mem.friends) ? mem.friends : [];
        for (const raw of arr) {
            const nm = normalize(raw);
            if (!nm) continue;
            if (nm === myName) continue;              // ✅ 내 이름 제외
            if (!friendNameSet.has(nm)) continue;     // ✅ 친구 목록에 있는 사람만
            counts.set(nm, (counts.get(nm) || 0) + 1);
        }
    }

    let topFriendName = null, topCount = 0;
    for (const [nm, c] of counts.entries()) {
        if (c > topCount) { topFriendName = nm; topCount = c; }
    }

    // topFriend 관련 추억 중 상세로 갈 것 1개(반응 높은 것)
    const commentsCount = (m) => Array.isArray(m.commentList) ? m.commentList.length : Number(m.comments || 0);
    const engagement = (m) => Number(m.likes || 0) + commentsCount(m);

    const topFriendBestMemory = topFriendName
        ? [...pool]
            .filter(m => (m.friends || []).map(normalize).includes(topFriendName))
            .sort((a, b) => engagement(b) - engagement(a))[0]
        : null;

    if (friendCard) {
        const heading = friendCard.querySelector("h4");
        const paragraph = friendCard.querySelector("p");

        if (!topFriendName || !topFriendBestMemory) {
            friendCard.dataset.memoryId = randomMemory.id;
            if (heading) heading.textContent = "아직 집계 중";
            if (paragraph) paragraph.textContent = "친구 태그가 쌓이면 함께 많이 찍힌 친구를 보여줄게요.";
        } else {
            friendCard.dataset.memoryId = topFriendBestMemory.id; // ✅ 기존 버그(인기추억 id 넣던 것) 제거
            if (heading) heading.textContent = topFriendName;
            if (paragraph) paragraph.innerHTML =
                `${topFriendName}와(과) 함께한 사진이 <strong>${topCount}장</strong> 있어요.`;
        }
    }

    // ---------- 3) 이번 주 인기 추억 (내 관련 추억 + 최근 7일 + 반응기반) ----------
    const parseDate = (s) => {
        if (!s) return null;
        const t = String(s).trim().replace(/\./g, "-").replace(/\//g, "-");
        const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (!m) return null;
        const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return Number.isNaN(dt.getTime()) ? null : dt;
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekPool = pool.filter(m => {
        const dt = parseDate(m.date);
        return dt ? dt >= weekAgo : false;
    });

    const popPool = weekPool.length ? weekPool : pool;
    const popular = [...popPool].sort((a, b) => engagement(b) - engagement(a))[0];

    if (popularCard && popular) {
        popularCard.dataset.memoryId = popular.id;
        const text = popularCard.querySelector("p");
        if (text) text.textContent = "AI 요약 생성 중...";

        try {
            const out = await fetchAi("http://127.0.0.1:5000/ai/highlight", {
                title: popular.title,
                likes: popular.likes || 0,
                comments: Array.isArray(popular.commentList)
                    ? popular.commentList.length
                    : (popular.comments || 0),
                date: popular.date || "",
            });
            if (text) text.textContent = out.summary;
        } catch (e) {
            if (text) {
                text.textContent =
                    `${popular.title} · 좋아요 ${popular.likes || 0}`;
            }
        }
    }

}



function setDetail(memory) {
    if (!memory) return;
    selectedMemoryId = memory.id;
    const titleEl = document.querySelector(".detail-title");
    const metaEl = document.querySelector(".detail-meta");
    const tagsEl = document.querySelector(".detail-tags");
    const bodyEl = document.querySelector(".detail-body");
    const friendsEl = document.querySelector(".detail-friends");
    const likesEl = document.querySelector(".detail-likes");
    const commentsEl = document.querySelector(".detail-comments");
    const commentList = document.querySelector(".detail-comment-list");
    const detailImg = document.querySelector(".detail-image");
    const detailPlaceholder = document.querySelector(".detail-placeholder");

    if (titleEl) titleEl.textContent = memory.title;
    if (metaEl) metaEl.textContent = `${memory.date || "날짜 미정"} · ${memory.location || "장소 미정"}`;
    if (tagsEl) tagsEl.innerHTML = (memory.tags || []).map(t => `<span class="tag-chip">#${t}</span>`).join("");
    if (bodyEl) bodyEl.textContent = memory.body || memory.desc;
    if (friendsEl) friendsEl.textContent = (memory.friends || []).join(", ");
    if (likesEl) likesEl.textContent = `${memory.likes || 0} Likes`;
    if (commentsEl) commentsEl.textContent = `${memory.comments || 0} Comments`;
    if (commentList) {
        const html = (memory.commentList || []).map(c => `<li><strong>${c.author}</strong> · ${c.date}<br>${c.text}</li>`).join("");
        commentList.innerHTML = html || "<li>아직 댓글이 없어요.</li>";
    }
    if (detailImg && detailPlaceholder) {
        if (memory.imageUrl) {
            detailImg.src = memory.imageUrl;
            detailImg.classList.remove("hidden");
            detailPlaceholder.classList.add("hidden");
        } else {
            detailImg.classList.add("hidden");
            detailPlaceholder.classList.remove("hidden");
        }
    }
    const deleteBtn = document.getElementById("delete-memory");
    if (deleteBtn) deleteBtn.disabled = false;
}

// ================= FILTERING =================
function applyFriendFilter(query = "") {
    const lowered = query.trim().toLowerCase();
    if (!lowered) {
        renderFriends(currentFriends);
        return;
    }
    const filtered = currentFriends.filter(f =>
        f.name.toLowerCase().includes(lowered) ||
        f.role.toLowerCase().includes(lowered) ||
        f.detail.toLowerCase().includes(lowered) ||
        (f.tags || []).some(tag => tag.toLowerCase().includes(lowered))
    );
    renderFriends(filtered);
    showToast(`검색 결과: ${filtered.length}명`);
}

// ================= GALLERY / TIMELINE RENDER =================
function renderGallery(memories) {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    grid.innerHTML = memories.map(mem => `
      <article class="gallery-card view-detail" data-memory-id="${mem.id}">
        ${mem.imageUrl ? `<img src="${mem.imageUrl}" alt="${mem.title}" />` : `<div class="timeline-thumb"></div>`}
        <div class="gallery-info">
          <p><strong>${mem.title}</strong></p>
          <p class="sub">${mem.date || ""}</p>
        </div>
      </article>
    `).join("");
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

// ================= AI SIMULATION =================
async function handleAiSummary() {
    const aiText = document.querySelector(".ai-text");
    const aiTitle = document.querySelector(".ai-title");
    if (!aiText || !aiTitle) return;
    aiTitle.textContent = "AI가 생각하는 당신";
    aiText.textContent = "요약 생성 중...";
    try {
        const res = await fetchJson("/api/highlights");
        const msg = res.length ? "팀워크와 기록을 중시하는 크루" : "데이터 부족";
        aiText.textContent = res.length
            ? `요약: ${msg}. 사진 ${res.length}건 분석 기준.`
            : "요약을 만들 데이터가 부족합니다.";
        showToast("AI 요약이 준비됐어요");
    } catch (e) {
        aiText.textContent = "AI 요약 실패";
        showToast("AI 요약 실패");
    }
}

async function handleAiRecommend() {
    const recoList = document.querySelector(".reco-list");
    if (!recoList) return;
    recoList.innerHTML = "<span>추천 계산 중...</span>";
    try {
        const res = await fetchJson("/api/friends", []);
        const sorted = [...res].sort((a, b) => (b.photos || 0) - (a.photos || 0)).slice(0, 3);
        recoList.innerHTML = sorted.map(f => `<span>${f.name} · 사진 ${f.photos || 0}장</span>`).join("");
        showToast("추천 친구를 업데이트했어요");
    } catch (e) {
        recoList.innerHTML = "<span>추천 실패</span>";
        showToast("추천 실패");
    }
}

function renderAiTagChips(tags, tagsInputEl, outEl) {
    const uniq = Array.from(new Set((tags || []).map(t => String(t).trim()).filter(Boolean))).slice(0, 8);

    if (!uniq.length) {
        outEl.innerHTML = `<span class="ai-chip">추천 없음</span>`;
        return;
    }

    // 현재 입력칸에 이미 있는 태그들 (선택 상태 초기화용)
    const getCurrent = () =>
        (tagsInputEl?.value || "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);

    const setCurrent = (arr) => {
        if (!tagsInputEl) return;
        tagsInputEl.value = arr.join(", ");
    };

    const current = new Set(getCurrent());

    // 칩 렌더 (선택되어 있으면 selected)
    outEl.innerHTML = uniq
        .map(t => {
            const selected = current.has(t);
            return `<button type="button" class="chip ai-tag ${selected ? "selected" : ""}" data-tag="${t}">#${t}</button>`;
        })
        .join("");

    // 클릭 → 토글
    outEl.querySelectorAll(".ai-tag").forEach(btn => {
        btn.addEventListener("click", () => {
            const t = btn.dataset.tag;
            const cur = getCurrent();
            const has = cur.includes(t);

            let next;
            if (has) {
                // ✅ 다시 누르면 제거(취소)
                next = cur.filter(x => x !== t);
                btn.classList.remove("selected");
            } else {
                // ✅ 누르면 추가
                next = [...cur, t];
                btn.classList.add("selected");
            }

            // 중복 제거
            next = Array.from(new Set(next));
            setCurrent(next);
        });
    });
}



// ================= DETAIL LOADER =================
async function loadDetail(memoryId) {
    if (!memoryId) return;
    const memory = await fetchJson(`/api/memories/${memoryId}`);
    if (memory && memory.id) {
        setDetail(memory);
        scrollToSection("detail-section");
    } else {
        showToast("상세 데이터를 불러오지 못했습니다");
    }
}

// ================= HERO STATS =================
async function updateStats(_memories, friends) {
    const uploadedEl = document.getElementById("uploaded-count");
    const tagEl = document.getElementById("tag-count");
    const friendEl = document.getElementById("friend-count");

    // stat 카드(부모) 잡아서 숨김/표시 처리
    const uploadedStat = uploadedEl?.closest(".stat");
    const tagStat = tagEl?.closest(".stat");

    // ✅ 친구 수는 항상 표시
    if (friendEl) friendEl.textContent = Array.isArray(friends) ? friends.length : 0;

    const user = getUser();

    // ✅ 로그인 안 했으면: 친구 수만 보이게 (나머지는 숨김)
    if (!user || !user.id) {
        if (uploadedStat) uploadedStat.classList.add("hidden");
        if (tagStat) tagStat.classList.add("hidden");
        return;
    }

    // ✅ 로그인 했으면: 숨겼던 stat 다시 보여주고, 본인 DB(/api/me) 기반으로 숫자 채움
    if (uploadedStat) uploadedStat.classList.remove("hidden");
    if (tagStat) tagStat.classList.remove("hidden");

    try {
        const res = await fetch("/api/me", {
            headers: { "x-user-id": user.id },
        });
        if (!res.ok) throw new Error("me fail");

        const me = await res.json();

        // createdCount = 내가 업로드한 사진 수
        if (uploadedEl) uploadedEl.textContent = me?.createdCount ?? 0;

        // taggedCount = 내가 태그된 활동(=태그된 추억 수)
        if (tagEl) tagEl.textContent = me?.taggedCount ?? 0;
    } catch (e) {
        console.error(e);
        // 실패해도 화면은 깨지지 않게 0 처리
        if (uploadedEl) uploadedEl.textContent = 0;
        if (tagEl) tagEl.textContent = 0;
    }
}


function populateFriendOptions(friends) {
    const datalist = document.getElementById("friend-options");
    if (!datalist) return;
    datalist.innerHTML = friends.map(f => `<option value="@${f.name}">${f.role}</option>`).join("");
}

function toggleUploadVisibility(user) {
    const section = document.getElementById("upload-section");
    const locked = document.getElementById("upload-locked");
    const form = document.getElementById("memory-form");
    if (!section || !locked || !form) return;
    if (user) {
        section.classList.remove("hidden");
        locked.classList.add("hidden");
        form.classList.remove("hidden");
    } else {
        section.classList.add("hidden");
        locked.classList.remove("hidden");
        form.classList.add("hidden");
    }
}

// ================= ACTIVITY =================
async function loadActivity() {
    const ul = document.querySelector(".activity-log");
    if (!ul) return;
    try {
        const res = await fetch("/api/activity");
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        if (!data.length) {
            ul.innerHTML = "<li>최근 활동이 없습니다.</li>";
            return;
        }
        ul.innerHTML = data.map(item => `<li>${item.message} (${item.date.slice(0, 10)})</li>`).join("");
    } catch (e) {
        ul.innerHTML = "<li>활동을 불러오지 못했습니다.</li>";
    }
}

// ================= FORM HANDLING =================
function attachPreview() {
    const input = document.getElementById("photo-input");
    const preview = document.getElementById("photo-preview");
    const placeholder = document.querySelector(".upload-placeholder");
    if (!input || !preview || !placeholder) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target?.result;
            preview.classList.remove("hidden");
            placeholder.classList.add("hidden");
        };
        reader.readAsDataURL(file);
    });
}

async function submitMemoryForm(e) {
    e.preventDefault();
    const form = e.target;
    const titleVal = document.getElementById("mem-title").value.trim();
    const dateVal = document.getElementById("mem-date").value;
    const bodyVal = document.getElementById("mem-body").value.trim();
    if (!titleVal || !dateVal || !bodyVal) {
        showToast("제목, 날짜, 설명은 필수입니다");
        return;
    }
    const friendsInput = document.getElementById("mem-friends");
    if (friendsInput && friendsInput.value) {
        const normalized = friendsInput.value.split(",").map(v => v.trim()).filter(Boolean).join(", ");
        friendsInput.value = normalized;
    }
    const formData = new FormData(form);
    const user = getUser();
    if (!user) {
        showToast("로그인 후 업로드 가능합니다");
        return;
    }
    try {
        const resp = await fetch("/api/memories", {
            method: "POST",
            body: formData,
            headers: { "x-user-id": user.id }
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            showToast(err.message || "업로드 실패");
            return;
        }
        const created = await resp.json();
        currentMemories.push(created);
        updateHighlights(currentMemories, currentFriends);
        renderGallery(currentMemories);
        renderTimeline(currentMemories);
        await updateStats(currentMemories, currentFriends);
        toggleUploadVisibility(user);
        setDetail(created);
        form.reset();
        const preview = document.getElementById("photo-preview");
        const placeholder = document.querySelector(".upload-placeholder");
        if (preview && placeholder) {
            preview.classList.add("hidden");
            placeholder.classList.remove("hidden");
        }
        showToast("추억이 저장됐어요");
    } catch (err) {
        console.error(err);
        showToast("업로드 실패");
    }
}

async function deleteSelectedMemory() {
    if (!selectedMemoryId) {
        showToast("삭제할 추억이 없습니다");
        return;
    }
    const resp = await fetch(`/api/memories/${selectedMemoryId}`, { method: "DELETE" });
    if (!resp.ok) {
        showToast("삭제 실패");
        return;
    }
    currentMemories = currentMemories.filter(m => m.id !== selectedMemoryId);
    selectedMemoryId = currentMemories[0]?.id || null;
    if (selectedMemoryId) {
        setDetail(currentMemories[0]);
    }
    updateHighlights(currentMemories, currentFriends);
    renderGallery(currentMemories);
    renderTimeline(currentMemories);
    await updateStats(currentMemories, currentFriends);
    showToast("추억을 삭제했습니다");
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    // 데이터 로드
    currentMemories = await fetchJson("/api/memories", []);
    const aiSuggestBtn = document.getElementById("ai-suggest-form");
    if (aiSuggestBtn) aiSuggestBtn.addEventListener("click", handleAiSuggestForForm);
    const user = getUser?.();
    document.body.classList.toggle("logged-out", !user);
    const rawFriends = await fetchJson("/api/friends", []);
    currentFriends = user
        ? rawFriends.filter(f => f.name !== user.username) // ✅ 본인 제외
        : rawFriends;



    renderFriends(currentFriends);
    setupFriendChips(currentFriends);
    setupFriendChips(currentFriends);
    populateFriendOptions(currentFriends);
    setupFriendMentions(currentFriends);
    updateHighlights(currentMemories, currentFriends);
    renderGallery(currentMemories);
    renderTimeline(currentMemories);
    await updateStats(currentMemories, currentFriends);
    toggleUploadVisibility(getUser());
    loadActivity();
    if (currentMemories.length) {
        setDetail(currentMemories[0]);
    }

    // HERO 버튼
    const goToFriendsBtn = document.getElementById("go-to-friends");
    const goToGalleryBtn = document.getElementById("go-to-gallery");
    if (goToFriendsBtn) goToFriendsBtn.addEventListener("click", () => scrollToSection("friends-section"));
    if (goToGalleryBtn) goToGalleryBtn.addEventListener("click", () => scrollToSection("gallery-section"));

    // FRIENDS 섹션 버튼
    const viewAllFriendsBtn = document.getElementById("view-all-friends");
    if (viewAllFriendsBtn) viewAllFriendsBtn.addEventListener("click", () => scrollToSection("friends-section"));

    // GALLERY / ACTIVITIES 버튼
    const goGalleryPageBtn = document.getElementById("go-gallery-page");
    const goActivitiesPageBtn = document.getElementById("go-activities-page");
    const goToActivities = document.getElementById("go-to-activities");
    if (goGalleryPageBtn) goGalleryPageBtn.addEventListener("click", () => window.location.href = "gallery.html");
    if (goActivitiesPageBtn) goActivitiesPageBtn.addEventListener("click", () => window.location.href = "timeline.html");
    if (goToActivities) goToActivities.addEventListener("click", () => window.location.href = "timeline.html");

    // NAV 링크 smooth scroll
    const navLinks = document.querySelectorAll("#main-nav a[href^='#']");
    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const targetId = link.getAttribute("href").substring(1);
            scrollToSection(targetId);
        });
    });

    // AI Lab 버튼
    const aiSummaryButton = document.getElementById("ai-summary-button");
    const aiRecommendButton = document.getElementById("ai-recommend-button");
    if (aiSummaryButton) aiSummaryButton.addEventListener("click", handleAiSummary);
    if (aiRecommendButton) aiRecommendButton.addEventListener("click", handleAiRecommend);

    // 태그 필터 / 검색
    const tagButtons = document.querySelectorAll(".tag-filter");
    const searchInput = document.getElementById("global-search-input");
    const searchButton = document.getElementById("global-search-button");
    tagButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tag = btn.dataset.tag;
            if (searchInput) searchInput.value = tag;
            applyFriendFilter(tag);
        });
    });
    if (searchButton && searchInput) {
        searchButton.addEventListener("click", () => applyFriendFilter(searchInput.value));
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") applyFriendFilter(searchInput.value);
        });
    }

    // 친구 캐러셀
    const friendsScroll = document.querySelector(".friends-scroll");
    const friendsPrev = document.getElementById("friends-prev");
    const friendsNext = document.getElementById("friends-next");
    if (friendsScroll && friendsPrev && friendsNext) {
        const scrollAmount = 250;
        friendsPrev.addEventListener("click", () => friendsScroll.scrollBy({ left: -scrollAmount, behavior: "smooth" }));
        friendsNext.addEventListener("click", () => friendsScroll.scrollBy({ left: scrollAmount, behavior: "smooth" }));
    }

    // 상세 보기 (델리게이션)
    document.body.addEventListener("click", (e) => {
        const targetCard = e.target.closest(".view-detail, [data-memory-id]");
        if (!targetCard) return;
        const memId = Number(targetCard.closest("[data-memory-id]")?.dataset.memoryId);
        if (memId) {
            window.location.href = `memory.html?id=${memId}`;
        }
    });

    // 업로드 폼
    const memoryForm = document.getElementById("memory-form");
    const resetBtn = document.getElementById("reset-form");
    attachPreview();
    if (memoryForm) memoryForm.addEventListener("submit", submitMemoryForm);
    if (resetBtn) resetBtn.addEventListener("click", () => memoryForm?.reset());
});

function setupFriendChips(allFriends) {
    const chipBox = document.getElementById("friends-chips");
    const input = document.getElementById("mem-friends-input");
    const hidden = document.getElementById("mem-friends");
    const suggest = document.getElementById("mention-suggest");
    if (!chipBox || !input || !hidden || !suggest) return;

    let selected = []; // ["김혜성", "홍길동"]
    let activeIndex = -1;
    let currentItems = [];

    const normalizeName = (s) => s.replace(/^@/, "").trim();
    const syncHidden = () => {
        hidden.value = selected.map(n => `@${n}`).join(", ");
    };

    const renderChips = () => {
        chipBox.innerHTML = selected.map(name => `
      <button type="button" class="chip" data-name="${name}">
        <span>@${name}</span>
        <span class="chip-x">×</span>
      </button>
    `).join("");
        syncHidden();
    };

    chipBox.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        const name = btn.dataset.name;
        selected = selected.filter(n => n !== name);
        renderChips();
        input.focus();
    });

    const closeSuggest = () => {
        suggest.classList.add("hidden");
        suggest.innerHTML = "";
        activeIndex = -1;
        currentItems = [];
    };

    const openSuggest = (items) => {
        currentItems = items;
        activeIndex = -1;
        if (!items.length) return closeSuggest();

        suggest.classList.remove("hidden");
        suggest.innerHTML = items.map((f, idx) => `
      <button type="button" class="mention-item" data-idx="${idx}">
        <span class="mention-name">@${f.name}</span>
        <span class="mention-sub">${f.role || ""}</span>
      </button>
    `).join("");

        suggest.querySelectorAll(".mention-item").forEach(btn => {
            btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const idx = Number(btn.dataset.idx);
                addChip(currentItems[idx].name);
            });
        });
    };

    const addChip = (raw) => {
        const name = normalizeName(raw);
        if (!name) return;
        if (!selected.includes(name)) selected.push(name);
        input.value = "";
        renderChips();
        closeSuggest();
    };

    const updateSuggest = () => {
        const q = normalizeName(input.value).toLowerCase();
        if (!q) {
            // ✅ "@"만 입력했을 때 전체 후보 보여주기
            const items = allFriends
                .filter(f => !selected.includes(f.name))
                .slice(0, 8);
            openSuggest(items);
            return;
        }

        const filtered = allFriends
            .filter(f => f.name.toLowerCase().includes(q))
            .filter(f => !selected.includes(f.name))
            .slice(0, 8);

        openSuggest(filtered);
    };

    // 쉼표 / Enter로 칩 확정
    input.addEventListener("keydown", (e) => {
        if (e.key === "," || e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && currentItems[activeIndex]) {
                addChip(currentItems[activeIndex].name);
            } else {
                addChip(input.value);
            }
            return;
        }

        if (!suggest.classList.contains("hidden")) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
            } else if (e.key === "Escape") {
                closeSuggest();
            }

            const nodes = suggest.querySelectorAll(".mention-item");
            nodes.forEach((n, i) => n.classList.toggle("active", i === activeIndex));
        }
    });

    input.addEventListener("input", updateSuggest);
    input.addEventListener("blur", () => setTimeout(closeSuggest, 120));

    renderChips();
}
