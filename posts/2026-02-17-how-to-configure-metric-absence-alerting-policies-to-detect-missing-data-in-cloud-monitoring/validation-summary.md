# Validation Summary: How to Configure Metric-Absence Alerting Policies to Detect Missing Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring alerting policies
- Metric-absence conditions
- Google Cloud CLI
- Cloud Run metrics
- Ops Agent metrics
- Cloud Monitoring Python client library

## Sources Consulted
- Google Cloud Monitoring metric-absence alerting policies: https://cloud.google.com/monitoring/alerts/metric-absence
- Google Cloud Monitoring alert policy REST reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring sample policies in JSON: https://cloud.google.com/monitoring/alerts/policies-in-json
- Google Cloud Monitoring filters: https://cloud.google.com/monitoring/api/v3/filters
- Google Cloud CLI `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring monitored resource types: https://cloud.google.com/monitoring/api/resources
- Google Cloud Monitoring user-defined metrics API: https://cloud.google.com/monitoring/custom-metrics/creating-metrics
- Google Cloud Monitoring Cloud Run metrics: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring Ops Agent metrics: https://cloud.google.com/monitoring/api/metrics_opsagent

## Issues Found
- The policy creation command used `gcloud alpha monitoring policies create`. The stable `gcloud monitoring policies create` command supports `--policy-from-file`, so the command was updated to use the current stable surface.
- The VM agent section said metric-absence alerting catches VM shutdowns. Google Cloud documentation states that, except for uptime-check metrics, metrics associated with `TERMINATED` or `DELETED` Google Cloud resources are not considered for metric-absence policies. The wording was updated to remove VM shutdowns and add this caveat.
- The Python heartbeat example created a `k8s_container` time series but only set `container_name`. Cloud Monitoring requires each `TimeSeries` to fully specify all monitored resource labels, so the example now includes `project_id`, `location`, `cluster_name`, `namespace_name`, `pod_name`, and `container_name`.

## Review Notes
Metric-absence policies require at least one successful measurement after the policy is installed or modified before absence can be detected, and the maximum configurable trigger absence time is 23.5 hours. The post's examples use valid `conditionAbsent`, `conditionThreshold`, aggregation, filter, notification channel, and documentation fields.
