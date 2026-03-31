import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
  meuble: { vide: "Logement vide" },
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

// Image publique affichée dans Stripe Checkout — adapte l'URL si besoin
const PRODUCT_IMAGE = "https://www.colettelabaule.com/assets/cover.png";

function buildLineItems(body) {
  const items = [];

  // ── 1. Ligne principale : offre + surface ──
  const basePrice =
    (PRIX.surface[parseInt(body.surface)] ?? 0) + (PRIX.offre[body.offre] ?? 0);
  items.push({
    price_data: {
      currency: "eur",
      unit_amount: basePrice * 100,
      product_data: {
        name: `${LABELS.offre[body.offre] || body.offre} — ${LABELS.surface[body.surface] || body.surface + " m²"}`,
        description:
          "Nettoyage à domicile · La Baule / Pornichet / Le Pouliguen",
        images: [PRODUCT_IMAGE],
      },
    },
    quantity: 1,
  });

  // ── 2. Options avec surcoût ──
  const optKeys = [
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
    const val = body[k];
    const prix = PRIX[k]?.[val] ?? 0;
    const label = LABELS[k]?.[val];
    if (prix !== 0 && label) {
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

    if (total <= 0) return res.status(400).json({ error: "Montant invalide" });

    const orderId = `COL-${Date.now()}`;
    const baseUrl = "https://www.colettelabaule.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true, // ← codes de réduction activés
      payment_method_types: ["card"],
      customer_email: body.client.email,
      line_items: lineItems,
      metadata: {
        order_id: orderId,
        // Prestation
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
        // Créneau
        creneau: JSON.stringify(body.creneau),
        // Client
        client_name: `${body.client.prenom} ${body.client.nom}`,
        client_tel: body.client.tel || "",
        adresse: body.client.adresse || "",
      },
      success_url: `${baseUrl}/confirmation/?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/configurer/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erreur checkout:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors de la création du paiement" });
  }
}
