# Validation Summary: How to Create VPC Flow Logs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS VPC Flow Logs
- Amazon CloudWatch Logs
- Amazon S3
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch metric filters and alarms
- Amazon Athena

## Sources Consulted
- AWS VPC User Guide: IAM role for publishing flow logs to CloudWatch Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- AWS VPC User Guide: Publish flow logs to Amazon S3 - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3.html
- AWS VPC User Guide: Amazon S3 bucket permissions for flow logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3-permissions.html
- AWS VPC User Guide: Required key policy for use with SSE-KMS - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3-cmk-policy.html
- AWS VPC User Guide: Flow log files - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-s3-path.html
- AWS VPC User Guide: Flow log records - https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon CloudWatch Logs User Guide: Filter pattern syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon Athena User Guide: Query Amazon VPC flow logs - https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs.html
- Amazon Athena User Guide: Create tables for flow logs in Apache Parquet format - https://docs.aws.amazon.com/athena/latest/ug/vpc-flow-logs-parquet.html
- Terraform AWS Provider documentation: aws_flow_log - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS Provider documentation: aws_athena_database - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_database
- Terraform AWS Provider documentation: aws_athena_named_query - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query

## Issues Found
- The S3 encryption example used `sse_algorithm = "aws:kms"` without configuring a customer managed KMS key ARN or the key policy required for VPC Flow Logs delivery. Changed the example to use SSE-S3 (`AES256`), which AWS documents as requiring no additional key policy configuration.
- The S3 destination example did not explicitly grant the log delivery service permission to write objects and check the bucket ACL. Added an `aws_s3_bucket_policy` using the documented `delivery.logs.amazonaws.com` service principal, `s3:PutObject`, `s3:GetBucketAcl`, `aws:SourceAccount`, `aws:SourceArn`, and the Hive-compatible S3 prefix.
- The Athena section claimed to set up a database and table, but only created an Athena database and named queries. Added saved named queries for the external Parquet table DDL and `MSCK REPAIR TABLE`.
- The Athena example queries referenced a `vpc_flow_logs` table and a `date` column that did not match the Hive-compatible hourly Parquet layout configured earlier. Updated the queries to use `vpc_flow_logs_parquet` and the `year`, `month`, and `day` partitions.

## Review Notes
The Terraform examples are still snippets, so they depend on caller-provided variables and resources such as `var.account_id`, `aws_vpc.main`, `aws_s3_bucket.athena_results`, and notification topics. The Athena named queries save SQL in Athena; operators still need to run the table creation and partition repair queries before the analysis queries return data.
