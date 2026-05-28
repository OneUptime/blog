# Validation Summary: How to Exclude Noisy Kubernetes System Logs from Cloud Logging Ingestion

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Cloud Logging
- Cloud Logging Logs Explorer and Log Analytics
- Google Cloud CLI
- Cloud Monitoring metrics and MQL
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK documentation for `gcloud logging sinks update`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- GKE documentation for available logs and `--logging` values: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- GKE documentation for viewing GKE logs and resource types: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/view-logs
- GKE logging troubleshooting documentation for required `SYSTEM` logging: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/logging
- Cloud Logging Log Analytics documentation and sample SQL queries: https://docs.cloud.google.com/logging/docs/analyze/query-and-view and https://docs.cloud.google.com/logging/docs/analyze/examples
- Cloud Logging sample query library for Kubernetes log filters: https://cloud.google.com/logging/docs/view/query-library
- Cloud Logging monitored log metrics documentation for `logging.googleapis.com/billing/bytes_ingested`: https://cloud.google.com/logging/docs/alerting/monitoring-logs
- Cloud Monitoring MQL deprecation guidance: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Observability pricing documentation: https://cloud.google.com/stackdriver/pricing
- Terraform Registry documentation for `google_logging_project_exclusion`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_exclusion

## Issues Found
- The Log Analytics SQL query used direct `resource.labels.namespace_name` and `resource.labels.container_name` access. Log Analytics stores `resource.labels` as JSON, so label subfields should be extracted with `JSON_VALUE`. Updated the SELECT and WHERE clauses accordingly.
- The GKE system namespace examples included `gke-managed-system`, which is not one of the system namespaces listed in the GKE logging documentation. Replaced it with `gke-system` and included `istio-system` in the broad exclusion example.
- The Cloud Monitoring dashboard query grouped `logging.googleapis.com/billing/bytes_ingested` by `resource.labels.log`, but that metric exposes `resource_type` as a metric label. Updated the MQL grouping to `metric.resource_type`.
- The dashboard section implied creating a new dashboard from MQL in the Cloud Console. MQL is no longer recommended and new MQL charts can't be saved from the Console, so the text now scopes the query to existing MQL dashboards or dashboards created through the Cloud Monitoring API.
- The ingestion metric verification command used `gcloud logging metrics list`, which lists logs-based metrics, not Cloud Monitoring metric descriptors. Replaced it with `gcloud monitoring metrics-descriptors list` filtered to `logging.googleapis.com/billing/bytes_ingested`.
- The GKE log collection section said `--logging=WORKLOAD` collects workload logs without system logs. GKE requires `SYSTEM` whenever Cloud Logging is enabled; `WORKLOAD` cannot be collected on its own. Rewrote that section to use `NONE` for disabling all logging on Standard clusters and `SYSTEM,WORKLOAD,API_SERVER` for a valid combined configuration.

## Review Notes
The MQL example remains useful for existing MQL assets and API-managed dashboards. A future update could show the same dashboard using the current Metrics Explorer or PromQL-style workflow.
