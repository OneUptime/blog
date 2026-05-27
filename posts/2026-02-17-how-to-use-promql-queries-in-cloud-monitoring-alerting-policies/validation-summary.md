# Validation Summary: How to Use PromQL Queries in Cloud Monitoring Alerting Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- PromQL
- Google Cloud CLI
- Cloud Monitoring API
- Google Cloud Managed Service for Prometheus
- Terraform Google provider

## Sources Consulted
- Google Cloud Monitoring: Create PromQL-based alerting policies in the console: https://docs.cloud.google.com/monitoring/promql/create-promql-alerts-console
- Google Cloud Monitoring: Create PromQL-based alerting policies by API: https://cloud.google.com/monitoring/promql/create-promql-alerts
- Google Cloud Monitoring: PromQL for Cloud Monitoring and metric-name mapping: https://cloud.google.com/monitoring/promql/promql-mapping
- Google Cloud Monitoring: PromQL code editor: https://docs.cloud.google.com/monitoring/promql/promql-in-monitoring
- Google Cloud Monitoring API: projects.location.prometheus.api.v1.query: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.location.prometheus.api.v1/query
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud metrics: Compute Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud metrics: Ops Agent metrics: https://cloud.google.com/monitoring/api/metrics_opsagent
- Google Cloud metrics: GKE system metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud IAM roles for Monitoring: https://cloud.google.com/iam/docs/roles-permissions/monitoring
- Terraform Google provider: google_monitoring_alert_policy resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The console workflow said to click **Select a metric** and switch to a **PromQL** tab. Current Cloud Monitoring documentation uses **Policy configuration mode** and **Code editor (MQL or PromQL)** for PromQL-based alerting policies, so the steps were updated.
- The CLI example used `gcloud alpha monitoring policies create`. The GA `gcloud monitoring policies create --policy-from-file=...` command supports this workflow, so the command was updated to the current GA form.
- The JSON alerting policy included `alertStrategy.autoClose`. Google Cloud documents that PromQL-based incidents don't follow the alerting policy autoclose duration, so the field was removed from the example to avoid implying it controls PromQL alert closure.
- The memory example used nonexistent Compute Engine metric names, `compute_googleapis_com:instance_memory_available` and `compute_googleapis_com:instance_memory_total`. It was changed to the documented Ops Agent / Monitoring agent metric `agent_googleapis_com:memory_percent_used{state="free"} < 20`.
- The disk example used nonexistent `compute_googleapis_com:instance_disk_utilization`. It was changed to the documented Ops Agent disk metric `agent_googleapis_com:disk_percent_used{state="used"} > 90`.
- The aggregation example described request counts but queried network received bytes. The comment and query were corrected to describe received network bytes and use `rate(...)` for the cumulative byte counter.
- The Cloud Monitoring PromQL query API example used `POST` with a request body. The official API reference documents `GET` and an empty request body with `query` as a query parameter, so the `curl` example was updated to use `curl -G --data-urlencode`.

## Review Notes
The post is technically relevant and valid after the corrections. Some PromQL examples assume that the referenced metrics already exist in the Google Cloud project; this is consistent with Cloud Monitoring's documented validation behavior for PromQL alerting policies.
