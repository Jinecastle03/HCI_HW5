(function () {
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 1600);
  }

  function saveUser(user) {
    localStorage.setItem("yb-user", JSON.stringify(user));
  }

  async function signup(username, password) {
    const res = await fetch(`/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return null;
    return res.json();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signup-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("signup-username").value.trim();
      const password = document.getElementById("signup-password").value.trim();
      const user = await signup(username, password);
      if (!user) {
        showToast("회원가입 실패");
        return;
      }
      saveUser(user);
      showToast("회원가입 성공");
      setTimeout(() => window.location.href = "main.html", 500);
    });
  });
})();
