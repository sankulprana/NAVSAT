/**
 * Trajectory & Metrics Generation Engine (Node.js)
 * Ported from Python optimizer.py
 */

function generateTrajectory(altitudeKm, velocityKmS, inclinationDeg, numPoints = 100) {
  const trajectory = [];
  const baseRadius = 100.0 + altitudeKm * 0.05;
  const eccFactor = 1.0 + (Math.abs(inclinationDeg - 45.0) / 180.0) * 0.3;

  for (let i = 0; i < numPoints; i++) {
    const theta = (2 * Math.PI * i) / (numPoints - 1);
    const x = Math.round(baseRadius * Math.cos(theta) * 100) / 100;
    const y = Math.round(baseRadius * eccFactor * Math.sin(theta) * 100) / 100;
    trajectory.push([x, y]);
  }

  const fuelConsumption = estimateFuelUsage(altitudeKm, velocityKmS, trajectory.length);
  const collisionRisk = getCollisionRisk(altitudeKm);

  return {
    trajectory,
    fuel_consumption: Math.round(fuelConsumption * 100) / 100,
    collision_risk: collisionRisk,
  };
}

function estimateFuelUsage(altitudeKm, velocityKmS, points) {
  const base = 10.0 + (altitudeKm / 800.0) * 8.0;
  const velPenalty = Math.abs(velocityKmS - 7.6) * 6.0;
  const pointFactor = 1.0 + points / 200.0;
  return base + velPenalty * pointFactor;
}

function getCollisionRisk(altitudeKm) {
  let weights;
  if (altitudeKm < 400) {
    weights = { High: 0.4, Medium: 0.4, Low: 0.2 };
  } else if (altitudeKm < 2000) {
    weights = { High: 0.2, Medium: 0.5, Low: 0.3 };
  } else {
    weights = { High: 0.1, Medium: 0.3, Low: 0.6 };
  }

  const rand = Math.random();
  let cumulative = 0.0;
  for (const [label, prob] of Object.entries(weights)) {
    cumulative += prob;
    if (rand <= cumulative) {
      return label;
    }
  }
  return "Low";
}

module.exports = {
  generateTrajectory,
  estimateFuelUsage,
  getCollisionRisk,
};
