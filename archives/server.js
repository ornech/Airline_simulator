const express = require("express");
const path = require("path");

const app = express();

// Sert tous les fichiers du même dossier que server.js
app.use(express.static(path.join(__dirname)));

app.listen(3000, () => {
  console.log("Serveur écoutant sur http://localhost:3000");
});
