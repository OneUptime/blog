# Validation Summary: How to Monitor Dapr on GCP with Cloud Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Google Cloud Monitoring (formerly Stackdriver)
- Google Cloud Trace
- Google Kubernetes Engine (GKE)
- OpenTelemetry Collector (with Google Cloud exporter)
- Prometheus (metrics scraping)
- Zipkin (trace format)

## Sources Consulted
- Dapr Configuration spec source code and documentation (dapr.io) — verified `MetricSpec` struct fields (`enabled`, `rules`, `http`, `latencyDistributionBuckets`; no `port` field)
- Dapr metrics documentation — verified metric name `dapr_http_server_request_count` and label `status` (not `status_code`)
- OpenTelemetry Collector contrib `googlecloud` exporter documentation — verified exporter name, `project` field, and `metric.prefix` field
- Google Cloud Monitoring filter syntax documentation — verified that `!~` is not valid; `monitoring.regex.full_match()` with `NOT` is the correct approach
- gcloud CLI reference for `gcloud alpha monitoring policies create` — verified flags and confirmed missing `--condition-threshold-comparison`
- gcloud CLI reference for Cloud Trace — confirmed `gcloud trace traces list` does not exist; Cloud Trace is accessed via Console or REST API

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural)**: The Dapr Configuration CRD accepts both `metric` (legacy alias) and `metrics`, but official documentation uses the plural form `metrics`. Changed to `metrics` for consistency with current docs.

2. **`port: 9090` is not a valid field in Dapr metrics spec**: The `MetricSpec` in the Dapr Configuration CRD does not have a `port` field. The metrics port is configured via the `dapr.io/metrics-port` pod annotation or the `--metrics-port` CLI flag, not in the Configuration resource. Removed the invalid field.

3. **`metric.labels.status_code` should be `metric.labels.status`**: Dapr's HTTP server metrics use the label name `status` for HTTP status codes, not `status_code`. Fixed in the alerting policy filter.

4. **`!~` is not valid Cloud Monitoring filter syntax**: Cloud Monitoring filters do not support the `!~` regex negation operator. The correct approach is `NOT metric.labels.status = monitoring.regex.full_match("2..")`. Fixed the filter expression.

5. **`--condition-threshold-value=0.05` was misleading for a count metric**: The original command described "Error rate > 5%" but used a threshold of 0.05 on an absolute count metric, which does not compute a ratio. Changed the condition to alert on absolute non-2xx request count exceeding 5, with an accurate description. True error rate alerting would require MQL-based policies.

6. **Missing `--condition-threshold-comparison` flag**: The alerting policy command was missing the explicit comparison operator. Added `--condition-threshold-comparison=COMPARISON_GT`.

7. **`gcloud trace traces list` is not a valid gcloud command**: There is no `gcloud trace traces list` command in the gcloud CLI. Cloud Trace data is accessed via the Cloud Console Trace Explorer or the Cloud Trace REST API. Replaced with a `curl` command using the Cloud Trace API v2 endpoint.

## Review Notes
- The OpenTelemetry Collector configuration for the `googlecloud` exporter is correct — the exporter name, `project` field, `metric.prefix` field, and dual pipeline usage (traces + metrics) are all valid.
- The Cloud Monitoring dashboard JSON structure is correct and follows the Dashboard API format.
- The `gcloud monitoring dashboards create --config-from-file` command is correct.
- For production use, the alerting policy section would benefit from a note about using MQL-based alert policies for true error rate (ratio) alerting, but this is beyond the scope of a correction.
- The Dapr metric `dapr_http_server_request_count` is correct for current Dapr versions, though metric names may evolve in future versions adopting OpenTelemetry semantic conventions.
