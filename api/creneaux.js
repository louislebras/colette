import { google } from "googleapis";

// ── À MODIFIER selon le nombre de personnes disponibles ──
// 1 = un seul créneau à la fois, 2 = deux simultanément, etc.
const CAPACITE_PAR_CRENEAU = 1;

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const PARIS_TIME_ZONE = "Europe/Paris";

function getParisDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addParisDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function getParisOffset(dateKey, hour) {
  const probe = new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00Z`,
  );
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(probe)
    .find((part) => part.type === "timeZoneName")?.value;
  return (
    (offset === "GMT" ? "+00:00" : offset?.replace("GMT", "")) ||
    "+00:00"
  );
}

function getParisDateTime(dateKey, hour) {
  const offset = getParisOffset(dateKey, hour);
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00${offset}`,
  );
}

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

    // Fenêtre : aujourd'hui + 4 jours, toujours basée sur le calendrier de Paris.
    const today = getParisDateKey();
    const timeMin = getParisDateTime(today, 0).toISOString();
    const timeMax = getParisDateTime(addParisDays(today, 4), 0).toISOString();

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
      const dateStr = addParisDays(today, i);
      const slots = getSlotsForDate(dateStr);

      result[dateStr] = slots.map((slot) => {
        const slotStart = getParisDateTime(
          dateStr,
          Number(slot.start.slice(11, 13)),
        ).getTime();
        const slotEnd = getParisDateTime(
          dateStr,
          Number(slot.end.slice(11, 13)),
        ).getTime();

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
