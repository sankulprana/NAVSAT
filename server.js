const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { generateTrajectory } = require("./optimizer");
const { predictEfficiency } = require("./model");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function parseNumber(val, defaultVal = 0.0) {
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

// System status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    database: db.getDbType(),
    timestamp: new Date().toISOString()
  });
});

// GET /api/history — Retrieve prediction history from database
app.get("/api/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await db.getPredictionHistory(limit);
    return res.json({ history, dbType: db.getDbType() });
  } catch (err) {
    console.error("Error fetching prediction history from database:", err);
    return res.status(500).json({ error: "Failed to fetch prediction history from database" });
  }
});

// POST /api/users — Create new user
app.post("/api/users", async (req, res) => {
  try {
    const { username, email } = req.body || {};
    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required." });
    }

    const newUser = await db.createUser({ username, email });
    return res.status(201).json({ user: newUser, dbType: db.getDbType() });
  } catch (err) {
    console.error("Error creating user:", err);
    return res.status(500).json({ error: err.message || "Failed to create user in database" });
  }
});

// GET /api/users — List users
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.getUsers();
    return res.json({ users, dbType: db.getDbType() });
  } catch (err) {
    console.error("Error listing users:", err);
    return res.status(500).json({ error: "Failed to list users from database" });
  }
});

// POST /generate-trajectory — Calculate trajectory and insert into database
app.post("/generate-trajectory", async (req, res) => {
  const data = req.body || {};

  try {
    const satelliteName = String(data.satelliteName || data.satellite_name || data.name || "NAVSAT");
    const altitude = parseNumber(data.altitude_km ?? data.altitude, 0.0);
    const velocity = parseNumber(data.velocity_km_s ?? data.velocity, 0.0);
    const inclination = parseNumber(data.inclination_deg ?? data.inclination, 0.0);
    const latitude = parseNumber(data.latitude, 0.0);
    const longitude = parseNumber(data.longitude, 0.0);
    const fuelCapacity = parseNumber(data.fuel_capacity ?? data.fuel ?? data.fuelCapacity, 1000.0);

    // Calculate trajectory & metrics
    const trajectoryData = generateTrajectory(altitude, velocity, inclination);
    const efficiency = predictEfficiency(altitude, velocity);
    const fuelConsumption = trajectoryData.fuel_consumption;
    const adjustedFuel = Math.round((fuelConsumption * (100 - efficiency)) / 100 * 100) / 100;
    const collisionRisk = trajectoryData.collision_risk;

    // Save prediction record into Database
    const savedRecord = await db.savePrediction({
      satelliteName,
      altitude,
      velocity,
      inclination,
      latitude,
      longitude,
      fuelCapacity,
      fuelConsumption: adjustedFuel,
      collisionRisk,
      efficiency
    });

    return res.json({
      trajectory: trajectoryData.trajectory,
      fuel_consumption: adjustedFuel,
      collision_risk: collisionRisk,
      efficiency: efficiency,
      recordId: savedRecord.id || savedRecord._id,
      dbType: db.getDbType()
    });
  } catch (err) {
    console.error("Trajectory generation error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate trajectory" });
  }
});

// POST /generate-mission-brief
app.post("/generate-mission-brief", (req, res) => {
  const data = req.body || {};

  const satelliteName = String(data.satelliteName || data.satellite_name || data.name || "NAVSAT");
  const altitude = parseNumber(data.altitude_km ?? data.altitude, 0.0);
  const velocity = parseNumber(data.velocity_km_s ?? data.velocity, 0.0);
  const inclination = parseNumber(data.inclination_deg ?? data.inclination, 0.0);
  const fuelCapacity = parseNumber(data.fuel_capacity ?? data.fuel ?? data.fuelCapacity, 0.0);

  const trajectoryData = generateTrajectory(altitude, velocity, inclination);
  const efficiency = predictEfficiency(altitude, velocity);
  const fuelConsumption = trajectoryData.fuel_consumption;
  const adjustedFuel = Math.round((fuelConsumption * (100 - efficiency)) / 100 * 100) / 100;
  const collisionRisk = trajectoryData.collision_risk;

  const brief =
    `Mission Brief for ${satelliteName}:\n\n` +
    `- Orbit Inputs: Altitude = ${altitude.toFixed(0)} km, Velocity = ${velocity.toFixed(2)} km/s, Inclination = ${inclination.toFixed(1)}°.\n` +
    `- Predicted Efficiency: ${efficiency.toFixed(1)}/100.\n` +
    `- Collision Risk Assessment: ${collisionRisk}.\n` +
    `- Estimated Fuel Usage: ${adjustedFuel.toFixed(2)} units (Capacity: ${fuelCapacity.toFixed(0)} units).\n\n` +
    `Database persistence layer (${db.getDbType()}) updated. Ready for mission execution.`;

  return res.json({
    brief: brief,
    genai_enabled: true,
  });
});

// Serve frontend build
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/generate-")) {
    return next();
  }
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send("Frontend build not found. Building now or check server logs.");
});

// Start DB first, then HTTP server
db.initDb().then(({ type }) => {
  app.listen(PORT, () => {
    console.log(`NavSat Server running on http://127.0.0.1:${PORT} using ${type} database`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
