# Validation Summary: How to Handle Multi-Account Cost Tracking with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp configuration language)
- AWS provider (hashicorp/aws): `aws_budgets_budget`, `aws_cur_report_definition`, `aws_athena_named_query`, `aws_glue_catalog_database`, `aws_ce_anomaly_monitor`, `aws_ce_anomaly_subscription`, `aws_cloudwatch_dashboard`, `aws_s3_bucket`, `aws_sns_topic`
- AzureRM provider (hashicorp/azurerm): `azurerm_consumption_budget_management_group`, `azurerm_consumption_budget_subscription`, `azurerm_management_group`
- Google provider (hashicorp/google): `google_billing_budget`, `google_billing_account` (data), `google_monitoring_notification_channel`
- AWS Organizations, AWS Cost and Usage Report (CUR), AWS Cost Explorer Anomaly Detection
- Azure Management Groups, Azure Consumption Budgets
- GCP Billing Budgets
- Amazon Athena (for CUR querying)

## Sources Consulted
- Terraform AWS provider docs:
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_monitor
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_subscription
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform AzureRM provider docs:
  - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_management_group
  - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_subscription
- Terraform Google provider docs:
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- AWS CUR API reference (PutReportDefinition) for valid format/compression value combinations
- AWS Budgets documentation for valid `cost_filter` dimension names (LinkedAccount)

## Issues Found
No technical issues found.

Notes on verification:
- `aws_cur_report_definition` with `format = "Parquet"` paired with `compression = "Parquet"` is correct — per the AWS CUR API, Parquet format requires Parquet compression (only `textORcsv` format may use `GZIP` or `ZIP`).
- `report_versioning = "OVERWRITE_REPORT"` is one of the two valid values (the other being `CREATE_NEW_REPORT`).
- `aws_ce_anomaly_subscription` uses the current `threshold_expression` block (with nested `dimension` block specifying `key`, `values`, `match_options`), which is the replacement for the deprecated `threshold` argument.
- `cost_filter` (singular block form with `name` and `values`) on `aws_budgets_budget` is valid; "LinkedAccount" is a valid filter dimension.
- CUR column names (`line_item_usage_account_id`, `line_item_usage_start_date`, `line_item_unblended_cost`, `product_product_name`) and partition columns (`year`, `month`) used in the Athena queries match the standard CUR Parquet schema.
- The CloudWatch dashboard metric dimension array `["AWS/Billing", "EstimatedCharges", "LinkedAccount", <id>, "Currency", "USD"]` matches the AWS Billing namespace dimension order.

## Review Notes
- For automated Athena integration of CUR data (table creation, partition management via crawler), `additional_artifacts = ["ATHENA"]` is typically added to `aws_cur_report_definition`. The post omits this — the resource is still valid, but readers integrating with Athena via the AWS-managed CloudFormation stack would likely want to add it. Not a technical error.
- The AWS Billing `EstimatedCharges` metric is only published in `us-east-1` and requires billing alerts to be enabled in account preferences; the post correctly sets `region = "us-east-1"` in the dashboard widget.
- The Athena queries hardcode `year = '2026' AND month = '02'`; in production, parameterizing these would be preferable, but the example is illustrative and not technically wrong.
- The `azurerm_consumption_budget_management_group` example references `azurerm_management_group.root.id` and `var.subscription_budgets` without defining them inline; this is fine for an illustrative snippet.
