# Validation Summary: How to Set Up AWS Cost and Usage Reports (CUR)

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- AWS Cost and Usage Reports
- AWS CLI
- Amazon S3 bucket policies and lifecycle configuration
- Amazon Athena integration for CUR
- Terraform AWS provider
- Amazon QuickSight

## Sources Consulted
- AWS CLI Command Reference: `aws cur put-report-definition` - https://docs.aws.amazon.com/cli/latest/reference/cur/put-report-definition.html
- AWS Billing and Cost Management User Guide: Setting up an Amazon S3 bucket for Cost and Usage Reports - https://docs.aws.amazon.com/cur/latest/userguide/cur-s3.html
- AWS Billing and Cost Management User Guide: Querying Cost and Usage Reports using Amazon Athena - https://docs.aws.amazon.com/cur/latest/userguide/cur-query-athena.html
- AWS Billing and Cost Management User Guide: Understanding your report versions - https://docs.aws.amazon.com/cur/latest/userguide/understanding-report-versions.html
- AWS Billing and Cost Management User Guide: Creating Cost and Usage Reports - https://docs.aws.amazon.com/cur/latest/userguide/cur-create.html
- AWS Billing and Cost Management User Guide: Line item details - https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html
- AWS Billing and Cost Management User Guide: Running Amazon Athena queries - https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html
- Terraform Registry: `aws_cur_report_definition` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
- Terraform Registry: `aws_s3_bucket_lifecycle_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- The opening description said every API call and every data transfer byte is accounted for. AWS CUR provides line items for cost and usage combinations, not a literal audit log of every API call or byte. Changed this to describe chargeable API requests, data transfer usage, and EC2 hours as reported line items.
- The AWS CLI `put-report-definition` example did not explicitly target `us-east-1`. The CUR API is currently available through `us-east-1`, so the command now includes `--region us-east-1`.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}`.
- The Terraform example did not set the provider region even though the CUR service endpoint must be `us-east-1`. Added a `provider "aws"` block with `region = "us-east-1"`.
- The Terraform bucket policy omitted the `aws:SourceArn` condition included in AWS's documented default CUR bucket policy. Added it to both statements.
- The Terraform lifecycle configuration applied to the whole bucket, while the CLI lifecycle example filtered to `cur/`. Added a `filter` block with `prefix = "cur/"` for consistency.
- The report structure example implied the report is always split into multiple numbered `.snappy.parquet` files. AWS's documented Athena CUR examples use `.parquet`, and large reports may be split. Updated the example and wording accordingly.

## Review Notes
AWS documentation now recommends Data Exports for CUR 2.0 as the newer way to receive detailed cost and usage data, while the legacy CUR API and Terraform `aws_cur_report_definition` resource used in this guide remain documented and valid.
