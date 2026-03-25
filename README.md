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

### Technologies Used

- **Backend**: Python, Flask, Flask-CORS
- **Machine Learning**: Scikit-learn (Random Forest Regressor), NumPy
- **Frontend**: HTML5, CSS3, JavaScript, Plotly.js
- **Data Processing**: NumPy for numerical computations

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/project-navsat.git
   cd project-navsat
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python server.py
   ```

4. Open your browser and navigate to `http://localhost:5000`

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
project-navsat/
├── app.py              # Machine learning efficiency model
├── optimizer.py        # Trajectory generation and optimization logic
├── server.py           # Flask backend server
├── index.html          # Main web interface
├── style.css           # CSS styling
├── script.js           # Frontend JavaScript logic
├── requirements.txt    # Python dependencies
└── README.md           # Project documentation
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Acknowledgments

- Inspired by real satellite mission control systems
- Uses synthetic data for demonstration purposes
- Built for educational and demonstration purposes