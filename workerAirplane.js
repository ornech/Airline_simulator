const { parentPort, workerData } = require("worker_threads");
const mysql = require("mysql2/promise");
const axios = require("axios"); // Pour envoyer les mises à jour à l'API

const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

let simulatedTime = new Date(); // Heure simulée reçue de l'orchestrateur
let currentFlight = null; // Stocke les détails du vol en cours

/***************************************************************
 * Mise à jour du statut du vol dans la base de données
 ***************************************************************/
async function updateFlightStatus(flightId, newStatus) {
  if (!flightId) {
    console.error("❌ Erreur: Flight_ID est null ou undefined.");
    return;
  }

  try {
    console.log(
      `🔄 Mise à jour en DB → Vol #${flightId} | Status: ${newStatus}`
    );

    const conn = await mysql.createConnection(dbConfig);

    // Mise à jour du statut du vol uniquement
    await conn.execute(`UPDATE Flights SET Status = ? WHERE Flight_ID = ?`, [
      newStatus,
      flightId,
    ]);

    // Log dans Flight_Status_Log
    await conn.execute(
      `INSERT INTO Flight_Status_Log (Flight_ID, Airplane_ID, Status, Updated_At) VALUES (?, ?, ?, NOW())`,
      [flightId, workerData.airplaneId, newStatus]
    );

    await conn.end();
  } catch (error) {
    console.error(
      `❌ Erreur SQL lors de la mise à jour du vol #${flightId}`,
      error
    );
  }
}

/***************************************************************
 * Calcul et mise à jour de l'heure d'arrivée
 ***************************************************************/
async function calculateAndUpdateArrivalTime(flightId) {
  try {
    const conn = await mysql.createConnection(dbConfig);

    // Récupération des informations du vol
    const [flightData] = await conn.execute(
      "SELECT Departure_Time, Departure_Airport_ID, Arrival_Airport_ID FROM Flights WHERE Flight_ID = ?",
      [flightId]
    );

    if (flightData.length === 0) {
      console.error(`❌ Vol #${flightId} introuvable.`);
      await conn.end();
      return;
    }

    const { Departure_Time, Departure_Airport_ID, Arrival_Airport_ID } =
      flightData[0];

    // Calcul de la distance du vol
    const [distanceResult] = await conn.execute(
      "SELECT Get_Flight_Distance(?, ?) AS distance",
      [Departure_Airport_ID, Arrival_Airport_ID]
    );
    const distance = distanceResult[0]?.distance || 0;

    // Calcul du temps de vol
    const [flightTimeResult] = await conn.execute(
      "SELECT Get_Flight_Time(?, ?) AS flightTime",
      [distance, workerData.airplaneId]
    );
    const flightTime = flightTimeResult[0]?.flightTime || 0;

    await conn.end();

    // Déterminer Arrival_Time
    const departureDate = new Date(Departure_Time);
    departureDate.setMinutes(departureDate.getMinutes() + flightTime);
    const arrivalTime = departureDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    console.log(`📅 Calcul Arrival_Time pour vol #${flightId}: ${arrivalTime}`);

    // Envoyer la mise à jour via l'API flight/update/:id
    await axios.post(`http://localhost:3000/api/flight/update/${flightId}`, {
      Arrival_Time: arrivalTime,
    });
  } catch (err) {
    console.error(
      `❌ Erreur lors du calcul de Arrival_Time pour vol #${flightId}`,
      err
    );
  }
}

/***************************************************************
 * Gestion du vol
 ***************************************************************/
async function processFlight(flight) {
  currentFlight = flight;
  console.log(
    `✈️ Avion #${workerData.airplaneId}: Acceptation du vol #${flight.Flight_ID}`
  );

  // Étape 2 : Acceptation du vol
  await updateFlightStatus(flight.Flight_ID, "Planned");

  // Calcul et mise à jour de Arrival_Time via API
  await calculateAndUpdateArrivalTime(flight.Flight_ID);

  // Programmer les étapes suivantes
  scheduleFlightProgression(flight);
}

/***************************************************************
 * Planification des changements de statut du vol
 ***************************************************************/
function scheduleFlightProgression(flight) {
  const { Departure_Time, Arrival_Time } = flight;

  if (!Departure_Time || !Arrival_Time) {
    console.error("❌ Erreur: Départ ou arrivée non définis.");
    return;
  }

  const departureTime = new Date(Departure_Time).getTime();
  const arrivalTime = new Date(Arrival_Time).getTime();

  const events = [
    { time: departureTime - 45 * 60 * 1000, status: "Boarding" },
    { time: departureTime, status: "In-Flight" },
    { time: arrivalTime - 20 * 60 * 1000, status: "Approaching" },
    { time: arrivalTime, status: "On-Ground" },
    { time: arrivalTime + 20 * 60 * 1000, status: "Completed" },
  ];

  events.forEach(({ time, status }) => {
    const delay = time - simulatedTime.getTime();
    if (delay > 0) {
      setTimeout(() => updateFlightStatus(flight.Flight_ID, status), delay);
    }
  });

  // 20 min après l'atterrissage, libération de l'avion
  setTimeout(async () => {
    console.log(`✈️ Avion #${workerData.airplaneId}: Vol terminé.`);
    currentFlight = null;
    await updateFlightStatus(flight.Flight_ID, "Completed");
    await updateAirplaneStatus(workerData.airplaneId, "IDLE");
  }, arrivalTime + 20 * 60 * 1000 - simulatedTime.getTime());
}

/***************************************************************
 * Mise à jour du statut d’un avion
 ***************************************************************/
async function updateAirplaneStatus(airplaneId, newStatus) {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `UPDATE Airplanes SET Status = ? WHERE Airplane_ID = ?`,
      [newStatus, airplaneId]
    );
    await conn.end();
    console.log(`🛫 Avion #${airplaneId} → Nouveau statut: ${newStatus}`);
  } catch (err) {
    console.error(`❌ Erreur mise à jour avion #${airplaneId}:`, err);
  }
}

/***************************************************************
 * Gestion des messages reçus
 ***************************************************************/
parentPort.on("message", async (msg) => {
  if (msg.type === "START_FLIGHT") {
    await processFlight(msg.flight);
  } else if (msg.type === "TIME_UPDATE") {
    simulatedTime = new Date(msg.simulatedTime);
  }
});
