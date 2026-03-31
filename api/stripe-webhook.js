import Stripe from "stripe";
import { google } from "googleapis";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: { bodyParser: false },
};

// ── Labels lisibles pour l'email ──
const LABELS = {
  offre: {
    basique: "Reset Minimal",
    hygiene: "Reset Hygiène",
    edl: "État des lieux",
  },
  surface: { 30: "0–30 m²", 45: "30–45 m²", 60: "45–60 m²", 80: "60–80 m²" },
  urgence: {
    "48h": "Dans les 48–72h",
    demain: "Demain",
    jour: "Dans la journée",
  },
  salissure: {
    normal: "Usage normal",
    sale: "Saleté modérée",
    "tres-sale": "Saleté importante",
  },
  rangement: {
    normal: "Rangement normal",
    encombre: "Encombré",
    desordre: "Désordre important",
  },
  meuble: { meuble: "Meublé", vide: "Logement vide" },
  occup: { vide: "Logement vide", occupe: "Occupé pendant intervention" },
  animaux: {
    non: "Aucun animal",
    poils: "Animaux — poils",
    beaucoup: "Animaux — présence importante",
  },
  vitres: {
    standard: "Vitres standard",
    "2baies": "2 baies vitrées",
    "3baies": "3 baies vitrées ou plus",
  },
  sdb: { 1: "1 salle de bain", 2: "2 salles de bain", 3: "3 salles de bain" },
  wc: { 1: "1 WC", 2: "WC supplémentaire" },
  cuisine: { standard: "Cuisine standard", familiale: "Cuisine familiale" },
  extras: {
    four: "Four",
    frigo: "Réfrigérateur",
    hotte: "Hotte",
    plaques: "Plaques brillantes",
    matelas: "Matelas",
    fauteuil: "Fauteuil",
    canape2: "Canapé 2 places",
    canape3: "Canapé 3 places",
    poussiere: "Poussière détailing",
    traces: "Traces & marques légères",
    brillance: "Brillance cuisine & salle de bain",
    degraissage: "Dégraissage renforcé",
    desinfection: "Désinfection ++",
  },
};

function buildDetailsHTML(metadata) {
  const rows = [];

  // Options principales
  const optKeys = [
    "offre",
    "surface",
    "urgence",
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
  for (const k of optKeys) {
    const val = metadata[k];
    const label = LABELS[k]?.[val];
    if (label) {
      rows.push(`<tr>
        <td style="padding:7px 0;color:#9A9A96;font-size:13px;border-bottom:1px solid #F2F2EE;">${k.charAt(0).toUpperCase() + k.slice(1)}</td>
        <td style="padding:7px 0;font-size:13px;color:#1A1A18;text-align:right;border-bottom:1px solid #F2F2EE;">${label}</td>
      </tr>`);
    }
  }

  // Extras
  const extras = metadata.extras
    ? metadata.extras.split(",").filter(Boolean)
    : [];
  if (extras.length > 0) {
    const extraLabels = extras.map((k) => LABELS.extras[k] || k).join(", ");
    rows.push(`<tr>
      <td style="padding:7px 0;color:#9A9A96;font-size:13px;">Options supplémentaires</td>
      <td style="padding:7px 0;font-size:13px;color:#1A1A18;text-align:right;">${extraLabels}</td>
    </tr>`);
  }

  return `<table style="width:100%;border-collapse:collapse;">${rows.join("")}</table>`;
}

// ── Auth Google avec gestion robuste de la clé ──
function getAuth() {
  // Vercel peut stocker la clé avec des \n littéraux ou de vrais sauts de ligne
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .replace(/^"/, "")
    .replace(/"$/, "");

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

// ── Crée l'événement Google Calendar ──
async function createCalendarEvent(metadata) {
  const creneau = JSON.parse(metadata.creneau);
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

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

  const description = [
    `Commande : ${metadata.order_id}`,
    `Prestation : ${niveaux[metadata.offre] || metadata.offre}`,
    `Surface : ${surfaces[metadata.surface] || metadata.surface + " m²"}`,
    `Adresse : ${metadata.adresse}`,
    `Tél : ${metadata.client_tel}`,
    `Email : ${metadata.client_email}`,
  ].join("\n");

  await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: {
      summary: `Colette — ${metadata.client_name}`,
      description,
      start: { dateTime: creneau.start, timeZone: "Europe/Paris" },
      end: { dateTime: creneau.end, timeZone: "Europe/Paris" },
    },
  });
}

// ── Envoie l'email de confirmation ──
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

  const detailsHTML = buildDetailsHTML(metadata);

  await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: metadata.client_email,
    subject: `Intervention confirmée — ${creneauDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A18;background:#ffffff;">

        <div style="background:#2D4A2D;padding:32px 40px;">
          <p style="color:#FAFAF7;font-size:22px;font-weight:700;margin:0;">Colette</p>
        </div>

        <div style="padding:40px;">
          <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">Réservation confirmée ✓</h2>
          <p style="color:#4A4A46;font-size:14px;margin:0 0 28px;">
            Bonjour ${metadata.client_name},<br>
            votre intervention est confirmée. Voici le récapitulatif complet.
          </p>

          <!-- Créneau -->
          <div style="background:#2D4A2D;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Créneau confirmé</p>
            <p style="color:#FAFAF7;font-size:16px;font-weight:600;margin:0 0 3px;">${creneauDate}</p>
            <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;">${creneauHeure} – ${creneauFin}</p>
          </div>

          <!-- Adresse -->
          <div style="background:#F2F2EE;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 6px;">Adresse d'intervention</p>
            <p style="font-size:14px;color:#1A1A18;margin:0;">📍 ${metadata.adresse}</p>
          </div>

          <!-- Détail prestation -->
          <div style="background:#F2F2EE;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 12px;">Détail de la prestation</p>
            ${detailsHTML}
          </div>

          <!-- Total -->
          <div style="border-top:2px solid #2D4A2D;padding:16px 0;margin-bottom:24px;display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:13px;color:#9A9A96;text-transform:uppercase;letter-spacing:0.08em;">Total payé</span>
            <span style="font-size:24px;font-weight:700;color:#2D4A2D;">${total}€</span>
          </div>

          <!-- Prochaines étapes -->
          <div style="margin-bottom:24px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 12px;">Prochaines étapes</p>
            <p style="font-size:14px;color:#4A4A46;margin:0 0 8px;line-height:1.6;">
              <strong>1.</strong> Nous vous contacterons par SMS la veille pour confirmer l'heure exacte.
            </p>
            <p style="font-size:14px;color:#4A4A46;margin:0;line-height:1.6;">
              <strong>2.</strong> Le jour J, nous intervenons exactement selon vos sélections.
            </p>
          </div>

          <!-- Contact -->
          <div style="background:#F2F2EE;border-radius:6px;padding:16px 20px;font-size:13px;color:#4A4A46;line-height:1.7;">
            Une question ? <a href="mailto:bonjour@colettelabaule.com" style="color:#2D4A2D;font-weight:500;">bonjour@colettelabaule.com</a>
          </div>

          <p style="font-size:11px;color:#9A9A96;margin-top:20px;">
            Référence : ${metadata.order_id}<br>
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

  // Body brut pour vérification signature Stripe
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
    }
  }

  return res.status(200).json({ received: true });
}
