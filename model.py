import warnings
import numpy as np
import pandas as pd
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
from sklearn.preprocessing import StandardScaler

# Training domain bounds — used for extrapolation warnings
_ALT_BOUNDS = (300.0, 1200.0)   # km
_VEL_BOUNDS  = (7.2, 8.2)       # km/s

# Synthetic grid resolution — more points → better fit, still fast
_GRID_SIZE = 60


class NavSatEfficiencyModel:
    """
    Predicts navigation-satellite efficiency (0–100) from altitude and velocity.

    Uses a Gaussian Process with an RBF + noise kernel, which:
      - captures smooth, continuous efficiency surfaces well
      - provides prediction uncertainty via predict_efficiency(…, return_std=True)
      - avoids the sensitivity to hidden-layer tuning of MLPs on small 2-feature inputs
    """

    _ALT_OPT = 700.0
    _VEL_OPT = 7.8

    def __init__(self, training_df: pd.DataFrame | None = None):
        self._scaler = StandardScaler()
        kernel = RBF(length_scale=[1.0, 1.0], length_scale_bounds=(1e-2, 1e2)) \
                 + WhiteKernel(noise_level=4.0, noise_level_bounds=(1e-1, 10.0))
        self._model = GaussianProcessRegressor(
            kernel=kernel,
            n_restarts_optimizer=5,
            normalize_y=True,
            random_state=42,
        )
        self._trained = False

        required = {"altitude_km", "velocity_km_s", "efficiency"}
        if training_df is not None and required.issubset(training_df.columns):
            self._train_from_dataframe(training_df)
        else:
            self._train_synthetic_model()

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def _train_synthetic_model(self) -> None:
        altitudes  = np.linspace(*_ALT_BOUNDS, _GRID_SIZE)
        velocities = np.linspace(*_VEL_BOUNDS,  _GRID_SIZE)
        alt_g, vel_g = np.meshgrid(altitudes, velocities)
        X = np.column_stack([alt_g.ravel(), vel_g.ravel()])

        alt_term = np.exp(-((X[:, 0] - self._ALT_OPT) ** 2) / (2 * 250.0 ** 2))
        vel_term = np.exp(-((X[:, 1] - self._VEL_OPT) ** 2) / (2 * 0.25  ** 2))
        y = 50.0 + 40.0 * alt_term * vel_term
        y += np.random.RandomState(42).normal(scale=2.0, size=y.shape)

        self._fit(X, y)

    def _train_from_dataframe(self, df: pd.DataFrame) -> None:
        X = df[["altitude_km", "velocity_km_s"]].to_numpy(dtype=float)
        y = df["efficiency"].to_numpy(dtype=float)
        self._fit(X, y)

    def _fit(self, X: np.ndarray, y: np.ndarray) -> None:
        X_scaled = self._scaler.fit_transform(X)
        self._model.fit(X_scaled, y)
        self._trained = True

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def predict_efficiency(
        self,
        altitude_km: float,
        velocity_km_s: float,
        *,
        return_std: bool = False,
    ) -> float | tuple[float, float]:
        result = self.predict_batch(
            np.array([[altitude_km, velocity_km_s]]),
            return_std=return_std,
        )
        if return_std:
            effs, stds = result
            return float(effs[0]), float(stds[0])
        return float(result[0])

    def predict_batch(
        self,
        X: np.ndarray,
        *,
        return_std: bool = False,
    ) -> np.ndarray | tuple[np.ndarray, np.ndarray]:
        if not self._trained:
            raise RuntimeError("Model has not been trained yet.")

        X = np.asarray(X, dtype=float)
        if X.ndim != 2 or X.shape[1] != 2:
            raise ValueError(f"X must have shape (N, 2), got {X.shape}")

        self._warn_extrapolation(X)

        X_scaled = self._scaler.transform(X)

        if return_std:
            preds, stds = self._model.predict(X_scaled, return_std=True)
            return np.clip(preds, 0.0, 100.0), stds
        preds = self._model.predict(X_scaled)
        return np.clip(preds, 0.0, 100.0)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _warn_extrapolation(self, X: np.ndarray) -> None:
        alt_lo, alt_hi = _ALT_BOUNDS
        vel_lo, vel_hi = _VEL_BOUNDS
        outside = (
            (X[:, 0] < alt_lo) | (X[:, 0] > alt_hi) |
            (X[:, 1] < vel_lo) | (X[:, 1] > vel_hi)
        )
        if outside.any():
            warnings.warn(
                f"{outside.sum()} point(s) lie outside the training domain "
                f"(alt {alt_lo}–{alt_hi} km, vel {vel_lo}–{vel_hi} km/s). "
                "Predictions may be unreliable.",
                UserWarning,
                stacklevel=3,
            )


def get_efficiency_model():
    return NavSatEfficiencyModel()