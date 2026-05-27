# Validation Summary: How to Monitor and Alert on Log-Based Metrics in Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Logging
- Google Cloud Monitoring
- Log-based metrics
- Google Cloud CLI
- Cloud Monitoring alert policies
- Cloud Monitoring dashboards
- Terraform Google provider
- Cloud Run monitored resources

## Sources Consulted
- Google Cloud Logging log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics
- Google Cloud Logging counter metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/counter-metrics
- Google Cloud Logging distribution metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/distribution-metrics
- Google Cloud Logging labels on log-based metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/labels
- Google Cloud Logging LogMetric REST reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics
- Google Cloud CLI `gcloud logging metrics create` reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud CLI `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring alert policy REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring dashboard REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud CLI `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Terraform Google provider `google_monitoring_alert_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The distribution metric example used unsupported `gcloud logging metrics create` flags, `--field-name` and `--bucket-boundaries`. Replaced the command with a JSON `LogMetric` definition using `metricDescriptor.valueType: DISTRIBUTION`, `valueExtractor`, `bucketOptions.explicitBuckets.bounds`, and `--config-from-file`, which matches the current CLI and API documentation.
- The text described `--bucket-boundaries` as the way to define histogram buckets. Updated it to refer to the `bucketOptions` field used by the corrected `LogMetric` definition.
- The custom label example extracted `httpRequest.requestUrl` directly while describing the label as an endpoint path. Changed the extractor to `REGEXP_EXTRACT` so the label captures the path portion without the query string, reducing accidental high cardinality.
- The custom label example typed `status_code` as a string even though it extracts the numeric `httpRequest.status` field. Changed the label type to `INT64`.
- The alerting CLI example used obsolete or incorrect `gcloud monitoring policies create` flags: `--condition-threshold-value`, `--condition-threshold-duration`, `--condition-threshold-comparison`, and `--condition-threshold-aggregation`. Replaced them with the current `--if`, `--duration`, and `--aggregation` flags.
- The alert examples claimed a threshold of 10 errors per minute while using `ALIGN_RATE`, which returns a per-second rate. Updated the CLI and Terraform thresholds to `0.1667`, approximately 10 divided by 60.
- The alert and dashboard examples used or omitted monitored resource filters inconsistently. Updated them to use `resource.type="cloud_run_revision"` to match the Cloud Run log filters used earlier in the post.
- The dashboard's "HTTP 500 Errors per Minute" chart used `ALIGN_RATE`, which would display errors per second. Changed it to `ALIGN_SUM` over a 60-second alignment period so the chart matches the title.

## Review Notes
Local `gcloud` was not installed in the review environment, so CLI details were verified against official Google Cloud CLI reference documentation instead of local `--help` output. The post is now technically valid for current Google Cloud Logging and Cloud Monitoring APIs as of 2026-05-27.
