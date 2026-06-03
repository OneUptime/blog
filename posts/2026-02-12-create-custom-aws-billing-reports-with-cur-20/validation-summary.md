# Validation Summary: How to Create Custom AWS Billing Reports with CUR 2.0

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Data Exports
- Cost and Usage Report 2.0
- AWS CLI
- Amazon S3 bucket policies
- Amazon Athena
- AWS Lambda
- boto3
- SQL

## Sources Consulted
- AWS CLI Command Reference: bcm-data-exports create-export: https://docs.aws.amazon.com/cli/latest/reference/bcm-data-exports/create-export.html
- AWS Data Exports User Guide: What is AWS Data Exports?: https://docs.aws.amazon.com/cur/latest/userguide/what-is-data-exports.html
- AWS Data Exports User Guide: Data query-SQL query and table configurations: https://docs.aws.amazon.com/cur/latest/userguide/dataexports-data-query.html
- AWS Data Exports User Guide: Cost and Usage Report (CUR) 2.0 table dictionary: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html
- AWS Data Exports User Guide: Bill columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-bill.html
- AWS Data Exports User Guide: Line item columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html
- AWS Data Exports User Guide: Product columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-product.html
- AWS Data Exports User Guide: Pricing columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-pricing.html
- AWS Data Exports User Guide: Resource tags columns: https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-resource-tags.html
- AWS Data Exports User Guide: Setting up an Amazon S3 bucket for data exports: https://docs.aws.amazon.com/cur/latest/userguide/dataexports-s3-bucket.html
- AWS Data Exports User Guide: Understanding export delivery: https://docs.aws.amazon.com/cur/latest/userguide/dataexports-export-delivery.html
- AWS Data Exports User Guide: Processing data exports: https://docs.aws.amazon.com/cur/latest/userguide/dataexports-processing.html

## Issues Found
- The post claimed Parquet is the default. AWS Data Exports lets users choose output format and compression, so this was changed to Parquet support when Parquet output is selected.
- The post claimed Data Exports automatically creates and maintains an Athena table. AWS documentation says Athena integration delivers setup files such as a CloudFormation template and create-table SQL, so the wording was corrected.
- The CLI example selected `product_product_name` and `product_region` directly from `COST_AND_USAGE_REPORT`. CUR 2.0 exposes many legacy product attributes through the `product` map, so the query now selects `product.product_name AS product_product_name` and `product.region AS product_region`.
- The CLI example used `OutputType` `CUSTOM` while describing Athena integration. It now uses `ATHENA`, which is a valid `S3OutputConfigurations.OutputType`.
- The S3 bucket policy omitted the documented `aws:SourceArn` condition and included permissions/resources that do not match the AWS Data Exports sample policy. The policy was corrected to grant `s3:PutObject` on bucket objects with both `aws:SourceArn` and `aws:SourceAccount` conditions.
- The guide created the export before noting that the CLI flow requires the bucket and policy to exist. A sentence was added to clarify that Step 2 must be completed before running the CLI command.
- The manual Athena table used string types for timestamp columns and for `resource_tags`. These were corrected to `TIMESTAMP` and `MAP<STRING, STRING>` based on the CUR 2.0 table dictionary.
- The manual Athena location pointed at the export prefix root instead of the delivered data path. It was corrected to the documented `<prefix>/<export-name>/data/BILLING_PERIOD=YYYY-MM/` layout.
- The Athena queries compared timestamp columns to string literals. These comparisons were changed to Athena timestamp literals.
- The Lambda Athena query compared a timestamp column to `current_date`. It now uses `date_add('day', -7, current_timestamp)` for a timestamp-to-timestamp comparison.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against official AWS CLI documentation rather than local `aws --help` output. The manual Athena table remains intentionally simplified for one billing period; AWS recommends using the generated SQL or Glue crawler workflow for loading partitions over time.
