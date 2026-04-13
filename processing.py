import logging

import numpy as np
import pandas as pd


LOGGER = logging.getLogger(__name__)


def process_satellite_data(df: pd.DataFrame) -> pd.DataFrame:
    LOGGER.info("Processing started")

    data = df.copy()

    # Ensure expected columns exist
    if "altitude_km" not in data.columns:
        data["altitude_km"] = np.nan
    if "velocity_km_s" not in data.columns:
        data["velocity_km_s"] = np.nan

    # Handle missing values with robust central tendency
    data["altitude_km"] = pd.to_numeric(data["altitude_km"], errors="coerce")
    data["velocity_km_s"] = pd.to_numeric(data["velocity_km_s"], errors="coerce")
    data["altitude_km"] = data["altitude_km"].fillna(data["altitude_km"].median())
    data["velocity_km_s"] = data["velocity_km_s"].fillna(data["velocity_km_s"].median())

    # Feature engineering for efficiency around ideal orbital values
    alt_opt = 700.0
    vel_opt = 7.8
    alt_term = np.exp(-((data["altitude_km"] - alt_opt) ** 2) / (2 * (250.0**2)))
    vel_term = np.exp(-((data["velocity_km_s"] - vel_opt) ** 2) / (2 * (0.25**2)))
    data["efficiency"] = 50 + 40 * alt_term * vel_term

    # Optional normalized features for analytics compatibility
    data["altitude_scaled"] = (data["altitude_km"] - data["altitude_km"].mean()) / (
        data["altitude_km"].std(ddof=0) + 1e-8
    )
    data["velocity_scaled"] = (data["velocity_km_s"] - data["velocity_km_s"].mean()) / (
        data["velocity_km_s"].std(ddof=0) + 1e-8
    )

    LOGGER.info("Processing completed")
    return data

