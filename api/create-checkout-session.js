// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const PRIX = {
//   surface: { 30: 179, 45: 259, 60: 329, 80: 399 },
//   offre: { basique: 0, hygiene: 120, edl: 150 },
//   urgence: { "48h": 0, demain: 39, jour: 79 },
//   salissure: { normal: 0, sale: 39, "tres-sale": 149 },
//   rangement: { normal: 0, encombre: 29, desordre: 49 },
//   meuble: { meuble: 0, vide: -29 },
//   occup: { vide: 0, occupe: 19 },
//   animaux: { non: 0, poils: 29, beaucoup: 49 },
//   vitres: { standard: 0, "2baies": 80, "3baies": 160 },
//   sdb: { 1: 0, 2: 89, 3: 209 },
//   wc: { 1: 0, 2: 39 },
//   cuisine: { standard: 0, familiale: 29 },
//   extras: {
//     four: 59,
//     frigo: 49,
//     hotte: 29,
//     plaques: 29,
//     matelas: 89,
//     fauteuil: 99,
//     canape2: 99,
//     canape3: 129,
//     poussiere: 49,
//     traces: 49,
//     brillance: 39,
//     degraissage: 29,
//     desinfection: 49,
//   },
// };

// const LABELS = {
//   offre: {
//     basique: "Reset Minimal",
//     hygiene: "Reset Hygiène",
//     edl: "État des lieux",
//   },
//   surface: { 30: "0–30 m²", 45: "30–45 m²", 60: "45–60 m²", 80: "60–80 m²" },
//   urgence: { demain: "Urgence — demain", jour: "Urgence — jour même" },
//   salissure: { sale: "Saleté modérée", "tres-sale": "Saleté importante" },
//   rangement: { encombre: "Logement encombré", desordre: "Désordre important" },
//   meuble: { vide: "Logement vide" },
//   occup: { occupe: "Présence pendant intervention" },
//   animaux: {
//     poils: "Animaux — poils",
//     beaucoup: "Animaux — présence importante",
//   },
//   vitres: { "2baies": "2 baies vitrées", "3baies": "3 baies vitrées ou plus" },
//   sdb: { 2: "2 salles de bain", 3: "3 salles de bain" },
//   wc: { 2: "WC supplémentaire" },
//   cuisine: { familiale: "Cuisine familiale" },
//   extras: {
//     four: "Four",
//     frigo: "Réfrigérateur",
//     hotte: "Hotte",
//     plaques: "Plaques brillantes",
//     matelas: "Matelas",
//     fauteuil: "Fauteuil",
//     canape2: "Canapé 2 places",
//     canape3: "Canapé 3 places",
//     poussiere: "Poussière détailing",
//     traces: "Traces & marques légères",
//     brillance: "Brillance cuisine & salle de bain",
//     degraissage: "Dégraissage renforcé",
//     desinfection: "Désinfection ++",
//   },
// };

// // Image publique affichée dans Stripe Checkout — adapte l'URL si besoin
// const PRODUCT_IMAGE = "https://www.colettelabaule.com/assets/cover.png";

// function buildLineItems(body) {
//   const items = [];

//   // ── 1. Ligne principale : offre + surface ──
//   const basePrice =
//     (PRIX.surface[parseInt(body.surface)] ?? 0) + (PRIX.offre[body.offre] ?? 0);
//   items.push({
//     price_data: {
//       currency: "eur",
//       unit_amount: basePrice * 100,
//       product_data: {
//         name: `${LABELS.offre[body.offre] || body.offre} — ${LABELS.surface[body.surface] || body.surface + " m²"}`,
//         description:
//           "Nettoyage à domicile · La Baule / Pornichet / Le Pouliguen",
//         images: [PRODUCT_IMAGE],
//       },
//     },
//     quantity: 1,
//   });

//   // ── 2. Options avec surcoût ──
//   const optKeys = [
//     "urgence",
//     "salissure",
//     "rangement",
//     "meuble",
//     "occup",
//     "animaux",
//     "vitres",
//     "sdb",
//     "wc",
//     "cuisine",
//   ];
//   for (const k of optKeys) {
//     const val = body[k];
//     const prix = PRIX[k]?.[val] ?? 0;
//     const label = LABELS[k]?.[val];
//     if (prix !== 0 && label) {
//       items.push({
//         price_data: {
//           currency: "eur",
//           unit_amount: Math.round(prix * 100),
//           product_data: { name: label },
//         },
//         quantity: 1,
//       });
//     }
//   }

//   // ── 3. Extras ──
//   for (const key of body.extras || []) {
//     const prix = PRIX.extras[key] ?? 0;
//     const label = LABELS.extras[key];
//     if (prix > 0 && label) {
//       items.push({
//         price_data: {
//           currency: "eur",
//           unit_amount: prix * 100,
//           product_data: { name: label },
//         },
//         quantity: 1,
//       });
//     }
//   }

//   return items;
// }

// function calculerTotal(lineItems) {
//   return (
//     lineItems.reduce((sum, item) => sum + item.price_data.unit_amount, 0) / 100
//   );
// }

// export default async function handler(req, res) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//   if (req.method === "OPTIONS") return res.status(200).end();
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const body = req.body;

//     if (!body.offre || !body.surface || !body.creneau || !body.client?.email) {
//       return res.status(400).json({ error: "Données manquantes" });
//     }

//     const lineItems = buildLineItems(body);
//     const total = calculerTotal(lineItems);

//     if (total <= 0) return res.status(400).json({ error: "Montant invalide" });

//     const orderId = `COL-${Date.now()}`;
//     const baseUrl = "https://www.colettelabaule.com";

//     const session = await stripe.checkout.sessions.create({
//       mode: "payment",
//       allow_promotion_codes: true, // ← codes de réduction activés
//       payment_method_types: ["card"],
//       customer_email: body.client.email,
//       line_items: lineItems,
//       metadata: {
//         order_id: orderId,
//         // Prestation
//         offre: body.offre,
//         surface: String(body.surface),
//         urgence: body.urgence,
//         salissure: body.salissure || "normal",
//         rangement: body.rangement || "normal",
//         meuble: body.meuble || "meuble",
//         occup: body.occup || "vide",
//         animaux: body.animaux || "non",
//         vitres: body.vitres || "standard",
//         sdb: String(body.sdb || "1"),
//         wc: String(body.wc || "1"),
//         cuisine: body.cuisine || "standard",
//         extras: (body.extras || []).join(","),
//         // Créneau
//         creneau: JSON.stringify(body.creneau),
//         // Client
//         client_name: `${body.client.prenom} ${body.client.nom}`,
//         client_tel: body.client.tel || "",
//         adresse: body.client.adresse || "",
//       },
//       success_url: `${baseUrl}/confirmation/?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${baseUrl}/configurer/`,
//     });

//     return res.status(200).json({ url: session.url });
//   } catch (err) {
//     console.error("Erreur checkout:", err);
//     return res
//       .status(500)
//       .json({ error: "Erreur lors de la création du paiement" });
//   }
// }
import Stripe from "stripe";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const PRIX = {
  surface: { 30: 179, 45: 259, 60: 329, 80: 399 },
  offre: { basique: 0, hygiene: 120, edl: 150 },
  urgence: { "48h": 0, demain: 39, jour: 79 },
  salissure: { normal: 0, sale: 39, "tres-sale": 149 },
  rangement: { normal: 0, encombre: 29, desordre: 49 },
  meuble: { meuble: 0, vide: -29 },
  occup: { vide: 0, occupe: 19 },
  animaux: { non: 0, poils: 29, beaucoup: 49 },
  vitres: { standard: 0, "2baies": 80, "3baies": 160 },
  sdb: { 1: 0, 2: 89, 3: 209 },
  wc: { 1: 0, 2: 39 },
  cuisine: { standard: 0, familiale: 29 },
  extras: {
    four: 59,
    frigo: 49,
    hotte: 29,
    plaques: 29,
    matelas: 89,
    fauteuil: 99,
    canape2: 99,
    canape3: 129,
    poussiere: 49,
    traces: 49,
    brillance: 39,
    degraissage: 29,
    desinfection: 49,
  },
};

const LABELS = {
  offre: {
    basique: "Reset Minimal",
    hygiene: "Reset Hygiène",
    edl: "État des lieux",
  },
  surface: { 30: "0–30 m²", 45: "30–45 m²", 60: "45–60 m²", 80: "60–80 m²" },
  urgence: { demain: "Urgence — demain", jour: "Urgence — jour même" },
  salissure: { sale: "Saleté modérée", "tres-sale": "Saleté importante" },
  rangement: { encombre: "Logement encombré", desordre: "Désordre important" },
  meuble: { vide: "Logement vide (−29€ déduit)" },
  occup: { occupe: "Présence pendant intervention" },
  animaux: {
    poils: "Animaux — poils",
    beaucoup: "Animaux — présence importante",
  },
  vitres: { "2baies": "2 baies vitrées", "3baies": "3 baies vitrées ou plus" },
  sdb: { 2: "2 salles de bain", 3: "3 salles de bain" },
  wc: { 2: "WC supplémentaire" },
  cuisine: { familiale: "Cuisine familiale" },
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

const PRODUCT_IMAGE = "https://www.colettelabaule.com/assets/cover.png";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatSlot(creneau) {
  const date = new Date(creneau.start);
  const day = date.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${day} · ${creneau.label || "créneau à confirmer"}`;
}

function getSelectedOptions(body) {
  const keys = [
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
  const labels = keys
    .map((key) => LABELS[key]?.[body[key]])
    .filter(Boolean);
  return [...labels, ...(body.extras || []).map((key) => LABELS.extras[key]).filter(Boolean)];
}

async function sendPrebookingEmails({ body, checkoutUrl, orderId, total }) {
  const creneau = body.creneau;
  const slot = formatSlot(creneau);
  const clientName = `${body.client.prenom} ${body.client.nom}`.trim();
  const selectedOptions = getSelectedOptions(body);
  const comment = String(body.commentaire || "").trim();
  const optionsHtml = selectedOptions.length
    ? `<ul style="margin:8px 0 0;padding-left:18px;color:#4A4A46;font-size:14px;line-height:1.55;">${selectedOptions.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}</ul>`
    : "";
  const commentHtml = comment
    ? `<p style="margin:0 0 14px;color:#4A4A46;font-size:14px;line-height:1.55;"><strong>Informations supplémentaires :</strong><br>${escapeHtml(comment).replace(/\n/g, "<br>")}</p>`
    : "";
  const paymentCta = `<a href="${checkoutUrl}" style="display:inline-block;background:#012D18;color:#EDEAE2;padding:15px 20px;font-size:12px;font-weight:700;letter-spacing:.05em;text-decoration:none;text-transform:uppercase;">Accéder au paiement →</a>`;

  const clientEmail = await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: body.client.email,
    subject: `Votre pré-réservation Colette — ${slot}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#012D18;background:#fff;">
      <div style="background:#012D18;padding:28px 32px;color:#EDEAE2;"><p style="margin:0;font-size:24px;font-weight:700;">Colette</p><p style="margin:6px 0 0;color:#FF9BD2;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">Pré-réservation reçue</p></div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:24px;">Bonjour ${escapeHtml(body.client.prenom)},</h1>
        <p style="margin:0 0 22px;color:#4A4A46;line-height:1.6;">Votre demande est reçue. <strong>Ce n'est pas encore une réservation confirmée.</strong> Nous revenons vers vous au plus vite par SMS ou téléphone pour valider le créneau et la prestation.</p>
        <div style="background:#E5E1D7;padding:18px 20px;margin-bottom:14px;"><p style="margin:0 0 5px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#005D41;">Créneau souhaité — à confirmer</p><p style="margin:0;font-size:16px;font-weight:700;">${escapeHtml(slot)}</p></div>
        <div style="background:#F6F5F0;padding:18px 20px;margin-bottom:14px;"><p style="margin:0 0 5px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#98968B;">Prestation estimée</p><p style="margin:0;font-size:15px;font-weight:700;">${escapeHtml(LABELS.offre[body.offre] || body.offre)} · ${escapeHtml(LABELS.surface[body.surface] || body.surface)}</p>${optionsHtml}<p style="margin:16px 0 0;font-size:18px;font-weight:700;color:#005D41;">${total}€</p></div>
        ${commentHtml}
        <div style="border:1px solid #DAD6C8;padding:18px 20px;margin-bottom:20px;"><p style="margin:0 0 12px;font-size:13px;line-height:1.55;"><strong>Votre lien de paiement est prêt.</strong> Merci de l'utiliser uniquement après notre confirmation par téléphone ou SMS.</p>${paymentCta}</div>
        <p style="margin:0;color:#4A4A46;font-size:13px;line-height:1.6;">Une question ou une urgence ? Appelez-nous au <a href="tel:0776232034" style="color:#005D41;font-weight:700;">07 76 23 20 34</a>.</p>
        <p style="margin:24px 0 0;color:#98968B;font-size:11px;">Référence : ${escapeHtml(orderId)}</p>
      </div>
    </div>`,
  });

  const ownerEmail = await resend.emails.send({
    from: "Colette <bonjour@colettelabaule.com>",
    to: "colettelabaule@gmail.com",
    subject: `⏳ Pré-réservation à valider — ${clientName} — ${slot}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#012D18;"><h1 style="font-size:22px;">Nouvelle pré-réservation</h1><p><strong>${escapeHtml(clientName)}</strong> souhaite le créneau <strong>${escapeHtml(slot)}</strong>.</p><p><strong>Prestation :</strong> ${escapeHtml(LABELS.offre[body.offre] || body.offre)} · ${escapeHtml(LABELS.surface[body.surface] || body.surface)}</p>${optionsHtml}<p>Montant prévu : <strong>${total}€</strong></p><p>📞 ${escapeHtml(body.client.tel || "Téléphone non renseigné")}<br>📧 ${escapeHtml(body.client.email)}<br>📍 ${escapeHtml(body.client.adresse || "Adresse non renseignée")}</p>${comment ? `<p><strong>Informations supplémentaires :</strong><br>${escapeHtml(comment).replace(/\n/g, "<br>")}</p>` : ""}<p><strong>À faire :</strong> appeler ou envoyer un SMS pour confirmer le créneau avant paiement.</p><p style="color:#777;font-size:12px;">Référence : ${escapeHtml(orderId)}</p></div>`,
  });

  if (clientEmail.error || ownerEmail.error) {
    throw new Error(clientEmail.error?.message || ownerEmail.error?.message || "Erreur d'envoi de pré-réservation");
  }
}

function buildLineItems(body) {
  const items = [];

  // ── 1. Ligne principale : offre + surface + réductions incluses ──
  // Les prix négatifs (ex: logement vide −29€) sont intégrés ici
  // car Stripe n'accepte pas de line_item avec unit_amount négatif.
  const basePrice =
    (PRIX.surface[parseInt(body.surface)] ?? 0) + (PRIX.offre[body.offre] ?? 0);

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
  const reductionsSum = optKeys.reduce((sum, k) => {
    const prix = PRIX[k]?.[body[k]] ?? 0;
    return prix < 0 ? sum + prix : sum; // accumule les négatifs
  }, 0);

  const baseWithReductions = basePrice + reductionsSum;

  items.push({
    price_data: {
      currency: "eur",
      unit_amount: Math.max(0, Math.round(baseWithReductions * 100)),
      product_data: {
        name: `${LABELS.offre[body.offre] || body.offre} — ${LABELS.surface[body.surface] || body.surface + " m²"}`,
        description:
          reductionsSum < 0
            ? `Nettoyage à domicile · La Baule / Pornichet / Le Pouliguen · Réduction logement vide incluse`
            : `Nettoyage à domicile · La Baule / Pornichet / Le Pouliguen`,
        images: [PRODUCT_IMAGE],
      },
    },
    quantity: 1,
  });

  // ── 2. Options avec surcoût uniquement (prix > 0) ──
  // Stripe refuse les unit_amount négatifs — les réductions sont dans la ligne de base.
  const urgenceAndOpts = ["urgence", ...optKeys];
  for (const k of urgenceAndOpts) {
    const val = body[k];
    const prix = PRIX[k]?.[val] ?? 0;
    const label = LABELS[k]?.[val];
    if (prix > 0 && label) {
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: Math.round(prix * 100),
          product_data: { name: label },
        },
        quantity: 1,
      });
    }
  }

  // ── 3. Extras ──
  for (const key of body.extras || []) {
    const prix = PRIX.extras[key] ?? 0;
    const label = LABELS.extras[key];
    if (prix > 0 && label) {
      items.push({
        price_data: {
          currency: "eur",
          unit_amount: prix * 100,
          product_data: { name: label },
        },
        quantity: 1,
      });
    }
  }

  return items;
}

function calculerTotal(lineItems) {
  return (
    lineItems.reduce((sum, item) => sum + item.price_data.unit_amount, 0) / 100
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;

    if (!body.offre || !body.surface || !body.creneau || !body.client?.email) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const lineItems = buildLineItems(body);
    const total = calculerTotal(lineItems);
    const commentaire =
      typeof body.commentaire === "string"
        ? body.commentaire.trim().slice(0, 500)
        : "";

    if (total < 0) return res.status(400).json({ error: "Montant invalide" });

    const orderId = `COL-${Date.now()}`;
    const baseUrl = "https://www.colettelabaule.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      customer_email: body.client.email,
      line_items: lineItems,
      metadata: {
        order_id: orderId,
        flow: "prebooking",
        offre: body.offre,
        surface: String(body.surface),
        urgence: body.urgence,
        salissure: body.salissure || "normal",
        rangement: body.rangement || "normal",
        meuble: body.meuble || "meuble",
        occup: body.occup || "vide",
        animaux: body.animaux || "non",
        vitres: body.vitres || "standard",
        sdb: String(body.sdb || "1"),
        wc: String(body.wc || "1"),
        cuisine: body.cuisine || "standard",
        extras: (body.extras || []).join(","),
        creneau: JSON.stringify(body.creneau),
        client_name: `${body.client.prenom} ${body.client.nom}`,
        client_tel: body.client.tel || "",
        adresse: body.client.adresse || "",
        commentaire,
      },
      success_url: `${baseUrl}/confirmation/?status=paid&order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/confirmation/?status=prebooking&order_id=${orderId}&payment=cancelled`,
    });

    await sendPrebookingEmails({
      body,
      checkoutUrl: session.url,
      orderId,
      total,
    });

    return res.status(200).json({ orderId });
  } catch (err) {
    console.error("Erreur pré-réservation:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors de l'envoi de la pré-réservation" });
  }
}
