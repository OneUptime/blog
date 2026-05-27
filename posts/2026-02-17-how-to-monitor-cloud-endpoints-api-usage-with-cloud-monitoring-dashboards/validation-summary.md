# Validation Summary: How to Monitor Cloud Endpoints API Usage with Cloud Monitoring Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Endpoints
- ESPv2
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- Cloud Monitoring SLO Monitoring
- Cloud Logging
- Google Cloud CLI
- Grafana Google Cloud Monitoring data source

## Sources Consulted
- Google Cloud Monitoring metrics list for `serviceruntime.googleapis.com`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Google Cloud Monitoring dashboard API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud CLI `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring SLO API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud SLO guidance for request-based SLIs: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/identifying-custom-sli
- Google Cloud Logging query language reference: https://cloud.google.com/logging/docs/view/logging-query-language
- Cloud Endpoints logs reference: https://cloud.google.com/endpoints/docs/openapi/ref-endpoints-logs
- Cloud Monitoring notification channel documentation: https://docs.cloud.google.com/monitoring/alerts/using-channels-api

## Issues Found
- The post used non-current metric names such as `serviceruntime.googleapis.com/api/producer/request_count` and `serviceruntime.googleapis.com/api/producer/total_latencies`. Updated these to documented metric types including `serviceruntime.googleapis.com/api/request_count` and `serviceruntime.googleapis.com/api/request_latencies`.
- The post said Cloud Endpoints metrics are associated with the `consumed_api` resource type. Updated this to state that Cloud Endpoints API metrics use `api`, while per-consumer producer views use `produced_api`.
- The dashboard grouped by `metric.labels.method` and `metric.labels.credential_id`, which are not documented labels for these metrics. Updated method grouping to `resource.labels.method` and consumer grouping to `resource.labels.consumer_id` on `produced_api`, with `REDUCE_SUM` where grouping is used.
- The alerting examples used `gcloud monitoring alerting policies create` and threshold flags that do not match the current documented `gcloud monitoring policies create` interface. Updated the commands to use `--condition-filter`, `--aggregation`, `--duration`, and `--if`.
- The high error rate alert described a percentage threshold but implemented a raw threshold. Updated the text and command to consistently alert on 5xx requests per second.
- The high latency alert used milliseconds for a metric documented in seconds. Updated the threshold to `2` seconds and added a p95 aligner.
- The SLO example used a `gcloud monitoring slos create` command that is not part of the current GA `gcloud monitoring` command group. Replaced it with a Cloud Monitoring API `curl` example using a request-based `goodTotalRatio`.
- The metrics export example used Cloud Monitoring notification channels as if they exported time-series metrics to Pub/Sub. Replaced it with accurate guidance that notification channels send alert notifications and external tools should query Cloud Monitoring through supported integrations.

## Review Notes
The dashboard JSON structure, plot types, Cloud Logging filters, and Endpoints log resource type were consistent with official documentation after the metric/resource corrections. `gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output.
