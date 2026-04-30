# Validation Summary: How to Configure GKE Logging and Monitoring with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL / Google provider resources
- Google Kubernetes Engine (GKE)
- Cloud Logging
- Cloud Monitoring
- Google Cloud Managed Service for Prometheus

## Sources Consulted
- HashiCorp Google provider docs for `google_container_cluster`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/container_cluster.html.markdown
- HashiCorp Google provider docs for `google_logging_metric`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/logging_metric.html.markdown
- HashiCorp Google provider docs for `google_monitoring_alert_policy`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/monitoring_alert_policy.html.markdown
- HashiCorp Google provider docs for `google_monitoring_notification_channel`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/monitoring_notification_channel.html.markdown
- HashiCorp Google provider docs for `google_monitoring_dashboard`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/monitoring_dashboard.html.markdown
- GKE REST reference for cluster logging and monitoring config: https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.locations.clusters
- About GKE logs: https://cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- Configure metrics collection in GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics
- Managed Service for Prometheus managed collection setup: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- Cloud Logging log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics
- Cloud Monitoring filters: https://cloud.google.com/monitoring/api/v3/filters
- Cloud Monitoring aggregation and aligners: https://cloud.google.com/monitoring/api/v3/aggregation

## Issues Found
- The `logging_config` example only enabled `SYSTEM_COMPONENTS` and `WORKLOADS`, but the inline explanation implied that API server, scheduler, and controller-manager logs were also included. I added `APISERVER`, `SCHEDULER`, and `CONTROLLER_MANAGER` so the code matches the behavior described by current GKE logging docs.
- The log-based metric and alert were framed as application error counting, but the metric filter matched all `k8s_container` logs and the alert used `ALIGN_RATE`, which converts a count into a per-second rate. I renamed the metric to container errors, updated the alert filter, and changed the aggregation to `ALIGN_DELTA` over a 300-second window so the threshold matches the stated count-based alert behavior.
- The dashboard widget title said `Pod Count` while the metric being queried was `kubernetes.io/container/cpu/request_cores`, and the Monitoring filter omitted the explicit `AND` operator used by Monitoring filter syntax. I renamed the widget to match the metric, added `plotType = "LINE"` for clarity, and corrected the filter expression.
- The summary implied that enabling managed Prometheus alone handles workload metric collection. I updated the summary and inline comment to reflect that managed collection still requires `PodMonitoring` or `ClusterPodMonitoring` resources for scrape targets.

## Review Notes
- Managed Service for Prometheus managed collection requires GKE version `1.21.4-gke.300` or newer according to Google Cloud's setup documentation.
- The post's `logging_service` and `monitoring_service` settings are still supported, but the granular component selection is controlled by `logging_config` and `monitoring_config`.
