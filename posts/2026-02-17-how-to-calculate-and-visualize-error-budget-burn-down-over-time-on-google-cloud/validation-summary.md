# Validation Summary: How to Calculate and Visualize Error Budget Burn Down Over Time on Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud Service Monitoring SLO API
- Google Cloud Monitoring dashboards and alerting policies
- Cloud Run monitoring metrics
- Python Google Cloud Monitoring client library
- BigQuery export workflow
- Mermaid diagrams

## Sources Consulted
- Google Cloud Monitoring SLO API: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/using-api
- Google Cloud Monitoring SLO time-series selectors: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud request-response SLI metrics for Cloud Run: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud Monitoring alerting on budget burn rate: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring Python `MetricServiceClient`: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.metric_service.MetricServiceClient
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The original SLO creation command used a non-existent `gcloud slo service-level-objectives create` command and unsupported flags. Replaced it with the documented Cloud Monitoring SLO API `curl` flow and a valid `ServiceLevelObjective` JSON body.
- The Cloud Run SLI filters used `metric.labels.response_code_class` and counted only `2xx` responses as good. Updated the example to use documented Cloud Monitoring filter label syntax and Cloud Run request-based SLI filters.
- The Python examples attempted to retrieve SLO data through MQL metric names that don't exist for SLOs. Replaced them with `MetricServiceClient.list_time_series` calls using `select_slo_budget_fraction` and `select_slo_burn_rate` selectors.
- The alerting command used unsupported threshold flags for `gcloud monitoring policies create`. Updated it to use the documented `--condition-filter`, `--if`, and `--duration` flags.
- The workflow section said Cloud Monitoring log sinks capture SLO metrics for BigQuery. Corrected this to recommend periodically querying SLO time-series selectors and writing the points to BigQuery.

## Review Notes
MQL is still available in some Cloud Monitoring contexts but is deprecated for `timeSeries.query`; the revised examples avoid MQL and use the documented SLO selector path. The dashboard JSON uses SLO selectors in direct filter mode, which matches the documented way to chart SLO time series.
