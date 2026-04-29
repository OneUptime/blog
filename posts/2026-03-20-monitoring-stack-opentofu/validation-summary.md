# Validation Summary: How to Build a Monitoring Stack with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Terraform AWS Provider (hashicorp/aws)
- Amazon CloudWatch (Log Groups, Log Metric Filters, Metric Alarms, Dashboards)
- Amazon Managed Service for Prometheus (AMP)
- Amazon Managed Grafana
- Amazon SNS (Simple Notification Service)
- AWS IAM (IRSA — IAM Roles for Service Accounts on EKS)
- Application Load Balancer (referenced via `aws_lb.app.arn_suffix`)

## Sources Consulted
- Terraform AWS Provider docs — `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider docs — `aws_cloudwatch_log_metric_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider docs — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider docs — `aws_cloudwatch_dashboard`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AWS Provider docs — `aws_prometheus_workspace`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/prometheus_workspace
- Terraform AWS Provider docs — `aws_grafana_workspace`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_workspace
- Terraform AWS Provider docs — `aws_grafana_workspace_api_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_workspace_api_key
- Terraform AWS Provider docs — `aws_sns_topic` / `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- AWS docs — CloudWatch Dashboard Body Structure: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- AWS docs — CloudWatch Logs Filter Pattern Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS docs — Amazon Managed Service for Prometheus logging configuration: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-logging.html
- AWS docs — IAM Roles for Service Accounts (IRSA) on EKS: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
No technical issues found. Specifically verified:
- `aws_cloudwatch_log_metric_filter.metric_transformation.unit` is a valid optional argument.
- The CloudWatch Logs filter pattern syntax `[timestamp, level="ERROR", ...]` is a valid space-delimited unstructured-log pattern.
- `treat_missing_data = "notBreaching"` is one of the four valid values (`missing`, `ignore`, `breaching`, `notBreaching`).
- Dashboard widget JSON structure is correct: metric widgets use the positional `[namespace, metric_name, dim_key, dim_value]` array format, and the `alarm` widget type with `properties.alarms` (array of alarm ARNs) is a valid widget kind.
- AMP `logging_configuration.log_group_arn` requires the trailing `:*` suffix on the CloudWatch Logs ARN — correctly included.
- `aws_grafana_workspace.data_sources` values (`AMAZON_OPENSEARCH_SERVICE`, `CLOUDWATCH`, `PROMETHEUS`) are all valid enum entries.
- `aws_grafana_workspace_api_key.seconds_to_live = 3600` falls within the allowed range (1 to 2,592,000 seconds / 30 days).
- IRSA assume-role trust policy structure (federated principal + `StringEquals` on `:sub`) is correct.

## Review Notes
- Amazon Managed Grafana (Grafana 9.4+) deprecated API keys in favor of **service accounts** and service account tokens. The `aws_grafana_workspace_api_key` resource still works and is not removed, but for new workspaces the recommended pattern is `aws_grafana_workspace_service_account` + `aws_grafana_workspace_service_account_token`. Worth considering for a future revision.
- The IRSA trust policy currently asserts only the `:sub` condition. A defense-in-depth best practice is to also assert `"${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"` in the `StringEquals` block. Not strictly required, but recommended by AWS.
- The `aws_cloudwatch_metric_alarm` uses `period = 60` (1-minute granularity). This requires the underlying metric to be published at 1-minute resolution; CloudWatch Log Metric Filters publish metrics at 1-minute resolution by default, so this is consistent.
- The post references `aws_lb.app` and `module.eks` without showing those resources/modules — this is fine for a focused tutorial, but readers will need to provide them in their own root module.
