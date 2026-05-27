# Validation Summary: How to Monitor Cloud Function Execution Times and Error Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Cloud Monitoring metrics, alerting policies, dashboards, uptime checks, and notification channels
- Cloud Logging logs-based metrics
- Google Cloud CLI
- Cloud Monitoring API
- Node.js with `@google-cloud/functions-framework` and `@google-cloud/monitoring`
- Terraform Google provider monitoring resources

## Sources Consulted
- Google Cloud metrics list for Cloud Functions and Cloud Run: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c and https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring notification channels API guide: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Cloud Monitoring custom metrics guide and metric descriptor API: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics and https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/create
- `gcloud logging metrics create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- `gcloud monitoring uptime create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Cloud Monitoring Node.js client reference: https://docs.cloud.google.com/nodejs/docs/reference/monitoring/latest/monitoring/v3.metricserviceclient
- Cloud Run request/response SLI metrics documentation: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics

## Issues Found
- Fixed incorrect Cloud Run metric names for request count, request latency, memory utilization, and CPU utilization. The Cloud Run request metrics do not use the `container/` prefix, and utilization metrics use plural `utilizations`.
- Replaced invalid `gcloud monitoring policies create --from-file` usage with `--policy-from-file`.
- Reworked the high error rate alert from an invalid MQL-style example into a threshold ratio using `denominatorFilter` and matching denominator aggregations.
- Reworked the slow execution alert because `cloudfunctions.googleapis.com/function/execution_times` is measured in nanoseconds, not milliseconds, and because the original `gcloud` threshold flags were not current.
- Updated the Gen 2 memory alert to use the current Cloud Run memory utilization metric name.
- Updated notification channel commands to use the documented `gcloud beta monitoring channels` command family.
- Replaced a non-existent `gcloud monitoring metrics-descriptors create` command with the documented MetricDescriptors REST API call.
- Corrected the logs-based metric command from `--filter`, `--metric-kind`, and `--value-type` to the supported `--log-filter` form for a simple counter metric.
- Reworked the logs-based metric alert to use a policy YAML and include the required resource type in the filter.
- Corrected uptime check flags to the current `gcloud monitoring uptime create` syntax.
- Renamed dashboard widgets that charted only p95 latency and error-count rate so their titles matched what the configuration actually displays.
- Updated the Node.js project ID lookup to prefer `GOOGLE_CLOUD_PROJECT` while retaining `GCP_PROJECT` as a fallback.
- Updated the Terraform error-rate alert to use a denominator filter and matching denominator aggregations so it actually evaluates an error ratio instead of an error request rate.

## Review Notes
The custom metrics example writes directly to Cloud Monitoring from the request path. This is technically valid, but for high-throughput functions a future revision should mention Cloud Monitoring write limits and consider batching or OpenTelemetry-based instrumentation.
