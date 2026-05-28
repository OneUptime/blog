# Validation Summary: How to Debug Cloud Functions Errors Using Cloud Logging Filters

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Cloud Logging and Logs Explorer query language
- Google Cloud CLI (`gcloud logging`, `gcloud monitoring`)
- Cloud Error Reporting
- Node.js and `@google-cloud/functions-framework`
- Node.js Error Reporting client library
- Log-based metrics and alerting policies

## Sources Consulted
- Google Cloud Logging structured logging documentation: https://cloud.google.com/logging/docs/structured-logging
- Google Cloud Logging query language documentation: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Run logging documentation, including structured JSON logs and Cloud Run revision resource filters: https://cloud.google.com/run/docs/logging
- Google Cloud monitored resource types documentation: https://cloud.google.com/monitoring/api/resources
- Google Cloud SDK reference for `gcloud logging read`: https://cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud log-based distribution metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/distribution-metrics
- Google Cloud log-based alerting policy documentation: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud Monitoring alert policy API / CLI file creation documentation: https://cloud.google.com/monitoring/alerts/policies-in-api
- Google Cloud Error Reporting Node.js setup documentation: https://cloud.google.com/error-reporting/docs/setup/nodejs

## Issues Found
- The CloudEvent example calculated `processingTimeMs` from `startTime`, but `startTime` was never defined. Added `const startTime = Date.now();` at the start of the handler.
- The first Cloud Logging function filter only covered 1st gen Cloud Functions (`resource.type="cloud_function"` and `resource.labels.function_name`). Added the Cloud Run functions equivalent using `resource.type="cloud_run_revision"` and `resource.labels.service_name`.
- The shell pipeline labeled "Count errors per hour" grouped timestamps too narrowly because `cut -d'T' -f1-2` preserves minutes and seconds. Changed it to `cut -c1-13` so entries are grouped by `YYYY-MM-DDTHH`.
- The payment failure metric command used `--filter`, but current `gcloud logging metrics create` uses `--log-filter` for simple counter metrics. Updated the flag.
- The alert policy command used `--from-file`, but the current documented flag is `--policy-from-file`. Updated the command.
- The distribution metric command used unsupported direct flags (`--value-extractor`, `--type=distribution`, and `--bucket-boundaries`) for `gcloud logging metrics create`. Replaced it with a YAML `LogMetric` definition and `--config-from-file`, which is the documented path for distribution metrics.

## Review Notes
- Local `gcloud` was not installed in the review environment, so CLI verification was performed against official Google Cloud SDK documentation.
- Most remaining filters in the article are still written for 1st gen Cloud Functions. They are technically valid for 1st gen, but users on Cloud Run functions should adapt them to `cloud_run_revision` and `service_name` as shown in the corrected example.
