import {
  availableLanguages,
  getDefaultLanguage,
  isLanguageAvailable,
} from "../../config/config-app.js";

document.addEventListener("DOMContentLoaded", () => {
  const userLang = navigator.language || navigator.userLanguage;
  const langPrefix = userLang.split("-")[0];

  const targetLang = isLanguageAvailable(langPrefix)
    ? langPrefix
    : getDefaultLanguage();

  const currentPath = window.location.pathname;
  const isLocal =
    window.location.hostname === "localhost" ||
    /^[0-9.]+$/.test(window.location.hostname);

  const alreadyRedirected = sessionStorage.getItem("langRedirected");
  const manualLangSelected = sessionStorage.getItem("manualLangSelected");

  if (!alreadyRedirected && !manualLangSelected) {
    if (isLocal) {
      const distIndex = currentPath.indexOf("/dist/");
      if (distIndex !== -1) {
        const pathAfterDist = currentPath.substring(distIndex + 6);
        const langInPath = availableLanguages.some((lang) =>
          pathAfterDist.startsWith(`${lang}/`)
        );

        if (!langInPath && targetLang !== getDefaultLanguage()) {
          const newPath = `/dist/${targetLang}/${pathAfterDist}`;
          sessionStorage.setItem("langRedirected", "true");
          sessionStorage.setItem("manualLangSelected", "true");
          window.location.replace(newPath);
        }
      }
    } else {
      const isLangPath = availableLanguages.some((lang) =>
        currentPath.startsWith(`/${lang}`)
      );

      if (!isLangPath && targetLang !== getDefaultLanguage()) {
        const newPath = `/${targetLang}${
          currentPath.startsWith("/") ? currentPath : "/" + currentPath
        }`;
        sessionStorage.setItem("langRedirected", "true");
        sessionStorage.setItem("manualLangSelected", "true");
        window.location.replace(newPath);
      }
    }
  }
});
