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

  async function login(username, password) {
    const res = await fetch(`/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return null;
    return res.json();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const signupBtn = document.getElementById("signup-btn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();
      const user = await login(username, password);
      if (!user) {
        showToast("로그인 실패");
        return;
      }
      saveUser(user);
      showToast("로그인 성공");
      setTimeout(() => window.location.href = "main.html", 500);
    });

    signupBtn.addEventListener("click", () => window.location.href = "signup.html");
  });
})();
