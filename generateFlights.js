/***************************************************************
 * generateFlights.js - Génération de vols planifiés
 ***************************************************************/
const mysql = require("mysql2/promise");

const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

async function generateFlights() {
  const conn = await mysql.createConnection(dbConfig);

  // Vérifier s'il y a déjà des vols planifiés
  const [existingFlights] = await conn.execute(
    "SELECT COUNT(*) AS count FROM Flights WHERE Status = 'Scheduled'"
  );

  if (existingFlights[0].count > 0) {
    console.log(
      "✅ Des vols planifiés existent déjà. Aucune action nécessaire."
    );
    await conn.end();
    return;
  }

  console.log("✈️ Génération de nouveaux vols planifiés...");

  // Récupérer des aéroports aléatoires
  const [airports] = await conn.execute(
    "SELECT Airport_ID FROM Airports ORDER BY RAND() LIMIT 10"
  );

  if (airports.length < 2) {
    console.error("❌ Pas assez d’aéroports pour planifier des vols !");
    await conn.end();
    return;
  }

  // Récupérer des pilotes disponibles
  const [pilots] = await conn.execute(
    "SELECT Employee_ID FROM Employees WHERE Role = 'Pilot' ORDER BY RAND() LIMIT 10"
  );

  if (pilots.length < 2) {
    console.error("❌ Pas assez de pilotes disponibles !");
    await conn.end();
    return;
  }

  // Générer 5 vols planifiés
  for (let i = 0; i < 5; i++) {
    const departure =
      airports[Math.floor(Math.random() * airports.length)].Airport_ID;
    let arrival;
    do {
      arrival =
        airports[Math.floor(Math.random() * airports.length)].Airport_ID;
    } while (arrival === departure); // S'assurer que l'aéroport d'arrivée est différent

    const cdb = pilots[i % pilots.length].Employee_ID;
    const opl = pilots[(i + 1) % pilots.length].Employee_ID; // Un autre pilote

    const departureTime = new Date();
    departureTime.setHours(departureTime.getHours() + i * 3); // Vols espacés de 3h
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + 2); // 2h de vol en moyenne

    // Générer un numéro de vol unique
    const flightNumber = `FL${1000 + i}`;

    await conn.execute(
      `INSERT INTO Flights (Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, CDB, OPL, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [flightNumber, departure, arrival, departureTime, arrivalTime, cdb, opl]
    );

    console.log(
      `✅ Vol ${flightNumber} planifié de ${departure} vers ${arrival}`
    );
  }

  // Vérifier que les vols ont bien été insérés
  const [newFlights] = await conn.execute(
    "SELECT Flight_ID, Flight_Number, Status FROM Flights WHERE Status = 'Scheduled'"
  );
  console.log("✈️ Vols planifiés après insertion :", newFlights);

  await conn.end();
  console.log("✈️ Vols planifiés ajoutés avec succès !");
}

// Exécuter la fonction
generateFlights().catch(console.error);
