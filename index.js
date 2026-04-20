const express = require("express");
const app = express();

const authRoutes = require("./auth");
const itemRoutes = require("./items");

app.use(express.json());

app.use("/", authRoutes);
app.use("/api", itemRoutes);

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});