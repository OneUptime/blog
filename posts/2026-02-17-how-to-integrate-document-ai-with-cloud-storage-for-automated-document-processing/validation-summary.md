# Validation Summary: How to Integrate Document AI with Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Document AI
- Cloud Storage
- Cloud Run functions / Cloud Functions Gen 2
- Eventarc
- Firestore
- Cloud Logging
- Cloud Monitoring
- Python
- Google Cloud CLI and gsutil

## Sources Consulted
- Google Cloud Document AI: Quickstart and process documents with Python client libraries: https://docs.cloud.google.com/document-ai/docs/process-documents-client-libraries
- Google Cloud Document AI: Send a processing request: https://cloud.google.com/document-ai/docs/send-request
- Google Cloud Document AI: Creating and managing processors: https://docs.cloud.google.com/document-ai/docs/create-processor
- Google Cloud Document AI: Supported files and MIME types: https://cloud.google.com/document-ai/docs/file-types
- Google Cloud Document AI Python API reference for ProcessRequest: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.ProcessRequest
- Google Cloud Run functions sample for Cloud Storage CloudEvents: https://cloud.google.com/functions/docs/samples/functions-cloudevent-storage
- Google Cloud SDK reference for gcloud functions deploy: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference for gcloud functions logs read: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud SDK reference for gcloud logging metrics create: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK reference for gcloud alpha monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Logging monitored resource types: https://cloud.google.com/logging/docs/api/v2/resource-list

## Issues Found
- The Document AI client examples did not configure the regional Document AI API endpoint. Added `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")` in the processor creation example and the Cloud Function, matching the official Python client samples.
- The Cloud Function logged processing failures with `print`, but the monitoring metric filtered on `severity>=ERROR`. Changed the failure path to use `logging.exception(...)` so caught processing errors are emitted as error logs.
- The Gen 2 function log command omitted `--gen2`. Added it to match the documented `gcloud functions logs read` usage for Gen 2 functions.
- The log-based metric command used `--filter`, but current `gcloud logging metrics create` uses `--log-filter`. Updated the command.
- The monitoring filter used the Gen 1 `cloud_function` monitored resource and `function_name` label. Updated it to `cloud_run_revision` and `service_name`, which match Cloud Run functions / Cloud Functions Gen 2 logs.
- The alert policy command used unsupported flags `--condition-threshold-value` and `--condition-threshold-duration`. Updated it to the documented `--if="> 5"` and `--duration=300s` flags.
- The retry section said it added retry logic and dead-letter handling, but the snippet only showed retry logic. Reworded the sentence to avoid claiming that the snippet implements dead-letter handling.

## Review Notes
The post is technically relevant and remains a valid implementation guide after the corrections. The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
