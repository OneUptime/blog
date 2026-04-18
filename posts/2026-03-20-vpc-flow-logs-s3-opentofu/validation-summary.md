# Validation Summary: How to Configure VPC Flow Logs to S3 with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC Flow Logs
- Amazon S3 (bucket policy, SSE, lifecycle, public access block)
- AWS Glue Data Catalog
- Amazon Athena
- Apache Parquet / Hive-compatible partitions

## Sources Consulted
- AWS VPC User Guide — Publishing flow logs to S3: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html
- AWS Athena User Guide — Query VPC flow logs in Parquet (Hive-compatible hourly partitions): https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html
- Terraform AWS provider — `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS provider — `aws_glue_catalog_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_catalog_table
- Terraform AWS provider — `aws_s3_bucket_lifecycle_configuration`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_policy`

## Issues Found
1. **Glue catalog table `location` and `partition_keys` were inconsistent with `hive_compatible_partitions = true`.**
   - The original `storage_descriptor.location` pointed to `s3://<bucket>/AWSLogs/<account-id>/vpcflowlogs/<region>/`, which is the **non–Hive-compatible** path layout. With `hive_compatible_partitions = true`, AWS writes objects under `s3://<bucket>/AWSLogs/aws-account-id=.../aws-service=vpcflowlogs/aws-region=.../year=.../month=.../day=.../hour=.../`.
   - Changed `location` to `s3://${aws_s3_bucket.flow_logs.id}/AWSLogs/` (the partition values live in the path, not the table prefix).
   - Replaced the partition keys (`region`, `year`, `month`, `day`) with the correct Hive-compatible keys per AWS docs: `aws-account-id`, `aws-service`, `aws-region`, `year`, `month`, `day`, `hour`. The `hour` key is required because `per_hour_partition = true` is set on the flow log.

## Review Notes
- The `aws_flow_log` resource is correct: `log_destination` receives the bucket ARN, `log_destination_type = "s3"`, and `destination_options` supports `file_format`, `hive_compatible_partitions`, and `per_hour_partition` as shown.
- The `$${field}` escaping inside `log_format` is correct — HCL treats `$${` as a literal `${`, so the flow-log service receives the unescaped `${field}` tokens it expects.
- The bucket policy uses the correct `delivery.logs.amazonaws.com` service principal and the `s3:x-amz-acl = "bucket-owner-full-control"` condition. Tightening it further with `aws:SourceAccount` / `aws:SourceArn` conditions (the current AWS-recommended template) would harden against confused-deputy scenarios but is not strictly required for the policy to work.
- The Glue table shows only a subset of columns ("Key columns for analysis"). For production use, the column list should match every field in the custom `log_format` (with hyphens converted to underscores in Parquet), but the example is explicitly labeled as partial and is acceptable as shown.
- `aws_s3_bucket_server_side_encryption_configuration` with `AES256` is compatible with `delivery.logs.amazonaws.com`. If switched to SSE-KMS, an additional `kms:GenerateDataKey` grant to the logs service would be required.
- Since April 2023, new S3 buckets default to `BucketOwnerEnforced` ownership with ACLs disabled. The `bucket-owner-full-control` ACL condition is still accepted by the flow logs service and is the documented AWS example, so no change is needed; readers using older regions/buckets with ACLs enabled will also remain compatible.
