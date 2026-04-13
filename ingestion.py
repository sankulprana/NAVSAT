import logging
from pathlib import Path

import numpy as np
import pandas as pd


LOGGER = logging.getLogger(__name__)


def load_or_generate_data(csv_path: str = "data/raw/satellite_data.csv", n_samples: int = 400) -> pd.DataFrame:
    LOGGER.info("Ingestion started")
    path = Path(csv_path)

    if path.exists():
        df = pd.read_csv(path)
    else:
        rng = np.random.RandomState(42)
        df = pd.DataFrame(
            {
                "altitude_km": rng.uniform(300, 1200, size=n_samples),
                "velocity_km_s": rng.uniform(7.2, 8.2, size=n_samples),
            }
        )

    LOGGER.info("Ingestion completed")
    return df

