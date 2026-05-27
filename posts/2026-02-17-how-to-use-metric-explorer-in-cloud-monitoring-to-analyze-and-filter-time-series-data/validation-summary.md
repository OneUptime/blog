# Validation Summary: How to Use Metric Explorer in Cloud Monitoring to Analyze

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Metrics Explorer
- Cloud Monitoring filters, aligners, reducers, and group-by aggregation
- PromQL for Cloud Monitoring
- Monitoring Query Language (MQL)
- Cloud Monitoring API
- Google Cloud metrics for Compute Engine, Cloud Run, GKE, Cloud SQL, and Cloud Load Balancing

## Sources Consulted
- Google Cloud: Create charts with Metrics Explorer: https://cloud.google.com/monitoring/charts/metrics-explorer
- Google Cloud: Explore charted data / Compare to past: https://cloud.google.com/monitoring/charts/working-with-charts
- Google Cloud: Cloud Monitoring API projects.timeSeries.list: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Cloud: Filtering and aggregation - manipulating time series: https://cloud.google.com/monitoring/api/v3/aggregation
- Google Cloud: Monitoring filters: https://cloud.google.com/monitoring/api/v3/filters
- Google Cloud: PromQL for Cloud Monitoring: https://cloud.google.com/monitoring/promql
- Google Cloud: Monitoring Query Language deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud: Cloud Run metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud: GKE system metrics list: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud: Cloud Load Balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud Architecture Center: Cloud Monitoring metric export: https://cloud.google.com/solutions/stackdriver-monitoring-metric-export

## Issues Found
- The post said there were "two query modes" but listed Builder, PromQL, and MQL. Changed this to "three ways to build queries" to match the content and current Metrics Explorer options.
- The PromQL CPU example compared the cumulative `kubernetes.io/container/cpu/core_usage_time` metric directly to `0.8` and described it as CPU utilization. Replaced it with `kubernetes_io:container_cpu_limit_utilization`, a GA GKE utilization metric whose unit is a fraction.
- The export example used `gcloud monitoring time-series list`, which could not be verified in the local environment or official gcloud reference. Replaced it with a documented `projects.timeSeries.list` REST API request using `curl`, `gcloud auth print-access-token`, RFC 3339 interval parameters, and `view=FULL`.
- The MQL section described MQL as an advanced option without mentioning its current status. Added a caveat that MQL is no longer Google's recommended query language for new Cloud Monitoring work, while existing MQL queries and Metrics Explorer execution continue to work.
- The MQL ratio example used a single equals sign in the filter and did not aggregate away `response_code_class` before computing the ratio. Updated it to use MQL's `==` comparison syntax and a documented `group_by drop[...], sliding(...), .sum | ratio` pattern.
- The dashboard-saving section implied all Metrics Explorer query types can be saved to dashboards. Clarified this as builder and PromQL queries because current MQL console workflows are limited.

## Review Notes
- Cloud Monitoring's MQL deprecation notice says MQL is not shut down, but Google recommends PromQL for new work. It also limits some console workflows for new MQL dashboards and alerts after July 22, 2025.
- The post's listed metric types and Cloud Run `response_code_class` label were verified against current Google Cloud metric documentation.
