# Validation Summary: How to Prepare for the Google Cloud Professional Cloud DevOps Engineer Exam SRE

## Status
validated

## Post Type
Technical certification study guide with implementation examples

## Technologies Covered
- Google Cloud Professional Cloud DevOps Engineer exam topics
- Site Reliability Engineering (SRE)
- Cloud Monitoring SLOs and alerting policies
- Cloud Run metrics
- Cloud Functions with Pub/Sub-triggered remediation
- Cloud Monitoring dashboards
- Cloud Trace and OpenTelemetry for Python
- Cloud Logging structured logging for Python

## Sources Consulted
- Google Cloud Observability: Working with the SLO API - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/using-api
- Google Cloud Observability: Creating a service-level indicator - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/identifying-custom-sli
- Google Cloud Observability: Alerting on your burn rate - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud Observability: Creating an alerting policy for SLOs by API - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/create-policy-api
- Google Cloud Monitoring API: AlertPolicy and MetricThreshold reference - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud SDK: gcloud monitoring policies create reference - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metrics list for Cloud Run - https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Trace Python OpenTelemetry sample - https://docs.cloud.google.com/trace/docs/setup/python-ot
- Google Cloud Logging Python standard library integration - https://docs.cloud.google.com/python/docs/reference/logging/latest/std-lib-integration
- Google Cloud Logging structured logging guide - https://cloud.google.com/logging/docs/structured-logging

## Issues Found
- The SLO creation example used an undocumented `gcloud monitoring slos create` command and unsupported flags. Replaced it with a `curl` example that calls the documented `serviceLevelObjectives.create` REST endpoint and uses a request-based `goodTotalRatio`.
- The burn-rate alert example used invalid `gcloud monitoring policies create` flags and omitted the required lookback period argument for `select_slo_burn_rate`. Replaced it with a documented Cloud Monitoring API alert-policy example using `select_slo_burn_rate(..., "60m")`.
- The Pub/Sub-triggered Cloud Function parsed `event['data']` directly as JSON. Pub/Sub event data is base64 encoded in the background-function event shape, so the snippet now decodes it before parsing.
- The high-error-rate alert claimed to alert on an error rate above 1%, but the YAML compared the 5xx request rate directly to `0.01`. Added `denominatorFilter` and `denominatorAggregations` so the condition is a real 5xx/total request ratio.
- The dashboard example title claimed `p50`, `p95`, and `p99` latency while only configuring `ALIGN_PERCENTILE_99`. Updated the title to `Latency (p99)` and made the Cloud Monitoring filters explicit with `AND`.
- The structured logging snippet serialized JSON into the log message. Updated it to use the documented `extra={"json_fields": ...}` pattern for structured payloads through the Python standard logging integration.

## Review Notes
The Cloud Trace direct exporter import shown in the post is still valid in Google Cloud Python library examples, but Google Cloud's current Python instrumentation guide generally recommends OTLP export through an OpenTelemetry Collector when that architecture is available.
