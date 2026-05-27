# Validation Summary: How to Monitor Dataflow Pipeline Performance with Cloud Monitoring Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataflow
- Cloud Monitoring metrics, dashboards, and alerting policies
- Google Cloud CLI (`gcloud`)
- Apache Beam Java metrics API
- Cloud Logging logs-based metrics
- BigQuery
- Cloud Monitoring Python client library
- Cloud Scheduler / Cloud Run functions

## Sources Consulted
- Google Cloud Dataflow: Use Cloud Monitoring for Dataflow pipelines: https://docs.cloud.google.com/dataflow/docs/guides/using-cloud-monitoring
- Google Cloud Dataflow job metrics: https://docs.cloud.google.com/dataflow/docs/guides/using-monitoring-intf
- Cloud Monitoring Google Cloud metrics list for Dataflow: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h#dataflow
- Google Cloud CLI: `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI: `gcloud beta dataflow metrics list`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/dataflow/metrics/list
- Google Cloud CLI: `gcloud logging metrics create`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Cloud Logging logs-based metrics overview: https://docs.cloud.google.com/logging/docs/logs-based-metrics
- Cloud Monitoring user-defined metrics with the API: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics

## Issues Found
- The system lag explanation described the metric as general real-time delay. Updated it to match the Dataflow metric definition: the current maximum duration an element has been processing or awaiting processing.
- The backlog bytes explanation said Pub/Sub backlog maps to unacknowledged messages. Updated it to describe Dataflow's backlog bytes metric as known unprocessed input for a stage, and referenced Pub/Sub-specific metrics separately.
- The data freshness explanation described the age of the most recent processed element. Updated it to match Dataflow's processing-time versus event-time definition and maximum-value behavior.
- The post referred to current worker count as if it were the same kind of built-in metric as current vCPUs. Updated the wording to reference active or target worker instance metrics.
- The dashboard widget title said "Current Workers" while it charted `job/current_num_vcpus`. Renamed the widget to "Current vCPUs".
- The alerting command used outdated or unsupported threshold flags. Replaced it with the current `gcloud monitoring policies create` syntax using `--duration` and `--if`.
- The alert threshold table referred to "Worker CPU". Updated it to "Aggregated worker utilization", which matches the current Dataflow metric.
- The Beam custom metrics sample included a `Gauge`, but Dataflow reports Beam `Counter` and `Distribution` metrics to Cloud Monitoring. Removed the unused gauge example and updated the explanation of Dataflow user metric names.
- The per-step metrics command used the non-beta Dataflow metrics command, `--source=user`, and a nested scalar format field that doesn't match the documented filter examples. Updated it to `gcloud beta dataflow metrics list`, `--source=service`, a transform filter, and the top-level `scalar` field.
- The external freshness probe omitted the required `project_id` label for the `global` monitored resource. Added `series.resource.labels["project_id"] = "my-project"`.

## Review Notes
The dashboard JSON and logs-based metric command match the current documented command structures. The local environment did not have `gcloud` installed, so CLI verification was done against the official Google Cloud CLI reference instead of local `--help` output.
