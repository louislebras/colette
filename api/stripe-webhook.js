const Stripe = require("stripe");
const { google } = require("googleapis");
const { Resend } = require("resend");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// ── AUTH GOOGLE ──
function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/calendar"],
  );
}

// ── CRÉE L'ÉVÉNEMENT DANS GOOGLE CALENDAR ──
async function createCalendarEvent(metadata) {
  const creneau = JSON.parse(metadata.creneau);
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: {
      summary: `Colette — ${metadata.client_name}`,
      description: `Commande ${metadata.order_id}\n${metadata.offre} · ${metadata.surface}m²\n${metadata.adresse}`,
      start: { dateTime: creneau.start, timeZone: "Europe/Paris" },
      end: { dateTime: creneau.end, timeZone: "Europe/Paris" },
    },
  });
}

// ── ENVOIE L'EMAIL DE CONFIRMATION ──
async function sendConfirmationEmail(metadata, total) {
  const creneau = JSON.parse(metadata.creneau);
  const creneauDate = new Date(creneau.start).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const creneauHeure = new Date(creneau.start).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const niveaux = {
    basique: "Reset Minimal",
    hygiene: "Reset Hygiène",
    edl: "État des lieux",
  };
  const surfaces = {
    30: "0–30 m²",
    45: "30–45 m²",
    60: "45–60 m²",
    80: "60–80 m²",
  };

  await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: metadata.client_email || "",
    subject: `Votre intervention Colette est confirmée — ${creneauDate}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1A1A18;">
        <div style="background: #2D4A2D; padding: 32px 40px;">
          <h1 style="color: #FAFAF7; font-size: 24px; margin: 0;">Colette</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">Réservation confirmée</h2>
          <p style="color: #4A4A46; margin-bottom: 32px;">Bonjour ${metadata.client_name},<br>
          votre intervention est confirmée. Voici le récapitulatif.</p>

          <div style="background: #F2F2EE; padding: 24px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-weight: 600;">📅 Créneau</p>
            <p style="margin: 0; color: #4A4A46;">${creneauDate} · ${creneauHeure}</p>
          </div>

          <div style="background: #F2F2EE; padding: 24px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-weight: 600;">Prestation</p>
            <p style="margin: 0 0 4px; color: #4A4A46;">${niveaux[metadata.offre] || metadata.offre}</p>
            <p style="margin: 0 0 4px; color: #4A4A46;">${surfaces[metadata.surface] || metadata.surface + " m²"}</p>
            <p style="margin: 0; color: #4A4A46;">📍 ${metadata.adresse}</p>
          </div>

          <div style="background: #2D4A2D; padding: 20px 24px; border-radius: 4px; margin-bottom: 32px; display: flex; justify-content: space-between;">
            <span style="color: rgba(255,255,255,0.7);">Total payé</span>
            <span style="color: #FAFAF7; font-size: 20px; font-weight: 600;">${total}€</span>
          </div>

          <p style="color: #4A4A46; font-size: 14px;">
            Nous vous contacterons par SMS la veille pour confirmer l'heure exacte.
            En cas de question : <a href="mailto:bonjour@colette-nettoyage.fr" style="color: #2D4A2D;">bonjour@colette-nettoyage.fr</a>
          </p>

          <p style="color: #9A9A96; font-size: 12px; margin-top: 32px;">
            Référence commande : ${metadata.order_id}<br>
            Annulation gratuite jusqu'à 24h avant l'intervention.
          </p>
        </div>
      </div>
    `,
  });
}

// ── HANDLER PRINCIPAL ──
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const body = req.body; // doit être le body brut (Buffer)

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Signature webhook invalide:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata;
    const total = Math.round(session.amount_total / 100);

    // Ajoute l'email client dans les metadata (pas disponible au moment de la création)
    metadata.client_email =
      session.customer_email || session.customer_details?.email || "";

    try {
      await Promise.all([
        createCalendarEvent(metadata),
        sendConfirmationEmail(metadata, total),
      ]);
      console.log(`✓ Commande ${metadata.order_id} confirmée — ${total}€`);
    } catch (err) {
      console.error("Erreur post-paiement:", err);
      // On retourne 200 quand même pour que Stripe ne re-tente pas
    }
  }

  return res.status(200).json({ received: true });
};

// ── IMPORTANT : Vercel doit recevoir le body brut pour la vérification Stripe ──
export const config = {
  api: {
    bodyParser: false,
  },
};
