import logging
from pathlib import Path

import pandas as pd


LOGGER = logging.getLogger(__name__)


def save_processed_data(df: pd.DataFrame, output_path: str = "data/processed/processed_data.csv") -> str:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    LOGGER.info("Storage completed: %s", path.as_posix())
    return path.as_posix()

