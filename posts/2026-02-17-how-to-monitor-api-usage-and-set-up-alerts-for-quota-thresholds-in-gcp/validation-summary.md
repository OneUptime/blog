# Validation Summary: How to Monitor API Usage and Set Up Alerts for Quota Thresholds in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Monitoring
- Cloud Quotas
- Google Cloud CLI (`gcloud`)
- Compute Engine quotas
- Service Runtime metrics
- Cloud Monitoring dashboards and alerting policies
- Bash scripting

## Sources Consulted
- Google Cloud SDK: `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring quota metrics guide: https://docs.cloud.google.com/monitoring/alerts/using-quota-metrics
- Cloud Monitoring Google Cloud metrics reference for `serviceruntime.googleapis.com` metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Monitoring Google Cloud metrics reference for `compute.googleapis.com` quota metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Quotas gcloud CLI examples: https://docs.cloud.google.com/docs/quotas/gcloud-cli-examples
- Cloud Monitoring dashboards `gcloud` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Cloud Monitoring AlertPolicy REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies

## Issues Found
- Replaced the invalid `gcloud services quotas list` command with the current `gcloud beta quotas info list` command documented for Cloud Quotas quota information.
- Corrected the claim that both quota types are universally monitorable through Cloud Monitoring; Google documents that not all services expose quota metrics.
- Corrected "all services" wording for `gcloud compute project-info describe`, because that command reports Compute Engine project quota information, not every Google Cloud service.
- Replaced BSD-only `date -v-*` examples with GNU `date -d` syntax that works in Google Cloud Shell and typical Linux environments.
- Removed nonexistent `metric.labels.service` and `metric.labels.method` usage from `serviceruntime.googleapis.com/api/request_count` examples and used documented labels such as `response_code` with `resource.labels.service`.
- Corrected quota usage wording: `serviceruntime.googleapis.com/quota/allocation/usage` is an absolute `INT64` usage metric, not a 0-to-1 utilization ratio.
- Added `resource.type="consumer_quota"` filters to Service Runtime quota metric examples to match the documented monitored resource.
- Replaced invalid `gcloud monitoring policies create --condition-threshold-*` flags with current `--if`, `--duration`, and `--aggregation` flags where appropriate.
- Replaced the allocation quota 80% alert with a PromQL alert policy that divides `quota/allocation/usage` by `quota/limit`, matching Google's documented ratio-based quota alert pattern.
- Replaced the 429-based quota exceeded alert with the documented `serviceruntime.googleapis.com/quota/exceeded` metric.
- Fixed the dashboard error filter from invalid `response_code>=monitoring.regex.full_match(...)` syntax to a valid `response_code_class = one_of("4xx", "5xx")` filter.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/tutorial post.
- `gcloud` was not installed in the local environment, so CLI behavior was verified against official Google Cloud documentation rather than local `--help` output.
- The edited JSON snippets were checked with `jq` for JSON syntax validity.
