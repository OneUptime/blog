# Validation Summary: How to Use Temporal Fusion Transformer for Time-Series Forecasting on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- Vertex AI custom training and model deployment
- PyTorch Forecasting
- Temporal Fusion Transformer
- Lightning / PyTorch Lightning
- pandas and NumPy

## Sources Consulted
- Google Cloud Vertex AI `CustomTrainingJob` Python SDK reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Google Cloud Vertex AI prebuilt custom training containers: https://cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Google Cloud Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- PyTorch Forecasting `TimeSeriesDataSet` API reference: https://pytorch-forecasting.readthedocs.io/en/latest/api/pytorch_forecasting.data.timeseries._timeseries.TimeSeriesDataSet.html
- PyTorch Forecasting Temporal Fusion Transformer tutorial: https://pytorch-forecasting.readthedocs.io/en/v1.5.0/tutorials/stallion.html
- PyPI project metadata for PyTorch Forecasting: https://pypi.org/project/pytorch-forecasting/
- PyPI project metadata for PyTorch Lightning: https://pypi.org/project/pytorch-lightning/2.6.1/
- Temporal Fusion Transformer paper: https://arxiv.org/abs/1912.09363

## Issues Found
- The BigQuery/pandas preparation code assumed `date` was already a pandas datetime column and concatenated IDs that may be numeric. Added `pd.to_datetime()` and string casts so `.dt` accessors and `series_id` construction work reliably.
- PyTorch Forecasting categorical variables should be supplied as categorical/string-like values, while the original code passed numeric weekday/month and boolean flags as categoricals. Cast the categorical fields to strings before building the `TimeSeriesDataSet`.
- The snippets used older `pytorch_lightning` imports and pinned `pytorch-forecasting==1.0.0`. Updated the examples to current PyTorch Forecasting usage with `lightning.pytorch`, `pytorch-forecasting==1.7.0`, and `lightning==2.6.1`.
- The Vertex AI training container URI used an outdated PyTorch 1.13 image. Updated it to the currently documented PyTorch 2.4 GPU Python 3.10 training image.
- The training script omitted required imports for `torch` and `TemporalFusionTransformer`. Added those imports and used `AIP_MODEL_DIR` when available so the script follows Vertex AI's model artifact convention.
- The interpretation example passed a `predict()` result directly to `interpret_output()` and treated returned tensors as dictionaries. Updated it to request raw predictions with `mode="raw"`, pass `raw_predictions.output`, and map variable names to tensor values before printing.
- The deployment example used an outdated prebuilt PyTorch prediction container URI and implied it could serve a PyTorch Forecasting checkpoint directly. Changed the example to require a custom serving container that loads the checkpoint and applies the same preprocessing.

## Review Notes
The post remains a high-level tutorial: helper functions such as `load_data_from_gcs()` and `save_model_to_gcs()` are referenced but not implemented. A future revision could include those helpers and a minimal serving container example.
