import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingSection from './components/LandingSection';
import InputPanel from './components/InputPanel';
import PlotViewport from './components/PlotViewport';
import ResultsDashboard from './components/ResultsDashboard';
import MissionBrief from './components/MissionBrief';
import MonitoringTable from './components/MonitoringTable';
import Footer from './components/Footer';

const BACKEND_URL = "http://127.0.0.1:5000/generate-trajectory";
const GENAI_URL = "http://127.0.0.1:5000/generate-mission-brief";
const HISTORY_URL = "http://127.0.0.1:5000/api/history";

export default function App() {
  const [formData, setFormData] = useState({
    satelliteName: 'NAVSAT-1',
    altitude: 700,
    velocity: 7.8,
    inclination: 98.7,
    latitude: 0,
    longitude: 0,
    fuelCapacity: 1000,
    missionDuration: 365,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [results, setResults] = useState(null);
  const [trajectory, setTrajectory] = useState(null);
  const [history, setHistory] = useState([]);
  const [dbType, setDbType] = useState('');
  const [briefText, setBriefText] = useState('');
  const [briefStatus, setBriefStatus] = useState('');

  // Fetch prediction history from Database on component load
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const resp = await fetch(HISTORY_URL);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.history)) {
          // Normalize database records to match table format
          const formatted = data.history.map((rec) => ({
            name: rec.satelliteName || rec.name || 'NAVSAT',
            latitude: Number(rec.latitude || 0),
            longitude: Number(rec.longitude || 0),
            velocity: Number(rec.velocity || 0),
            altitude: Number(rec.altitude || 0),
            collision_risk: rec.collisionRisk || rec.collision_risk || 'Low',
            createdAt: rec.createdAt,
          }));
          setHistory(formatted);
        }
        if (data.dbType) {
          setDbType(data.dbType);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch history from database:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStartClick = () => {
    const el = document.getElementById('input-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleReset = () => {
    setFormData({
      satelliteName: '',
      altitude: '',
      velocity: '',
      inclination: '',
      latitude: 0,
      longitude: 0,
      fuelCapacity: '',
      missionDuration: 365,
    });
    setResults(null);
    setTrajectory(null);
    setMessage('Parameters cleared. Ready for a new simulation.');
    setMessageType('success');
    setBriefText('');
    setBriefStatus('');
  };

  const handleGenerate = async () => {
    const alt = Number(formData.altitude);
    const vel = Number(formData.velocity);
    const inc = Number(formData.inclination);
    const fuelCap = Number(formData.fuelCapacity);

    if (!formData.satelliteName || isNaN(alt) || isNaN(vel) || isNaN(inc) || isNaN(fuelCap)) {
      setMessage('Please fill in Satellite Name, Altitude, Velocity, Inclination, and Fuel Capacity.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Contacting Express server and saving run to Database...');
    setMessageType('success');

    const payload = {
      satelliteName: formData.satelliteName,
      altitude: alt,
      velocity: vel,
      inclination: inc,
      latitude: Number(formData.latitude || 0),
      longitude: Number(formData.longitude || 0),
      fuel: fuelCap,
    };

    try {
      // 1. Call Express trajectory endpoint
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.trajectory)) {
        throw new Error('Invalid trajectory payload received.');
      }

      setTrajectory(data.trajectory);
      setResults(data);
      if (data.dbType) {
        setDbType(data.dbType);
      }
      setMessage(`Simulation complete. Record saved to ${data.dbType || 'Database'}.`);
      setMessageType('success');

      // Refresh telemetry table from database
      fetchHistory();

      // 2. Fetch Mission Brief
      fetchMissionBrief(payload);
    } catch (err) {
      console.error('Generation error:', err);
      setMessage('Unable to reach backend server. Please verify Express is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMissionBrief = async (payload) => {
    setBriefStatus('Generating mission brief...');
    try {
      const resp = await fetch(GENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const briefData = await resp.json();
        setBriefText(briefData.brief || 'Brief generated successfully.');
        setBriefStatus('Mission brief generated.');
      } else {
        setBriefStatus('Mission brief generation unavailable.');
      }
    } catch (e) {
      console.warn('Brief error:', e);
      setBriefStatus('Mission brief fetch failed.');
    }
  };

  return (
    <div>
      <div className="stars-background"></div>
      <Header dbType={dbType} />
      <main>
        <LandingSection onStartClick={handleStartClick} />
        <div className="dashboard-grid">
          <InputPanel
            formData={formData}
            onChange={handleChange}
            onGenerate={handleGenerate}
            onReset={handleReset}
            loading={loading}
            message={message}
            messageType={messageType}
          />
          <PlotViewport trajectory={trajectory} params={formData} />
          <ResultsDashboard results={results} params={formData} />
          <MissionBrief briefText={briefText} briefStatus={briefStatus} />
          <MonitoringTable history={history} dbType={dbType} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
