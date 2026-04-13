import logging

from model import NavSatEfficiencyModel
from pipeline import run_pipeline


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
    dataset = run_pipeline()
    model = NavSatEfficiencyModel(training_df=dataset)
    sample_eff = model.predict_efficiency(700.0, 7.8)
    logging.info("Model trained on pipeline dataset. Sample efficiency: %.2f", sample_eff)


if __name__ == "__main__":
    main()

