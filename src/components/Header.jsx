import React from 'react';

export default function Header({ dbType }) {
  return (
    <header className="top-bar">
      <div className="logo-area">
        <span className="logo-dot"></span>
        <span className="logo-text">Project NavSat</span>
      </div>
      <nav className="top-nav">
        <a href="#overview">Overview</a>
        <a href="#input-panel">Simulator</a>
        <a href="#visualization">3D Orbit</a>
        <a href="#results">Analytics</a>
      </nav>
      <div className="status-indicator">
        <span className="status-light online"></span>
        <span>{dbType ? `${dbType} Database Connected` : 'Database Server Active'}</span>
      </div>
    </header>
  );
}
