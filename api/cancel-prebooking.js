import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configuration Supabase manquante");
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function isAuthenticated(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return false;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  try {
    if (!(await isAuthenticated(req))) {
      return res.status(401).json({ error: "Connexion requise" });
    }

    const orderId = String(req.body?.orderId || "").trim();
    if (!/^COL-\d+$/.test(orderId)) {
      return res.status(400).json({ error: "Référence de pré-réservation invalide" });
    }

    const supabase = getSupabaseAdmin();
    const { data: booking, error: readError } = await supabase
      .from("prebookings")
      .select("status,stripe_checkout_session_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (readError) throw readError;
    if (!booking) return res.status(404).json({ error: "Pré-réservation introuvable" });
    if (booking.status !== "pending_confirmation") {
      return res.status(409).json({ error: "Cette pré-réservation ne peut plus être annulée" });
    }

    if (booking.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
      if (session.status === "complete") {
        return res.status(409).json({ error: "Le paiement a déjà été reçu" });
      }
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(booking.stripe_checkout_session_id);
      }
    }

    const { error: updateError } = await supabase
      .from("prebookings")
      .update({ status: "cancelled" })
      .eq("order_id", orderId)
      .eq("status", "pending_confirmation");
    if (updateError) throw updateError;

    return res.status(200).json({ cancelled: true });
  } catch (error) {
    console.error("Erreur annulation pré-réservation:", error);
    return res.status(500).json({ error: "Impossible d'annuler la pré-réservation" });
  }
}
