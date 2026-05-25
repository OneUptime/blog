# Validation Summary: How to Create Cost Reports Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Cost and Usage Reports
- Amazon S3
- Amazon Athena
- AWS Glue
- Azure Cost Management exports
- Google Cloud Billing export to BigQuery
- Amazon QuickSight
- AWS Lambda
- Amazon EventBridge

## Sources Consulted
- AWS Cost and Usage Reports S3 bucket policy documentation: https://docs.aws.amazon.com/cur/latest/userguide/cur-s3.html
- AWS Cost and Usage Reports creation documentation: https://docs.aws.amazon.com/cur/latest/userguide/cur-create.html
- AWS CUR Athena documentation: https://docs.aws.amazon.com/cur/latest/userguide/cur-query-athena.html
- AWS EventBridge schedule expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Terraform AWS provider `aws_cur_report_definition` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cur_report_definition.html.markdown
- Terraform AWS provider `aws_quicksight_data_source` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/quicksight_data_source.html.markdown
- Terraform AzureRM provider `azurerm_subscription_cost_management_export` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/subscription_cost_management_export.html.markdown
- Terraform Google provider `google_bigquery_table` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigquery_table.html.markdown
- Google Cloud Billing export setup documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud Billing BigQuery table documentation: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables

## Issues Found
- The AWS CUR S3 bucket policy omitted the documented `aws:SourceArn` and `aws:SourceAccount` conditions. Added `data.aws_caller_identity.current` and both conditions to the `GetBucketAcl`/`GetBucketPolicy` and `PutObject` statements so the policy matches AWS's current guidance.
- The Glue crawler S3 IAM policy granted `s3:PutObject` but did not grant `s3:ListBucket`. Replaced that with `s3:GetObject` on objects and `s3:ListBucket` on the bucket, which is the access needed for a crawler to read and enumerate CUR objects.
- The BigQuery view used `LEFT JOIN UNNEST(credits)` and then `SUM(cost)`, which can multiply cost values for billing rows with multiple credits. Replaced it with a scalar subquery that sums credits per billing row before grouping.
- The QuickSight section described the Terraform resource as a dashboard, but the snippet only creates an `aws_quicksight_data_source`. Updated the heading and introductory sentence to call it a data source.

## Review Notes
- Several snippets intentionally reference surrounding resources or data sources that are not fully shown, such as Lambda packaging, IAM roles, resource groups, and random suffixes. That is acceptable for a focused blog post, but a future end-to-end example should include those prerequisites.
- EventBridge scheduled rules are now documented by AWS as a legacy scheduling feature, with EventBridge Scheduler recommended for new scheduling use cases. The existing `aws_cloudwatch_event_rule` example remains syntactically valid.
