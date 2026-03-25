import math
import random
from typing import Dict, List, Tuple

import numpy as np


def generate_trajectory(
    altitude_km: float,
    velocity_km_s: float,
    inclination_deg: float,
    num_points: int = 100,
) -> Dict[str, object]:
    """Generate a simple 2D trajectory and mission metrics.

    The trajectory is a parametric curve using sine/cosine to simulate
    motion along an orbital track. All units and relationships are
    deliberately simplified for a teaching/demo setting.
    """

    # Angle values from 0 to 2π (one full orbit)
    theta = np.linspace(0, 2 * math.pi, num_points)

    # Effective radius scales with altitude (arbitrary scaling for visualization)
    base_radius = 100.0 + altitude_km * 0.05

    # Slight eccentricity based on inclination
    ecc_factor = 1.0 + (abs(inclination_deg - 45.0) / 180.0) * 0.3

    x_vals = base_radius * np.cos(theta)
    y_vals = base_radius * ecc_factor * np.sin(theta)

    trajectory_coords: List[Tuple[float, float]] = [
        [float(round(x, 2)), float(round(y, 2))] for x, y in zip(x_vals, y_vals)
    ]

    # --- Simple derived metrics (demo approximations) ---
    fuel_consumption = _estimate_fuel_usage(altitude_km, velocity_km_s, len(trajectory_coords))
    collision_risk = _random_collision_risk(altitude_km)

    return {
        "trajectory": trajectory_coords,
        "fuel_consumption": round(fuel_consumption, 2),
        "collision_risk": collision_risk,
    }


def _estimate_fuel_usage(altitude_km: float, velocity_km_s: float, points: int) -> float:
    """Very rough fuel proxy for demonstration.

    Higher altitudes and more aggressive velocities consume more fuel.
    """
    base = 10.0 + (altitude_km / 800.0) * 8.0
    vel_penalty = abs(velocity_km_s - 7.6) * 6.0
    point_factor = 1.0 + points / 200.0
    return base + vel_penalty * point_factor


def _random_collision_risk(altitude_km: float) -> str:
    """Randomly choose a collision risk label using a simple heuristic.

    - Lower altitudes (crowded LEO) tend to have higher risk.
    - Higher altitudes slightly favour lower risk.
    """
    if altitude_km < 400:
        weights = {"High": 0.4, "Medium": 0.4, "Low": 0.2}
    elif altitude_km < 2000:
        weights = {"High": 0.2, "Medium": 0.5, "Low": 0.3}
    else:
        weights = {"High": 0.1, "Medium": 0.3, "Low": 0.6}

    labels, probs = zip(*weights.items())
    r = random.random()
    cumulative = 0.0
    for label, p in zip(labels, probs):
        cumulative += p
        if r <= cumulative:
            return label
    return labels[-1]

