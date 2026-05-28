# Validation Summary: How to Migrate Amazon CloudWatch Dashboards

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon CloudWatch dashboards and alarms
- Google Cloud Monitoring dashboards, alert policies, notification channels, metrics, and filters
- Terraform Google provider resources
- Python and boto3
- PromQL and Cloud Monitoring forecasted alert policies

## Sources Consulted
- AWS boto3 CloudWatch `ListDashboards` paginator: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/paginator/ListDashboards.html
- AWS boto3 CloudWatch `DescribeAlarms` paginator: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/paginator/DescribeAlarms.html
- Google Cloud Monitoring metrics list: https://docs.cloud.google.com/monitoring/api/metrics
- Google Cloud metrics for Cloud SQL, Compute Engine, and Cloud Functions: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud metrics for Cloud Load Balancing: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring alert policy API and forecast options: https://docs.cloud.google.com/monitoring/alerts/policies-in-api
- Google Cloud Monitoring notification channels API: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Terraform Google provider `google_monitoring_alert_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Terraform Google provider `google_monitoring_dashboard`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard
- Terraform Google provider `google_monitoring_notification_channel`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel

## Issues Found
- The concept mapping incorrectly treated `resource.type` as the metric type and mapped dimensions only to metric labels. Updated the mapping to distinguish metric type prefixes, monitored resource types, metric labels, and resource labels.
- The post recommended MQL for metric math and anomaly detection even though Google no longer recommends MQL for new Cloud Monitoring workflows. Updated the mapping to PromQL or Cloud Monitoring filters, and to forecasted metric-value alert policies.
- The dashboard export used `list_dashboards()` without pagination. Updated it to use the official boto3 `list_dashboards` paginator.
- The alarm export only handled simple metric alarms and could fail or omit data for metric-math, percentile, and composite alarms. Updated it to preserve metric-math and composite alarms as unsupported export records, and to export `ExtendedStatistic` for percentile alarms.
- Several metric mappings would have generated incorrect alert filters or misleading threshold conversions. Removed mappings without a direct equivalent and added per-metric resource overrides or label filters where needed.
- The generated Terraform alert policy omitted the required `combiner` field. Added `combiner = "OR"`.
- The generated Terraform alert policy did not safely escape display names and condition names. Added a helper that emits Terraform string literals with JSON escaping.
- The conversion script wrote to `terraform/alert_policies.tf` without creating the directory. Added directory creation before writing.
- The PagerDuty notification channel placed `service_key` in `labels`; Terraform models it as a sensitive label. Updated the snippet to use `sensitive_labels`.

## Review Notes
The migration examples are best treated as a starting point. Thresholds often need manual adjustment because AWS and Google Cloud metrics can differ in unit, sampling period, aggregation semantics, and required labels even when the metric names appear equivalent.
