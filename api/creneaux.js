const { google } = require("googleapis");

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/calendar.readonly"],
  );
}

// Créneaux fixes par jour : matin 9h-12h, après-midi 14h-18h
function getSlots(dateStr) {
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

module.exports = async function handler(req, res) {
  // CORS pour le dev local
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    // On regarde les 4 prochains jours
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeMin = today.toISOString();
    const timeMax = new Date(
      today.getTime() + 4 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Récupère tous les événements existants sur la période
    const { data } = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const existingEvents = data.items || [];

    // Pour chaque jour, vérifie quels créneaux sont occupés
    const result = {};

    for (let i = 0; i < 4; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      const slots = getSlots(dateStr);

      result[dateStr] = slots.map((slot) => {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();

        // Un créneau est occupé si un événement existant chevauche sa plage horaire
        const busy = existingEvents.some((event) => {
          const evStart = new Date(
            event.start.dateTime || event.start.date,
          ).getTime();
          const evEnd = new Date(
            event.end.dateTime || event.end.date,
          ).getTime();
          return evStart < slotEnd && evEnd > slotStart;
        });

        return {
          id: slot.id,
          label: slot.label,
          start: slot.start,
          end: slot.end,
          available: !busy,
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
};
