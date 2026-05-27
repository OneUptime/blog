# Validation Summary: How to Monitor Cloud Load Balancer Metrics and Set Up Latency Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Cloud Monitoring metrics
- Monitoring Query Language (MQL)
- Cloud Monitoring alert policies
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Load Balancing metrics documentation: https://docs.cloud.google.com/load-balancing/docs/metrics
- Google Cloud monitored resource types documentation: https://docs.cloud.google.com/monitoring/api/resources
- Google Cloud Monitoring alert policy REST API documentation: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring filter syntax documentation: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud SDK `gcloud monitoring policies create` documentation: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Terraform Google provider `google_monitoring_alert_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The `total_latencies` description overstated client-to-load-balancer request timing. Updated it to match Google Cloud's metric descriptor: latency is calculated from when the load balancer receives the request until the client ACKs the last response byte.
- The latency alert examples used `REDUCE_SUM` after `ALIGN_PERCENTILE_95`, which sums percentile latency values across time series and can produce misleading alert values. Changed this to `REDUCE_MAX` so the alert triggers on the highest per-series p95 within each URL map group.
- The 5xx error-rate alert examples grouped numerator and denominator time series without reducing them, which can prevent the ratio from producing matching time series. Added `REDUCE_SUM` to both numerator and denominator aggregations so the 5xx rate is calculated as summed 5xx request rate divided by summed total request rate per URL map.

## Review Notes
MQL still runs and existing MQL assets continue to work, but Google no longer recommends MQL for new Cloud Monitoring work, and new MQL dashboards or alerting policies cannot be created through the Google Cloud console after the 2025 support change. The post's MQL snippets remain technically usable through supported API paths, but PromQL or the query builder would be preferable for future examples.
