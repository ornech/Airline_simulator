const { parentPort, workerData } = require("worker_threads");
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

let simulatedTime = new Date(); // Heure simulée reçue de l'orchestrateur
let currentFlight = null; // Stocke les détails du vol en cours

// Fonction pour mettre à jour la base de données
async function updateFlightStatus(flight, newStatus) {
  if (!flight || !flight.Flight_ID) {
    console.error(
      "❌ Erreur: Flight_ID est null ou undefined dans updateFlightStatus."
    );
    return;
  }

  try {
    console.log(
      `🔄 Mise à jour en DB → Vol #${flight.Flight_ID} | Status: ${newStatus}`
    );

    const conn = await mysql.createConnection(dbConfig);

    // Mise à jour du statut + assignation de l'avion
    await conn.execute(
      `UPDATE Flights SET Status = ?, Airplane_ID = ? WHERE Flight_ID = ?`,
      [newStatus, workerData.airplaneId, flight.Flight_ID]
    );

    // Ajout dans le log des statuts
    await conn.execute(
      `INSERT INTO Flight_Status_Log (Flight_ID, Airplane_ID, Status, Updated_At) VALUES (?, ?, ?, NOW())`,
      [flight.Flight_ID, workerData.airplaneId, newStatus]
    );

    await conn.end();
  } catch (error) {
    console.error(
      `❌ Erreur SQL lors de la mise à jour du statut du vol #${flight.Flight_ID}`,
      error
    );
  }
}

// Gestion du vol
async function processFlight(flight) {
  currentFlight = flight;
  console.log(
    `✈️ Avion #${workerData.airplaneId}: Acceptation du vol #${flight.Flight_ID}`
  );

  await updateFlightStatus("On-Time");

  // Planification des changements de statut
  setTimeout(() => updateFlightStatus("Boarding"), 45 * 60 * 1000); // 45 min avant départ
  setTimeout(() => updateFlightStatus("In-Flight"), 60 * 60 * 1000); // Départ
  setTimeout(
    () => updateFlightStatus("Approaching"),
    flight.Arrival_Time - 20 * 60 * 1000 - simulatedTime
  );
  setTimeout(
    () => updateFlightStatus("On-Ground"),
    flight.Arrival_Time - simulatedTime
  );
  setTimeout(() => {
    updateFlightStatus("Completed");
    currentFlight = null;
  }, flight.Arrival_Time + 20 * 60 * 1000 - simulatedTime); // 20 min après arrivée
}

// Gestion des messages reçus
parentPort.on("message", async (msg) => {
  if (msg.type === "START_FLIGHT") {
    await processFlight(msg.flight);
  } else if (msg.type === "TIME_UPDATE") {
    simulatedTime = new Date(msg.simulatedTime);
  }
});
