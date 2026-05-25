# Validation Summary: How to Build a Data Lake Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS S3
- AWS KMS
- AWS Glue Data Catalog
- AWS Glue ETL Jobs
- Amazon Athena
- Amazon Data Firehose / Kinesis Firehose Terraform resource
- AWS Lake Formation

## Sources Consulted
- Terraform AWS Provider `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS Provider `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider `aws_glue_catalog_database` and `aws_glue_catalog_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_catalog_table
- Terraform AWS Provider `aws_glue_job` and `aws_glue_trigger`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_job
- Terraform AWS Provider `aws_athena_workgroup`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup
- Terraform AWS Provider `aws_kinesis_firehose_delivery_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- AWS Data Firehose custom S3 prefixes: https://docs.aws.amazon.com/firehose/latest/dev/s3-prefixes.html
- Terraform AWS Provider `aws_lakeformation_data_lake_settings` and `aws_lakeformation_permissions`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lakeformation_permissions
- AWS Lake Formation permissions reference: https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html

## Issues Found
- The S3 lifecycle rules omitted an explicit `filter {}` block. Current Terraform AWS Provider documentation allows rules without a filter or prefix, but recommends `filter {}` for rules that apply to all objects and notes prefix-only behavior is deprecated. Added `filter {}` to both lifecycle rules.
- The Firehose `error_output_prefix` used timestamp expressions but did not include `!{firehose:error-output-type}`. AWS Data Firehose requires at least one `!{firehose:error-output-type}` expression when `ErrorOutputPrefix` contains expressions. Added it to the error prefix.
- The Glue ETL job command did not explicitly set the command name. The provider examples for Spark ETL jobs use `name = "glueetl"`, so the snippet now sets it explicitly.

## Review Notes
- Several snippets reference supporting resources that are not shown, such as KMS keys, script/result buckets, and IAM roles or policies. That is acceptable for a blog-length architecture example, but a production module would need complete IAM permissions for S3, KMS, Glue, Athena, Firehose, and Lake Formation operations.
- Firehose is now branded by AWS as Amazon Data Firehose, but the Terraform resource name remains `aws_kinesis_firehose_delivery_stream`.
