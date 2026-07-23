import React from 'react';

export default function MonitoringTable({ history, dbType }) {
  return (
    <div className="panel monitoring-panel" id="monitoring">
      <div className="card">
        <div className="panel-header">
          <h3>Active Satellite Telemetry Log</h3>
          <span className="panel-subtitle">
            {dbType ? `${dbType} Database Records` : 'Database Simulation Log'}
          </span>
        </div>
        <div className="table-wrapper">
          <table className="monitoring-table">
            <thead>
              <tr>
                <th>Satellite Name</th>
                <th>Position (Lat, Lon)</th>
                <th>Velocity (km/s)</th>
                <th>Altitude (km)</th>
                <th>Collision Risk</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '1.2rem' }}>
                    No simulation records found in database. Submit parameters to log trajectory.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  const riskLabel = (item.collision_risk || 'Low').toUpperCase();
                  const riskClass =
                    riskLabel === 'HIGH'
                      ? 'risk-high'
                      : riskLabel === 'MEDIUM'
                      ? 'risk-medium'
                      : 'risk-low';

                  return (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{`Lat ${Number(item.latitude || 0).toFixed(2)}°, Lon ${Number(item.longitude || 0).toFixed(2)}°`}</td>
                      <td>{Number(item.velocity).toFixed(2)}</td>
                      <td>{Number(item.altitude).toFixed(0)}</td>
                      <td>
                        <span className={`risk-pill ${riskClass}`}>{riskLabel}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
