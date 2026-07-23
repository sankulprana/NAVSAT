import React from 'react';

export default function InputPanel({
  formData,
  onChange,
  onGenerate,
  onReset,
  loading,
  message,
  messageType,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <div className="panel control-panel" id="input-panel">
      <div className="card control-form">
        <div className="panel-header">
          <h3>Simulation Parameters</h3>
          <span className="panel-subtitle">Orbital Inputs</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="satelliteName">Satellite Name</label>
              <input
                id="satelliteName"
                name="satelliteName"
                type="text"
                placeholder="e.g. NAVSAT-1"
                value={formData.satelliteName}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="altitude">Altitude (km)</label>
              <input
                id="altitude"
                name="altitude"
                type="number"
                step="10"
                placeholder="700"
                value={formData.altitude}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="velocity">Velocity (km/s)</label>
              <input
                id="velocity"
                name="velocity"
                type="number"
                step="0.1"
                placeholder="7.8"
                value={formData.velocity}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="inclination">Inclination (°)</label>
              <input
                id="inclination"
                name="inclination"
                type="number"
                step="0.1"
                placeholder="98.7"
                value={formData.inclination}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="latitude">Initial Latitude (°)</label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.1"
                placeholder="0"
                value={formData.latitude}
                onChange={onChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="longitude">Initial Longitude (°)</label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.1"
                placeholder="0"
                value={formData.longitude}
                onChange={onChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fuelCapacity">Fuel Capacity (u)</label>
              <input
                id="fuelCapacity"
                name="fuelCapacity"
                type="number"
                step="10"
                placeholder="1000"
                value={formData.fuelCapacity}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="missionDuration">Mission Duration (Days)</label>
              <input
                id="missionDuration"
                name="missionDuration"
                type="number"
                step="1"
                placeholder="365"
                value={formData.missionDuration}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="primary-btn" type="submit" disabled={loading}>
              <span>{loading ? 'Generating...' : 'Generate Optimized Trajectory'}</span>
            </button>
            <button className="secondary-btn" type="button" onClick={onReset} disabled={loading}>
              <span>Reset</span>
            </button>
          </div>

          <div className={`form-message ${messageType === 'success' ? 'success' : ''}`}>
            {message}
          </div>
        </form>
      </div>
    </div>
  );
}
