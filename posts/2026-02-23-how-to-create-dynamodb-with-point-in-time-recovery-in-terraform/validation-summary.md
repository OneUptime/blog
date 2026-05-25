# Validation Summary: How to Create DynamoDB with Point-in-Time Recovery in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon DynamoDB
- DynamoDB point-in-time recovery
- AWS Backup
- AWS CLI

## Sources Consulted
- Amazon DynamoDB Developer Guide: Point-in-time backups for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Amazon DynamoDB API Reference: RestoreTableToPointInTime - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_RestoreTableToPointInTime.html
- AWS CLI Command Reference: dynamodb restore-table-to-point-in-time - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/restore-table-to-point-in-time.html
- AWS Prescriptive Guidance: Backup and recovery for DynamoDB - https://docs.aws.amazon.com/prescriptive-guidance/latest/backup-recovery/dynamodb.html
- AWS DynamoDB pricing documentation - https://aws.amazon.com/dynamodb/pricing/
- Terraform Registry: aws_dynamodb_table resource, HashiCorp AWS provider 5.x/latest documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform Registry: aws_dynamodb_table data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/dynamodb_table

## Issues Found
- The post described PITR as always covering the last 35 days. Updated wording to reflect current DynamoDB behavior: PITR defaults to 35 days but can be configured from 1 to 35 days.
- The Terraform examples enabled PITR but did not show the currently supported `recovery_period_in_days` argument. Added it where PITR is configured and noted that omitting it keeps the default 35-day period.
- The restore section said PITR restore is done through the AWS CLI or console rather than Terraform. Updated it to explain that Terraform can create a restored table using `restore_source_name` and `restore_date_time`.
- The cost section said tables with lots of data churn can increase PITR storage costs. Updated this because AWS bills PITR based on table size, including table data and local secondary indexes, and reducing the recovery period does not reduce PITR cost.

## Review Notes
Terraform is not installed in the workspace, so local `terraform validate` could not be run. The HCL snippets were reviewed against the official Terraform AWS provider documentation and AWS DynamoDB documentation.
