if (window.location.hash === "#line") {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  window.scrollTo(0, 0);
  window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });
}

document.querySelectorAll("[data-line-link]").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", "LineClick", { line_target: "footer" });
      window.fbq("track", "Lead", { content_name: "LINE click - footer" });
    }
  });
});

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const mobileLine = document.querySelector(".mobile-line");
const lineRevealPoint = document.querySelector("#story");
const lineSection = document.querySelector("#line");

mobileLine?.addEventListener("click", () => {
  lineSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", "LineSectionView", { source: "mobile_sticky" });
  }
});

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
  if (!mobileLine || !lineRevealPoint || !lineSection) return;
  const passedRevealPoint = window.scrollY + window.innerHeight >= lineRevealPoint.offsetTop + 80;
  const beforeLineSection = lineSection.getBoundingClientRect().top > window.innerHeight - 80;
  const shouldShow = passedRevealPoint && beforeLineSection;
  mobileLine.classList.toggle("is-visible", shouldShow);
  mobileLine.setAttribute("aria-hidden", String(!shouldShow));
  mobileLine.tabIndex = shouldShow ? 0 : -1;
}

window.addEventListener("scroll", updateMobileLineVisibility, { passive: true });
window.addEventListener("resize", updateMobileLineVisibility);
updateMobileLineVisibility();

document.getElementById("year").textContent = new Date().getFullYear();
