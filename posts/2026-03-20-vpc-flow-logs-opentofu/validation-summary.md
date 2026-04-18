# Validation Summary: How to Configure VPC Flow Logs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC Flow Logs
- AWS IAM (roles and policies)
- AWS CloudWatch Logs
- AWS S3 (bucket, lifecycle, bucket policy)
- AWS Glue Data Catalog
- AWS Athena (partition projection, Parquet)

## Sources Consulted
- HashiCorp AWS provider docs: `aws_flow_log` resource (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log)
- HashiCorp AWS provider docs: `aws_s3_bucket_lifecycle_configuration`
- HashiCorp AWS provider docs: `aws_glue_catalog_table`
- AWS docs: VPC Flow Logs publishing to CloudWatch Logs and S3 (service principals, log record formats, file format options)
- AWS docs: Athena partition projection (`projection.*` table parameters)

## Issues Found
No technical issues found.

Verified specifically:
- `aws_flow_log` `traffic_type` accepts `ALL`, `ACCEPT`, `REJECT`.
- `log_format` correctly uses `$${field}` Terraform escaping; all fields listed (`version`, `account-id`, `interface-id`, `srcaddr`, `dstaddr`, `srcport`, `dstport`, `protocol`, `packets`, `bytes`, `start`, `end`, `action`, `log-status`, `vpc-id`, `subnet-id`, `instance-id`, `tcp-flags`, `type`, `pkt-srcaddr`, `pkt-dstaddr`) are valid AWS-defined fields.
- `destination_options` arguments (`file_format`, `hive_compatible_partitions`, `per_hour_partition`) match the provider schema.
- IAM trust principal `vpc-flow-logs.amazonaws.com` is correct for the CloudWatch role.
- S3 bucket policy uses `delivery.logs.amazonaws.com` (correct service principal for VPC Flow Logs S3 delivery) with the correct `AWSLogs/${account_id}/*` path pattern.
- Glue table `parameters` map correctly holds Athena partition-projection keys; `storage_descriptor` and `columns` syntax matches the provider schema.

## Review Notes
- The `aws_s3_bucket_lifecycle_configuration` rule omits a `filter` block. This is permitted by the provider, but newer AWS provider releases (v5+) may emit a recommendation to add an explicit `filter {}` for clarity. Not a correctness issue.
- The example references `data.aws_caller_identity.current` without showing the data source declaration. Implicit but standard practice for Terraform examples.
- `GLACIER` storage class is valid (S3 Glacier Flexible Retrieval). Authors using this in 2026 may want to consider `GLACIER_IR` for occasional-access workloads or `DEEP_ARCHIVE` for lower-cost long-term retention; the current choice is technically correct.
- When `log_destination_type = "s3"`, omitting `iam_role_arn` is correct — delivery is authorized via the bucket policy, as the post does.
