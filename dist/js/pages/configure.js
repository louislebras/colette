// ── SHARED NAVIGATION (à importer depuis shared.js) ──
// navigate(), toggleFaq(), goToConfig() définis dans shared.js

// ── CONFIGURATEUR STATE ──
const cfgState = {
  offre: { val: "basique", uplift: 0 },
  surface: { val: "45", base: 229 },
  urgence: { val: "48h", add: 0 },
  salissure: { val: "normal", add: 0 },
  rangement: { val: "normal", add: 0 },
  meuble: { val: "meuble", add: 0 },
  occup: { val: "vide", add: 0 },
  animaux: { val: "non", add: 0 },
  vitres: { val: "standard", add: 0 },
  sdb: { val: "1", add: 0 },
  wc: { val: "1", add: 0 },
  cuisine: { val: "standard", add: 0 },
  extras: {},
};

function selectRadio(el, group) {
  document
    .querySelectorAll(`[data-group="${group}"]`)
    .forEach((o) => o.classList.remove("selected"));
  el.classList.add("selected");
  if (group === "offre") {
    cfgState.offre = {
      val: el.dataset.val,
      uplift: parseInt(el.dataset.uplift),
    };
  } else if (group === "surface") {
    cfgState.surface = { val: el.dataset.val, base: parseInt(el.dataset.base) };
  } else {
    cfgState[group] = { val: el.dataset.val, add: parseInt(el.dataset.add) };
  }
  updatePrice();
}

function toggleCheck(el) {
  el.classList.toggle("selected");
  const cb = el.querySelector(".config-checkbox");
  if (el.classList.contains("selected")) {
    cfgState.extras[el.dataset.key] = parseInt(el.dataset.add);
    cb.textContent = "✓";
  } else {
    delete cfgState.extras[el.dataset.key];
    cb.textContent = "";
  }
  updatePrice();
}

const offreLabels = {
  basique: "Reset Basique",
  hygiene: "Reset Hygiène",
  edl: "État des lieux",
};
const surfaceLabels = {
  30: "0–30 m²",
  45: "30–45 m²",
  60: "45–60 m²",
  80: "60–80 m²",
  100: "80–100 m²",
};
const optLabels = {
  urgence: { demain: "Urgence demain", jour: "Urgence jour même" },
  salissure: { sale: "Saleté +", "tres-sale": "Saleté ++" },
  rangement: { encombre: "Encombré", desordre: "Désordre" },
  meuble: { vide: "Logement vide" },
  occup: { occupe: "Occupé" },
  animaux: { poils: "Animaux", beaucoup: "Animaux ++" },
  vitres: { "2baies": "2 baies vitrées", "3baies": "3+ baies vitrées" },
  sdb: { 2: "2 salles de bain", 3: "3 salles de bain" },
  wc: { 2: "WC supplémentaire" },
  cuisine: { familiale: "Cuisine familiale" },
};
const extraLabels = {
  four: "Four",
  frigo: "Réfrigérateur",
  hotte: "Hotte",
  plaques: "Plaques brillantes",
  matelas: "Matelas",
  fauteuil: "Fauteuil",
  canape2: "Canapé 2p",
  canape3: "Canapé 3p",
  poussiere: "Poussière détailing",
  traces: "Traces murs",
  brillance: "Brillance",
  degraissage: "Dégraissage renforcé",
  desinfection: "Désinfection ++",
};

function updatePrice() {
  const base = cfgState.surface.base;
  const uplift = cfgState.offre.uplift;
  const optKeys = [
    "salissure",
    "rangement",
    "meuble",
    "occup",
    "animaux",
    "vitres",
    "sdb",
    "wc",
    "cuisine",
  ];
  const urgenceAdd = cfgState.urgence ? cfgState.urgence.add : 0;
  const optsSum =
    optKeys.reduce((s, k) => s + (cfgState[k] ? cfgState[k].add : 0), 0) +
    urgenceAdd;
  const extrasSum = Object.values(cfgState.extras).reduce((s, v) => s + v, 0);
  const total = base + uplift + optsSum + extrasSum;

  document.getElementById("ps-total").textContent = total + "€";

  const offreSubs = {
    basique: "Entretien rapide, résultat propre",
    hygiene: "Nettoyage approfondi, résultat complet",
    edl: "Standard agence, prêt à relouer",
  };
  let html = `<div class="ps-line base"><span class="ps-line-label">${offreLabels[cfgState.offre.val]}</span><span class="ps-line-val">${base + uplift}€</span></div>`;
  html += `<div class="ps-line"><span class="ps-line-label" style="color:rgba(255,255,255,0.35);font-size:11px;font-style:italic">${offreSubs[cfgState.offre.val]}</span><span class="ps-line-val"></span></div>`;
  html += `<div class="ps-line"><span class="ps-line-label">${surfaceLabels[cfgState.surface.val]}</span><span class="ps-line-val">inclus</span></div>`;
  const urgenceLabel =
    typeof getUrgenceDisplayLabel === "function"
      ? getUrgenceDisplayLabel()
      : "Dans les 48–72h";
  html += `<div class="ps-line"><span class="ps-line-label">${urgenceLabel}</span><span class="ps-line-val">${urgenceAdd > 0 ? "+" + urgenceAdd + "€" : "inclus"}</span></div>`;

  optKeys.forEach((k) => {
    const s = cfgState[k];
    if (s && s.add !== 0 && optLabels[k] && optLabels[k][s.val]) {
      html += `<div class="ps-line"><span class="ps-line-label">${optLabels[k][s.val]}</span><span class="ps-line-val">${s.add > 0 ? "+" : ""}${s.add}€</span></div>`;
    }
  });

  Object.entries(cfgState.extras).forEach(([k, v]) => {
    html += `<div class="ps-line"><span class="ps-line-label">${extraLabels[k] || k}</span><span class="ps-line-val">+${v}€</span></div>`;
  });

  document.getElementById("ps-lines").innerHTML = html;

  // Mobile bar + drawer sync
  const mbbTotal = document.getElementById("mbb-total");
  const drawerTotal = document.getElementById("drawer-total");
  const drawerLines = document.getElementById("drawer-lines");
  if (mbbTotal) mbbTotal.textContent = total + "€";
  if (drawerTotal) drawerTotal.textContent = total + "€";
  if (drawerLines) drawerLines.innerHTML = html;
}

function openDrawer() {
  updatePrice();
  const drawerCta = document.getElementById("drawer-cta");
  if (drawerCta) drawerCta.style.display = currentStep === 1 ? "block" : "none";
  document.getElementById("drawer-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  document.getElementById("drawer-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function closeDrawerOnOverlay(e) {
  if (e.target === document.getElementById("drawer-overlay")) closeDrawer();
}

// ── GOTO CONFIG WITH PRESELECT ──
function goToConfig(offre) {
  // Reset to offre
  document
    .querySelectorAll('[data-group="offre"]')
    .forEach((el) => el.classList.remove("selected"));
  const offreEl = document.querySelector(
    `[data-group="offre"][data-val="${offre}"]`,
  );
  if (offreEl) {
    offreEl.classList.add("selected");
    cfgState.offre = { val: offre, uplift: parseInt(offreEl.dataset.uplift) };
  }
  updatePrice();
  navigate("config");
}

// ── URGENCE DAY LABELS ──
function getFrenchDay(date) {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const months = [
    "jan",
    "fév",
    "mar",
    "avr",
    "mai",
    "jun",
    "jul",
    "aoû",
    "sep",
    "oct",
    "nov",
    "déc",
  ];
  return (
    days[date.getDay()] + " " + date.getDate() + " " + months[date.getMonth()]
  );
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function initUrgenceLabels() {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const d2 = addDays(today, 2);
  const d3 = addDays(today, 3);

  const lbl48 = document.getElementById("urgence-label-48h");
  const desc48 = document.getElementById("urgence-desc-48h");
  const lblDemain = document.getElementById("urgence-label-demain");
  const descDemain = document.getElementById("urgence-desc-demain");
  const lblJour = document.getElementById("urgence-label-jour");
  const descJour = document.getElementById("urgence-desc-jour");

  if (lbl48) lbl48.textContent = "Dans les 48–72h";
  if (desc48) desc48.textContent = getFrenchDay(d2) + " ou " + getFrenchDay(d3);
  if (lblDemain) lblDemain.textContent = "Demain";
  if (descDemain) descDemain.textContent = getFrenchDay(tomorrow);
  if (lblJour) lblJour.textContent = "Dans la journée";
  if (descJour)
    descJour.textContent =
      getFrenchDay(today) + " — sous réserve de disponibilité";
}

// ── URGENCE display labels for recap ──
function getUrgenceDisplayLabel() {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const d2 = addDays(today, 2);
  const d3 = addDays(today, 3);
  const val = cfgState.urgence ? cfgState.urgence.val : "48h";
  if (val === "48h")
    return (
      "Dans les 48–72h<br>(" + getFrenchDay(d2) + "/" + getFrenchDay(d3) + ")"
    );
  if (val === "demain") return "Demain — " + getFrenchDay(tomorrow);
  if (val === "jour") return "Aujourd'hui — " + getFrenchDay(today);
  return "Dans les 48–72h";
}

// ── FUNNEL STEPS ──
let currentStep = 1;
let selectedSlot = null;

function stepClickable(n) {
  // Only allow going back, or to step 2 if slot selected, or step 3 if slot confirmed
  if (n < currentStep) {
    goToStep(n);
    return;
  }
  if (n === 2 && currentStep === 1) {
    goToStep(2);
    return;
  }
  if (n === 3 && selectedSlot) {
    goToStep(3);
    return;
  }
}

function goToStep(n) {
  // Hide all steps
  document
    .querySelectorAll(".funnel-step")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("funnel-step-" + n).classList.add("active");
  currentStep = n;
  window.scrollTo(0, 0);

  // Update stepper dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById("step-dot-" + i);
    const line = document.getElementById("step-line-" + i);
    if (!dot) continue;
    dot.classList.remove("active", "done");
    if (i < n) dot.classList.add("done");
    else if (i === n) dot.classList.add("active");
    if (line) {
      line.classList.remove("done");
      if (i < n) line.classList.add("done");
    }
  }

  if (n === 2) buildStep2();
  if (n === 3) buildStep3();

  // Mobile bottom bar: hide CTA on step 2+, show only recap strip
  const mbbCta = document.getElementById("mbb-cta");
  const mbbStep2 = document.getElementById("mbb-step2-confirm");
  const drawerCta = document.getElementById("drawer-cta");
  const drawerConfirm = document.getElementById("drawer-step2-confirm");
  const mbbTop = document.querySelector(".mbb-top");
  const mbbStep3 = document.getElementById("mbb-step3-pay");
  if (mbbCta) mbbCta.style.display = n === 1 ? "block" : "none";
  if (mbbStep2) mbbStep2.style.display = n === 2 ? "block" : "none";
  if (mbbStep3) mbbStep3.style.display = n === 3 ? "block" : "none";
  if (drawerCta) drawerCta.style.display = n === 1 ? "block" : "none";
  if (drawerConfirm) drawerConfirm.style.display = n === 2 ? "block" : "none";
  if (mbbTop) mbbTop.style.marginBottom = "10px";
}

function mbbCtaClick() {
  if (currentStep === 1) goToStep(2);
}

function buildStep2() {
  const urgenceVal = cfgState.urgence ? cfgState.urgence.val : "48h";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Always show 4 days: today, tomorrow, J+2, J+3
  const allDays = [
    {
      date: new Date(today),
      relLabel: "Aujourd'hui",
      tag: urgenceVal === "jour" ? "Votre choix" : null,
      urgenceIfPicked: "jour",
      addIfPicked: 99,
    },
    {
      date: addDays(today, 1),
      relLabel: "Demain",
      tag: urgenceVal === "demain" ? "Votre choix" : null,
      urgenceIfPicked: "demain",
      addIfPicked: 49,
    },
    {
      date: addDays(today, 2),
      relLabel: "Après-demain",
      tag: urgenceVal === "48h" ? "Votre choix" : null,
      urgenceIfPicked: "48h",
      addIfPicked: 0,
    },
    {
      date: addDays(today, 3),
      relLabel: null,
      tag: null,
      urgenceIfPicked: "48h",
      addIfPicked: 0,
    },
  ];

  const sub = document.getElementById("step2-sub");
  if (sub) {
    if (urgenceVal === "jour")
      sub.textContent =
        "Vous avez choisi une intervention aujourd'hui — vérifiez les créneaux disponibles.";
    else if (urgenceVal === "demain")
      sub.textContent = "Vous avez choisi demain — confirmez votre créneau.";
    else
      sub.textContent =
        "Vous avez choisi dans les 48–72h — des créneaux plus tôt sont aussi disponibles.";
  }

  // Sync recap
  updatePrice();
  const lines2 = document.getElementById("ps-lines-2");
  const total2 = document.getElementById("ps-total-2");
  if (lines2) lines2.innerHTML = document.getElementById("ps-lines").innerHTML;
  if (total2)
    total2.textContent = document.getElementById("ps-total").textContent;

  const notice = document.getElementById("step2-notice");
  const urgenceAdd = cfgState.urgence ? cfgState.urgence.add : 0;
  if (notice)
    notice.textContent =
      urgenceAdd > 0
        ? `Majoration de +${urgenceAdd}€ appliquée pour ce délai.`
        : "Aucune majoration pour ce délai.";

  const container = document.getElementById("step2-days");
  if (!container) return;
  container.innerHTML = "";
  selectedSlot = null;
  updateStep2Confirm();

  const now = new Date();

  window._choixDayIndex = allDays.findIndex((d) => d.tag !== null);

  allDays.forEach(
    ({ date, relLabel, tag, urgenceIfPicked, addIfPicked }, dayIndex) => {
      const col = document.createElement("div");
      col.className = "cal-col";

      // Header
      const head = document.createElement("div");
      head.className = "cal-col-head";
      const dayName = getFrenchDay(date).split(" ")[0]; // just "Lundi"
      const dayNum = date.getDate();
      const months = [
        "jan",
        "fév",
        "mar",
        "avr",
        "mai",
        "jun",
        "jul",
        "aoû",
        "sep",
        "oct",
        "nov",
        "déc",
      ];
      const mon = months[date.getMonth()];

      let headHTML = "";
      if (relLabel) headHTML += `<div class="cal-col-rel">${relLabel}</div>`;
      headHTML += `<div class="cal-col-day">${dayName} ${dayNum} ${mon}</div>`;
      head.innerHTML = headHTML;
      col.appendChild(head);

      // Slots
      const isToday = date.getTime() === today.getTime();
      const slots = [
        {
          id: date.toISOString().slice(0, 10) + "-matin",
          time: "9h–12h",
          label: "Matin",
          available: !(isToday && now.getHours() >= 11),
        },
        {
          id: date.toISOString().slice(0, 10) + "-soir",
          time: "14h–18h",
          label: "Après-midi",
          available: !(isToday && now.getHours() >= 16),
        },
      ];

      // FOMO / upsell logic
      const fomoPrices = { jour: 99, demain: 49, "48h": 0 };
      const currentAdd = cfgState.urgence ? cfgState.urgence.add : 0;
      const isUpsell = addIfPicked > currentAdd;
      const isDownsell = addIfPicked < currentAdd;

      slots.forEach((slot) => {
        const slotEl = document.createElement("div");
        slotEl.className =
          "cal-slot-v2" + (slot.available ? "" : " unavailable");

        let priceTag = "";
        if (slot.available) {
          if (isUpsell)
            priceTag = `<div class="slot-upsell">+${addIfPicked - currentAdd}€</div>`;
          else if (isDownsell)
            priceTag = `<div class="slot-downsell">-${currentAdd - addIfPicked}€</div>`;
        }

        slotEl.innerHTML = `
        <div class="slot-v2-time">${slot.time}</div>
        <div class="slot-v2-label">${slot.available ? slot.label : "Complet"}</div>
        ${priceTag}
      `;

        if (slot.available) {
          slotEl.onclick = () => {
            if (urgenceIfPicked !== cfgState.urgence.val) {
              cfgState.urgence = { val: urgenceIfPicked, add: addIfPicked };
              updatePrice();
              const lines2 = document.getElementById("ps-lines-2");
              const total2 = document.getElementById("ps-total-2");
              if (lines2)
                lines2.innerHTML =
                  document.getElementById("ps-lines").innerHTML;
              if (total2)
                total2.textContent =
                  document.getElementById("ps-total").textContent;
              const notice = document.getElementById("step2-notice");
              if (notice)
                notice.textContent =
                  addIfPicked > 0
                    ? `Majoration de +${addIfPicked}€ appliquée.`
                    : "Aucune majoration.";
              // Move "Votre choix" to this column
              window._choixDayIndex = dayIndex;
              buildChoixRow(dayIndex);
            }
            container
              .querySelectorAll(".cal-slot-v2")
              .forEach((s) => s.classList.remove("selected"));
            slotEl.classList.add("selected");
            selectedSlot = {
              date: (relLabel ? relLabel + " — " : "") + getFrenchDay(date),
              time: slot.time,
            };
            updateStep2Confirm();
          };
        }
        col.appendChild(slotEl);
      });

      container.appendChild(col);
    },
  );

  // Build the "Votre choix" row above the grid
  buildChoixRow(window._choixDayIndex);
}

function buildChoixRow(activeIdx) {
  const row = document.getElementById("step2-choix-row");
  if (!row) return;
  row.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement("div");
    cell.className = "choix-row-cell";
    cell.id = "choix-cell-" + i;
    if (i === activeIdx) {
      cell.innerHTML = '<span class="choix-bar-label">Votre choix</span>';
    }
    row.appendChild(cell);
  }
}

function updateStep2Confirm() {
  const btn = document.getElementById("step2-confirm");
  const drawerBtn = document.getElementById("drawer-step2-confirm");
  if (!btn) return;
  const mbbStep2 = document.getElementById("mbb-step2-confirm");
  if (selectedSlot) {
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    if (drawerBtn) {
      drawerBtn.style.opacity = "1";
      drawerBtn.style.cursor = "pointer";
    }
    if (mbbStep2) {
      mbbStep2.style.opacity = "1";
      mbbStep2.style.cursor = "pointer";
    }
  } else {
    btn.style.opacity = "0.4";
    if (drawerBtn) {
      drawerBtn.style.opacity = "0.4";
      drawerBtn.style.cursor = "not-allowed";
    }
    if (mbbStep2) {
      mbbStep2.style.opacity = "0.4";
      mbbStep2.style.cursor = "not-allowed";
    }
    btn.style.cursor = "not-allowed";
  }
}

function buildStep3() {
  if (!selectedSlot) return;
  updatePrice();
  const lines3 = document.getElementById("ps-lines-3");
  const total3 = document.getElementById("ps-total-3");
  const slotRecap = document.getElementById("pay-slot-recap");
  if (lines3) lines3.innerHTML = document.getElementById("ps-lines").innerHTML;
  if (total3)
    total3.textContent = document.getElementById("ps-total").textContent;
  if (slotRecap)
    slotRecap.textContent = selectedSlot.date + " · " + selectedSlot.time;
}

window.addEventListener("resize", () => {
  const bar = document.getElementById("mobile-bottom-bar");
  const isConfig = document
    .getElementById("page-config")
    .classList.contains("active");
  if (bar)
    bar.style.display = isConfig && window.innerWidth <= 768 ? "block" : "none";
});

// ── PAYMENT ──
function handlePayment() {
  alert("Paiement en cours de configuration — Stripe à brancher ici.");
}

// ── RESET SIMULATION ──
function resetSimulation() {
  const defaults = {
    offre: { val: "basique", uplift: 0 },
    surface: { val: "45", base: 229 },
    urgence: { val: "48h", add: 0 },
    salissure: { val: "normal", add: 0 },
    rangement: { val: "normal", add: 0 },
    meuble: { val: "meuble", add: 0 },
    occup: { val: "vide", add: 0 },
    animaux: { val: "non", add: 0 },
    vitres: { val: "standard", add: 0 },
    sdb: { val: "1", add: 0 },
    wc: { val: "1", add: 0 },
    cuisine: { val: "standard", add: 0 },
  };
  Object.assign(cfgState, defaults);
  cfgState.extras = {};

  Object.keys(defaults).forEach((group) => {
    document
      .querySelectorAll('[data-group="' + group + '"]')
      .forEach((el) => el.classList.remove("selected"));
    const def = document.querySelector(
      '[data-group="' + group + '"][data-val="' + defaults[group].val + '"]',
    );
    if (def) def.classList.add("selected");
  });

  document.querySelectorAll("[data-key]").forEach((el) => {
    el.classList.remove("selected");
    const cb = el.querySelector(".config-checkbox");
    if (cb) cb.textContent = "";
  });

  if (currentStep !== 1) goToStep(1);
  updatePrice();
}

navigate("home");
updatePrice();
requestAnimationFrame(() => updatePrice());
