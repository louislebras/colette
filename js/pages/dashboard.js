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

function renderStats() {
  const pending = bookings.filter((booking) => booking.status === "pending_confirmation").length;
  const paid = bookings.filter((booking) => booking.status === "paid").length;
  stats.innerHTML = [[pending, "À confirmer"], [paid, "Payées"], [bookings.length, "Total"]].map(([number, label]) => `<div class="dashboard-stat"><div class="dashboard-stat-number">${number}</div><div class="dashboard-stat-label">${label}</div></div>`).join("");
}

function bookingCard(booking) {
  const isPaid = booking.status === "paid";
  const mailSubject = encodeURIComponent(`Colette — votre pré-réservation ${booking.order_id}`);
  const mailBody = encodeURIComponent("Bonjour,\n\nNous revenons vers vous au sujet de votre pré-réservation Colette afin de confirmer le créneau souhaité.\n\nÀ bientôt,");
  const details = booking.configuration || {};
  const offer = details.offre || "Prestation";
  const surface = details.surface ? `${details.surface} m²` : "";
  return `<article class="booking-card"><div><span class="booking-status ${escapeHtml(booking.status)}">${isPaid ? "Payée" : "À confirmer"}</span><h2 class="booking-client">${escapeHtml(booking.client_name)}</h2><p class="booking-detail">${escapeHtml(booking.client_email)} · ${escapeHtml(booking.client_tel || "Téléphone non renseigné")}</p><p class="booking-detail">${escapeHtml(booking.adresse || "Adresse non renseignée")}</p>${booking.commentaire ? `<div class="booking-comment"><strong>Note :</strong> ${escapeHtml(booking.commentaire)}</div>` : ""}</div><div><p class="booking-slot">${escapeHtml(formatDate(booking.slot_start))}${booking.slot_label ? ` · ${escapeHtml(booking.slot_label)}` : ""}</p><p class="booking-meta">${escapeHtml(offer)} ${escapeHtml(surface)}</p><div class="booking-total">${Number(booking.total || 0)}€</div><p class="booking-meta">${escapeHtml(booking.order_id)}</p></div><div class="booking-actions">${!isPaid ? `<a class="booking-action primary" href="mailto:${encodeURIComponent(booking.client_email)}?subject=${mailSubject}&body=${mailBody}">Relancer par email</a><a class="booking-action" href="tel:${escapeHtml(booking.client_tel || "")}">Appeler</a>${booking.checkout_url ? `<a class="booking-action" href="${escapeHtml(booking.checkout_url)}" target="_blank" rel="noopener">Voir le paiement</a>` : ""}` : `<span class="booking-meta">Payée le ${booking.paid_at ? escapeHtml(formatDate(booking.paid_at)) : "—"}</span>`}</div></article>`;
}

function renderBookings() {
  document.querySelectorAll(".dashboard-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === activeTab));
  const visible = activeTab === "all" ? bookings : bookings.filter((booking) => booking.status === activeTab);
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
document.querySelectorAll(".dashboard-tab").forEach((tab) => tab.addEventListener("click", () => { activeTab = tab.dataset.tab; renderBookings(); }));
bootstrap();
