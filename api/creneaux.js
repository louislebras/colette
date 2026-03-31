import { google } from "googleapis";

// ── À MODIFIER selon le nombre de personnes disponibles ──
// 1 = un seul créneau à la fois, 2 = deux simultanément, etc.
const CAPACITE_PAR_CRENEAU = 1;

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .replace(/^"/, "")
    .replace(/"$/, "");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

// Définit les 2 créneaux fixes par jour
function getSlotsForDate(dateStr) {
  return [
    {
      id: `${dateStr}-matin`,
      start: `${dateStr}T09:00:00`,
      end: `${dateStr}T12:00:00`,
      label: "9h–12h",
    },
    {
      id: `${dateStr}-apres-midi`,
      start: `${dateStr}T14:00:00`,
      end: `${dateStr}T18:00:00`,
      label: "14h–18h",
    },
  ];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    // Fenêtre : aujourd'hui + 4 jours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();
    const timeMax = new Date(
      today.getTime() + 4 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data } = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const existingEvents = data.items || [];

    const result = {};

    for (let i = 0; i < 4; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      const slots = getSlotsForDate(dateStr);

      result[dateStr] = slots.map((slot) => {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();

        // Compte combien d'événements chevauchent ce créneau
        const overlappingCount = existingEvents.filter((event) => {
          const evStart = new Date(
            event.start.dateTime || event.start.date,
          ).getTime();
          const evEnd = new Date(
            event.end.dateTime || event.end.date,
          ).getTime();
          // Chevauchement : l'événement commence avant la fin du créneau ET finit après son début
          return evStart < slotEnd && evEnd > slotStart;
        }).length;

        // Disponible si le nombre de réservations < capacité
        const available = overlappingCount < CAPACITE_PAR_CRENEAU;

        return {
          id: slot.id,
          start: slot.start,
          end: slot.end,
          label: slot.label,
          available,
          booked: overlappingCount,
          capacity: CAPACITE_PAR_CRENEAU,
        };
      });
    }

    return res.status(200).json({ slots: result });
  } catch (err) {
    console.error("Erreur creneaux:", err);
    return res
      .status(500)
      .json({ error: "Impossible de récupérer les créneaux" });
  }
}
