# Validation Summary: How to Create Composite Alerting Conditions for Multi-Signal Detection on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring alerting policies
- Terraform `google_monitoring_alert_policy`
- Google Cloud CLI `gcloud monitoring policies create`
- Cloud Run, Compute Engine, Ops Agent, and Cloud SQL monitoring metrics
- Cloud Monitoring metric filters, aligners, reducers, and alert combiners

## Sources Consulted
- Google Cloud Monitoring AlertPolicy REST API: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring alerting overview: https://docs.cloud.google.com/monitoring/alerts
- Google Cloud Monitoring metric-threshold alerting behavior and incident auto-close behavior: https://docs.cloud.google.com/monitoring/alerts/incidents-events
- Google Cloud Monitoring filters documentation: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud Monitoring Google Cloud metrics list for Cloud Run and Cloud SQL metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z and https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring Ops Agent metrics list: https://docs.cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud CLI reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider documentation for `google_monitoring_alert_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The first Terraform example used two `condition_monitoring_query_language` conditions in one alerting policy. The Cloud Monitoring API only allows an MQL condition to be the only condition in a policy, so this would not create the intended composite alert. Replaced both MQL conditions with `condition_threshold` blocks.
- The error-rate examples compared only 5xx request rate values while describing percentage error rate. Replaced those with Cloud Monitoring ratio conditions using `denominator_filter` / `denominator_aggregations` and a `0.05` threshold for 5%.
- The latency examples grouped by service without a cross-series reducer. Added `REDUCE_PERCENTILE_99` with `group_by_fields` so the grouping is applied correctly.
- The `alert_strategy.auto_close` comment described recovery. Cloud Monitoring auto-close applies after metric data stops arriving for the configured duration, so the comment was corrected.
- The sustained degradation example used MQL inside a reusable condition snippet. Replaced it with a metric-threshold condition to avoid implying that MQL can be combined freely in multi-condition policies.
- The memory capacity example did not filter `agent.googleapis.com/memory/percent_used` to the `used` state. Added `metric.labels.state = "used"` so the threshold represents used memory, not any memory state.
- The CLI example used `gcloud alpha monitoring policies create` even though the command is available as a stable `gcloud monitoring policies create` command. Updated the command.
- The JSON policy's error-rate condition used a raw 5xx rate threshold while describing an error-rate threshold. Updated it to use the API's ratio fields and changed the combiner to `AND_WITH_MATCHING_RESOURCE` so the traffic and error conditions match the same Cloud Run service.

## Review Notes
- Google notes that MQL alerting policies can still be created through the Cloud Monitoring API, but new MQL alerting policies can no longer be created through the Google Cloud console. The post now avoids MQL examples for composite policies.
- The Cloud SQL connection threshold is still an example value and depends on the instance configuration, as the post notes with the inline comment.
