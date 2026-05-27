# Validation Summary: How to Use Grafana with Google Cloud Monitoring as a Data Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Google Cloud Monitoring
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- GKE Workload Identity Federation
- Kubernetes service accounts
- Monitoring Query Language (MQL)
- PromQL

## Sources Consulted
- Grafana Google Cloud Monitoring data source documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/
- Grafana Google Cloud Monitoring configuration documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/configure/
- Grafana Google Cloud Monitoring query editor documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/query-editor/
- Grafana Google Cloud Monitoring template variables documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/google-cloud-monitoring/template-variables/
- Grafana Google Cloud Monitoring alerting documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/google-cloud-monitoring/alerting/
- Google Cloud GKE Workload Identity Federation guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK `gcloud iam service-accounts keys create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK `gcloud projects add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud Monitoring MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring metric and resource documentation: https://cloud.google.com/monitoring/api/metrics_gcp_c, https://cloud.google.com/monitoring/api/metrics_gcp_p_z, https://cloud.google.com/monitoring/api/metrics_kubernetes, https://cloud.google.com/monitoring/api/resources
- Google Cloud Observability pricing documentation: https://cloud.google.com/products/observability/pricing
- Google Cloud Monitoring quotas and limits documentation: https://cloud.google.com/monitoring/quotas
- Grafana Enterprise features documentation: https://grafana.com/docs/grafana/latest/introduction/grafana-enterprise/

## Issues Found
- The prerequisites omitted required Google APIs. Added that the Cloud Monitoring API and Cloud Resource Manager API must be enabled before Grafana can query Cloud Monitoring.
- The Grafana UI navigation and authentication field names were outdated. Updated the path to **Connections** > **Add new connection**, added the **Add new data source** step, and changed "Service Account Key" to the current "Google JWT File" / "JWT token" terminology.
- The post presented MQL as the primary advanced-query path without mentioning its current status. Added a note that MQL is still supported in Grafana, but Google no longer recommends it for new Cloud Monitoring queries and recommends PromQL for new work.
- The template variable query type was inaccurate for current Grafana docs. Changed "Metric Labels" to "Labels Values" for returning instance label values.
- The performance section described Cloud Monitoring as charging for API calls in a way that no longer matches current pricing. Updated it to explain that current read API costs are based on returned time series after the free monthly allotment, and that broad/high-resolution queries also affect latency and quota usage.
- The caching guidance implied data source caching is universally available. Clarified that Grafana data source query caching is a Grafana Enterprise or Grafana Cloud feature.

## Review Notes
The `gcloud` commands, IAM role, Workload Identity binding and annotation pattern, Grafana save/test message, alerting support, and referenced Compute Engine, Cloud SQL, and GKE metric type strings were consistent with official documentation. The MQL examples were left in place because Grafana still supports MQL, but new dashboards should prefer PromQL where possible.
