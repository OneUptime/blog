# Validation Summary: How to Troubleshoot Compute Engine VM Performance Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Compute Engine
- Cloud Monitoring
- Cloud Monitoring API
- Google Cloud CLI
- Ops Agent metrics
- Persistent Disk performance metrics
- Linux VM troubleshooting commands

## Sources Consulted
- Google Cloud Monitoring API `projects.timeSeries.list`: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Cloud Monitoring filters: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud Compute Engine metrics list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Ops Agent metrics list: https://docs.cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud disk performance metrics: https://docs.cloud.google.com/compute/docs/disks/review-disk-metrics
- Google Cloud Persistent Disk performance overview: https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud general-purpose machine family documentation: https://docs.cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- The post used `gcloud monitoring time-series list`, but current official GA `gcloud monitoring` documentation does not provide a `time-series` command. Replaced those examples with Cloud Monitoring API `projects.timeSeries.list` calls using `curl`, `gcloud auth print-access-token`, explicit intervals, and `view=FULL`.
- The CPU throttling example queried `compute.googleapis.com/instance/cpu/reserved_cores`, which reports reserved vCPU count, not throttling. Replaced it with `compute.googleapis.com/instance/cpu/scheduler_wait_time`, which reports time when a vCPU is ready to run but not scheduled.
- The disk throttling example used `compute.googleapis.com/instance/disk/throttled_read_ops_count`, which is not a documented Compute Engine disk metric. Replaced it with documented disk latency and queue-depth metrics: `average_io_latency` and `average_io_queue_depth`.
- The memory utilization query did not filter the Ops Agent memory state. Added `metric.labels.state="used"` because `agent.googleapis.com/memory/percent_used` is reported by memory state and all states sum to 100%.
- The alerting policy command used outdated/nonexistent threshold flags. Updated it to the current `gcloud monitoring policies create` flags: `--if='> 0.85'` and `--duration=300s`.
- The dashboard JSON used a string for `gridLayout.columns` and omitted resource type selectors in filters. Updated `columns` to a number and added `resource.type="gce_instance"` to the chart filters.
- The Persistent Disk bottleneck explanation implied disk size alone determines limits. Updated it to include VM vCPU limits, consistent with Compute Engine Persistent Disk performance documentation.

## Review Notes
The post is now technically valid. Future improvements could include adding aggregation parameters to the time-series API examples so DELTA metrics are shown as per-second rates or sums, but the corrected examples use valid metric types and API fields.
