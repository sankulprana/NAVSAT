import csv
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from pipeline import run_pipeline
from model import NavSatEfficiencyModel
from optimizer import generate_trajectory

try:
    from genai import generate_mission_brief
except Exception:
    generate_mission_brief = None  # type: ignore[assignment]

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Run pipeline initially to build/load data and train the model
processed_df = run_pipeline()
model = NavSatEfficiencyModel(training_df=processed_df)


def append_raw_data(altitude: float, velocity: float, file_path: str = "data/raw/satellite_data.csv"):
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = path.exists() and path.stat().st_size > 0
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["altitude_km", "velocity_km_s"])
        writer.writerow([altitude, velocity])


def _get_float(data: dict, *keys: str, default: float = 0.0) -> float:
    for k in keys:
        if k in data and data.get(k) is not None and str(data.get(k)).strip() != "":
            try:
                return float(data.get(k))
            except Exception:
                pass
    return float(default)


@app.route('/generate-trajectory', methods=['POST'])
def generate_trajectory_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        # Accept both backend-style keys (altitude_km) and frontend-style keys (altitude)
        altitude = _get_float(data, "altitude_km", "altitude", default=0.0)
        velocity = _get_float(data, "velocity_km_s", "velocity", default=0.0)
        inclination = _get_float(data, "inclination_deg", "inclination", default=0.0)
        fuel_capacity = _get_float(data, "fuel_capacity", "fuel", default=0.0)

        # Append new raw data to CSV
        append_raw_data(altitude, velocity)

        # Run pipeline to process new data
        processed_df = run_pipeline()

        # Retrain ML model globally with the updated data
        global model
        model = NavSatEfficiencyModel(training_df=processed_df)

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


@app.route("/generate-mission-brief", methods=["POST"])
def generate_mission_brief_endpoint():
    """GenAI: generate a natural-language mission brief from inputs + predicted metrics."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        satellite_name = str(data.get("satelliteName") or data.get("satellite_name") or data.get("name") or "NAVSAT")
        altitude = _get_float(data, "altitude_km", "altitude", default=0.0)
        velocity = _get_float(data, "velocity_km_s", "velocity", default=0.0)
        inclination = _get_float(data, "inclination_deg", "inclination", default=0.0)
        fuel_capacity = _get_float(data, "fuel_capacity", "fuel", "fuelCapacity", default=0.0)

        trajectory_data = generate_trajectory(altitude, velocity, inclination)
        efficiency = float(model.predict_efficiency(altitude, velocity))
        fuel_consumption = float(trajectory_data["fuel_consumption"])
        adjusted_fuel = float(fuel_consumption * (100 - efficiency) / 100)
        collision_risk = str(trajectory_data["collision_risk"])

        if generate_mission_brief is None:
            # Safe fallback if GenAI deps are not installed
            brief = (
                f"Mission Brief for {satellite_name}:\n\n"
                f"- Inputs: altitude={altitude:.0f} km, velocity={velocity:.2f} km/s, inclination={inclination:.1f}°.\n"
                f"- Predicted efficiency: {efficiency:.1f}/100.\n"
                f"- Collision risk (heuristic): {collision_risk}.\n"
                f"- Fuel estimate (adjusted by efficiency): {adjusted_fuel:.2f} units (capacity: {fuel_capacity:.0f}).\n\n"
                "GenAI is currently disabled because optional dependencies are not installed. "
                "Install the GenAI requirements to enable the full text generator."
            )
            return jsonify({"brief": brief, "genai_enabled": False})

        try:
            brief = generate_mission_brief(
                satellite_name=satellite_name,
                altitude_km=altitude,
                velocity_km_s=velocity,
                inclination_deg=inclination,
                fuel_capacity=fuel_capacity,
                efficiency=efficiency,
                collision_risk=collision_risk,
                adjusted_fuel=adjusted_fuel,
            )
            return jsonify({"brief": brief, "genai_enabled": True})
        except Exception as e:
            # Never let GenAI errors break the UI.
            brief = (
                f"Mission Brief for {satellite_name}:\n\n"
                f"- Inputs: altitude={altitude:.0f} km, velocity={velocity:.2f} km/s, inclination={inclination:.1f}°.\n"
                f"- Predicted efficiency: {efficiency:.1f}/100.\n"
                f"- Collision risk (heuristic): {collision_risk}.\n"
                f"- Fuel estimate (adjusted by efficiency): {adjusted_fuel:.2f} units (capacity: {fuel_capacity:.0f}).\n\n"
                f"GenAI generation failed and a fallback brief was returned.\nError: {e}"
            )
            return jsonify({"brief": brief, "genai_enabled": False})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)