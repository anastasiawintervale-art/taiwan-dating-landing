document.querySelectorAll("[data-line-link]").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", { content_name: "LINE click" });
    }
  });
});

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");

menuButton.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("menu-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "關閉選單" : "開啟選單");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "開啟選單");
  });
});

document.getElementById("year").textContent = new Date().getFullYear();
