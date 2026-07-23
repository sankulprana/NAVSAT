import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

const EARTH_RADIUS_KM = 6371;
const SATELLITE_TRACE_INDEX = 3;

export default function PlotViewport({ trajectory, params }) {
  const containerRef = useRef(null);
  const animationTimerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!trajectory || !Array.isArray(trajectory) || trajectory.length === 0) {
      // Show placeholder if no trajectory loaded
      if (container.data) {
        Plotly.purge(container);
      }
      return;
    }

    // Build 3D Earth sphere mesh
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

    let maxRadius = 0;
    trajectory.forEach((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        const r = Math.hypot(point[0], point[1]);
        if (r > maxRadius) maxRadius = r;
      }
    });

    const altitude = Number(params?.altitude || 700);
    const inclination = Number(params?.inclination || 45);
    const satelliteName = params?.satelliteName || 'NAVSAT';

    const exaggeratedAltitude = altitude * 3.5;
    const targetRadius = EARTH_RADIUS_KM + Math.max(160, exaggeratedAltitude);
    const scale = maxRadius > 0 ? targetRadius / maxRadius : 1;

    const inclinationRad = (inclination * Math.PI) / 180;
    const cosInc = Math.cos(inclinationRad);
    const sinInc = Math.sin(inclinationRad);

    const xs = [];
    const ys = [];
    const zs = [];
    trajectory.forEach((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        const rx = point[0] * scale;
        const ry = point[1] * scale;
        xs.push(rx);
        ys.push(ry * cosInc);
        zs.push(ry * sinInc);
      }
    });

    const earthTrace = {
      type: 'scatter3d',
      mode: 'markers',
      x: sphereX,
      y: sphereY,
      z: sphereZ,
      marker: {
        size: 1.8,
        color: '#0ea5e9',
        opacity: 0.5,
      },
      name: 'Earth',
      hoverinfo: 'skip',
      showlegend: true,
    };

    const actualXs = [];
    const actualYs = [];
    const actualZs = [];
    const steps = Math.max(xs.length, 100);
    for (let i = 0; i <= steps; i++) {
      const angle = (2 * Math.PI * i) / steps;
      const rx = targetRadius * Math.cos(angle);
      const ry = targetRadius * Math.sin(angle);
      actualXs.push(rx);
      actualYs.push(ry * cosInc);
      actualZs.push(ry * sinInc);
    }

    const actualOrbitTrace = {
      type: 'scatter3d',
      mode: 'lines',
      x: actualXs,
      y: actualYs,
      z: actualZs,
      line: {
        color: '#38bdf8',
        width: 3,
      },
      name: 'Actual Path',
    };

    const optimizedTrace = {
      type: 'scatter3d',
      mode: 'lines',
      x: xs,
      y: ys,
      z: zs,
      line: {
        color: '#22c55e',
        width: 4,
        dash: 'dash',
      },
      name: 'Optimized Path',
    };

    const satelliteTrace = {
      type: 'scatter3d',
      mode: 'markers',
      x: xs.length ? [xs[0]] : [0],
      y: ys.length ? [ys[0]] : [0],
      z: zs.length ? [zs[0]] : [0],
      marker: {
        size: 6,
        color: '#facc15',
        line: { color: '#f97316', width: 1 },
        opacity: 0.95,
      },
      name: 'Satellite',
      hoverinfo: 'none',
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 0, r: 0, t: 0, b: 0 },
      showlegend: true,
      legend: {
        x: 0,
        y: 1.05,
        orientation: 'h',
        font: { color: '#e5f5ff', size: 10 },
      },
      scene: {
        aspectmode: 'data',
        dragmode: 'orbit',
        xaxis: {
          title: 'X (km)',
          showgrid: true,
          gridcolor: '#1f2937',
          zeroline: false,
          showbackground: false,
          color: '#64748b',
        },
        yaxis: {
          title: 'Y (km)',
          showgrid: true,
          gridcolor: '#1f2937',
          zeroline: false,
          showbackground: false,
          color: '#64748b',
        },
        zaxis: {
          title: 'Z (km)',
          showgrid: true,
          gridcolor: '#1f2937',
          zeroline: false,
          showbackground: false,
          color: '#64748b',
        },
        bgcolor: 'rgba(15,23,42,0.95)',
        camera: {
          eye: { x: 1.8, y: 1.8, z: 1.4 },
        },
      },
      annotations: [
        {
          text: `${satelliteName} – Altitude: ${altitude.toFixed(0)} km, Inclination: ${inclination.toFixed(1)}°`,
          xref: 'paper',
          yref: 'paper',
          x: 0,
          y: -0.08,
          showarrow: false,
          font: { color: '#64748b', size: 10 },
        },
      ],
    };

    const config = {
      displayModeBar: true,
      responsive: true,
      scrollZoom: true,
    };

    Plotly.newPlot(container, [earthTrace, actualOrbitTrace, optimizedTrace, satelliteTrace], layout, config);

    // Animation Loop for moving satellite marker
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
    }

    let animIndex = 0;
    const scaledTrajectory = xs.map((x, idx) => [x, ys[idx], zs[idx]]);

    animationTimerRef.current = setInterval(() => {
      if (!container || !container.data) return;
      const pt = scaledTrajectory[animIndex];
      if (pt) {
        Plotly.restyle(container, { x: [[pt[0]]], y: [[pt[1]]], z: [[pt[2]]] }, [SATELLITE_TRACE_INDEX]);
      }
      animIndex = (animIndex + 1) % scaledTrajectory.length;
    }, 100);

    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }
    };
  }, [trajectory, params]);

  return (
    <div className="panel visualization-panel" id="visualization">
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header">
          <h3>3D Orbital Track Visualization</h3>
          <span className="panel-subtitle">Interactive Plotly Viewport</span>
        </div>
        <div className="trajectory-plot" ref={containerRef}>
          {(!trajectory || trajectory.length === 0) && (
            <div className="plot-placeholder">
              <span>Awaiting simulation parameters...</span>
            </div>
          )}
        </div>
        <div className="plot-legend-hint">
          <span>Hint: Click and drag to rotate in 3D space. Scroll to zoom.</span>
        </div>
      </div>
    </div>
  );
}
