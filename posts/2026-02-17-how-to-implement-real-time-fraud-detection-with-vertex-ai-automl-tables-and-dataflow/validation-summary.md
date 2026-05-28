# Validation Summary: How to Use Real-Time Fraud Detection with Vertex AI AutoML Tables and Dataflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI AutoML tabular classification
- Google Cloud Python SDK for Vertex AI
- Apache Beam Python SDK
- Google Cloud Dataflow
- Pub/Sub
- BigQuery
- SQL
- Python

## Sources Consulted
- Google Cloud Vertex AI Python SDK `AutoMLTabularTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.AutoMLTabularTrainingJob
- Google Cloud Vertex AI Python SDK `Model.deploy` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud Vertex AI Python SDK `Endpoint.deploy` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Google Cloud Vertex AI online prediction documentation for tabular classification and regression: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/classification-regression/get-online-predictions
- Apache Beam BigQuery I/O Python reference: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Google Cloud Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options

## Issues Found
- The training example passed `column_specs` to `job.run()`, but the Vertex AI Python SDK defines `column_specs` on `AutoMLTabularTrainingJob(...)`. Moved `column_specs` into the training-job constructor.
- The original `column_specs` implied that `transaction_id` would be auto-excluded. Vertex AI ignores columns that are not listed when `column_specs` is provided, so the example now lists the intended feature columns and omits `transaction_id`.
- The prediction code assumed `scores[1]` was always the fraud score. Vertex AI returns `classes` and corresponding `scores`, so the code now finds the score whose class label is `1`.
- The architecture showed approved transactions being published to Pub/Sub, but the pipeline only published flagged transactions. Added the approved-topic write.
- The streaming BigQuery sink used `schema="SCHEMA_AUTODETECT"`, but Beam's BigQuery schema autodetection applies to JSON-based file loads, while streaming pipelines default to streaming inserts. Replaced it with an explicit schema string.
- The retraining snippet used `datetime.now()` without importing `datetime`. Added the missing import.

## Review Notes
The code snippets are syntactically valid Python after the fixes. The examples still use placeholder project, endpoint, bucket, dataset, and topic names that readers must replace before running.
