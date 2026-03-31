import Stripe from "stripe";
import { google } from "googleapis";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: { bodyParser: false },
};

// ── Labels complets — toutes les valeurs y compris les défauts ──
const LABELS = {
  offre: {
    basique: "Reset Minimal — Entretien rapide, résultat propre",
    hygiene: "Reset Hygiène — Nettoyage intense, résultat complet",
    edl: "État des lieux — Standard agence, prêt à relouer",
  },
  surface: {
    30: "0–30 m² (studio)",
    45: "30–45 m² (T2)",
    60: "45–60 m² (T2+/T3)",
    80: "60–80 m² (T3)",
  },
  urgence: {
    "48h": "Dans les 48–72h",
    demain: "Demain",
    jour: "Dans la journée",
  },
  salissure: {
    normal: "Usage quotidien normal",
    sale: "Encrassement modéré",
    "tres-sale": "Encrassement important",
  },
  rangement: {
    normal: "Rangement normal",
    encombre: "Encombré",
    desordre: "Désordre important",
  },
  meuble: {
    meuble: "Meublé",
    vide: "Logement vide",
  },
  occup: {
    vide: "Logement vide pendant intervention",
    occupe: "Occupé pendant intervention",
  },
  animaux: {
    non: "Aucun animal",
    poils: "Présence d'animaux (poils)",
    beaucoup: "Présence importante d'animaux",
  },
  vitres: {
    standard: "1 baie + 1 vitre par pièce (standard)",
    "2baies": "2 baies vitrées",
    "3baies": "3 baies vitrées ou plus",
  },
  sdb: {
    1: "1 salle de bain",
    2: "2 salles de bain",
    3: "3 salles de bain",
  },
  wc: {
    1: "1 WC",
    2: "WC supplémentaire",
  },
  cuisine: {
    standard: "Cuisine standard",
    familiale: "Cuisine familiale",
  },
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
    degraissage: "Dégraissage renforcé cuisine",
    desinfection: "Désinfection ++",
  },
};

const OPT_KEYS = [
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

// ── Génère les lignes HTML du récap prestation ──
function buildPrestationRows(metadata) {
  const rows = OPT_KEYS.map((k) => {
    // sdb et wc sont stockés comme strings dans Stripe metadata ("1","2","3")
    // les autres clés sont des strings normales
    const rawVal = metadata[k];
    const val = k === "sdb" || k === "wc" ? rawVal : rawVal;
    const label = LABELS[k]?.[val] || LABELS[k]?.[parseInt(val)] || val;
    const key =
      {
        offre: "Niveau",
        surface: "Surface",
        urgence: "Disponibilité",
        salissure: "État du logement",
        rangement: "Rangement",
        meuble: "Aménagement",
        occup: "Présence",
        animaux: "Animaux",
        vitres: "Vitres",
        sdb: "Salle de bain",
        wc: "WC",
        cuisine: "Cuisine",
      }[k] || k;
    return `<tr>
      <td style="padding:8px 0;color:#9A9A96;font-size:13px;border-bottom:1px solid #EBEBEB;width:40%;">${key}</td>
      <td style="padding:8px 0;font-size:13px;color:#1A1A18;border-bottom:1px solid #EBEBEB;">${label}</td>
    </tr>`;
  }).join("");

  const extras = (metadata.extras || "").split(",").filter(Boolean);
  const extrasRow =
    extras.length > 0
      ? `<tr>
        <td style="padding:8px 0;color:#9A9A96;font-size:13px;width:40%;">Options sup.</td>
        <td style="padding:8px 0;font-size:13px;color:#1A1A18;">${extras.map((k) => LABELS.extras[k] || k).join("<br>")}</td>
      </tr>`
      : "";

  return `<table style="width:100%;border-collapse:collapse;">${rows}${extrasRow}</table>`;
}

// ── Auth Google ──
function getAuth() {
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

// ── Crée l'événement Google Calendar avec toutes les infos ──
async function createCalendarEvent(metadata, total) {
  const creneau = JSON.parse(metadata.creneau);
  const auth = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  const extras = (metadata.extras || "").split(",").filter(Boolean);
  const extrasText =
    extras.length > 0
      ? "\nExtras : " +
        extras.map((k) => LABELS.extras[k]?.split(" —")[0] || k).join(", ")
      : "";

  const description = [
    `── CLIENT ──`,
    `Nom : ${metadata.client_name}`,
    `Email : ${metadata.client_email}`,
    `Tél : ${metadata.client_tel}`,
    `Adresse : ${metadata.adresse}`,
    ``,
    `── PRESTATION ──`,
    `Niveau : ${LABELS.offre[metadata.offre] || metadata.offre}`,
    `Surface : ${LABELS.surface[metadata.surface] || metadata.surface + " m²"}`,
    `Urgence : ${LABELS.urgence[metadata.urgence] || metadata.urgence}`,
    `État : ${LABELS.salissure[metadata.salissure] || metadata.salissure}`,
    `Rangement : ${LABELS.rangement[metadata.rangement] || metadata.rangement}`,
    `Meublé : ${LABELS.meuble[metadata.meuble] || metadata.meuble}`,
    `Occupation : ${LABELS.occup[metadata.occup] || metadata.occup}`,
    `Animaux : ${LABELS.animaux[metadata.animaux] || metadata.animaux}`,
    `Vitres : ${LABELS.vitres[metadata.vitres] || metadata.vitres}`,
    `SDB : ${LABELS.sdb[metadata.sdb] || LABELS.sdb[parseInt(metadata.sdb)] || metadata.sdb}`,
    `WC : ${LABELS.wc[metadata.wc] || LABELS.wc[parseInt(metadata.wc)] || metadata.wc}`,
    `Cuisine : ${LABELS.cuisine[metadata.cuisine] || metadata.cuisine}`,
    extrasText,
    ``,
    `── PAIEMENT ──`,
    `Total : ${total}€`,
    `Référence : ${metadata.order_id}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: {
      summary: `Colette — ${metadata.client_name} — ${LABELS.offre[metadata.offre] || metadata.offre}`,
      description,
      start: { dateTime: creneau.start, timeZone: "Europe/Paris" },
      end: { dateTime: creneau.end, timeZone: "Europe/Paris" },
      colorId: "2", // vert dans Google Calendar
    },
  });
}

// ── Email client : confirmation complète ──
async function sendClientEmail(metadata, total) {
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
  const prestationRows = buildPrestationRows(metadata);

  await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: metadata.client_email,
    subject: `Votre intervention Colette est confirmée — ${creneauDate}`,
    html: `
<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1A1A18;background:#fff;">

  <div style="background:#2D4A2D;padding:28px 36px;">
    <p style="color:#FAFAF7;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.02em;">Colette</p>
    <p style="color:rgba(255,255,255,0.55);font-size:12px;margin:4px 0 0;">La Baule · Pornichet · Le Pouliguen</p>
  </div>

  <div style="padding:36px;">
    <h2 style="font-size:20px;font-weight:600;margin:0 0 6px;">Réservation confirmée ✓</h2>
    <p style="color:#4A4A46;font-size:14px;margin:0 0 28px;line-height:1.6;">
      Bonjour ${metadata.client_name},<br>
      votre intervention est confirmée et votre créneau est bloqué. Voici le récapitulatif complet.
    </p>

    <div style="background:#2D4A2D;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
      <p style="color:rgba(255,255,255,0.55);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Créneau confirmé</p>
      <p style="color:#FAFAF7;font-size:16px;font-weight:600;margin:0 0 3px;">${creneauDate}</p>
      <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">${creneauHeure} – ${creneauFin}</p>
    </div>

    <div style="background:#F6F5F0;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 4px;">Adresse d'intervention</p>
      <p style="font-size:14px;color:#1A1A18;margin:0;font-weight:500;">📍 ${metadata.adresse}</p>
    </div>

    <div style="background:#F6F5F0;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 14px;">Détail de la prestation</p>
      ${prestationRows}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:16px 0;border-top:2px solid #2D4A2D;border-bottom:2px solid #2D4A2D;margin-bottom:24px;">
      <span style="font-size:12px;color:#9A9A96;text-transform:uppercase;letter-spacing:0.08em;">Total payé</span>
      <span style="font-size:26px;font-weight:700;color:#2D4A2D;">${total}€</span>
    </div>

    <div style="margin-bottom:24px;">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 10px;">Prochaines étapes</p>
      <p style="font-size:14px;color:#4A4A46;margin:0 0 8px;line-height:1.7;"><strong>1.</strong> Nous vous contacterons par <strong>SMS la veille</strong> pour confirmer l'heure exacte d'arrivée.</p>
      <p style="font-size:14px;color:#4A4A46;margin:0;line-height:1.7;"><strong>2.</strong> Le jour J, nous intervenons exactement selon vos sélections.</p>
    </div>

    <div style="background:#F6F5F0;border-radius:8px;padding:14px 18px;font-size:13px;color:#4A4A46;line-height:1.7;">
      Une question ? Écrivez-nous à <a href="mailto:bonjour@colettelabaule.com" style="color:#2D4A2D;font-weight:500;">bonjour@colettelabaule.com</a>
    </div>

    <p style="font-size:11px;color:#ADADAD;margin-top:20px;line-height:1.6;">
      Référence : ${metadata.order_id}<br>
      Annulation gratuite jusqu'à 24h avant l'intervention.
    </p>
  </div>
</div>`,
  });
}

// ── Email propriétaire : notification nouvelle réservation ──
async function sendOwnerEmail(metadata, total) {
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
  const prestationRows = buildPrestationRows(metadata);

  await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: "colettelabaule@gmail.com",
    subject: `🆕 Nouvelle réservation — ${metadata.client_name} — ${creneauDate}`,
    html: `
<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1A1A18;background:#fff;">

  <div style="background:#1A2E1A;padding:24px 32px;">
    <p style="color:#FAFAF7;font-size:16px;font-weight:700;margin:0;">Colette — Nouvelle réservation</p>
  </div>

  <div style="padding:32px;">

    <div style="background:#F6F5F0;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 12px;">Client</p>
      <p style="font-size:15px;font-weight:600;margin:0 0 4px;">${metadata.client_name}</p>
      <p style="font-size:13px;color:#4A4A46;margin:0 0 2px;">📧 <a href="mailto:${metadata.client_email}" style="color:#2D4A2D;">${metadata.client_email}</a></p>
      <p style="font-size:13px;color:#4A4A46;margin:0 0 2px;">📱 ${metadata.client_tel || "Non renseigné"}</p>
      <p style="font-size:13px;color:#4A4A46;margin:0;">📍 ${metadata.adresse}</p>
    </div>

    <div style="background:#2D4A2D;border-radius:8px;padding:18px 22px;margin-bottom:16px;">
      <p style="color:rgba(255,255,255,0.55);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Créneau</p>
      <p style="color:#FAFAF7;font-size:15px;font-weight:600;margin:0 0 3px;">${creneauDate}</p>
      <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:0;">${creneauHeure} – ${creneauFin}</p>
    </div>

    <div style="background:#F6F5F0;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9A9A96;margin:0 0 14px;">Prestation commandée</p>
      ${prestationRows}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:14px 0;border-top:2px solid #2D4A2D;border-bottom:2px solid #2D4A2D;margin-bottom:20px;">
      <span style="font-size:12px;color:#9A9A96;text-transform:uppercase;letter-spacing:0.08em;">Total encaissé</span>
      <span style="font-size:24px;font-weight:700;color:#2D4A2D;">${total}€</span>
    </div>

    <p style="font-size:11px;color:#ADADAD;line-height:1.6;">
      Référence : ${metadata.order_id}
    </p>
  </div>
</div>`,
  });
}

// ── Handler principal ──
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
        createCalendarEvent(metadata, total),
        sendClientEmail(metadata, total),
        sendOwnerEmail(metadata, total),
      ]);
      console.log(
        `✓ Commande ${metadata.order_id} — ${metadata.client_name} — ${total}€`,
      );
    } catch (err) {
      console.error("Erreur post-paiement:", err);
    }
  }

  return res.status(200).json({ received: true });
}
