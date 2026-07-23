import React from 'react';

export default function LandingSection({ onStartClick }) {
  return (
    <section className="landing-section" id="overview">
      <div className="landing-content">
        <h1>Satellite Trajectory Optimization</h1>
        <h2>Next-Generation Orbital Mission Planning Powered by Node.js & Machine Learning</h2>
        <p>
          Project NavSat optimizes satellite trajectory parameters in real time to reduce fuel consumption,
          minimize orbital collision hazards, and maximize navigation accuracy across low-Earth and medium-Earth orbits.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="primary-btn" onClick={onStartClick}>
            <span>Start Simulation</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="landing-side-panel">
        <div className="telemetry-card">
          <div className="telemetry-header">Mission Telemetry</div>
          <div className="telemetry-body">
            <div className="telemetry-row">
              <span>Target Altitude</span>
              <span>700 km</span>
            </div>
            <div className="telemetry-row">
              <span>Target Velocity</span>
              <span>7.80 km/s</span>
            </div>
            <div className="telemetry-row">
              <span>Constellation Mode</span>
              <span>LEO Constellation</span>
            </div>
          </div>
        </div>

        <div className="orbit-mini-visual">
          <div className="orbit-circle orbit-1"></div>
          <div className="orbit-circle orbit-2"></div>
          <div className="orbit-circle orbit-3"></div>
          <div className="orbit-satellite"></div>
        </div>
      </div>
    </section>
  );
}
