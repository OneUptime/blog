# Validation Summary: How to Implement Anomaly Detection Alerts Using Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring alerting policies
- Terraform Google provider
- PromQL
- Cloud Run metrics
- Cloud Functions
- BigQuery
- Python Google Cloud Monitoring client

## Sources Consulted
- Google Cloud Monitoring: Create forecasted metric-value alerting policies: https://docs.cloud.google.com/monitoring/alerts/metric-forecast
- Google Cloud Monitoring: PromQL-based alerting policies: https://docs.cloud.google.com/monitoring/promql/promql-in-alerting
- Google Cloud Monitoring: PromQL for Cloud Monitoring and metric-name mapping: https://docs.cloud.google.com/monitoring/promql
- Google Cloud Monitoring: Cloud Run metric descriptors: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#run
- Google Cloud Monitoring: Create alerting policies with Terraform: https://docs.cloud.google.com/monitoring/alerts/terraform
- Google Cloud Monitoring: MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Cloud Monitoring API Python client reference: https://cloud.google.com/python/docs/reference/monitoring/latest

## Issues Found
- The post described Cloud Monitoring as if it had a general-purpose built-in ML anomaly detector with learned seasonal confidence bands. I changed this to distinguish forecasted threshold alerts from query-based anomaly-style detection with PromQL.
- The Terraform forecast example used `threshold_value = 0` and implied that `forecast_options` supplies the actual anomaly threshold. I changed it to a forecasted threshold alert with a real p99 latency threshold and accurate explanation.
- The post used MQL as the primary current query language for new alert policies. MQL is no longer recommended, support for writing valid MQL ended on July 22, 2025, and new console-created MQL alerts are no longer available. I replaced the MQL alert examples with PromQL.
- The original MQL examples used 7-day and 14-day alert query windows. Cloud Monitoring PromQL alerting policies have a 24-hour retest-window/alignment-period limit and a 25-hour combined limit, so I changed Cloud Monitoring alert examples to 23-hour rolling baselines and moved multi-day/seasonal baselines to the custom detector path.
- The PromQL examples now use Cloud Monitoring's supported UTF-8 metric selector syntax for Google Cloud metric names and `_bucket` suffixes for distribution-valued metrics.
- The Cloud Function example queried Cloud Run latency without a resource filter and used deprecated `datetime.utcnow()`. I added the `cloud_run_revision` resource filter and changed timestamps to timezone-aware UTC.

## Review Notes
Forecasted metric-value alerting is documented as a Preview feature. Terraform was not installed in the workspace, so I could not run `terraform fmt` or provider validation locally; the embedded Python snippet was syntax-checked with Python's compiler.
