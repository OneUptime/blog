# Validation Summary: How to Create VPC Flow Logs to S3 with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS provider (~> 5.0)
- AWS VPC Flow Logs
- Amazon S3 (versioning, encryption, lifecycle, public access block, bucket policy)
- Amazon Athena (workgroup, database, named queries, partition projection)
- Parquet file format
- Hive-compatible partitions
- AWS IAM (bucket policy for cross-account log delivery)

## Sources Consulted
- AWS VPC Flow Logs to S3 documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html
- Hive-compatible S3 prefixes for VPC Flow Logs: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html#flow-logs-s3-path
- Terraform AWS provider `aws_flow_log` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` docs
- Terraform AWS provider `aws_athena_workgroup`, `aws_athena_database`, `aws_athena_named_query` docs
- Athena partition projection documentation: https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- AWS VPC Flow Logs available fields (v5): https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html#flow-logs-fields

## Issues Found
- **`storage.location.template` did not match Hive-compatible S3 path format.** When `hive_compatible_partitions = true` is set in `destination_options`, VPC Flow Logs writes to paths like `AWSLogs/aws-account-id=XXX/aws-service=vpcflowlogs/aws-region=us-east-1/year=YYYY/month=MM/day=DD/hour=HH/`. The post's original template only had bare values (`AWSLogs/$${aws-account-id}/$${aws-service}/...`) without the `key=value` prefixes, which would cause Athena partition projection to look in non-existent S3 locations and queries would return zero rows. Updated the template to include the `aws-account-id=`, `aws-service=`, `aws-region=`, `year=`, `month=`, `day=`, `hour=` prefixes so the synthesized partition locations match the actual Hive-style flow log paths.

## Review Notes
- The basic `aws_flow_log "vpc_to_s3"` resource does not set a custom `log_format`. When `file_format = "parquet"` is used, the default Parquet schema includes all v5 fields, so the Athena `CREATE EXTERNAL TABLE` (which expects v5 columns) is consistent with both the basic example and the custom-format example.
- `'skip.header.line.count'='1'` is unnecessary for `STORED AS PARQUET` tables (Parquet is binary and self-describing). It is harmless — Athena ignores the property for non-text formats — so I left it.
- `data.aws_caller_identity.current` is referenced inside the named-query heredoc before its declaration block (declared at line 304 in the original). Terraform resolves references by graph dependencies regardless of file order, so this works correctly.
- The cross-account bucket policy follows the current AWS-published template (allowing `delivery.logs.amazonaws.com` with `aws:SourceAccount` and `s3:x-amz-acl=bucket-owner-full-control`). Note: if the central bucket uses Object Ownership = BucketOwnerEnforced (ACLs disabled), the `s3:x-amz-acl` condition becomes inert; modern setups may also want to add an `aws:SourceArn` condition for confused-deputy protection. This was not changed since it is not strictly incorrect.
- `aws_s3_bucket_lifecycle_configuration` rules do not include explicit `filter` blocks. Recent AWS provider versions emit a warning when a rule has no filter/prefix; the rule still applies but to all objects. This is a non-blocking style issue, not a correctness error, so I did not modify it.
- The `aws_athena_named_query.workgroup = aws_athena_workgroup.flow_logs.id` works because the workgroup's `id` is its name (the named query attribute accepts the workgroup name).
- `max_aggregation_interval = 60` is valid (allowed values are 60 and 600).
- The Athena partition projection hardcodes `us-east-1` and the current account; for a multi-region or multi-account central bucket the projection enums would need to be widened accordingly. This is fine for the single-region example shown.
