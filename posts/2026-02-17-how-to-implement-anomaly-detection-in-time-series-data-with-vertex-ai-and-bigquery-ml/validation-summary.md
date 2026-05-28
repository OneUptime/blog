# Validation Summary: How to Use Anomaly Detection in Time-Series Data with Vertex AI and BigQuery ML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- BigQuery ML
- BigQuery GoogleSQL
- Vertex AI
- Cloud Storage
- Pub/Sub
- Cloud Functions
- Python
- TensorFlow/Keras
- pandas

## Sources Consulted
- BigQuery ML `ML.DETECT_ANOMALIES` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-detect-anomalies
- BigQuery ML `CREATE MODEL` for `ARIMA_PLUS` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-time-series
- BigQuery parameterized queries documentation: https://docs.cloud.google.com/bigquery/docs/parameterized-queries
- Vertex AI model import documentation: https://docs.cloud.google.com/vertex-ai/docs/model-registry/import-model
- Vertex AI model upload sample: https://docs.cloud.google.com/vertex-ai/docs/samples/aiplatform-upload-model-sample
- Keras model saving documentation: https://keras.io/api/models/model_saving_apis/model_saving_and_loading/
- TensorFlow SavedModel API documentation: https://www.tensorflow.org/api_docs/python/tf/saved_model/save
- Cloud Functions Pub/Sub trigger sample: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub
- Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher

## Issues Found
- The `ARIMA_PLUS` `CREATE MODEL` examples used `confidence_level`, which is not a supported training option for `ARIMA_PLUS`. Removed it from both model creation examples.
- The anomaly detection query referenced non-existent `ML.DETECT_ANOMALIES` output columns (`forecast_value`, `prediction_interval_lower_bound`, and `prediction_interval_upper_bound`). Updated the query to use the documented `lower_bound`, `upper_bound`, `anomaly_probability`, and `is_anomaly` columns.
- The anomaly detection query filtered on a SELECT alias in the same query block. Reworked it with a CTE and filtered on `is_anomaly`.
- The multi-metric example described training separate models, but `TIME_SERIES_ID_COL` trains one BigQuery ML model with separate time series identified by the ID column. Corrected the comment.
- The Python BigQuery query interpolated metric names into SQL. Replaced that with BigQuery query parameters using `ArrayQueryParameter` and `ScalarQueryParameter`.
- The pandas code used `fillna(method='ffill')`, which is deprecated in modern pandas. Replaced it with `.ffill()`.
- The Vertex AI example saved a model to a local `/tmp` path and passed that path as `artifact_uri`, but Vertex AI model import expects a Cloud Storage artifact URI for prebuilt containers. Updated the code to export a TensorFlow SavedModel, upload it to Cloud Storage, and use the `gs://` URI.
- The Keras example used `model.save("/tmp/anomaly_model")` for SavedModel export. In Keras 3, `model.save()` is for the `.keras` format; updated it to `model.export(...)` for TensorFlow SavedModel export.
- The Cloud Functions Pub/Sub example parsed `event["data"]` directly as JSON, but Pub/Sub event data is base64-encoded. Added base64 decoding before JSON parsing.
- Pub/Sub attributes must be strings, but the alert code passed numeric severity directly. Converted the Pub/Sub `severity_score` attribute to a string.
- The alert code stored severity as a numeric value but compared it to the string `"critical"`. Updated the alert check to compare the numeric `severity_score`.

## Review Notes
The helper functions `get_recent_metrics`, `check_with_bqml`, `check_with_vertex`, and `send_pagerduty_alert` remain illustrative placeholders. The post is technically valid as a tutorial pattern, but a production implementation should also persist and apply the normalization statistics (`mean`, `std`) and anomaly threshold used by the Vertex AI model at inference time.
