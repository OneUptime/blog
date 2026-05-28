# Validation Summary: How to Debug App Engine Instance Memory and CPU Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine
- Cloud Monitoring
- Google Cloud CLI
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- Python profiling and memory tracking
- Cloud Monitoring custom metrics

## Sources Consulted
- Google Cloud Monitoring metrics list for App Engine metrics: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud monitored resource descriptors for `gae_app`, `gae_instance`, and `global`: https://cloud.google.com/monitoring/api/resources
- Google Cloud CLI reference for `gcloud monitoring dashboards create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud Monitoring dashboard API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud CLI reference for `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring time-series retrieval guide: https://cloud.google.com/monitoring/custom-metrics/reading-metrics
- Google Cloud Monitoring user-defined metrics guide and Python samples: https://cloud.google.com/monitoring/custom-metrics/creating-metrics
- Python standard library documentation for `tracemalloc`, `cProfile`, `pstats`, and `functools.lru_cache`: https://docs.python.org/3/library/

## Issues Found
- The post described `appengine.googleapis.com/system/cpu/usage` as per-instance CPU utilization. Official metrics define it as CPU usage in megacycles across instances, and expose `appengine.googleapis.com/system/cpu/utilization` for average utilization. Updated the metric list, dashboard, and gcloud query to use `system/cpu/utilization` where utilization is intended.
- The post described `appengine.googleapis.com/system/memory/usage` as per-instance memory usage. Official metrics define it as total memory used by running App Engine instances for the monitored resource. Updated wording and workflow language to avoid claiming per-instance Cloud Monitoring data.
- The dashboard used `ALIGN_RATE` with `system/cpu/usage`, which is not appropriate for the intended CPU utilization chart. Changed the dashboard chart to `system/cpu/utilization` with `ALIGN_MEAN`.
- The latency dashboard title said p50, p95, and p99, but the JSON only queried p50. Added p95 and p99 datasets.
- The gcloud time-series example claimed to fetch the last hour but did not specify an interval. Added `--interval-start-time` and `--interval-end-time`.
- The alerting command used obsolete/incorrect flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Replaced it with the current `gcloud monitoring policies create` flags: `--if` and `--duration`.
- The memory alert used `0.8` as a threshold for a bytes metric. Replaced the example with a byte threshold and clarified that thresholds should be set for the service or version being monitored.
- The CPU profiling snippet used `logger` without defining it. Added the missing `logging` import and logger initialization.
- The custom metrics example used `gae_app` but only populated `project_id`; the `gae_app` monitored resource also requires service, version, and zone labels. Changed the sample to use the `global` resource with `project_id`, matching official custom metric examples.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud CLI documentation rather than local `gcloud --help`.
- The dashboard JSON was parsed successfully with `python3 -m json.tool`.
- The standalone Python memory and CPU snippets were syntax-checked with `compile()`.
