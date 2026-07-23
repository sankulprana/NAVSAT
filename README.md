# Project NavSat

## Satellite Trajectory Optimization System

Project NavSat is a full-stack web application for satellite trajectory optimization, interactive 3D visualization, and mission telemetry analysis.

### Technologies Used

- **Frontend**: React (Vite), JavaScript (ES6+), HTML5, CSS3, Plotly.js (3D Graphics)
- **Backend**: Node.js, Express, CORS
- **Data Persistence**: CSV File Logging (`data/raw/satellite_data.csv`)

### Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Express Backend API (Port 5000)**:
   ```bash
   npm run server
   ```

3. **Start the React Frontend (Port 5173)**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   👉 **`http://localhost:5173`**

### Project Structure

```
NAVSAT/
├── server.js                # Node.js + Express backend server
├── optimizer.js             # Trajectory calculation & metric estimation engine
├── model.js                 # Efficiency surface prediction model
├── index.html               # React application HTML entry point
├── package.json             # Node dependencies and scripts
├── vite.config.js           # Vite development server configuration
├── data/                    # CSV data storage
└── src/
    ├── main.jsx             # React entry point
    ├── App.jsx              # Main App component & state management
    ├── index.css            # Space-themed glassmorphism CSS styling
    └── components/          # React UI components
        ├── Header.jsx
        ├── LandingSection.jsx
        ├── InputPanel.jsx
        ├── PlotViewport.jsx
        ├── ResultsDashboard.jsx
        ├── MissionBrief.jsx
        ├── MonitoringTable.jsx
        └── Footer.jsx
```