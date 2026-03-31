document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.querySelector(".search-button");
  const overlay = document.querySelector(".search-overlay");
  const input = document.querySelector(".search-input");
  const resultsContainer = document.querySelector(".search-results");
  const template = document.querySelector("#search-result-template")?.innerHTML;

  const spotSearch = document.querySelector(".spot-search");
  const suggestionsTitle = document.querySelector(".search-suggestions");

  const lang = document.documentElement.lang || "en";
  const availableLangs = ["en", "fr"];
  let unifiedData = [];
  let hasLoaded = false;

  const isMobile = () => window.innerWidth < 850;

  const normalize = (text) =>
    text
      ? text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[’‘']/g, "'")
          .replace(/[^a-z0-9\s,'’\-]/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";

  async function loadAllSearchData() {
    if (hasLoaded) return;
    hasLoaded = true;

    const isLocal =
      window.location.href.includes("localhost") ||
      window.location.href.includes("/dist/");
    const basePath = isLocal ? "/dist/search" : "/search";

    try {
      const langFiles = await Promise.all(
        availableLangs.map(async (lng) => {
          const res = await fetch(`${basePath}/${lng}.json`);
          if (!res.ok) return [];
          const data = await res.json();
          return data.map((p) => {
            let image = p.image || "";
            if (image.startsWith("../")) {
              image = image.replace(/^(\.\.\/)+/, "/");
            } else if (!image.startsWith("/")) {
              image = "/" + image;
            }

            return { ...p, image, __lang: lng };
          });
        })
      );

      const allProducts = langFiles.flat();
      const map = new Map();

      for (const p of allProducts) {
        const key = p.link; // clé unique = link

        if (!map.has(key)) {
          map.set(key, {
            link: p.link,
            image: p.image,
            highlighted: p["search-highlighted"],
            variants: [],
          });
        }

        map.get(key).variants.push({
          lang: p.__lang,
          name: p.name,
          brand: p.brand,
          description: p.description || "",
          types: Array.isArray(p.types) ? p.types : p.type ? [p.type] : [],
        });
      }

      unifiedData = Array.from(map.values());
      displayHighlighted();
    } catch (err) {
      console.error("❌ Error loading search data:", err);
    }
  }

  function displayHighlighted() {
    if (!unifiedData.length || !template || !resultsContainer) return;
    const highlighted = unifiedData.filter((p) => p.highlighted);
    renderResults(highlighted);

    // barre vide = suggestions visibles
    if (spotSearch) spotSearch.style.display = "";
    if (suggestionsTitle) suggestionsTitle.style.display = "";
  }

  function handleSearch(e) {
    const q = normalize(e.target.value);
    const hasQuery = q.length > 0;

    // 🔁 toggle Suggestions / SpotSearch
    if (spotSearch) spotSearch.style.display = hasQuery ? "none" : "";
    if (suggestionsTitle)
      suggestionsTitle.style.display = hasQuery ? "none" : "";

    if (!q) {
      // champ vidé -> retour aux produits highlightés + suggestions
      displayHighlighted();
      return;
    }

    const results = unifiedData
      .map((product) => {
        let score = 0;

        for (const variant of product.variants) {
          const name = normalize(variant.name);
          const brand = normalize(variant.brand);
          const langBoost = variant.lang === lang ? 1.5 : 1;

          // 🎯 SEULEMENT name + brand décident si le produit est éligible
          if (name.includes(q)) score += 10 * langBoost;
          if (brand.includes(q)) score += 8 * langBoost;
        }

        if (score === 0) return null; // aucun match => produit ignoré

        return { product, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.product);

    renderResults(results);
  }

  function renderResults(list) {
    if (!template || !resultsContainer) return;

    const existing = new Map();
    resultsContainer.querySelectorAll(".search-item").forEach((el) => {
      existing.set(el.dataset.link, el);
    });

    const visibleLinks = new Set(list.map((p) => p.link));

    existing.forEach((el, link) => {
      if (!visibleLinks.has(link)) el.remove();
    });

    for (const item of list) {
      if (existing.has(item.link)) continue;

      const variant =
        item.variants.find((v) => v.lang === lang) ||
        item.variants.find((v) => v.lang === "en") ||
        item.variants[0];

      const types = Array.isArray(variant.types)
        ? variant.types.join(", ")
        : "";

      const wrapper = document.createElement("div");
      wrapper.innerHTML = template
        .replaceAll("[link]", item.link)
        .replaceAll("[image]", item.image)
        .replaceAll("[name]", variant.name)
        .replaceAll("[brand]", variant.brand)
        .replaceAll("[type]", types);

      const el = wrapper.firstElementChild;
      el.dataset.link = item.link;
      resultsContainer.appendChild(el);
    }
  }

  const openSearch = () => {
    if (!overlay) return;
    overlay.classList.add("visible");
    document.body.classList.add("no-scroll");

    // état initial : suggestions visibles, champ vide => highlights
    if (spotSearch) spotSearch.style.display = "";
    if (suggestionsTitle) suggestionsTitle.style.display = "";

    loadAllSearchData();

    if (!isMobile() && input) {
      setTimeout(() => input.focus(), 80);
    }
  };

  const closeSearch = () => {
    if (!overlay) return;
    overlay.classList.remove("visible");
    document.body.classList.remove("no-scroll");

    if (input) {
      input.value = "";
    }

    if (spotSearch) spotSearch.style.display = "";
    if (suggestionsTitle) suggestionsTitle.style.display = "";

    displayHighlighted();
  };

  if (searchBtn && overlay) {
    searchBtn.addEventListener("click", openSearch);
  }

  if (input) {
    input.addEventListener("input", handleSearch);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("visible")) {
      closeSearch();
    }
  });

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeSearch();
      }
    });
  }
});
