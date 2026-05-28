# Validation Summary: How to Build Unified Observability Dashboards Combining All Four Golden Signals

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Monitoring
- Monitoring Query Language (MQL)
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- Google Cloud CLI (`gcloud`)
- Google Cloud Load Balancing metrics
- Google Kubernetes Engine (GKE) system metrics
- Cloud Run metrics
- Site Reliability Engineering golden signals

## Sources Consulted
- Google SRE Book, "Monitoring Distributed Systems": https://sre.google/sre-book/monitoring-distributed-systems/
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Load Balancing metrics: https://docs.cloud.google.com/load-balancing/docs/metrics
- Google Cloud Run metrics list (`run.googleapis.com`): https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#run
- Google Cloud GKE system metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud Monitoring dashboard API examples: https://docs.cloud.google.com/monitoring/dashboards/api-examples
- Google Cloud Monitoring dashboard API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud CLI `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Google Cloud Monitoring aggregation docs: https://docs.cloud.google.com/monitoring/api/v3/aggregation

## Issues Found
- MQL status was outdated. Google no longer recommends MQL for new Cloud Monitoring work, and new MQL charts and alerts are no longer created from the Google Cloud console. Added a note explaining that the examples still work through the Cloud Monitoring API and `gcloud`.
- Several request-rate examples used `group_by ..., rate(val())`. Google Cloud Monitoring examples and aggregation docs use the rate aligner for converting delta or cumulative metrics into rates. Updated traffic and restart-rate queries to use `align rate(...)`, followed by `every` and `group_by ... sum(val())`.
- The dashboard JSON contained request-rate chart queries using the same incorrect rate pattern. Updated the dashboard JSON queries and verified the embedded JSON parses successfully.
- The final paragraph described MQL as broadly straightforward for building current dashboards. Updated it to clarify that MQL can still be used through the API and `gcloud`.

## Review Notes
MQL-based assets continue to work, but Google recommends PromQL or the interactive query builder for new Cloud Monitoring workflows. A future update could add PromQL equivalents for the examples.
