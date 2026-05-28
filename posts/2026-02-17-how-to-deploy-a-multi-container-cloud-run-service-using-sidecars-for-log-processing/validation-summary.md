# Validation Summary: How to Deploy a Multi-Container Cloud Run Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run services
- Cloud Run multi-container sidecars
- Google Cloud CLI
- Artifact Registry
- Cloud Build
- Cloud Logging
- Cloud Storage
- BigQuery
- Node.js and Express
- Python and Flask
- Docker

## Sources Consulted
- Cloud Run: Deploying multiple containers to a service (sidecars): https://docs.cloud.google.com/run/docs/deploying
- Cloud Run: Configure containers for services and container startup order: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Cloud Run: Container runtime contract and container resources: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run: Logging and viewing logs: https://docs.cloud.google.com/run/docs/logging
- Google Cloud CLI reference for `gcloud run services logs read`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Cloud Run YAML reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1

## Issues Found
- The post said multi-container Cloud Run services require YAML and that gcloud flags cannot specify multiple containers. Current Cloud Run documentation supports multi-container deployment by YAML, Terraform, Google Cloud CLI, and console. Updated the wording to present YAML as the example approach rather than the only supported approach.
- The YAML included `run.googleapis.com/launch-stage: BETA`, which is not required by the current Cloud Run multi-container service documentation. Removed the annotation from the sample.
- The resource allocation section described CPU and memory as a single service-level pool. Current Cloud Run documentation describes CPU and memory limits per container, with CPU allocation affected by the service billing setting. Updated the section to describe per-container limits and request-based billing behavior for sidecars.
- The Python sidecar called `flush_logs()` while holding `buffer_lock`, but `flush_logs()` also acquires that lock. This could deadlock when `BATCH_SIZE` is reached. Changed the sample to decide whether to flush inside the lock, then call `flush_logs()` after releasing it.
- The Python sidecar claimed to flush logs to Cloud Storage and BigQuery, imported BigQuery, and defined BigQuery environment variables, but only wrote to Cloud Storage. Added a BigQuery `insert_rows_json` call so the code matches the description.
- The Node.js sample used `data.length` for the `Content-Length` header. Updated it to `Buffer.byteLength(data)` so the byte count is correct for JSON payloads containing non-ASCII characters.
- The text said the main app sends logs on startup, but the sample sends logs while handling requests. Updated the explanation to match the code.

## Review Notes
- The log processor sample assumes the Cloud Run service identity has IAM permissions for the target Cloud Storage bucket and BigQuery table, and that the BigQuery dataset/table schema already exists.
- With request-based billing, background flushing in an idle sidecar may be CPU-throttled. The article now notes instance-based billing for sidecars that need idle background work.
