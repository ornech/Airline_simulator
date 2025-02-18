/***************************************************************
 * workerAirplane.js - Gestion des avions (Workers)
 ***************************************************************/
const { parentPort, workerData } = require("worker_threads");
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

async function processFlight(flight) {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log(
      `✈️ Avion #${workerData.airplaneId}: 📥 Réception du vol #${flight.Flight_ID} depuis l’orchestrateur.`
    );

    // Vérifier si l'avion est déjà occupé
    const [existingFlights] = await conn.execute(
      `SELECT COUNT(*) AS count FROM Flights 
       WHERE Airplane_ID = ? AND Status IN ('Assigned', 'Boarding', 'In-Flight')`,
      [workerData.airplaneId]
    );

    if (existingFlights[0].count > 0) {
      console.log(
        `❌ Avion #${workerData.airplaneId} est déjà en vol. Refus du vol #${flight.Flight_ID}.`
      );
      parentPort.postMessage({
        type: "FLIGHT_DENIED",
        airplaneId: workerData.airplaneId,
        flightId: flight.Flight_ID,
      });
      await conn.end();
      return;
    }

    console.log(
      `✈️ Avion #${workerData.airplaneId}: ✅ Acceptation du vol #${flight.Flight_ID}, insertion en base de données.`
    );

    // Log de la requête pour debug
    console.log(`
      🔍 Requête SQL exécutée :
      INSERT INTO Flights (Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, Airplane_ID, CDB, OPL, Status)
      VALUES (${flight.Flight_ID}, '${flight.Flight_Number}', ${flight.Departure_Airport_ID}, ${flight.Arrival_Airport_ID}, '${flight.Departure_Time}', '${flight.Arrival_Time}', ${workerData.airplaneId}, ${flight.CDB}, ${flight.OPL}, 'Assigned')
    `);

    // Insérer le vol en base avec assignation à l'avion
    await conn.execute(
      `UPDATE Flights 
       SET Airplane_ID = ?, Status = 'On-Time' 
       WHERE Flight_ID = ?`,
      [workerData.airplaneId, flight.Flight_ID]
    );

    console.log(
      `✅ Avion #${workerData.airplaneId}: Vol #${flight.Flight_ID} correctement inséré et assigné.`
    );
    parentPort.postMessage({
      type: "FLIGHT_ADDED",
      airplaneId: workerData.airplaneId,
      flightId: flight.Flight_ID,
    });
  } catch (error) {
    console.error(`❌ Erreur lors de l'insertion du vol en base.`);
    console.error(`🔍 Erreur SQL :`, error);
    parentPort.postMessage({
      type: "FLIGHT_ERROR",
      airplaneId: workerData.airplaneId,
      flightId: flight.Flight_ID,
      error: error.message,
    });
  } finally {
    await conn.end();
  }
}

// Gestion des messages reçus
parentPort.on("message", async (msg) => {
  if (msg.type === "START_FLIGHT") {
    await processFlight(msg.flight);
  }
});
