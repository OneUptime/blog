# Validation Summary: How to Monitor Cloud Run Service Latency and Error Rates with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Monitoring metrics
- Cloud Monitoring alerting policies
- Monitoring Query Language (MQL)
- Cloud Monitoring Service Level Objectives (SLOs)
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Cloud Run monitoring guide: https://docs.cloud.google.com/run/docs/monitoring
- Google Cloud metrics list for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring SLO API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Cloud Monitoring SLO create method: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/create
- Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Cloud Monitoring metric ratios guidance: https://cloud.google.com/monitoring/charts/metric-ratios

## Issues Found
- Corrected Cloud Run CPU and memory utilization metric names from `run.googleapis.com/container/cpu/utilization` and `run.googleapis.com/container/memory/utilization` to `run.googleapis.com/container/cpu/utilizations` and `run.googleapis.com/container/memory/utilizations`.
- Clarified that `run.googleapis.com/request_latencies` measures latency after a request reaches a running container and does not include container startup latency.
- Updated dashboard guidance to avoid recommending new MQL dashboard creation in the Google Cloud console, because MQL is no longer recommended for new Cloud Monitoring assets and new MQL dashboard or alert creation in the console is no longer available.
- Updated the latency alert policy and Terraform example to include a cross-series reducer and group by service name, so the alert aggregates across revision and metric-label series correctly.
- Updated the error-rate ratio alert to reduce numerator and denominator series with `REDUCE_SUM`, preserving matching service labels for the ratio.
- Replaced the undocumented `gcloud monitoring slos create` example with a documented Cloud Monitoring API `services.serviceLevelObjectives.create` request.
- Simplified the MQL error-rate calculation to compute the 5xx ratio directly from the `request_count` metric label.
- Changed the startup metric example from counting distribution points to charting p95 container startup latency.

## Review Notes
MQL examples remain in the post for existing or API-managed assets, but PromQL or the Cloud Monitoring query builder is the current recommended path for new console dashboards and ratio charts.
