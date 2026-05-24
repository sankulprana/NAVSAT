# Project NavSat

## Satellite Trajectory Optimization System

Project NavSat is a web-based satellite trajectory optimization system that leverages machine learning to predict efficient orbital paths, minimize fuel consumption, and assess collision risks for artificial satellites. Inspired by real-world mission control workflows, this system provides an interactive interface for trajectory planning and visualization.

### Features

- **Machine Learning Efficiency Prediction**: Uses a Random Forest model trained on synthetic orbital data to predict path efficiency based on altitude and velocity parameters
- **Trajectory Generation**: Generates 2D orbital trajectories with configurable parameters (altitude, velocity, inclination)
- **Fuel Consumption Estimation**: Calculates adjusted fuel usage based on predicted efficiency
- **Collision Risk Assessment**: Evaluates potential collision risks for different orbital configurations
- **Interactive Web Interface**: Modern, space-themed UI with real-time visualization using Plotly.js
- **RESTful API**: Flask-based backend providing trajectory optimization endpoints
- **Data Pipeline + CSV Storage**: Optional pipeline that loads (or generates) data, computes efficiency features, and stores a processed CSV for inspection

### Technologies Used

- **Backend**: Python, Flask, Flask-CORS
- **Machine Learning**: Scikit-learn (Random Forest Regressor), NumPy
- **Frontend**: HTML5, CSS3, JavaScript, Plotly.js
- **Data Processing**: Pandas + NumPy (CSV ingestion/processing/storage)

### Installation

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Flask API (backend):
   ```bash
   python server.py
   ```

3. Open the UI:
   - Open `index.html` in your browser (or use a simple local web server / VS Code “Live Server” extension).
   - The UI will call the Flask API at `http://127.0.0.1:5000`.

4. (Optional) Run the data pipeline (generates/stores CSV output):
   ```bash
   python main.py
   ```

### Usage

1. **Input Parameters**:
   - Altitude (km): Orbital altitude in kilometers
   - Velocity (km/s): Orbital velocity in kilometers per second
   - Inclination (deg): Orbital inclination in degrees
   - Fuel Capacity: Available fuel capacity

2. **Generate Trajectory**:
   - Click "Start Simulation" or use the input panel
   - The system will generate an optimized trajectory
   - View the 2D orbital path visualization
   - Review efficiency metrics, fuel consumption, and collision risk

3. **API Usage**:
   The backend provides a REST API endpoint:

   ```http
   POST /generate-trajectory
   Content-Type: application/json

   {
     "altitude_km": 700,
     "velocity_km_s": 7.8,
     "inclination_deg": 45,
     "fuel_capacity": 1000
   }
   ```

   Response:
   ```json
   {
     "trajectory": [[x1, y1], [x2, y2], ...],
     "fuel_consumption": 85.5,
     "collision_risk": "Low",
     "efficiency": 87.3
   }
   ```

### Project Structure

```
minor/
├── server.py                # Flask backend (API endpoint: /generate-trajectory)
├── app.py                   # RandomForest efficiency model used by server.py
├── optimizer.py             # Trajectory + mission metrics generation
├── index.html               # Frontend UI
├── script.js                # Frontend logic (calls Flask API)
├── style.css                # UI styling
├── requirements.txt         # Python dependencies
├── main.py                  # Runs the data pipeline + trains MLP model for CLI demo
├── pipeline.py              # Pipeline orchestration: ingestion -> processing -> storage
├── ingestion.py              # Loads raw CSV or generates synthetic input data
├── processing.py             # Computes efficiency + engineered features
├── storage.py                # Writes processed CSV to disk
├── model.py                  # MLPRegressor model used by main.py (pipeline training_df)
└── data/
    ├── raw/
    │   └── satellite_data.csv
    └── processed/
        └── processed_data.csv
```

### Where the data is stored (and how to view it)

- **Raw input CSV**: `data/raw/satellite_data.csv`
  - Used by the pipeline if it exists (otherwise `ingestion.py` generates synthetic rows).
- **Processed output CSV**: `data/processed/processed_data.csv`
  - Written by `storage.py` when you run `python main.py`.
  - Contains columns like `altitude_km`, `velocity_km_s`, `efficiency`, `altitude_scaled`, `velocity_scaled`.

To view the stored data:

- **Quick way**: open `data/processed/processed_data.csv` in Excel/Google Sheets (or VS Code).
- **Python way**:

```python
import pandas as pd

df = pd.read_csv("data/processed/processed_data.csv")
print(df.head())
print(df.describe())
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Acknowledgments

- Inspired by real satellite mission control systems
- Uses synthetic data for demonstration purposes
- Built for educational and demonstration purposes