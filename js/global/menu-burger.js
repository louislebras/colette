document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".menu-pages");
  const overlay = document.querySelector(".nav-pages-overlay");
  const closeBtn = document.querySelector(".nav-pages-close");

  if (!menuBtn || !overlay) return;

  const closeMenu = () => {
    overlay.classList.remove("visible");
    document.body.classList.remove("no-scroll");
  };

  // ✅ OUVERTURE
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    overlay.classList.add("visible");
    document.body.classList.add("no-scroll");
  });

  // ✅ CLIC EN DEHORS
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeMenu();
    }
  });

  // ✅ BOUTON CLOSE
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
    });
  }

  // ✅ ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });
});
