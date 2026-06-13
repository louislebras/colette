document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".mobile-menu-toggle");
  const overlay = document.querySelector(".mobile-menu");
  const closeBtn = document.querySelector(".mobile-menu-close");
  const menuLinks = overlay?.querySelectorAll("a");

  if (!menuBtn || !overlay) return;

  const closeMenu = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-menu-open");
  };

  menuBtn.addEventListener("click", () => {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-menu-open");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeMenu);
  }

  menuLinks?.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) closeMenu();
  });
});
