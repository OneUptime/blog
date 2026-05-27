# Validation Summary: How to Monitor Bigtable Performance Using Cloud Monitoring Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- Google Cloud CLI
- Cloud Monitoring REST API
- Python `google-cloud-monitoring` client library
- Bigtable Key Visualizer

## Sources Consulted
- Bigtable monitoring documentation: https://cloud.google.com/bigtable/docs/monitoring-instance
- Bigtable metrics reference: https://cloud.google.com/bigtable/docs/metrics
- Bigtable performance and capacity guidance: https://cloud.google.com/bigtable/docs/performance
- Bigtable Key Visualizer overview: https://cloud.google.com/bigtable/docs/keyvis-overview
- Bigtable Key Visualizer usage guide: https://cloud.google.com/bigtable/docs/keyvis-getting-started
- `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring metric descriptor documentation: https://cloud.google.com/monitoring/custom-metrics/browsing-metrics
- Cloud Monitoring time-series retrieval documentation: https://cloud.google.com/monitoring/custom-metrics/reading-metrics
- Cloud Monitoring Python client reference: https://cloud.google.com/python/docs/reference/monitoring/latest

## Issues Found
- The post claimed Bigtable recommends keeping CPU below 70% for production workloads. Current Bigtable guidance is 60% for latency-optimized workloads and 90% for throughput-optimized workloads. Updated the text and chart threshold guidance.
- Dashboard filter strings omitted `AND` between metric and resource selectors. Updated both dashboard JSON filters to use valid Cloud Monitoring filter syntax.
- The CPU dashboard axis label said `CPU %`, but `cluster/cpu_load` is reported as a fraction with unit `1`. Updated the label to `CPU utilization`.
- The throughput section described `server/request_count` as rows read and written per second. That metric counts server requests, not rows. Updated the description and added the correct row metrics: `server/returned_rows_count` and `server/modified_rows_count`.
- The storage section described `cluster/storage_utilization` as total bytes stored. That metric is storage used as a fraction of cluster capacity. Updated the description and added the correct bytes metrics: `disk/bytes_used` and `table/bytes_used`.
- The Metrics Explorer command block used unsupported current `gcloud monitoring metrics list` and `gcloud monitoring time-series list` commands. Replaced those examples with Cloud Monitoring REST API `curl` calls authenticated by `gcloud auth print-access-token`.
- The alert policy CLI example used non-current flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Updated it to current `gcloud monitoring policies create` syntax using `--if`, `--duration`, and `--aggregation`.
- The Python error alert was named `Error Rate > 1%`, but the threshold and aligner implement an absolute error rate of 10 errors per second, not a percentage. Updated the display name to match the actual condition.
- The Key Visualizer requirements stated that 24 hours of data and a production instance are required. Current documentation says Key Visualizer is available for tables with at least 1 GB of data per cluster, scans can take up to an hour after reaching that size, and initial data for new tables typically takes a few days and can take up to a week. Updated the requirement statement.

## Review Notes
The Python snippets were syntax-checked with `compile()`, and the JSON dashboard snippet was parsed successfully. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud CLI reference instead of local `--help` output.
