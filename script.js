// Core constants
const EARTH_RADIUS_KM = 6371;
const BACKEND_URL = "http://127.0.0.1:5000/generate-trajectory";

// State used for the animated satellite marker
let currentTrajectory = null;
let satelliteAnimationTimer = null;
// Trace index for the moving satellite marker in the Plotly data array.
// We will render traces in this order: [0] Earth, [1] Actual Path, [2] Optimized Path, [3] Satellite
const SATELLITE_TRACE_INDEX = 3;

document.addEventListener("DOMContentLoaded", () => {
  const startSimulationBtn = document.getElementById("start-simulation-btn");
  const footerYearEl = document.getElementById("footer-year");
  const form = document.getElementById("satellite-form");
  const formMessage = document.getElementById("form-message");
  const generateBtn = document.getElementById("generate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const plotContainer = document.getElementById("trajectory-plot");
  const tableBody = document.getElementById("satellite-table-body");

  footerYearEl.textContent = new Date().getFullYear();

  // Smooth scroll to input panel when "Start Simulation" is clicked
  startSimulationBtn.addEventListener("click", () => {
    const inputPanel = document.getElementById("input-panel");
    if (inputPanel) {
      inputPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Handle form actions
  generateBtn.addEventListener("click", () => {
    const data = readFormData(form);
    if (!data.valid) {
      showFormMessage(
        formMessage,
        "Please fill in Satellite Name, Altitude, Velocity, Inclination, and Fuel Capacity.",
        false
      );
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
    showFormMessage(formMessage, "Contacting NavSat backend and generating trajectory...", true);

    // Call backend to generate a new trajectory and update the visualization
    generateTrajectory(data, plotContainer, tableBody)
      .then(() => {
        showFormMessage(formMessage, "Simulation complete. Results updated.", true);
      })
      .catch((error) => {
        console.error("Error during trajectory generation:", error);
        showFormMessage(
          formMessage,
          "Unable to reach NavSat backend. Please ensure the server is running on http://127.0.0.1:5000.",
          false
        );
      })
      .finally(() => {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Optimized Trajectory";
      });
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    showFormMessage(formMessage, "Parameters cleared. Ready for a new simulation.", true);
    resetDashboardMetrics();
    stopSatelliteAnimation();
    resetTrajectoryPlot(plotContainer);
  });

  // Initialize results state
  resetDashboardMetrics();
});

function readFormData(form) {
  const name = form.querySelector("#satelliteName")?.value.trim();
  const altitude = Number(form.querySelector("#altitude")?.value);
  const velocity = Number(form.querySelector("#velocity")?.value);
  const inclination = Number(form.querySelector("#inclination")?.value);
  const latitude = Number(form.querySelector("#latitude")?.value);
  const longitude = Number(form.querySelector("#longitude")?.value);
  const fuelCapacity = Number(form.querySelector("#fuelCapacity")?.value);
  const missionDuration = Number(form.querySelector("#missionDuration")?.value);

  const requiredFilled =
    name &&
    isFinite(altitude) &&
    isFinite(velocity) &&
    isFinite(inclination) &&
    isFinite(fuelCapacity);

  return {
    valid: Boolean(requiredFilled),
    name: name || "NAVSAT",
    altitude: isFinite(altitude) ? altitude : 700,
    velocity: isFinite(velocity) ? velocity : 7.8,
    inclination: isFinite(inclination) ? inclination : 98.7,
    latitude: isFinite(latitude) ? latitude : 0,
    longitude: isFinite(longitude) ? longitude : 0,
    fuelCapacity: isFinite(fuelCapacity) ? fuelCapacity : 1000,
    missionDuration: isFinite(missionDuration) ? missionDuration : 365,
  };
}

function showFormMessage(el, text, success) {
  el.textContent = text;
  el.classList.toggle("success", Boolean(success));
}

// Call backend API to generate trajectory
// This function:
// 1) Sends the current satellite parameters to the Flask backend
// 2) Receives trajectory + metrics from the backend
// 3) Updates the Plotly graph and dashboard
// 4) Starts the animated satellite marker along the optimized path
async function generateTrajectory(params, plotContainer, tableBody) {
  const payload = {
    satelliteName: params.name,
    altitude: params.altitude,
    velocity: params.velocity,
    inclination: params.inclination,
    fuel: params.fuelCapacity,
  };

  console.log("NavSat – sending payload to backend:", payload);

  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("NavSat backend returned an error response:", response.status, text);
    throw new Error(`Backend error: ${response.status}`);
  }

  const data = await response.json();
  console.log("NavSat – received response from backend:", data);

  if (!Array.isArray(data.trajectory)) {
    throw new Error("Invalid trajectory data received from backend.");
  }

  // Store the original (unscaled) trajectory from the backend
  currentTrajectory = data.trajectory.slice();

  // Draw Earth + optimized orbit path once for this trajectory.
  // updateGraph returns a scaled version of the trajectory that matches
  // the visualized orbit around Earth, which we will use for animation.
  const scaledTrajectory = updateGraph(plotContainer, currentTrajectory, params);

  // Update KPIs and monitoring table using backend metrics
  updateResults(data);
  updateMonitoringTable(tableBody, params, data);

  // Start (or restart) the moving satellite animation along this path
  animateSatellite(scaledTrajectory);
}

// Update Plotly graph using backend trajectory.
// This renders:
// - A static Earth sphere
// - A static "Actual Path" orbit based only on radius (unoptimized)
// - A static optimized orbit path from the backend
// - A single moving satellite marker (initially at the first optimized point)
function updateGraph(container, trajectory, params) {
  // Remove placeholder overlay if present
  const placeholder = container.querySelector(".plot-placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  // Earth sphere mesh
  const sphereLatSteps = 24;
  const sphereLonSteps = 24;
  const sphereX = [];
  const sphereY = [];
  const sphereZ = [];

  for (let i = 0; i <= sphereLatSteps; i++) {
    const v = (Math.PI * i) / sphereLatSteps;
    const sv = Math.sin(v);
    const cv = Math.cos(v);
    for (let j = 0; j <= sphereLonSteps; j++) {
      const u = (2 * Math.PI * j) / sphereLonSteps;
      const su = Math.sin(u);
      const cu = Math.cos(u);
      sphereX.push(EARTH_RADIUS_KM * sv * cu);
      sphereY.push(EARTH_RADIUS_KM * sv * su);
      sphereZ.push(EARTH_RADIUS_KM * cv);
    }
  }

  // First, compute a scaling factor so that the optimized path orbits just above
  // Earth rather than sitting inside the planet. This uses the backend's
  // trajectory shape but scales the radius to (Earth radius + altitude).
  let maxRadius = 0;
  trajectory.forEach((point) => {
    if (Array.isArray(point) && point.length >= 2) {
      const r = Math.hypot(point[0], point[1]);
      if (r > maxRadius) maxRadius = r;
    }
  });

  const targetRadius = EARTH_RADIUS_KM + Math.max(160, params.altitude || 400);
  const scale = maxRadius > 0 ? targetRadius / maxRadius : 1;

  // Scaled trajectory arrays used both for drawing the green orbit path
  // and for driving the animated satellite marker.
  const xs = [];
  const ys = [];
  const zs = [];
  trajectory.forEach((point) => {
    if (Array.isArray(point) && point.length >= 2) {
      xs.push(point[0] * scale);
      ys.push(point[1] * scale);
      zs.push(0); // keep the orbit in a single inclined plane for now
    }
  });

  const earthTrace = {
    type: "scatter3d",
    mode: "markers",
    x: sphereX,
    y: sphereY,
    z: sphereZ,
    marker: {
      size: 1.8,
      color: "#0ea5e9",
      opacity: 0.5,
    },
    name: "Earth",
    hoverinfo: "skip",
    showlegend: true,
  };

  // Actual orbit path: circular path at radius (Earth radius + altitude)
  // This illustrates the "before optimization" path using simple cos/sin.
  const actualXs = [];
  const actualYs = [];
  const actualZs = [];
  const steps = Math.max(xs.length, 100);
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = targetRadius * Math.cos(angle);
    const y = targetRadius * Math.sin(angle);
    const z = 0;
    actualXs.push(x);
    actualYs.push(y);
    actualZs.push(z);
  }

  const actualOrbitTrace = {
    type: "scatter3d",
    mode: "lines",
    x: actualXs,
    y: actualYs,
    z: actualZs,
    line: {
      color: "#38bdf8", // cyan/blue
      width: 3,
    },
    name: "Actual Path",
  };

  // Full optimized orbit path (static line) from backend trajectory
  const optimizedTrace = {
    type: "scatter3d",
    mode: "lines",
    x: xs,
    y: ys,
    z: zs,
    line: {
      color: "#22c55e",
      width: 4,
      dash: "dash",
    },
    name: "Optimized Path",
  };

  // Moving satellite marker (starts at the first trajectory point)
  const satelliteTrace = {
    type: "scatter3d",
    mode: "markers",
    x: xs.length ? [xs[0]] : [0],
    y: ys.length ? [ys[0]] : [0],
    z: zs.length ? [zs[0]] : [0],
    marker: {
      size: 6,
      color: "#facc15", // bright yellow so it stands out
      line: { color: "#f97316", width: 1 },
      opacity: 0.95,
    },
    name: "Satellite",
    hoverinfo: "none",
  };

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 0, b: 0 },
    showlegend: true,
    legend: {
      x: 0,
      y: 1.05,
      orientation: "h",
      font: { color: "#e5f5ff", size: 10 },
    },
    scene: {
      aspectmode: "data",
      dragmode: "orbit", // allow mouse / touch orbit rotation
      xaxis: {
        title: "X (km)",
        showgrid: true,
        gridcolor: "#1f2937",
        zeroline: false,
        showbackground: false,
        color: "#64748b",
      },
      yaxis: {
        title: "Y (km)",
        showgrid: true,
        gridcolor: "#1f2937",
        zeroline: false,
        showbackground: false,
        color: "#64748b",
      },
      zaxis: {
        title: "Z (km)",
        showgrid: true,
        gridcolor: "#1f2937",
        zeroline: false,
        showbackground: false,
        color: "#64748b",
      },
      bgcolor: "rgba(15,23,42,0.95)",
      camera: {
        eye: { x: 1.8, y: 1.8, z: 1.4 },
      },
    },
    annotations: [
      {
        text: `${params.name} – Altitude: ${params.altitude.toFixed(
          0
        )} km, Inclination: ${params.inclination.toFixed(1)}°`,
        xref: "paper",
        yref: "paper",
        x: 0,
        y: -0.08,
        showarrow: false,
        font: { color: "#64748b", size: 10 },
      },
    ],
  };

  const config = {
    displayModeBar: true, // keep Plotly controls visible for usability
    responsive: true,
    scrollZoom: true, // allow zoom with mouse wheel / touchpad / pinch
  };

  // Order of traces for legend & animation index:
  // 0: Earth, 1: Actual Path, 2: Optimized Path, 3: Satellite
  Plotly.newPlot(container, [earthTrace, actualOrbitTrace, optimizedTrace, satelliteTrace], layout, config);

  // Return the scaled trajectory coordinates (as [x,y,z]) so that the
  // animation function can move the satellite marker along the same
  // visual path that is drawn on screen.
  const scaledTrajectory = xs.map((x, i) => [x, ys[i], zs[i]]);
  return scaledTrajectory;
}

function resetTrajectoryPlot(container) {
  if (window.Plotly && container && container.data) {
    Plotly.purge(container);
  }
  if (!container.querySelector(".plot-placeholder")) {
    const placeholder = document.createElement("div");
    placeholder.className = "plot-placeholder";
    placeholder.innerHTML = "<span>Awaiting simulation parameters...</span>";
    container.appendChild(placeholder);
  }
}

// Stop the satellite animation loop if it is running
function stopSatelliteAnimation() {
  if (satelliteAnimationTimer !== null) {
    clearInterval(satelliteAnimationTimer);
    satelliteAnimationTimer = null;
  }
}

// Animate the satellite marker along the optimized trajectory.
// This function:
// - Iterates over the trajectory points
// - Moves the satellite marker to the next point every frame
// - Loops back to the start when it reaches the end of the path
function animateSatellite(trajectory) {
  // The Plotly container we are animating in (3D trajectory viewport)
  const container = document.getElementById("trajectory-plot");

  // Clear any previous animation so we don't have multiple timers running
  stopSatelliteAnimation();

  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return;
  }

  // Index of the current point along the optimized path
  let index = 0;

  satelliteAnimationTimer = setInterval(() => {
    // Defensive check in case the plot has been reset
    if (!container || !window.Plotly) {
      return;
    }
    const point = trajectory[index];
    if (!Array.isArray(point) || point.length < 2) {
      index = (index + 1) % trajectory.length;
      return;
    }

    // Our scaled trajectory contains [x, y, z] triplets
    const x = point[0];
    const y = point[1];
    const z = point[2];

    // Update only the satellite trace to avoid redrawing Earth and the orbit,
    // which keeps the animation smooth and efficient.
    Plotly.restyle(
      container,
      { x: [[x]], y: [[y]], z: [[z]] },
      [SATELLITE_TRACE_INDEX]
    );

    index = (index + 1) % trajectory.length;
  }, 100); // move the satellite every 100 ms
}

// Results Dashboard Metrics
function updateResults(data) {
  const fuelValueEl = document.getElementById("fuel-value");
  const fuelBarEl = document.getElementById("fuel-bar");
  const riskValueEl = document.getElementById("risk-value");
  const riskBarEl = document.getElementById("risk-bar");
  const stabilityValueEl = document.getElementById("stability-value");
  const stabilityBarEl = document.getElementById("stability-bar");
  const efficiencyValueEl = document.getElementById("efficiency-value");
  const efficiencyBarEl = document.getElementById("efficiency-bar");

  const fuelUsage = typeof data.fuel_consumption === "number" ? data.fuel_consumption : 0;
  const efficiency = typeof data.efficiency === "number" ? data.efficiency : 0;
  const riskLabelRaw = (data.collision_risk || "").toString();
  const riskLabel = riskLabelRaw.toUpperCase();

  let riskPercent = 30;
  if (riskLabel === "HIGH") {
    riskPercent = 85;
  } else if (riskLabel === "MEDIUM") {
    riskPercent = 60;
  }

  const stability = Math.min(100, Math.max(0, efficiency * 0.9));

  // Update text
  fuelValueEl.textContent = `${fuelUsage.toFixed(1)}`;
  riskValueEl.textContent = `${riskLabel} (${riskPercent}%)`;
  stabilityValueEl.textContent = `${stability.toFixed(0)} %`;
  efficiencyValueEl.textContent = `${efficiency.toFixed(0)} %`;

  // Animate progress bars
  animateBarTo(fuelBarEl, fuelUsage);
  animateBarTo(riskBarEl, riskPercent);
  animateBarTo(stabilityBarEl, stability);
  animateBarTo(efficiencyBarEl, efficiency);

  // Reveal cards with entrance animation
  document.querySelectorAll(".metric-card").forEach((card, idx) => {
    setTimeout(() => {
      card.classList.add("visible");
    }, idx * 80);
  });
}

function resetDashboardMetrics() {
  const resetText = "--";
  const resetBarPercent = 0;

  const fuelValueEl = document.getElementById("fuel-value");
  const fuelBarEl = document.getElementById("fuel-bar");
  const riskValueEl = document.getElementById("risk-value");
  const riskBarEl = document.getElementById("risk-bar");
  const stabilityValueEl = document.getElementById("stability-value");
  const stabilityBarEl = document.getElementById("stability-bar");
  const efficiencyValueEl = document.getElementById("efficiency-value");
  const efficiencyBarEl = document.getElementById("efficiency-bar");

  fuelValueEl.textContent = `${resetText} %`;
  riskValueEl.textContent = resetText;
  stabilityValueEl.textContent = `${resetText} %`;
  efficiencyValueEl.textContent = `${resetText} %`;

  [fuelBarEl, riskBarEl, stabilityBarEl, efficiencyBarEl].forEach((bar) => {
    if (bar) {
      bar.style.width = `${resetBarPercent}%`;
    }
  });

  document.querySelectorAll(".metric-card").forEach((card) => {
    card.classList.remove("visible");
  });
}

function animateBarTo(barEl, targetPercent) {
  if (!barEl) return;
  // Ensure a new animation can trigger from current state
  requestAnimationFrame(() => {
    barEl.style.width = `${targetPercent}%`;
  });
}

// Monitoring Table
function updateMonitoringTable(tableBody, params, backendData) {
  const row = document.createElement("tr");

  const positionString = `Lat ${params.latitude.toFixed(2)}°, Lon ${params.longitude.toFixed(2)}°`;
  const riskCell = document.createElement("td");
  const riskLabelRaw = (backendData && backendData.collision_risk) || "Low";
  const riskLabel = riskLabelRaw.toUpperCase();
  let riskClass = "risk-low";
  if (riskLabel === "HIGH") {
    riskClass = "risk-high";
  } else if (riskLabel === "MEDIUM") {
    riskClass = "risk-medium";
  }

  const riskPill = document.createElement("span");
  riskPill.className = `risk-pill ${riskClass}`;
  riskPill.textContent = riskLabel;

  riskCell.appendChild(riskPill);

  row.innerHTML = `
    <td>${escapeHtml(params.name)}</td>
    <td>${positionString}</td>
    <td>${params.velocity.toFixed(2)}</td>
    <td>${params.altitude.toFixed(0)}</td>
  `;

  row.appendChild(riskCell);

  // Keep latest runs at the top of the table
  if (tableBody.firstChild) {
    tableBody.insertBefore(row, tableBody.firstChild);
  } else {
    tableBody.appendChild(row);
  }
}

// Simple HTML escape for table
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

