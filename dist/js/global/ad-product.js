document.addEventListener("DOMContentLoaded", () => {
  const ad = document.querySelector(".ad-partner-sponsor-products");
  if (!ad) return;

  // Fonction de placement réutilisable
  function injectAd() {
    const placeholder = document.querySelector(".placement-ad-product");
    if (!placeholder) return; // Rien à faire si la page ne le contient pas
    if (placeholder.contains(ad)) return; // Évite le double placement

    placeholder.replaceWith(ad);
    console.log("[AD] Sponsor block injected into page content.");
  }

  // 1️⃣ Essaye immédiatement (si on est déjà sur une page concernée)
  injectAd();

  // 2️⃣ Réessaye à chaque nouveau chargement de page dynamique
  document.addEventListener("pageScriptsLoaded", injectAd);
});
