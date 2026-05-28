# Validation Summary: How to Create a Multi-Project Monitoring Dashboard Using Metrics Scopes in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Metrics scopes
- Google Cloud CLI
- Cloud Monitoring API
- Cloud Monitoring dashboards
- Monitoring Query Language (MQL)
- Google Cloud IAM

## Sources Consulted
- Google Cloud Monitoring metrics scopes overview: https://docs.cloud.google.com/monitoring/settings
- Configure a metrics scope by using the API: https://docs.cloud.google.com/monitoring/settings/manage-api
- Metrics scopes REST create method: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/locations.global.metricsScopes.projects/create
- Cloud Monitoring dashboards API guide: https://docs.cloud.google.com/monitoring/dashboards/api-dashboard
- Cloud Monitoring dashboards REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- gcloud monitoring dashboards create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- gcloud beta monitoring metrics-scopes reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/monitoring/metrics-scopes
- Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Cloud Monitoring IAM access control: https://docs.cloud.google.com/monitoring/access-control
- Cloud Monitoring quotas and limits: https://cloud.google.com/monitoring/quotas
- Cloud Monitoring filters: https://docs.cloud.google.com/monitoring/api/v3/filters
- Cloud Load Balancing metrics documentation: https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics

## Issues Found
- The post described `gcloud beta monitoring metrics-scopes list --project=scoping-project-id` as listing projects in a metrics scope. That command lists metrics scopes that include a monitored project. I changed the example to use `gcloud beta monitoring metrics-scopes describe locations/global/metricsScopes/scoping-project-id`, whose output includes `monitoredProjects`.
- The REST example used only project-number placeholders. The API accepts project IDs or numbers, so I updated the placeholders to `SCOPING_PROJECT_ID_OR_NUMBER` and `MONITORED_PROJECT_ID_OR_NUMBER` to match the official API and gcloud documentation.
- The dashboard JSON grouped by `project`, which is not the correct aggregation field for preserving project identity in Cloud Monitoring filters. I changed the grouping to `resource.label.project_id` and added explicit `resource.type` filters for the Compute Engine metrics.
- The MQL examples used `value.utilization` and `value.request_count`. I changed these to `val()`, matching current MQL examples and avoiding metric-value-column ambiguity.
- The post did not mention the current MQL limitation. I added a note that, as of July 22, 2025, new MQL charts, dashboards, and alerting policies can no longer be created from the Cloud Console, although existing assets continue to work and MQL remains available through the Cloud Monitoring API.
- The IAM section incorrectly said `roles/monitoring.viewer` must be granted on each monitored project and referenced a Cloud Monitoring notification service agent for reading metrics. I revised this to match Google Cloud IAM guidance: viewers need Monitoring Viewer on the scoping project, and principals modifying a metrics scope need Monitoring Admin or Monitoring Metrics Scopes Admin on the scoping project and projects being added or removed.
- The quota section said a metrics scope can include up to 375 monitored projects. Current docs say Cloud Monitoring officially supports 375 projects per metrics scope and only guarantees performant queries/charts up to that limit, while more can be added. I updated the wording.

## Review Notes
The Google Cloud CLI for metrics scopes remains in beta/pre-GA. The post now reflects that by keeping the `gcloud beta monitoring metrics-scopes` commands and noting the MQL console limitation for new dashboards.
