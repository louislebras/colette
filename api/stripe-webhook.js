import Stripe from "stripe";
import { google } from "googleapis";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Config Vercel : bodyParser désactivé pour lire le body brut ──
export const config = {
  api: { bodyParser: false },
};

// ── Auth Google Calendar ──
function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/calendar"],
  );
}

// ── Crée l'événement dans Google Calendar ──
async function createCalendarEvent(metadata) {
  const creneau = JSON.parse(metadata.creneau);
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: {
      summary: `Colette — ${metadata.client_name}`,
      description: `Commande ${metadata.order_id}\n${metadata.offre} · ${metadata.surface}m²\n${metadata.adresse}\nTél : ${metadata.client_tel}`,
      start: { dateTime: creneau.start, timeZone: "Europe/Paris" },
      end: { dateTime: creneau.end, timeZone: "Europe/Paris" },
    },
  });
}

// ── Envoie l'email de confirmation via Resend ──
async function sendConfirmationEmail(metadata, total) {
  const creneau = JSON.parse(metadata.creneau);

  const creneauDate = new Date(creneau.start).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const creneauHeure = new Date(creneau.start).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const creneauFin = new Date(creneau.end).toLocaleTimeString("fr-FR", {
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
    to: metadata.client_email,
    subject: `Intervention confirmée — ${creneauDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A18;background:#ffffff;">

        <!-- Header -->
        <div style="background:#2D4A2D;padding:32px 40px;">
          <p style="color:#FAFAF7;font-size:22px;font-weight:700;margin:0;">Colette</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          <h2 style="font-size:22px;font-weight:600;margin:0 0 8px;">Réservation confirmée ✓</h2>
          <p style="color:#4A4A46;font-size:15px;margin:0 0 32px;">
            Bonjour ${metadata.client_name},<br>
            votre intervention est confirmée. Voici le récapitulatif complet.
          </p>

          <!-- Créneau -->
          <div style="background:#2D4A2D;border-radius:6px;padding:20px 24px;margin-bottom:16px;display:flex;gap:16px;align-items:center;">
            <div>
              <p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Créneau confirmé</p>
              <p style="color:#FAFAF7;font-size:16px;font-weight:600;margin:0 0 2px;">${creneauDate}</p>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">${creneauHeure} – ${creneauFin}</p>
            </div>
          </div>

          <!-- Prestation -->
          <div style="background:#F2F2EE;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 12px;">Prestation</p>
            <p style="font-size:15px;font-weight:600;margin:0 0 4px;">${niveaux[metadata.offre] || metadata.offre}</p>
            <p style="font-size:14px;color:#4A4A46;margin:0 0 4px;">${surfaces[metadata.surface] || metadata.surface + " m²"}</p>
            <p style="font-size:14px;color:#4A4A46;margin:0;">📍 ${metadata.adresse}</p>
          </div>

          <!-- Total -->
          <div style="border-top:2px solid #2D4A2D;padding:16px 0;margin-bottom:28px;display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:13px;color:#9A9A96;text-transform:uppercase;letter-spacing:0.08em;">Total payé</span>
            <span style="font-size:24px;font-weight:700;color:#2D4A2D;">${total}€</span>
          </div>

          <!-- Prochaines étapes -->
          <div style="margin-bottom:28px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 14px;">Prochaines étapes</p>
            <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">
              <div style="width:20px;height:20px;border-radius:50%;background:#2D4A2D;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
              <p style="font-size:14px;color:#4A4A46;margin:0;line-height:1.6;">Nous vous contacterons par <strong>SMS la veille</strong> pour confirmer l'heure exacte d'arrivée.</p>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <div style="width:20px;height:20px;border-radius:50%;background:#2D4A2D;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
              <p style="font-size:14px;color:#4A4A46;margin:0;line-height:1.6;">Le jour J, nous intervenons exactement selon vos sélections.</p>
            </div>
          </div>

          <!-- Contact -->
          <div style="background:#F2F2EE;border-radius:6px;padding:16px 20px;font-size:13px;color:#4A4A46;line-height:1.7;">
            Une question ? Contactez-nous par email à
            <a href="mailto:bonjour@colettelabaule.com" style="color:#2D4A2D;font-weight:500;">bonjour@colettelabaule.com</a>
            ou directement par SMS/WhatsApp.
          </div>

          <!-- Référence -->
          <p style="font-size:11px;color:#9A9A96;margin-top:24px;">
            Référence commande : ${metadata.order_id}<br>
            Annulation gratuite jusqu'à 24h avant l'intervention.
          </p>
        </div>

      </div>
    `,
  });
}

// ── Handler principal ──
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Lit le body brut — nécessaire pour la vérification de signature Stripe
  const rawBody = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
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

    // Récupère l'email depuis Stripe (pas disponible dans les metadata à la création)
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
      // On retourne 200 quand même — Stripe ne doit pas re-tenter
    }
  }

  return res.status(200).json({ received: true });
}
