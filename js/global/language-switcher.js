document.addEventListener("DOMContentLoaded", () => {
  const languageButtons = document.querySelectorAll(".language-button");
  const languagePopups = document.querySelectorAll(".language-popup");
  const languageOptions = document.querySelectorAll(".language-option");

  const currentPath = window.location.pathname;
  const langRegex = /^\/([a-z]{2})(\/|$)/;
  const currentLangMatch = currentPath.match(langRegex);
  const currentLang = currentLangMatch ? currentLangMatch[1] : "en"; // langue par défaut sans slug

  // === gestion ouverture/fermeture popups ===
  languageButtons.forEach((button, index) => {
    const popup = languagePopups[index];
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isVisible = popup.classList.contains("visible");
      languagePopups.forEach((p) => {
        p.classList.remove("visible");
        p.style.opacity = "0";
        p.style.zIndex = "0";
      });
      if (!isVisible) {
        popup.classList.add("visible");
        popup.style.opacity = "1";
        popup.style.zIndex = "100";
      }
    });

    document.addEventListener("click", (event) => {
      if (!popup.contains(event.target) && !button.contains(event.target)) {
        popup.classList.remove("visible");
        popup.style.opacity = "0";
        popup.style.zIndex = "0";
      }
    });
  });

  languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
      // Toujours récupérer l’URL ACTUELLE (SPA = elle change sans reload)
      const currentPath = location.pathname;

      const langRegex = /^\/([a-z]{2})(\/|$)/;
      const currentLangMatch = currentPath.match(langRegex);
      const currentLang = currentLangMatch ? currentLangMatch[1] : "en";

      const selectedLang = option.dataset.lang || "en";
      sessionStorage.setItem("manualLangSelected", "true");

      let newPath = currentPath;

      if (currentLang !== selectedLang) {
        if (selectedLang === "en") {
          // Retire le slug
          newPath = currentPath.replace(langRegex, "/");
        } else {
          // Ajoute ou remplace
          if (currentLangMatch) {
            newPath = currentPath.replace(langRegex, `/${selectedLang}/`);
          } else {
            newPath = `/${selectedLang}${
              currentPath.startsWith("/") ? currentPath : "/" + currentPath
            }`;
          }
        }
      }

      newPath = newPath.replace(/\/{2,}/g, "/");

      // Laisser le navigateur faire un vrai reload
      window.location.href = newPath;
    });
  });
});
