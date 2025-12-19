// detail.js
(function () {
    function getQueryId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }

    async function fetchMemory(id) {
        try {
            const res = await fetch(`/api/memories/${id}`);
            if (!res.ok) return null;
            return res.json();
        } catch (e) {
            return null;
        }
    }

    function setDetail(memory) {
        if (!memory) return;
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
        const likeBtn = document.getElementById("like-button");
        const user = localStorage.getItem("yb-user") ? JSON.parse(localStorage.getItem("yb-user")) : null;

        if (likeBtn && user) {
            const likedBy = Array.isArray(memory.likedBy) ? memory.likedBy : [];
            const isLiked = likedBy.includes(user.id);

            likeBtn.classList.toggle("liked", isLiked);
            likeBtn.textContent = isLiked ? "좋아요 취소 👎" : "좋아요 👍";
        }


        if (titleEl) titleEl.textContent = memory.title;
        if (metaEl) metaEl.textContent = `${memory.date || "날짜 미정"} · ${memory.location || "장소 미정"}`;
        if (tagsEl) tagsEl.innerHTML = (memory.tags || []).map(t => `<span class="tag-chip">#${t}</span>`).join("");
        if (bodyEl) bodyEl.textContent = memory.body || memory.desc;
        if (friendsEl) friendsEl.textContent = (memory.friends || []).join(", ");
        if (likesEl) likesEl.textContent = `${memory.likes || 0} Likes`;
        if (commentsEl) commentsEl.textContent = `${memory.comments || 0} Comments`;
        if (commentList) {
            const html = (memory.commentList || []).map(c => `<li><strong>${c.author}</strong> · ${c.date}<br>${c.text}</li>`).join("") || "<li>아직 댓글이 없어요.</li>";
            commentList.innerHTML = html;
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
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const id = getQueryId();
        if (!id) {
            window.location.href = "gallery.html";
            return;
        }
        const mem = await fetchMemory(id);
        if (!mem) {
            window.location.href = "gallery.html";
            return;
        }
        setDetail(mem);
        // ✅ 좋아요 버튼 (로그인 시만)
        const likeBtn = document.getElementById("like-button");
        const user = localStorage.getItem("yb-user") ? JSON.parse(localStorage.getItem("yb-user")) : null;

        if (likeBtn) {
            if (!user) {
                likeBtn.classList.add("hidden");
            } else {
                likeBtn.classList.remove("hidden");
                likeBtn.addEventListener("click", async () => {
                    const res = await fetch(`/api/memories/${id}/like`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-user-id": user.id
                        }
                    });

                    if (!res.ok) {
                        alert("좋아요 실패 (로그인 확인)");
                        return;
                    }

                    const data = await res.json();

                    const likesEl = document.querySelector(".detail-likes");
                    if (likesEl) likesEl.textContent = `${data.likes} Likes`;

                    // ✅ (추가) 버튼 상태 토글 반영
                    likeBtn.classList.toggle("liked", !!data.liked);
                    likeBtn.textContent = data.liked ? "좋아요 취소 👎" : "좋아요 👍";

                    // ✅ (추가) 메모리 객체도 동기화 (새로고침 없이 상태 유지)
                    mem.likes = data.likes;
                    mem.likedBy = Array.isArray(mem.likedBy) ? mem.likedBy : [];

                    if (data.liked) {
                        if (!mem.likedBy.includes(user.id)) mem.likedBy.push(user.id);
                    } else {
                        mem.likedBy = mem.likedBy.filter(uid => uid !== user.id);
                    }

                    // 버튼 연타 방지(선택)
                    likeBtn.disabled = true;
                    setTimeout(() => (likeBtn.disabled = false), 800);

                });
            }
        }


        const form = document.getElementById("comment-form");
        const textArea = document.getElementById("comment-text");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = textArea.value.trim();
            if (!text) return;
            const user = localStorage.getItem("yb-user") ? JSON.parse(localStorage.getItem("yb-user")) : null;
            if (!user) {
                alert("로그인 후 댓글 작성 가능합니다");
                return;
            }
            const res = await fetch(`/api/memories/${id}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(user ? { "x-user-id": user.id } : {})
                },
                body: JSON.stringify({ text })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.message || "댓글 작성 실패");
                return;
            }
            const newComment = await res.json();
            mem.commentList = mem.commentList || [];
            mem.commentList.push(newComment);
            mem.comments = mem.commentList.length;
            setDetail(mem);
            textArea.value = "";
        });
    });
})();
