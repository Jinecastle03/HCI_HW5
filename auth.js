function getCurrentUser() {
  const raw = localStorage.getItem("yb-user");
  return raw ? JSON.parse(raw) : null;
}

// ✅ main.js 등에서 쓰는 이름으로 alias 제공
function getUser() {
  return getCurrentUser();
}


function applyNavAuth() {
  const user = getCurrentUser();
  const navAuth = document.getElementById("nav-auth");
  const navSignup = document.getElementById("nav-signup");
  const navUser = document.getElementById("nav-user");
  const navMypage = document.getElementById("nav-mypage");

  if (user) {
    if (navAuth) {
      navAuth.textContent = "로그아웃";
      navAuth.href = "#";
      navAuth.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("yb-user");
        window.location.href = "login.html";
      }, { once: true });
    }
    if (navSignup) navSignup.classList.add("hidden");
    if (navUser) {
      navUser.classList.remove("hidden");
      navUser.textContent = `${user.username}으로 로그인`;
    }
    if (navMypage) navMypage.classList.remove("hidden");
  } else {
    if (navUser) navUser.classList.add("hidden");
    if (navAuth) {
      navAuth.textContent = "로그인";
      navAuth.href = "login.html";
    }
    if (navSignup) navSignup.classList.remove("hidden");
    if (navMypage) navMypage.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", applyNavAuth);
