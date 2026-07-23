/**
 * NavSat Efficiency Prediction Model (Node.js)
 * Ported from Gaussian Process RBF surface in model.py
 */

const ALT_OPT = 700.0;
const VEL_OPT = 7.8;

function predictEfficiency(altitudeKm, velocityKmS) {
  const altTerm = Math.exp(-Math.pow(altitudeKm - ALT_OPT, 2) / (2 * Math.pow(250.0, 2)));
  const velTerm = Math.exp(-Math.pow(velocityKmS - VEL_OPT, 2) / (2 * Math.pow(0.25, 2)));

  let score = 50.0 + 40.0 * altTerm * velTerm;
  
  // Bound prediction between 0 and 100
  score = Math.max(0.0, Math.min(100.0, score));
  return Math.round(score * 100) / 100;
}

module.exports = {
  predictEfficiency,
};
