# Validation Summary: How to Use Supply Chain Demand Forecasting with Vertex AI AutoML Forecasting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI AutoML Forecasting
- Vertex AI SDK for Python
- BigQuery
- pandas
- pandas-gbq
- gcloud CLI
- SQL

## Sources Consulted
- Google Cloud Vertex AI SDK for Python: AutoMLForecastingTrainingJob API reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.AutoMLForecastingTrainingJob
- Google Cloud Vertex AI SDK for Python: TimeSeriesDataset API reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.TimeSeriesDataset
- Google Cloud Vertex AI SDK for Python: Model.batch_predict API reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud Vertex AI forecasting training guide: https://cloud.google.com/vertex-ai/docs/tabular-data/forecasting/train-model
- Google Cloud Vertex AI forecasting parameters guide: https://cloud.google.com/vertex-ai/docs/tabular-data/forecasting-parameters
- Google Cloud Vertex AI forecasting prediction guide: https://cloud.google.com/vertex-ai/docs/tabular-data/forecasting/get-predictions
- Google Cloud Vertex AI forecasting training data preparation guide: https://cloud.google.com/vertex-ai/docs/tabular-data/forecasting/prepare-data

## Issues Found
- The post claimed AutoML Forecasting tries specific architectures including Temporal Fusion Transformer and DeepAR. The official SDK docs present AutoML, Seq2Seq+, and Temporal Fusion Transformer as separate forecasting training methods, and do not document DeepAR as an AutoML-tried architecture. Changed the wording to describe Google-managed forecasting configuration search and note separate classes for explicit TFT or Seq2Seq+ training.
- The install command omitted packages required by the examples. Added `google-cloud-bigquery` for `google.cloud.bigquery` and `pandas-gbq` for `DataFrame.to_gbq`.
- The missing-date fill function left several feature columns null after reindexing. Filled static/category values forward/backward and filled binary promotion/holiday flags with zero so the generated training table remains usable.
- The AutoML training call omitted required `data_granularity_unit` and `data_granularity_count` parameters. Added daily granularity values for the daily demand data.
- The static `category` column was included in `column_specs` but not assigned as a forecasting attribute or covariate. Added `time_series_attribute_columns=["category"]`.
- The post queried lower and upper forecast bounds without configuring quantile or probabilistic output. Added probabilistic inference with 0.1, 0.5, and 0.9 quantiles, then updated the dashboard SQL to read `predicted_demand.value`, `quantile_values`, and `quantile_predictions`.
- The batch prediction section described deployment, but AutoML forecasting uses batch inference and does not support online endpoint deployment. Changed the wording to "run a batch prediction job."
- The prediction input SQL only included future rows and omitted the target column. Vertex AI forecasting input should include the columns used for training, historical context for each time series, and null target values where forecasts should start. Rewrote the prediction input SQL to include the 90-day context window plus 30 future rows with `demand` set to `NULL`.
- The original dashboard SQL assumed a fixed `predictions` table and column names such as `predicted_date` and `predicted_demand_lower_bound`. Updated it to use the documented BigQuery forecast output shape and timestamped prediction table pattern.

## Review Notes
The tutorial is technically relevant and valid after correction. The example still uses placeholder project, dataset, and table names, so it remains illustrative rather than directly runnable without environment-specific substitutions.
