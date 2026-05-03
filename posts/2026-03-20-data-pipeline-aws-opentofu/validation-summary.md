# Validation Summary: How to Build a Data Pipeline Architecture with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Kinesis Data Streams
- AWS Kinesis Data Firehose
- AWS Lambda (event source mapping)
- AWS S3 (data lake with lifecycle and versioning)
- AWS KMS (encryption)
- AWS Glue (catalog database, crawler, ETL job)
- AWS Athena (workgroup)
- Apache Parquet (columnar format)
- AWS SQS (DLQ)

## Sources Consulted
- Terraform AWS Provider docs — `aws_kinesis_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- Terraform AWS Provider docs — `aws_kinesis_firehose_delivery_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- Terraform AWS Provider docs — `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider docs — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider docs — `aws_glue_crawler`, `aws_glue_job`, `aws_glue_catalog_database`
- Terraform AWS Provider docs — `aws_athena_workgroup`
- AWS Kinesis Data Streams limits documentation (1 MB/s write, 2 MB/s read per shard)
- AWS Glue Special Parameters documentation (`--enable-job-bookmarks`, `--enable-continuous-cloudwatch-log`, `--TempDir`)
- AWS Glue version compatibility (Glue 4.0 with Spark 3.3 / Python 3.10)
- AWS EventBridge / Glue cron expression syntax (6-field with `?` placeholder)

## Issues Found
No technical issues found.

## Review Notes
- All AWS provider resource arguments shown are valid for the current (5.x/6.x) Terraform AWS provider. The post correctly uses the current `buffering_size` / `buffering_interval` attribute names (renamed from the now-deprecated `buffer_size` / `buffer_interval` in earlier provider versions).
- The Kinesis shard capacity comment (1 MB/s write, 2 MB/s read per shard ⇒ 4 shards = 4/8 MB/s) is accurate per AWS service limits.
- `parallelization_factor = 4` is within the AWS-allowed 1–10 range.
- `bytes_scanned_cutoff_per_query = 10 * 1024 * 1024 * 1024` (10 GiB) is above the 10 MB minimum and correctly enforced via the Athena workgroup configuration.
- The post references several resources that aren't defined inline (e.g., `aws_kms_key.kinesis`, `aws_iam_role.firehose`, `aws_iam_role.glue`, `aws_lambda_function.stream_processor`, `aws_sqs_queue.dlq`, `aws_glue_catalog_table.events`, `aws_s3_bucket.scripts`). This is acceptable for an illustrative tutorial showing partial config, but readers should be aware they need to define those resources (and supporting IAM trust/permissions policies) for the configuration to apply cleanly.
- Glue 4.0 is correctly referenced (released late 2022, Spark 3.3, Python 3.10). Glue 5.0 was released later (2024+) and could be considered for future updates, but Glue 4.0 remains supported.
- The `cron(0 1 * * ? *)` schedule uses AWS's required 6-field cron syntax with `?` to disambiguate day-of-month and day-of-week — correct.
