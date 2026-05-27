# Validation Summary: How to Run Batch Prediction Jobs in Vertex AI for Large-Scale Inference

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI batch prediction jobs
- Vertex AI SDK for Python (`google-cloud-aiplatform`)
- Google Cloud Storage
- BigQuery
- Google Cloud CLI authentication
- Python

## Sources Consulted
- Vertex AI SDK for Python `Model.batch_predict` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI SDK for Python `BatchPredictionJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.BatchPredictionJob
- Vertex AI custom model batch inference documentation: https://docs.cloud.google.com/vertex-ai/docs/predictions/get-batch-predictions
- Vertex AI tabular batch inference output documentation: https://docs.cloud.google.com/vertex-ai/docs/tabular-data/classification-regression/get-batch-predictions
- Vertex AI batch prediction jobs REST resource: https://docs.cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.batchPredictionJobs
- Google Cloud CLI `ai-platform jobs submit prediction` reference, checked to distinguish legacy AI Platform commands from Vertex AI batch prediction jobs: https://docs.cloud.google.com/sdk/gcloud/reference/ai-platform/jobs/submit/prediction

## Issues Found
- The post described `max_replica_count` as "Vertex AI will auto-scale." The Python SDK documents `starting_replica_count` and `max_replica_count` as dedicated-resource limits, and the Vertex AI batch inference guide recommends choosing replica counts up front for batch jobs. Changed the comment to "Maximum replicas Vertex AI may use for the batch operation" to avoid implying online-style autoscaling.
- The monitoring section used `gcloud ai batch-prediction-jobs describe` and `gcloud ai batch-prediction-jobs list`. Official Vertex AI batch prediction documentation shows REST API usage with `gcloud auth print-access-token`; the documented `gcloud ai-platform jobs` commands are for legacy AI Platform jobs, not Vertex AI batch prediction jobs. Replaced those commands with supported REST `curl` GET requests for a single job and for listing jobs.
- The BigQuery output example said results would be written to a single new table and queried `predictions_TIMESTAMP`. For the SDK example using `bigquery_destination_prefix='bq://your-project-id.dataset'`, the SDK reference describes `predictions` and `errors` tables in the destination dataset. Updated the comment and query to use the `predictions` table.
- The GCS output reader only processed files ending in `.jsonl`. Vertex AI's custom-model batch inference guide documents JSON Lines output files named `prediction.results-{file_number}-of-{number_of_files_generated}`, so the filter was updated to read both documented `prediction.results*` files and `.jsonl` files.

## Review Notes
- The Python SDK examples use current `google.cloud.aiplatform` APIs and parameters for GCS, BigQuery, GPU, replica counts, and asynchronous submission.
- The JSONL output parsing example matches the documented custom model output shape, where each line contains `instance` and `prediction` fields for standard JSONL output.
- `gcloud` was not installed in the local environment, so CLI verification was performed against official Google Cloud documentation rather than local `--help` output.
