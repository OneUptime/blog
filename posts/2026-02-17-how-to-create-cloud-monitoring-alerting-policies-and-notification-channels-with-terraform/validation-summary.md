# Validation Summary: How to Create Cloud Monitoring Alerting Policies and Notification Channels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Terraform Google provider
- Monitoring alerting policies
- Monitoring notification channels
- Cloud Run metrics
- Cloud SQL metrics
- Compute Engine and Ops Agent metrics
- Uptime checks

## Sources Consulted
- Google Cloud Monitoring: Create alerting policies with Terraform: https://docs.cloud.google.com/monitoring/alerts/terraform
- Terraform Google provider: google_monitoring_alert_policy resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Terraform Google provider: google_monitoring_notification_channel resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel
- Terraform Google provider: google_monitoring_uptime_check_config resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_uptime_check_config
- Google Cloud Monitoring filters: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud Monitoring notification channels by API: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud Monitoring notification options: https://docs.cloud.google.com/monitoring/support/notification-options
- Google Cloud Run metrics list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud SQL for PostgreSQL metrics: https://docs.cloud.google.com/sql/docs/postgres/admin-api/metrics
- Google Cloud uptime-check alerting policies: https://docs.cloud.google.com/monitoring/uptime-checks/uptime-alerting-policies
- Google Cloud uptime-check charts and metrics: https://docs.cloud.google.com/monitoring/charts/uptime-charts

## Issues Found
- PagerDuty notification channel used `service_key` in `labels`. The Terraform Google provider exposes PagerDuty `service_key` as a sensitive label, so the example now uses a `sensitive_labels` block.
- Token-auth webhook channel used a `webhook_tokenauth` type without an authentication token in the endpoint URL. Google Cloud's webhook token-auth documentation requires a query-string token, so the example URL now includes `auth_token=${var.webhook_auth_token}`.
- Cloud SQL connection alert used `cloudsql.googleapis.com/database/network/connections`, which is not the documented PostgreSQL connection metric. The example now uses `cloudsql.googleapis.com/database/postgresql/num_backends`.
- Cloud SQL connection threshold comment claimed a default PostgreSQL limit of 200. Cloud SQL connection limits vary by instance and configuration, so the comment now tells readers to adjust the threshold for their `max_connections` setting.
- Cloud Run error alert claimed a 5% error rate but only filtered 5xx requests and compared their per-second rate to `5`. The example now uses a ratio condition with `denominator_filter`, matching 5xx requests over total requests with a `0.05` threshold.

## Review Notes
The examples are syntactically consistent with the Terraform provider documentation, but Terraform is not installed in this environment, so I could not run `terraform validate`. The snippets still assume supporting variables such as `project_id`, `slack_auth_token`, `pagerduty_service_key`, and `webhook_auth_token` are declared elsewhere.
