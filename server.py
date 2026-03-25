from flask import Flask, request, jsonify
from flask_cors import CORS
from app import get_efficiency_model
from optimizer import generate_trajectory

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

model = get_efficiency_model()

@app.route('/generate-trajectory', methods=['POST'])
def generate_trajectory_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        altitude = float(data.get('altitude_km', 0))
        velocity = float(data.get('velocity_km_s', 0))
        inclination = float(data.get('inclination_deg', 0))
        fuel_capacity = float(data.get('fuel_capacity', 0))

        # Generate trajectory
        trajectory_data = generate_trajectory(altitude, velocity, inclination)

        # Predict efficiency
        efficiency = model.predict_efficiency(altitude, velocity)

        # Calculate fuel efficiency or something
        fuel_consumption = trajectory_data['fuel_consumption']
        # Assuming efficiency affects fuel usage
        adjusted_fuel = fuel_consumption * (100 - efficiency) / 100

        response = {
            'trajectory': trajectory_data['trajectory'],
            'fuel_consumption': round(adjusted_fuel, 2),
            'collision_risk': trajectory_data['collision_risk'],
            'efficiency': round(efficiency, 2)
        }

        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)