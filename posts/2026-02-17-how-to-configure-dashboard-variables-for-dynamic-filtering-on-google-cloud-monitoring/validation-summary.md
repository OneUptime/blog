# Validation Summary: How to Configure Dashboard Variables for Dynamic Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring dashboards
- Cloud Monitoring Dashboard API
- Dashboard filters and variables
- Monitoring Query Language (MQL)
- Terraform Google provider
- Python Google Cloud Monitoring Dashboards client
- Cloud Run metrics

## Sources Consulted
- Google Cloud Monitoring: Create and manage variables and pinned filters: https://docs.cloud.google.com/monitoring/dashboards/filter-permanent
- Google Cloud Monitoring: Create and manage dashboards by API: https://docs.cloud.google.com/monitoring/dashboards/api-dashboard
- Google Cloud Monitoring REST API: DashboardFilter schema: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Run monitoring documentation: https://docs.cloud.google.com/run/docs/monitoring
- Google Cloud metrics list for run.googleapis.com metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Terraform Google provider google_monitoring_dashboard resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard
- Google Cloud Python Monitoring Dashboards client reference: https://cloud.google.com/python/docs/reference/monitoring-dashboards/latest/google.cloud.monitoring_dashboard_v1.services.dashboards_service.DashboardsServiceClient

## Issues Found
- Dashboard filter `labelKey` values incorrectly used fully qualified strings like `resource.label.service_name` and `metric.label.response_code_class`. Changed them to bare label keys like `service_name`, `location`, and `response_code_class`, with `filterType` identifying the label namespace.
- Query-based variables were described as metric-query based. Updated the wording because Cloud Monitoring value-only query variables use Cloud Monitoring SQL / Ops Analytics queries for possible values.
- Variable behavior was described as automatically filtering every matching chart. Clarified that variables apply to widgets whose query references the variable or has been updated through the console's Apply to charts flow.
- MQL examples compared labels directly to quoted `${variable}` placeholders. Changed them to use label-based variable filter expressions such as `| filter ${service_name}`.
- Added the current MQL caveat: as of July 22, 2025, new MQL charts and dashboards can't be created in the Google Cloud console, but existing MQL assets continue to work and new MQL dashboards can still be created through the API.
- The Terraform MQL heredocs used `${service}`, which Terraform would interpret as a Terraform interpolation. Changed these to `$${service}` so the Cloud Monitoring variable placeholder is preserved.
- The multi-select example used a comma-delimited `stringValue`. Changed it to `valueType: STRING_ARRAY` with `stringArrayValue.values`.
- The variable chaining section claimed Cloud Monitoring automatically narrows dependent variable menus. Reworded it to explain that label-based variables aren't automatically chained and that both filters should be referenced by the affected queries.
- The "Error Rate (%)" chart only returned 5xx request rate, not a percentage. Renamed it to "5xx Request Rate" and fixed the final aggregation expression to call `aggregate(val())`.
- Removed an unused Python import and added missing newlines in the MQL string literal for readability and correctness.

## Review Notes
MQL remains usable through the Cloud Monitoring API, but Google recommends PromQL or the interactive query builder for new dashboards and alerting workflows.
