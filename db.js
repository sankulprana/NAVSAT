const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const sqlite3 = require("sqlite3").verbose();

const DB_DIR = path.join(__dirname, "data");
const SQLITE_PATH = path.join(DB_DIR, "navsat.db");

let isMongoConnected = false;
let sqliteDb = null;

// Mongoose Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PredictionSchema = new mongoose.Schema({
  satelliteName: { type: String, required: true },
  altitude: { type: Number, required: true },
  velocity: { type: Number, required: true },
  inclination: { type: Number, required: true },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  fuelCapacity: { type: Number, default: 1000 },
  fuelConsumption: { type: Number, required: true },
  collisionRisk: { type: String, required: true },
  efficiency: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MongoUser = mongoose.model("User", UserSchema);
const MongoPrediction = mongoose.model("PredictionHistory", PredictionSchema);

async function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // 1. Try MongoDB Connection first
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/navsat";
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    console.log("Connected successfully to MongoDB!");
    return { type: "MongoDB" };
  } catch (err) {
    console.log("MongoDB not detected. Initializing embedded SQLite database fallback...");
    isMongoConnected = false;
  }

  // 2. Initialize SQLite Fallback
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
      if (err) {
        console.error("SQLite initialization error:", err);
        return reject(err);
      }
      console.log(`Connected to SQLite database at ${SQLITE_PATH}`);

      sqliteDb.serialize(() => {
        // Users table
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Predictions table
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            satelliteName TEXT NOT NULL DEFAULT 'NAVSAT',
            altitude REAL NOT NULL DEFAULT 0,
            velocity REAL NOT NULL DEFAULT 0,
            inclination REAL NOT NULL DEFAULT 0,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0,
            fuelCapacity REAL DEFAULT 1000,
            fuelConsumption REAL NOT NULL DEFAULT 0,
            collisionRisk TEXT NOT NULL DEFAULT 'Low',
            efficiency REAL NOT NULL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (tableErr) => {
          if (tableErr) reject(tableErr);
          else resolve({ type: "SQLite" });
        });
      });
    });
  });
}

// Data Access Methods
async function savePrediction(data = {}) {
  const satelliteName = (data.satelliteName && String(data.satelliteName).trim()) 
    || (data.satellite_name && String(data.satellite_name).trim()) 
    || (data.name && String(data.name).trim()) 
    || "NAVSAT";
  const altitude = Number(data.altitude ?? data.altitude_km ?? 0) || 0;
  const velocity = Number(data.velocity ?? data.velocity_km_s ?? 0) || 0;
  const inclination = Number(data.inclination ?? data.inclination_deg ?? 0) || 0;
  const latitude = Number(data.latitude ?? 0) || 0;
  const longitude = Number(data.longitude ?? 0) || 0;
  const fuelCapacity = Number(data.fuelCapacity ?? data.fuel_capacity ?? data.fuel ?? 1000) || 1000;
  const fuelConsumption = Number(data.fuelConsumption ?? data.fuel_consumption ?? 0) || 0;
  const collisionRisk = String(data.collisionRisk ?? data.collision_risk ?? "Low");
  const efficiency = Number(data.efficiency ?? 0) || 0;

  const record = {
    satelliteName,
    altitude,
    velocity,
    inclination,
    latitude,
    longitude,
    fuelCapacity,
    fuelConsumption,
    collisionRisk,
    efficiency
  };

  if (isMongoConnected) {
    const doc = new MongoPrediction(record);
    return await doc.save();
  } else {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO predictions 
        (satelliteName, altitude, velocity, inclination, latitude, longitude, fuelCapacity, fuelConsumption, collisionRisk, efficiency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        record.satelliteName,
        record.altitude,
        record.velocity,
        record.inclination,
        record.latitude,
        record.longitude,
        record.fuelCapacity,
        record.fuelConsumption,
        record.collisionRisk,
        record.efficiency
      ];
      sqliteDb.run(sql, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...record, createdAt: new Date() });
      });
    });
  }
}

async function getPredictionHistory(limit = 20) {
  if (isMongoConnected) {
    return await MongoPrediction.find().sort({ createdAt: -1 }).limit(limit).lean();
  } else {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM predictions ORDER BY createdAt DESC LIMIT ?`;
      sqliteDb.all(sql, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
}

async function createUser(userData) {
  if (isMongoConnected) {
    const user = new MongoUser(userData);
    return await user.save();
  } else {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO users (username, email) VALUES (?, ?)`;
      sqliteDb.run(sql, [userData.username, userData.email], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...userData, createdAt: new Date() });
      });
    });
  }
}

async function getUsers() {
  if (isMongoConnected) {
    return await MongoUser.find().sort({ createdAt: -1 }).lean();
  } else {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users ORDER BY createdAt DESC`;
      sqliteDb.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
}

function getDbType() {
  return isMongoConnected ? "MongoDB" : "SQLite";
}

module.exports = {
  initDb,
  savePrediction,
  getPredictionHistory,
  createUser,
  getUsers,
  getDbType
};
