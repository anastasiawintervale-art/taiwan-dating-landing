document.querySelectorAll("[data-line-link]").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", "LineClick", { line_target: link.dataset.lineTarget || "primary" });
      window.fbq("track", "Lead", { content_name: `LINE click - ${link.dataset.lineTarget || "primary"}` });
    }
  });
});

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const mobileLine = document.querySelector(".mobile-line");
const lineRevealPoint = document.querySelector("#about");

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

function updateMobileLineVisibility() {
  if (!mobileLine || !lineRevealPoint) return;
  const shouldShow = window.scrollY + window.innerHeight >= lineRevealPoint.offsetTop + 80;
  mobileLine.classList.toggle("is-visible", shouldShow);
  mobileLine.setAttribute("aria-hidden", String(!shouldShow));
  mobileLine.tabIndex = shouldShow ? 0 : -1;
}

window.addEventListener("scroll", updateMobileLineVisibility, { passive: true });
window.addEventListener("resize", updateMobileLineVisibility);
updateMobileLineVisibility();

document.getElementById("year").textContent = new Date().getFullYear();
