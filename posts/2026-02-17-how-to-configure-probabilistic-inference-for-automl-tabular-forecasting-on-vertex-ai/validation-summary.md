# Validation Summary: How to Configure Probabilistic Inference for AutoML Tabular Forecasting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- AutoML Tabular Forecasting
- Vertex AI SDK for Python
- BigQuery SQL
- Python pandas / pandas-gbq

## Sources Consulted
- Google Cloud Vertex AI forecast training parameters: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/forecasting-parameters
- Google Cloud Vertex AI train a forecast model: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/forecasting/train-model
- Google Cloud Vertex AI batch inferences for forecast models: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/tabular-workflows/forecasting-batch-predictions
- Google Cloud Vertex AI online inference output for quantile/probabilistic forecasting: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/tabular-workflows/forecasting-online-predictions
- Vertex AI SDK for Python `AutoMLForecastingTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.AutoMLForecastingTrainingJob
- Official Vertex AI Python SDK forecasting training sample: https://github.com/googleapis/python-aiplatform/blob/main/samples/model-builder/create_training_pipeline_forecasting_sample.py

## Issues Found
- The post incorrectly treated `minimize-quantile-loss` as the way to enable probabilistic inference. Updated the training configuration to use `enable_probabilistic_inference=True` with `quantiles`, and changed the objective to `minimize-rmse` because Google documents probabilistic inference as incompatible with `minimize-quantile-loss`.
- The `AutoMLForecastingTrainingJob.run()` example was missing required `data_granularity_unit` and `data_granularity_count` parameters. Added daily granularity settings.
- The training `column_specs` included the target column. Removed `demand` because the target column should not have a transformation specified.
- The BigQuery data preparation query mixed grouped aggregation with a window function over the raw `units_sold` column. Rewrote it with a `daily_sales` CTE and computed the rolling standard deviation over the aggregated daily demand.
- The prediction queries assumed separate BigQuery columns such as `predicted_demand_quantile_0_9`. Vertex AI forecast batch output stores quantile data in `predicted_demand.quantile_values` and `predicted_demand.quantile_predictions`. Updated the SQL examples to extract quantiles from those arrays.
- Updated references to P50 as an "expected value" or "point forecast" to describe it as a median or central forecast, which is more accurate for quantile output.

## Review Notes
Google Cloud documentation notes that Vertex AI documentation is moving under Gemini Enterprise Agent Platform, but the current Vertex AI SDK reference was updated on 2026-05-27 and still documents the APIs used here.
