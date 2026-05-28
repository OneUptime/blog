# Validation Summary: How to Build Custom Dashboards Using Monitoring Query Language on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Monitoring Query Language (MQL)
- Cloud Monitoring Dashboards API
- Google Cloud CLI (`gcloud`)
- Terraform Google provider

## Sources Consulted
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring Query Language reference: https://docs.cloud.google.com/monitoring/mql/reference
- Google Cloud sample MQL queries: https://docs.cloud.google.com/monitoring/mql/examples
- Cloud Monitoring Dashboards API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud metric list for App Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud metric list for Compute Engine metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Ops Agent metrics: https://cloud.google.com/monitoring/api/metrics_opsagent
- Cloud Load Balancing metrics: https://docs.cloud.google.com/load-balancing/docs/metrics
- Monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Terraform `google_monitoring_dashboard` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard

## Issues Found
- The post described MQL as an active choice for production dashboards without mentioning its current status. Google no longer recommends MQL for new Cloud Monitoring work, support for writing MQL ended on July 22, 2025, and new MQL dashboards can no longer be created in the Google Cloud console. Updated the introduction and MQL description to include this caveat while preserving the API-based dashboard workflow.
- Several MQL examples used `resource.` and `metric.` label prefixes inside `group_by` and `filter` expressions where the official MQL examples use label columns directly, such as `zone`, `module_id`, `response_code`, `instance_id`, `device_name`, and `url_map_name`. Updated the snippets to use documented MQL label-column syntax.
- The "Disk usage above 90%" alert example queried `compute.googleapis.com/instance/disk/write_bytes_count`, which measures bytes written, not disk usage percentage. Updated the comment to describe the query accurately as disk writes above 1 GB per 5-minute alignment period.

## Review Notes
The `gcloud monitoring dashboards create --config-from-file=dashboard.json` command and the dashboard `timeSeriesQueryLanguage` field are current according to official Google Cloud documentation. The Terraform resource uses the documented `dashboard_json` argument. The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
