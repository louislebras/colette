import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const root = document.getElementById("dashboard-root");
const login = document.getElementById("dashboard-login");
const app = document.getElementById("dashboard-app");
const form = document.getElementById("dashboard-login-form");
const message = document.getElementById("dashboard-message");
const list = document.getElementById("booking-list");
const stats = document.getElementById("dashboard-stats");
const user = document.getElementById("dashboard-user");
let supabase;
let activeTab = "pending_confirmation";
let bookings = [];

const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const formatDate = (value) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const detailDefinitions = [
  ["offre", "Prestation", { basique: "Reset Minimal", hygiene: "Reset Hygiène", edl: "État des lieux" }],
  ["surface", "Surface", { 30: "0–30 m²", 45: "30–45 m²", 60: "45–60 m²", 80: "60–80 m²" }],
  ["urgence", "Délai souhaité", { "48h": "Dans les 48–72h", demain: "Demain", jour: "Dans la journée" }],
  ["salissure", "État du logement", { normal: "Usage quotidien normal", sale: "Saleté modérée", "tres-sale": "Saleté importante" }],
  ["rangement", "Rangement", { normal: "Rangement normal", encombre: "Logement encombré", desordre: "Désordre important" }],
  ["meuble", "Aménagement", { meuble: "Logement meublé", vide: "Logement vide" }],
  ["occup", "Présence pendant l'intervention", { vide: "Logement vide pendant l'intervention", occupe: "Présence pendant l'intervention" }],
  ["animaux", "Animaux", { non: "Aucun animal", poils: "Présence d'animaux (poils)", beaucoup: "Présence importante d'animaux" }],
  ["vitres", "Vitres", { standard: "1 baie + 1 vitre par pièce (standard)", "2baies": "2 baies vitrées", "3baies": "3 baies vitrées ou plus" }],
  ["sdb", "Salle de bain", { 1: "1 salle de bain", 2: "2 salles de bain", 3: "3 salles de bain" }],
  ["wc", "WC", { 1: "1 WC", 2: "2 WC" }],
  ["cuisine", "Cuisine", { standard: "Cuisine standard", familiale: "Cuisine familiale" }],
];

const defaults = { urgence: "48h", salissure: "normal", rangement: "normal", meuble: "meuble", occup: "vide", animaux: "non", vitres: "standard", sdb: 1, wc: 1, cuisine: "standard" };
const extrasLabels = { four: "Four", frigo: "Réfrigérateur", hotte: "Hotte", plaques: "Plaques brillantes", matelas: "Matelas", fauteuil: "Fauteuil", canape2: "Canapé 2 places", canape3: "Canapé 3 places", poussiere: "Poussière détailing", traces: "Traces & marques légères", brillance: "Brillance cuisine & salle de bain", degraissage: "Dégraissage renforcé", desinfection: "Désinfection ++" };

function prestationDetails(configuration) {
  if (Array.isArray(configuration?.details)) return configuration.details;
  const details = configuration || {};
  const rows = detailDefinitions.map(([key, label, labels]) => {
    const value = details[key] ?? defaults[key];
    return { label, value: labels[value] || String(value ?? "—") };
  });
  const extras = Array.isArray(details.extras) ? details.extras.map((key) => extrasLabels[key] || key) : [];
  return [...rows, { label: "Options supplémentaires", value: extras.length ? extras.join(" · ") : "Aucune" }];
}

function detailRows(configuration) {
  return prestationDetails(configuration).map((detail) => `<div class="booking-detail-row"><dt>${escapeHtml(detail.label)}</dt><dd>${escapeHtml(detail.value)}</dd></div>`).join("");
}

function renderStats() {
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const pending = activeBookings.filter((booking) => booking.status === "pending_confirmation").length;
  const paid = activeBookings.filter((booking) => booking.status === "paid").length;
  stats.innerHTML = [[pending, "À confirmer"], [paid, "Payées"], [activeBookings.length, "Total"]].map(([number, label]) => `<div class="dashboard-stat"><div class="dashboard-stat-number">${number}</div><div class="dashboard-stat-label">${label}</div></div>`).join("");
}

function bookingCard(booking) {
  const isPaid = booking.status === "paid";
  const isPending = booking.status === "pending_confirmation";
  const mailSubject = encodeURIComponent(`Colette — votre pré-réservation ${booking.order_id}`);
  const mailBody = encodeURIComponent("Bonjour,\n\nNous revenons vers vous au sujet de votre pré-réservation Colette afin de confirmer le créneau souhaité.\n\nÀ bientôt,");
  const details = booking.configuration || {};
  const offer = details.offre || "Prestation";
  const surface = details.surface ? `${details.surface} m²` : "";
  return `<article class="booking-card"><div><span class="booking-status ${escapeHtml(booking.status)}">${isPaid ? "Payée" : "À confirmer"}</span><h2 class="booking-client">${escapeHtml(booking.client_name)}</h2><p class="booking-detail">${escapeHtml(booking.client_email)} · ${escapeHtml(booking.client_tel || "Téléphone non renseigné")}</p><p class="booking-detail">${escapeHtml(booking.adresse || "Adresse non renseignée")}</p>${booking.commentaire ? `<div class="booking-comment"><strong>Note :</strong> ${escapeHtml(booking.commentaire)}</div>` : ""}</div><div><p class="booking-slot">${escapeHtml(formatDate(booking.slot_start))}${booking.slot_label ? ` · ${escapeHtml(booking.slot_label)}` : ""}</p><p class="booking-meta">${escapeHtml(offer)} ${escapeHtml(surface)}</p><div class="booking-total">${Number(booking.total || 0)}€</div><p class="booking-meta">${escapeHtml(booking.order_id)}</p></div><div class="booking-actions">${isPending ? `<a class="booking-action primary" href="mailto:${encodeURIComponent(booking.client_email)}?subject=${mailSubject}&body=${mailBody}">Relancer par email</a><a class="booking-action" href="tel:${escapeHtml(booking.client_tel || "")}">Appeler</a>${booking.checkout_url ? `<a class="booking-action" href="${escapeHtml(booking.checkout_url)}" target="_blank" rel="noopener">Voir le paiement</a>` : ""}<button class="booking-action danger" data-cancel-order="${escapeHtml(booking.order_id)}" type="button">Annuler</button>` : `<span class="booking-meta">Payée le ${booking.paid_at ? escapeHtml(formatDate(booking.paid_at)) : "—"}</span>`}</div><details class="booking-details"><summary>Détail complet de la prestation <span>+</span></summary><dl>${detailRows(details)}</dl></details></article>`;
}

function renderBookings() {
  document.querySelectorAll(".dashboard-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === activeTab));
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const visible = activeTab === "all" ? activeBookings : activeBookings.filter((booking) => booking.status === activeTab);
  list.innerHTML = visible.length ? visible.map(bookingCard).join("") : `<div class="dashboard-empty">Aucune ${activeTab === "paid" ? "réservation payée" : "pré-réservation à afficher"}.</div>`;
}

async function loadBookings() {
  const { data, error } = await supabase.from("prebookings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  bookings = data || [];
  renderStats();
  renderBookings();
}

async function showDashboard(session) {
  login.hidden = true;
  app.hidden = false;
  user.textContent = session.user.email;
  try { await loadBookings(); } catch (error) { list.innerHTML = `<div class="dashboard-empty">Impossible de charger les demandes : ${escapeHtml(error.message)}</div>`; }
}

async function bootstrap() {
  try {
    const response = await fetch("/api/dashboard-config");
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || "Configuration Supabase manquante");
    supabase = createClient(config.url, config.anonKey);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await showDashboard(session);
  } catch (error) { message.textContent = `Dashboard indisponible : ${error.message}`; }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  const email = document.getElementById("dashboard-email").value.trim();
  const password = document.getElementById("dashboard-password").value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { message.textContent = "Email ou mot de passe incorrect."; return; }
  await showDashboard(data.session);
});

document.getElementById("dashboard-signout").addEventListener("click", async () => { await supabase.auth.signOut(); app.hidden = true; login.hidden = false; form.reset(); });
list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-cancel-order]");
  if (!button) return;

  const orderId = button.dataset.cancelOrder;
  if (!window.confirm("Annuler cette pré-réservation ? Le lien de paiement sera immédiatement désactivé.")) return;

  button.disabled = true;
  button.textContent = "Annulation…";
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/cancel-prebooking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Annulation impossible");
    bookings = bookings.filter((booking) => booking.order_id !== orderId);
    renderStats();
    renderBookings();
  } catch (error) {
    alert(error.message || "Impossible d'annuler cette pré-réservation.");
    button.disabled = false;
    button.textContent = "Annuler";
    await loadBookings();
  }
});
document.querySelectorAll(".dashboard-tab").forEach((tab) => tab.addEventListener("click", () => { activeTab = tab.dataset.tab; renderBookings(); }));
bootstrap();
