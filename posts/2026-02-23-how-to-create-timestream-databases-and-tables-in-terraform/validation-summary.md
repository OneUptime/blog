# Validation Summary: How to Create Timestream Databases and Tables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Timestream (timestreamwrite database/table)
- AWS KMS
- AWS S3
- AWS IAM (policies and roles)
- AWS SNS
- AWS CloudWatch metric alarms
- AWS VPC interface endpoints / security groups

## Sources Consulted
- Terraform AWS provider documentation for `aws_timestreamwrite_database` and `aws_timestreamwrite_table` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/timestreamwrite_table)
- AWS Timestream developer guide — scheduled queries and IAM (https://docs.aws.amazon.com/timestream/latest/developerguide/scheduled-queries.create-iam-role.html)
- AWS Timestream actions reference for IAM (`timestream:WriteRecords`, `timestream:Select`, `timestream:SelectValues`, `timestream:DescribeEndpoints`, `timestream:DescribeTable`, `timestream:ListMeasures`, `timestream:CancelQuery`)
- AWS VPC interface endpoints for Timestream (cell-based service names format)
- AWS CloudWatch metrics for Timestream (`AWS/Timestream` namespace, `SystemErrors` metric, dimensions `DatabaseName`, `TableName`, `Operation`)

## Issues Found
No technical issues found.

The Terraform schema in the post matches the current AWS provider:
- `retention_properties` block with `memory_store_retention_period_in_hours` (1–8766) and `magnetic_store_retention_period_in_days` (1–73000) — valid.
- `magnetic_store_write_properties` → `magnetic_store_rejected_data_location` → `s3_configuration` nesting and the `encryption_option = "SSE_S3"` value are correct.
- `aws_timestreamwrite_database` accepts `kms_key_id` as the customer-managed key ARN.
- IAM action names used in both the write and read policies are valid Timestream actions.
- CloudWatch alarm uses the correct namespace, metric, and dimensions.

## Review Notes
- The VPC endpoint service names hard-code `cell1` (`com.amazonaws.us-east-1.timestream.ingest-cell1` and `...query-cell1`). AWS Timestream uses a cell-based architecture where the cell number is assigned per account. Readers should run `aws timestream-write describe-endpoints` / `aws timestream-query describe-endpoints` to discover the cell assigned to their account before using these service names verbatim. The syntax shown is valid; the cell number is just account-specific.
- The "Creating Scheduled Queries" section creates the destination table, IAM role, and SNS topic that would back a scheduled query, but does not create an `aws_timestreamquery_scheduled_query` resource (which is available in the AWS provider). The section title is slightly broader than the resources actually shown, but everything that is shown is technically correct.
- The IAM trust policy for scheduled queries uses `timestream.amazonaws.com` as the service principal, which is the principal commonly shown in AWS examples for scheduled-query service roles.
