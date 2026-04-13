import logging

import pandas as pd

from ingestion import load_or_generate_data
from processing import process_satellite_data
from storage import save_processed_data


def run_pipeline(input_csv: str = "data/raw/satellite_data.csv") -> pd.DataFrame:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
    df = load_or_generate_data(input_csv)
    processed_df = process_satellite_data(df)
    save_processed_data(processed_df)
    return processed_df

