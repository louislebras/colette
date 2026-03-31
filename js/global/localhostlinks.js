document.addEventListener("DOMContentLoaded", () => {
  const isLocalhost = location.hostname === "localhost";

  if (!isLocalhost) return; // ✅ Active uniquement en local

  document.body.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    // Si ce n’est pas un lien ou un lien externe, on ignore
    if (
      !link ||
      link.target === "_blank" ||
      (link.href.startsWith("http") && !link.href.includes(location.host))
    )
      return;

    const url = new URL(link.href);

    // Si le lien pointe vers une page de ton site, sans /dist, on le modifie
    if (
      url.hostname === location.hostname &&
      !url.pathname.startsWith("/dist/")
    ) {
      event.preventDefault(); // Bloque le comportement natif

      const newPath = "/dist" + url.pathname;
      const newUrl = newPath + url.search + url.hash;

      // Redirige vers la nouvelle URL
      window.location.href = newUrl;
    }
  });
});
