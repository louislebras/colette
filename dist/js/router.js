import { GOOGLE_ANALYTICS_ID } from "../config/analytics.js";

const availableLanguages = ["en"];
const forceFullReloadFor = ["/archives"];
const routerCache = {};

document.addEventListener("DOMContentLoaded", async () => {
  const contentContainer = document.querySelector("#pageContent");
  if (!contentContainer) return;

  // === CRÉATION DU VOILE DE TRANSITION ===
  const overlay = document.createElement("div");
  overlay.id = "pageTransitionOverlay";
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 1000;
  `;

  // Wrapper pour position relative
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  contentContainer.parentNode.insertBefore(wrapper, contentContainer);
  wrapper.appendChild(contentContainer);
  wrapper.appendChild(overlay);

  // === SAUVEGARDE DES LIENS HORS #pageContent (UNIQUEMENT <a>) ===
  const staticLinks = [];
  document.querySelectorAll("a:not(#pageContent a)").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && !href.startsWith("http") && !href.startsWith("#")) {
      const absolute = new URL(href, window.location.origin).pathname;
      staticLinks.push({ el: a, baseHref: absolute });
    }
  });

  // === LAYOUT MAP ===
  let layoutMap = [];
  try {
    const resp = await fetch("/layout-map.json");
    layoutMap = await resp.json();
  } catch {
    console.warn("[Router] layout-map.json introuvable.");
  }

  // === UTILITAIRES ===
  function normalizePath(url) {
    const tmp = new URL(url, window.location.origin);
    let path = tmp.pathname.replace(/\/{2,}/g, "/");
    if (path.endsWith("/")) path = path.slice(0, -1);
    if (!path) path = "/";
    return path;
  }

  function getGroupForPath(normPath) {
    for (const entry of layoutMap) {
      if (entry.pages.some((page) => normPath === page)) return entry.group;
    }
    return "default";
  }

  // Ajoute /dist uniquement en local
  function addDistIfLocal(url) {
    if (location.hostname !== "localhost") return url;
    try {
      const parsed = new URL(url, window.location.origin);
      if (!parsed.pathname.startsWith("/dist/")) {
        parsed.pathname = "/dist" + parsed.pathname;
      }
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return url;
    }
  }

  // Langue courante à partir de l'URL
  function getCurrentLang() {
    const match = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    return match ? match[1] : "en";
  }

  function resolveHref(href) {
    if (href.startsWith("http") || href.startsWith("#")) return href;

    href = href.replace(/\/+\.\.\/+/g, "/").replace(/\/{2,}/g, "/");

    const currentLang = getCurrentLang();

    // === 1) Cas où le lien contient déjà un slug explicite → on le respecte ===
    if (/^\/[a-z]{2}(\/|$)/.test(href)) {
      return href.replace(/\/{2,}/g, "/");
    }

    // === 2) Cas d'un lien racine ===
    if (!href || href === "/" || href === "/.." || href === "../") {
      return currentLang === "en" ? "/" : `/${currentLang}/`;
    }

    // === 3) Autres liens internes ===
    if (!/^\/[a-z]{2}\//.test(href) && currentLang !== "en") {
      href = `/${currentLang}${href.startsWith("/") ? href : "/" + href}`;
    }

    return href.replace(/\/{2,}/g, "/");
  }

  // Ré-applique le slug langue aux <a> statiques hors #pageContent
  function restoreStaticLinks() {
    const lang = getCurrentLang();
    const langPrefix = lang !== "en" ? `/${lang}` : "";
    staticLinks.forEach(({ el, baseHref }) => {
      const alreadyPrefixed =
        baseHref.startsWith(`/${lang}/`) || baseHref === `/${lang}`;
      const finalHref = alreadyPrefixed
        ? baseHref
        : `${langPrefix}${baseHref}`.replace(/\/{2,}/g, "/");
      el.setAttribute("href", finalHref);
    });
  }

  // === TITLE + META UNIQUEMENT (AUCUN TOUCHER AUX <link>) ===
  function updateMetaAndTitle(newDoc) {
    const newTitle = newDoc.querySelector("title");
    if (newTitle) document.title = newTitle.textContent;

    const oldMetas = Array.from(document.head.querySelectorAll("meta"));
    const newMetas = Array.from(newDoc.querySelectorAll("meta"));

    const newMetaMap = new Map(
      newMetas.map((m) => [
        m.getAttribute("name") || m.getAttribute("property"),
        m,
      ])
    );

    // remove metas qui n'existent plus
    oldMetas.forEach((m) => {
      const key = m.getAttribute("name") || m.getAttribute("property");
      if (key && !newMetaMap.has(key)) m.remove();
    });

    // upsert metas
    newMetas.forEach((m) => {
      const key = m.getAttribute("name") || m.getAttribute("property");
      if (!key) return;
      const existing = document.head.querySelector(
        `meta[name="${key}"], meta[property="${key}"]`
      );
      if (existing) existing.content = m.content;
      else document.head.appendChild(m.cloneNode(true));
    });
  }

  // === NETTOYAGE ===
  const activeTimeouts = new Set();
  const activeIntervals = new Set();
  const trackedListeners = [];

  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (
      this instanceof Node &&
      document.querySelector("#pageContent")?.contains(this)
    ) {
      trackedListeners.push({ target: this, type, listener, options });
    }
    originalAddEventListener.call(this, type, listener, options);
  };

  function clearAllTimeoutsAndIntervals() {
    activeTimeouts.forEach(clearTimeout);
    activeIntervals.forEach(clearInterval);
    activeTimeouts.clear();
    activeIntervals.clear();
  }

  function removeTrackedListeners() {
    trackedListeners.forEach(({ target, type, listener, options }) => {
      if (target && target.removeEventListener)
        target.removeEventListener(type, listener, options);
    });
    trackedListeners.length = 0;
  }

  function cleanupPreviousPage() {
    contentContainer.querySelectorAll("script").forEach((s) => s.remove());
    clearAllTimeoutsAndIntervals();
    removeTrackedListeners();
  }

  // === RE-EXECUTION DES SCRIPTS DE PAGE (#pageContent) ===
  async function executeScripts(container) {
    const scripts = Array.from(container.querySelectorAll("script"));
    for (const oldScript of scripts) {
      await new Promise((resolve) => {
        const newScript = document.createElement("script");
        for (const attr of oldScript.attributes) {
          newScript.setAttribute(attr.name, attr.value);
        }
        if (oldScript.src) {
          newScript.src = oldScript.src + "?v=" + Date.now();
          newScript.onload = resolve;
          newScript.onerror = resolve;
        } else {
          newScript.textContent = oldScript.textContent;
          resolve();
        }
        oldScript.replaceWith(newScript);
      });
    }
    document.dispatchEvent(new Event("pageScriptsLoaded"));
  }

  // === CHARGEMENT DYNAMIQUE AVEC VOILE ET HAUTEUR FIGÉE ===
  async function loadPage(targetUrl, pushToHistory = true) {
    const adjustedUrl = addDistIfLocal(targetUrl);
    const normTarget = normalizePath(adjustedUrl);
    const normCurrent = normalizePath(window.location.pathname);
    const currentGroup = getGroupForPath(normCurrent);
    const targetGroup = getGroupForPath(normTarget);

    if (
      currentGroup !== targetGroup ||
      forceFullReloadFor.some((p) => normTarget.startsWith(p))
    ) {
      window.location.href = adjustedUrl;
      return;
    }

    // === ÉTAPE 1 : FIGER LA HAUTEUR ACTUELLE ===
    const currentHeight = contentContainer.offsetHeight;
    contentContainer.style.minHeight = `${currentHeight}px`;
    contentContainer.style.maxHeight = `${currentHeight}px`;
    contentContainer.style.overflow = "hidden";

    // === ÉTAPE 2 : AFFICHER LE VOILE ===
    overlay.style.pointerEvents = "auto";
    overlay.style.opacity = "1";

    // Attendre que le voile soit complètement opaque
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      let newContent;

      // === ÉTAPE 3 : SWAP CACHÉ DERRIÈRE LE VOILE ===
      if (routerCache[normTarget]) {
        cleanupPreviousPage();
        contentContainer.innerHTML = routerCache[normTarget];
        window.scrollTo(0, 0);
        updateMetaAndTitle(document);
        restoreStaticLinks();
        await executeScripts(contentContainer);
      } else {
        // FETCH
        const response = await fetch(adjustedUrl);
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        newContent = doc.querySelector("#pageContent");
        if (!newContent) throw new Error("Pas de #pageContent");

        routerCache[normTarget] = newContent.innerHTML;

        cleanupPreviousPage();
        contentContainer.innerHTML = newContent.innerHTML;
        window.scrollTo(0, 0);

        updateMetaAndTitle(doc);
        restoreStaticLinks();

        if (typeof gtag === "function" && GOOGLE_ANALYTICS_ID) {
          gtag("config", GOOGLE_ANALYTICS_ID, {
            page_path: normTarget,
            page_title: document.title,
          });
        }
        if (typeof window.plausible === "function") plausible("pageview");

        await executeScripts(contentContainer);
      }

      // === ÉTAPE 4 : LIBÉRER LA HAUTEUR ===
      contentContainer.style.minHeight = "";
      contentContainer.style.maxHeight = "";
      contentContainer.style.overflow = "";

      // === ÉTAPE 5 : RETIRER LE VOILE ===
      overlay.style.opacity = "0";
      await new Promise((resolve) => setTimeout(resolve, 300));
      overlay.style.pointerEvents = "none";

      if (pushToHistory) {
        history.pushState({ path: adjustedUrl }, "", adjustedUrl);
      }
    } catch (err) {
      console.error("[Router] Erreur :", err);
      // En cas d'erreur, libérer la hauteur et retirer le voile
      contentContainer.style.minHeight = "";
      contentContainer.style.maxHeight = "";
      contentContainer.style.overflow = "";
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      window.location.href = adjustedUrl;
    }
  }

  // === INTERCEPTION DES <a> ===
  document.addEventListener("click", (e) => {
    // 🚫 1. Ne jamais intercepter le changement de langue (no-spa)
    if (e.target.closest(".no-spa")) {
      return;
    }

    // 2. Interception standard des <a>
    const link = e.target.closest("a");
    if (!link) return;

    let href = link.getAttribute("href") || "";
    if (!href) return;

    // 3. Liens externes ou ancres → laisser passer
    if (
      href.startsWith("http") ||
      href.startsWith("#") ||
      link.target === "_blank"
    ) {
      return;
    }

    // 4. Navigation SPA classique
    e.preventDefault();
    href = resolveHref(href);
    if (href === window.location.pathname) return;

    loadPage(href);
  });

  // === BOUTON RETOUR ===
  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.path) loadPage(e.state.path, false);
    else window.location.reload();
  });

  // === INIT ===
  restoreStaticLinks();
  document.dispatchEvent(new Event("pageScriptsLoaded"));
});
