# Validation Summary: How to Debug Cloud Run Container Startup Failures

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Google Cloud Run
- Cloud Logging and Logs Explorer query language
- Google Cloud CLI (`gcloud`)
- Docker
- Python logging
- Node.js port binding

## Sources Consulted
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run troubleshooting guide: https://docs.cloud.google.com/run/docs/troubleshooting
- Cloud Run logging guide: https://docs.cloud.google.com/run/docs/logging
- Cloud Run health checks and startup probes: https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Cloud Run CPU and startup CPU boost configuration: https://docs.cloud.google.com/run/docs/configuring/services/cpu
- `gcloud run services update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging structured logging: https://docs.cloud.google.com/logging/docs/structured-logging

## Issues Found
- The startup timeout fix used `--startup-cpu-boost`, which is not the current `gcloud run services update` flag. Official docs use `--cpu-boost` for startup CPU boost, and startup probe timing is configured with `--startup-probe`. Changed the example to configure a TCP startup probe with `periodSeconds=240`, `timeoutSeconds=240`, and `failureThreshold=1`, which stays within Cloud Run's documented startup probe limits.
- The "System Logs" query filtered `run.googleapis.com%2Frequests`, which returns request logs rather than Cloud Run system logs. Changed it to `run.googleapis.com%2Fvarlog%2Fsystem`, the documented log name for platform-generated Cloud Run system logs.
- The basic `gcloud logging read` example comment said "last hour" while the filter used a fixed timestamp. Changed the comment to say it queries since a specific timestamp.
- The structured logging Python example implied a `TRACE_CONTEXT` environment variable could be used for Cloud Trace correlation. Cloud Run request correlation uses the `X-Cloud-Trace-Context` request header and a fully qualified trace resource name, not a standard startup environment variable. Removed the misleading trace field from the startup logging helper.

## Review Notes
The `gcloud` SDK is not installed in this local environment, so CLI validation was performed against the official Google Cloud CLI reference instead of local `--help` output. The remaining queries use documented Cloud Logging field names and operators, and the Cloud Run claims about `$PORT`, binding to `0.0.0.0`, 64-bit Linux container images, startup probes, memory termination, and stdout/stderr ingestion match official documentation.
