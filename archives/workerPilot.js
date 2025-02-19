/***************************************************************
 * workerPilot.js - Worker gérant un pilote unique
 ***************************************************************/
const { parentPort, workerData } = require("worker_threads");

// workerData = { pilotId, location, ...}
let { pilotId, location } = workerData;

let currentFlight = null;
let simulatedTime = new Date("2025-02-15T07:00:00");
let restUntil = null; // date jusqu'à laquelle le pilote doit se reposer

function log(msg) {
  console.log(`Pilote #${pilotId}: ${msg}`);
}

parentPort.on("message", (msg) => {
  if (msg.type === "TIME_UPDATE") {
    simulatedTime = new Date(msg.simulatedTime);
    checkStatus();
  } else if (msg.type === "START_FLIGHT") {
    // msg = { flightId, departureTime, arrivalTime, departureAirport, arrivalAirport, ... }
    startFlight(msg);
  }
});

// Le pilote commence un vol
function startFlight(fInfo) {
  currentFlight = {
    flightId: fInfo.flightId,
    depTime: new Date(fInfo.departureTime),
    arrTime: new Date(fInfo.arrivalTime),
    departure: fInfo.departureAirport,
    arrival: fInfo.arrivalAirport,
    status: "On-Time",
  };
  log(
    `👨‍✈️ Début vol #${currentFlight.flightId} de ${currentFlight.departure} à ${currentFlight.arrival}`
  );
}

// Vérifier si on a terminé le vol, etc.
function checkStatus() {
  if (currentFlight) {
    const now = simulatedTime.getTime();
    const dep = currentFlight.depTime.getTime();
    const arr = currentFlight.arrTime.getTime();

    if (now > arr) {
      // Vol terminé
      location = currentFlight.arrival;
      currentFlight = null;
      // Imposer un repos de 7h par ex
      restUntil = new Date(now + 7 * 60 * 60 * 1000);
      // Informer orchestrateur
      parentPort.postMessage({
        type: "PILOT_LOCATION_UPDATE",
        pilotId,
        location,
      });
      log(`👨‍✈️ Vol terminé, repos jusqu'à ${restUntil.toISOString()}`);
    }
  }
}

// À intervalle régulier, on peut vérifier s'il est dispo
setInterval(() => {
  // ...
}, 2000);

log(`👨‍✈️ WorkerPilot démarré, location initiale=${location}`);
