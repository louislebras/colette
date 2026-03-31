// // js/modal-manager.js
// document.addEventListener(""pageScriptsLoaded"", () => {
//   const modalRoot = document.querySelector("#modals-root");

//   if (!modalRoot) {
//     console.error("[MODAL] #modals-root non trouvé.");
//     return;
//   }

//   const openedModals = new Set();

//   // Racines injectées par base.html
//   const ROOT =
//     (typeof window !== "undefined" && window.__ROOT__) !== undefined
//       ? window.__ROOT__
//       : "/";
//   const DEFAULT_LANG =
//     (typeof window !== "undefined" && window.__DEFAULT_LANG__) || "en";

//   // Construit les chemins candidats pour une modale donnée
//   // - si lang !== DEFAULT_LANG → essaie d'abord <ROOT><lang>/modals/<name>/index.html
//   // - fallback toujours sur <ROOT>modals/<name>/index.html
//   function resolveModalPaths(modalName) {
//     const lang = (document.documentElement.getAttribute("lang") || "").trim();
//     const paths = [];
//     if (lang && lang.toLowerCase() !== DEFAULT_LANG.toLowerCase()) {
//       paths.push(`${ROOT}${lang}/modals/${modalName}/index.html`);
//     }
//     paths.push(`${ROOT}modals/${modalName}/index.html`);
//     return paths;
//   }

//   // Essaie une liste d'URLs successivement et renvoie { html, base }
//   function fetchFirstHtml(paths) {
//     return paths.reduce(
//       (prev, url) =>
//         prev.catch(() =>
//           fetch(url).then((res) => {
//             if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
//             return res.text().then((html) => ({
//               html,
//               base: url.replace(/index\.html$/, ""),
//             }));
//           })
//         ),
//       Promise.reject(new Error("no-candidate"))
//     );
//   }

//   function openModal(modalName) {
//     if (openedModals.has(modalName)) {
//       console.warn(`[MODAL] ${modalName} déjà ouverte, skipping.`);
//       return;
//     }

//     console.log(`[MODAL] Début du chargement de ${modalName}...`);

//     // Spécifique cookies : ne pas rouvrir si consentement déjà enregistré
//     if (modalName === "cookies" && localStorage.getItem("cookieConsent")) {
//       console.log(
//         `[MODAL] ${modalName} bloquée, consentement déjà enregistré.`
//       );
//       return;
//     }

//     const candidates = resolveModalPaths(modalName);

//     fetchFirstHtml(candidates)
//       .then(({ html, base }) => {
//         const wrapper = document.createElement("div");
//         wrapper.innerHTML = html;

//         const modal = wrapper.querySelector(".modal");
//         if (!modal) {
//           console.error(
//             `[MODAL] Structure de modal incorrecte pour ${modalName}`
//           );
//           return;
//         }

//         modal.setAttribute("data-modal-name", modalName);
//         modal.classList.add("modal-open");
//         modalRoot.appendChild(wrapper);

//         console.log(
//           `[MODAL] HTML de ${modalName} chargé depuis ${base}index.html.`
//         );

//         // Charger le JS associé depuis le même dossier que l'HTML retenu (s'il existe)
//         const scriptPath = `${base}index.js`;
//         return fetch(scriptPath)
//           .then((resp) => (resp.ok ? resp.text() : ""))
//           .then((scriptContent) => {
//             if (scriptContent) {
//               try {
//                 const script = document.createElement("script");
//                 script.textContent = `(function(){ ${scriptContent} })();`;
//                 document.body.appendChild(script);
//                 console.log(
//                   `[MODAL] Script de ${modalName} exécuté (${scriptPath}).`
//                 );
//               } catch (e) {
//                 console.error(
//                   `[MODAL] Erreur d'exécution du script pour ${modalName}:`,
//                   e
//                 );
//               }
//             } else {
//               console.log(
//                 `[MODAL] Pas de script dédié pour ${modalName} (ok).`
//               );
//             }
//           });
//       })
//       .then(() => {
//         openedModals.add(modalName);
//         console.log(`[MODAL] ${modalName} complètement chargée.`);
//       })
//       .catch((error) => {
//         console.error(`[MODAL] Erreur pour ${modalName}:`, error);
//       });
//   }

//   function closeModal(modalName) {
//     console.log(`[MODAL] Tentative de fermeture de ${modalName}.`);
//     const container = modalRoot.querySelector(
//       `.modal[data-modal-name="${modalName}"]`
//     )?.parentElement;
//     if (!container) {
//       console.error(`[MODAL] Conteneur de ${modalName} non trouvé.`);
//       return;
//     }

//     const modal = container.querySelector(".modal");
//     if (modal) {
//       modal.classList.add("modal-closing");
//       console.log(`[MODAL] Animation de fermeture démarrée pour ${modalName}.`);
//     }

//     setTimeout(() => {
//       container.remove();
//       openedModals.delete(modalName);
//       console.log(`[MODAL] ${modalName} fermée.`);
//     }, 200);
//   }

//   function closeOnOutsideClick(event) {
//     const modals = modalRoot.querySelectorAll(".modal");
//     if (!modals.length) return;

//     modals.forEach((modal) => {
//       const disableClose = modal.hasAttribute("data-disable-close");
//       if (!disableClose && !modal.contains(event.target)) {
//         closeModal(modal.getAttribute("data-modal-name"));
//       }
//     });
//   }

//   // Ouvrir via .open-modal-<name>
//   document.addEventListener("click", (event) => {
//     const openBtn = event.target.closest("[class^='open-modal-']");
//     if (openBtn) {
//       const modalName = openBtn.classList[0].replace("open-modal-", "");
//       openModal(modalName);
//     }
//   });

//   // Bouton interne de fermeture
//   modalRoot.addEventListener("click", (event) => {
//     if (event.target.classList.contains("close-modal")) {
//       const modal = event.target.closest(".modal");
//       if (modal) {
//         closeModal(modal.getAttribute("data-modal-name"));
//       }
//     }
//   });

//   // Fermer au clic extérieur
//   document.addEventListener("click", closeOnOutsideClick);

//   // Auto-modales au chargement (ex: cookies)
//   if (window.modalConfig && window.modalConfig.autoModals) {
//     window.modalConfig.autoModals.forEach((modalName) => {
//       openModal(modalName);
//     });
//   }

//   // Expose fermeture globale
//   window.closeModal = closeModal;
//   console.log("[MODAL] Manager initialisé, closeModal exposé globalement.", {
//     ROOT,
//     DEFAULT_LANG,
//   });
// });

// js/modal-manager.js

document.addEventListener("DOMContentLoaded", () => {
  const modalRoot = document.querySelector("#modals-root");
  if (!modalRoot) {
    console.error("[MODAL] #modals-root non trouvé.");
    return;
  }

  const openedModals = new Set();
  const DEFAULT_LANG =
    (typeof window !== "undefined" && window.__DEFAULT_LANG__) || "en";

  // --- Détection racine absolue ---
  function getBaseRoot() {
    // Exemple en local : http://localhost:3000/dist/
    // Exemple en prod : https://monsite.com/
    const { origin, pathname } = window.location;
    // Si tu sers depuis /dist/, on garde /dist/, sinon juste /
    const rootMatch = pathname.match(/^\/[^/]+\/?/);
    let base =
      origin + (rootMatch && rootMatch[0] === "/dist/" ? "/dist/" : "/");
    if (!base.endsWith("/")) base += "/";
    return base;
  }
  const ABS_ROOT = getBaseRoot();

  // --- Résolution des URLs modals ---
  function resolveModalUrls(modalName) {
    const lang = (document.documentElement.getAttribute("lang") || "").trim();
    const urls = [];
    if (lang && lang.toLowerCase() !== DEFAULT_LANG.toLowerCase()) {
      urls.push(`${ABS_ROOT}${lang}/modals/${modalName}/index.html`);
    }
    urls.push(`${ABS_ROOT}modals/${modalName}/index.html`);
    return urls;
  }

  // --- Essayer les candidats ---
  function fetchFirstHtml(urls) {
    return urls.reduce(
      (prev, url) =>
        prev.catch(() =>
          fetch(url).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            return res.text().then((html) => ({
              html,
              base: url.replace(/index\.html$/, ""),
            }));
          })
        ),
      Promise.reject(new Error("no-candidate"))
    );
  }

  // // --- Ouvrir ---
  function openModal(modalName) {
    if (openedModals.has(modalName)) return;

    if (modalName === "cookies" && localStorage.getItem("cookieConsent")) {
      return;
    }

    const candidates = resolveModalUrls(modalName);

    fetchFirstHtml(candidates)
      .then(({ html, base }) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const modal = wrapper.querySelector(".modal");
        if (!modal) return;

        modal.setAttribute("data-modal-name", modalName);
        modal.classList.add("modal-open");
        modalRoot.appendChild(wrapper);

        const jsUrl = `${base}index.js`;
        return fetch(jsUrl)
          .then((r) => (r.ok ? r.text() : ""))
          .then((code) => {
            if (!code) return;
            const s = document.createElement("script");
            s.textContent = `(function(){ ${code} })();`;
            document.body.appendChild(s);
          });
      })
      .then(() => {
        openedModals.add(modalName);
      })
      .catch((err) =>
        console.error(`[MODAL] Erreur ouverture ${modalName}:`, err)
      );
  }

  // --- Fermer ---
  function closeModal(modalName) {
    const container = modalRoot.querySelector(
      `.modal[data-modal-name="${modalName}"]`
    )?.parentElement;
    if (!container) return;
    const modal = container.querySelector(".modal");
    if (modal) modal.classList.add("modal-closing");
    setTimeout(() => {
      container.remove();
      openedModals.delete(modalName);
    }, 200);
  }

  // --- Clics ---
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[class^='open-modal-']");
    if (btn) {
      const name = btn.classList[0].replace("open-modal-", "");
      openModal(name);
    }
  });

  modalRoot.addEventListener("click", (e) => {
    if (e.target.classList.contains("close-modal")) {
      const modal = e.target.closest(".modal");
      if (modal) closeModal(modal.getAttribute("data-modal-name"));
    }
  });

  // Fermeture clic extérieur
  document.addEventListener("click", (e) => {
    const modals = modalRoot.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (
        !modal.hasAttribute("data-disable-close") &&
        !modal.contains(e.target)
      ) {
        closeModal(modal.getAttribute("data-modal-name"));
      }
    });
  });

  // Auto-modals
  if (window.modalConfig && window.modalConfig.autoModals) {
    window.modalConfig.autoModals.forEach((name) => openModal(name));
  }

  window.closeModal = closeModal;
});
