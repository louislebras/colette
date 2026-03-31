// config/config-app.js

// URL de base du site
const baseUrl = "https://archivesbottega.com";

// Liste des langues disponibles
const availableLanguages = ["en"];

// Langue par défaut (utilisée si aucune langue n'est spécifiée ou si la langue de l'utilisateur n'est pas disponible)
const defaultLanguage = "en";

// Langues à traduire automatiquement via l'API
const autoTranslatedLanguages = [];

// Fonction pour vérifier si une langue est disponible
function isLanguageAvailable(lang) {
  return availableLanguages.includes(lang);
}

// Fonction pour obtenir la langue par défaut
function getDefaultLanguage() {
  return defaultLanguage;
}

// Fonction pour vérifier si une langue est la langue par défaut
function isDefaultLanguage(lang) {
  return lang === defaultLanguage;
}

// Fonction pour ajouter un slug de langue à un chemin (si nécessaire)
function prependLangSlug(href, lang) {
  if (isDefaultLanguage(lang)) return href;
  if (href.startsWith("/")) {
    return `/${lang}${href}`;
  }
  return href;
}

// Fonction pour retirer le slug de langue d'un chemin
function removeLangSlug(path) {
  return path
    .replace(new RegExp(`^/(${availableLanguages.join("|")})(/|$)`), "/")
    .replace(/\/{2,}/g, "/");
}

export {
  baseUrl,
  availableLanguages,
  defaultLanguage,
  autoTranslatedLanguages,
  isLanguageAvailable,
  getDefaultLanguage,
  isDefaultLanguage,
  prependLangSlug,
  removeLangSlug,
};
