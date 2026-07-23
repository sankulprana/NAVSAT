import React from 'react';

export default function MissionBrief({ briefText, briefStatus }) {
  return (
    <div className="panel mission-brief-panel" id="missionbrief">
      <div className="card">
        <div className="panel-header">
          <h3>Mission Intelligence Brief</h3>
          <span className="panel-subtitle">AI & Express Analysis</span>
        </div>
        <div className="mission-brief-body">
          <div className="form-message success" style={{ minHeight: 'auto' }}>
            {briefStatus || 'Awaiting simulation run...'}
          </div>
          <div className="mission-brief-text">
            {briefText || 'Mission brief summary will be generated upon submitting trajectory parameters.'}
          </div>
        </div>
      </div>
    </div>
  );
}
