import numpy as np
from sklearn.linear_model import LinearRegression


class NavSatEfficiencyModel:
    """Simple wrapper around a LinearRegression model.

    For this demo, the model is trained on synthetic data that encodes a
    plausible relationship between altitude, velocity and efficiency:
    - Efficiency is highest for typical LEO values (~500–800 km, ~7.6–7.9 km/s)
    - Too low / too high altitude or off‑nominal velocity reduces efficiency.
    """

    def __init__(self) -> None:
        self._model = LinearRegression()
        self._train_synthetic_model()

    def _train_synthetic_model(self) -> None:
        # Synthetic training grid of [altitude_km, velocity_km_s]
        altitudes = np.linspace(300, 1200, 20)
        velocities = np.linspace(7.2, 8.2, 20)
        alt_grid, vel_grid = np.meshgrid(altitudes, velocities)

        X = np.column_stack([alt_grid.ravel(), vel_grid.ravel()])

        # Hand‑crafted efficiency surface: near‑Gaussian around a "sweet spot"
        alt_opt = 700.0
        vel_opt = 7.8
        alt_term = np.exp(-((X[:, 0] - alt_opt) ** 2) / (2 * (250.0**2)))
        vel_term = np.exp(-((X[:, 1] - vel_opt) ** 2) / (2 * (0.25**2)))
        base_eff = 50 + 40 * alt_term * vel_term  # between ~50 and ~90

        noise = np.random.RandomState(42).normal(scale=2.0, size=base_eff.shape)
        y = base_eff + noise

        self._model.fit(X, y)

    def predict_efficiency(self, altitude_km: float, velocity_km_s: float) -> float:
        """Predict a path efficiency score (0–100 range is typical here)."""
        X = np.array([[altitude_km, velocity_km_s]], dtype=float)
        eff = float(self._model.predict(X)[0])
        return max(0.0, min(100.0, eff))


# Convenience factory used by the Flask app
def get_efficiency_model() -> NavSatEfficiencyModel:
    return NavSatEfficiencyModel()

