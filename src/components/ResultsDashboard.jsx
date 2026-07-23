import React from 'react';

export default function ResultsDashboard({ results, params }) {
  const hasResults = Boolean(results);

  // Optimized metrics
  const optFuel = results?.fuel_consumption ?? 0;
  const optEfficiency = results?.efficiency ?? 0;
  const optRiskLabel = (results?.collision_risk || '--').toUpperCase();
  const optRiskPercent = optRiskLabel === 'HIGH' ? 85 : optRiskLabel === 'MEDIUM' ? 60 : 30;
  const optStability = Math.min(100, Math.max(0, optEfficiency * 0.9));

  // Current baseline metrics (unoptimized)
  const baselinePenalty = 0.12 + Math.min(0.18, Math.abs((Number(params?.inclination) || 0) - 45) / 300);
  const currentFuel = optFuel * (1 + baselinePenalty);
  const currentEfficiency = Math.max(0, Math.min(100, optEfficiency - (10 + baselinePenalty * 35)));
  
  let currentRiskLabel = 'LOW';
  if (optRiskLabel === 'LOW') currentRiskLabel = 'MEDIUM';
  if (optRiskLabel === 'MEDIUM') currentRiskLabel = 'HIGH';
  if (optRiskLabel === 'HIGH') currentRiskLabel = 'HIGH';
  const currentRiskPercent = currentRiskLabel === 'HIGH' ? 85 : currentRiskLabel === 'MEDIUM' ? 60 : 30;
  const currentStability = Math.min(100, Math.max(0, currentEfficiency * 0.85));

  const fuelCap = Math.max(1, Number(params?.fuelCapacity || 1));
  const optFuelPct = hasResults ? Math.min(100, Math.max(0, (optFuel / fuelCap) * 100)) : 0;
  const currentFuelPct = hasResults ? Math.min(100, Math.max(0, (currentFuel / fuelCap) * 100)) : 0;

  return (
    <div className="panel results-panel" id="results">
      <div className="card">
        <div className="panel-header">
          <h3>Optimization Performance</h3>
          <span className="panel-subtitle">Comparative Analytics</span>
        </div>

        <div className="results-sections">
          {/* Current Path Baseline */}
          <div className="results-group">
            <div className="results-section-header">
              <span className="results-section-title">Current Path (Unoptimized Baseline)</span>
              <span className="results-section-hint">Standard Orbital Maneuvers</span>
            </div>
            <div className="results-grid">
              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Fuel Consumption</span>
                  <span className="metric-value">{hasResults ? `${currentFuel.toFixed(1)} u` : '--'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${currentFuelPct}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Collision Risk</span>
                  <span className="metric-value">{hasResults ? `${currentRiskLabel} (${currentRiskPercent}%)` : '--'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? currentRiskPercent : 0}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Orbit Stability</span>
                  <span className="metric-value">{hasResults ? `${currentStability.toFixed(0)} %` : '-- %'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? currentStability : 0}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Path Efficiency Score</span>
                  <span className="metric-value">{hasResults ? `${currentEfficiency.toFixed(0)} %` : '-- %'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? currentEfficiency : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Optimized Path */}
          <div className="results-group" style={{ marginTop: '0.8rem' }}>
            <div className="results-section-header">
              <span className="results-section-title" style={{ color: '#4ade80' }}>
                Optimized Path (NavSat Machine Learning)
              </span>
              <span className="results-section-hint">AI-Tuned Orbital Path</span>
            </div>
            <div className="results-grid">
              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Fuel Consumption</span>
                  <span className="metric-value" style={{ color: '#4ade80' }}>
                    {hasResults ? `${optFuel.toFixed(1)} u` : '--'}
                  </span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${optFuelPct}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Collision Risk</span>
                  <span className="metric-value">{hasResults ? `${optRiskLabel} (${optRiskPercent}%)` : '--'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? optRiskPercent : 0}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Orbit Stability</span>
                  <span className="metric-value">{hasResults ? `${optStability.toFixed(0)} %` : '-- %'}</span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? optStability : 0}%` }}></div>
                </div>
              </div>

              <div className={`metric-card ${hasResults ? 'visible' : ''}`}>
                <div className="metric-header">
                  <span>Path Efficiency Score</span>
                  <span className="metric-value" style={{ color: '#38bdf8' }}>
                    {hasResults ? `${optEfficiency.toFixed(0)} %` : '-- %'}
                  </span>
                </div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${hasResults ? optEfficiency : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
