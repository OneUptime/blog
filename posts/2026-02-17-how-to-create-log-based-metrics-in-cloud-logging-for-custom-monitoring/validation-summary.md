# Validation Summary: How to Create Log-Based Metrics in Cloud Logging for Custom Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Log-based metrics
- Google Cloud Monitoring
- Google Cloud CLI
- Monitoring Query Language (MQL)
- Terraform Google provider

## Sources Consulted
- Google Cloud CLI reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Cloud Logging command-line interface documentation: https://cloud.google.com/logging/docs/reference/tools/gcloud-logging
- Cloud Logging log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics
- Cloud Logging distribution metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/distribution-metrics
- Cloud Logging labels for log-based metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/labels
- Cloud Logging query language documentation: https://cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging API `LogMetric` reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics#LogMetric
- Cloud Monitoring MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- Cloud Monitoring alert policy API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Terraform Google provider `google_logging_metric` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_metric

## Issues Found
- The `gcloud logging metrics create` examples for metrics with labels and distribution metrics used unsupported direct flags (`--label-extractors`, `--value-extractor`, and `--bucket-options`). Updated those examples to create LogMetric YAML files and pass them with `--config-from-file`, which is the documented approach for advanced log-based metrics.
- The distribution metric examples did not declare the required distribution metric descriptor and bucket options in the format used by the Cloud Logging API. Added `metricDescriptor`, `valueExtractor`, and `bucketOptions` fields in valid LogMetric YAML.
- The MQL dashboard examples used `fetch global`, but the sample metrics are based on Cloud Run logs and should be queried with the `cloud_run_revision` monitored resource. Updated the examples accordingly.
- The post presented MQL as a normal new-dashboard option without noting its current status. Added the current Google Cloud caveat that MQL is no longer recommended for new console dashboards, while existing/API-created MQL usage still works.
- The alert examples used `ALIGN_RATE` while describing a threshold of 100 errors per minute. `ALIGN_RATE` converts the delta count to a per-second rate, so the examples would have tested 100 errors per second. Changed the counter alert aligner to `ALIGN_DELTA` for a 60-second count.
- The Terraform distribution metric filter did not match the corrected Cloud Run response-time example and allowed entries without a positive numeric response time. Updated the filter to include `resource.type="cloud_run_revision"` and `jsonPayload.response_time_ms>0`.

## Review Notes
The Terraform `google_logging_metric` examples use current provider field names and valid metric descriptor, extractor, and bucket configuration blocks. The examples remain illustrative and assume logs with the referenced Cloud Run resource labels and JSON payload fields already exist.
