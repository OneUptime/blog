# Validation Summary: How to Monitor Cloud Spanner CPU Utilization and Latency with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Monitoring
- Google Cloud CLI
- Cloud Monitoring dashboards and alerting policies
- Spanner `SPANNER_SYS` introspection tables
- Python Cloud Monitoring client library

## Sources Consulted
- Google Cloud Spanner monitoring with Cloud Monitoring: https://docs.cloud.google.com/spanner/docs/monitoring-cloud
- Google Cloud Monitoring metric list for Spanner metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud CLI `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Spanner query statistics: https://docs.cloud.google.com/spanner/docs/introspection/query-statistics
- Cloud Spanner transaction statistics: https://docs.cloud.google.com/spanner/docs/introspection/transaction-statistics
- Cloud Spanner lock statistics: https://docs.cloud.google.com/spanner/docs/introspection/lock-statistics
- Cloud Spanner GoogleSQL mathematical functions: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/mathematical_functions

## Issues Found
- The CPU threshold guidance referred to CPU generally. Updated it to match Spanner documentation: the 65% regional and 45% dual-region/multi-region thresholds apply to high-priority CPU, with the multi-region threshold evaluated per region.
- The dashboard used `spanner.googleapis.com/instance/cpu/utilization` for the CPU chart. Changed it to `spanner.googleapis.com/instance/cpu/utilization_by_priority` filtered to `metric.labels.priority="high"` to match the recommended alerting metric.
- The API request-count example was labeled as transaction commit attempts vs aborts. Renamed and reworded it as API errors and aborted requests because `spanner.googleapis.com/api/request_count` measures API request rate by status, not transaction commit-attempt statistics.
- The alert examples used obsolete or undocumented `gcloud monitoring policies create` flags. Replaced them with the documented `--if`, `--duration`, and `--aggregation` flags.
- The latency alert compared the Spanner latency metric to `100`, but `api/request_latencies` is measured in seconds. Changed the threshold to `0.1` seconds and added the percentile aligner needed for p99.
- The Metrics Explorer CPU description incorrectly described smoothed CPU as a priority bucket. Clarified that priority CPU and smoothed 24-hour CPU are separate metrics.
- The API request-count example used uppercase `OK`; the current Spanner metric descriptor documents `ok` as the success value for the `status` label, so the filter now uses lowercase.
- Removed an unused `timestamp_pb2` import from the Python example.

## Review Notes
The local environment does not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference rather than local `--help` output. The Python example is structurally correct for the current `google-cloud-monitoring` client, but it still requires Application Default Credentials and the Cloud Monitoring API to be enabled in the target project.
