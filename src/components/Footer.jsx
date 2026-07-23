import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-left">
        <span className="footer-title">Project NavSat</span>
        <span className="footer-subtitle">Satellite Trajectory Optimization System</span>
      </div>
      <div className="footer-center">
        <span>Powered by React & Express Node Backend</span>
      </div>
      <div className="footer-right">
        <span>© {new Date().getFullYear()} NavSat Autonomous Systems</span>
      </div>
    </footer>
  );
}
