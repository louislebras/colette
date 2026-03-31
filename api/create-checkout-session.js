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

function calculerTotal(body) {
  const base = PRIX.surface[parseInt(body.surface)] ?? 0;
  const offre = PRIX.offre[body.offre] ?? 0;
  const urgence = PRIX.urgence[body.urgence] ?? 0;
  const options = [
    "salissure",
    "rangement",
    "meuble",
    "occup",
    "animaux",
    "vitres",
    "sdb",
    "wc",
    "cuisine",
  ].reduce((sum, k) => sum + (PRIX[k]?.[body[k]] ?? 0), 0);
  const extras = (body.extras || []).reduce(
    (sum, k) => sum + (PRIX.extras[k] ?? 0),
    0,
  );
  return base + offre + urgence + options + extras;
}

function buildDescription(body) {
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
  return `${niveaux[body.offre] || body.offre} · ${surfaces[body.surface] || body.surface + " m²"}`;
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

    const total = calculerTotal(body);
    if (total <= 0) return res.status(400).json({ error: "Montant invalide" });

    const orderId = `COL-${Date.now()}`;
    const baseUrl = "https://www.colettelabaule.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.client.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: total * 100,
            product_data: {
              name: "Prestation Colette",
              description: buildDescription(body),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        offre: body.offre,
        surface: String(body.surface),
        urgence: body.urgence,
        creneau: JSON.stringify(body.creneau),
        client_name: `${body.client.prenom} ${body.client.nom}`,
        client_tel: body.client.tel || "",
        adresse: body.client.adresse || "",
        extras: (body.extras || []).join(","),
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
