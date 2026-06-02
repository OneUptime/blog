# Validation Summary: How to Import Data from S3 to DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- Amazon S3
- AWS CLI
- AWS Lambda
- Boto3 for Python
- AWS Step Functions
- AWS Glue
- Apache Spark / PySpark
- CloudWatch

## Sources Consulted
- Amazon DynamoDB Developer Guide: DynamoDB data import from Amazon S3: how it works - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataImport.HowItWorks.html
- Amazon DynamoDB Developer Guide: Amazon S3 import formats for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataImport.Format.html
- AWS CLI Command Reference: dynamodb import-table - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/import-table.html
- AWS Lambda Developer Guide: Tutorial using an Amazon S3 trigger with Python - https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- Amazon S3 User Guide: Event message structure - https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- AWS Lambda Developer Guide: Configure Lambda function timeout - https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Boto3 documentation: Amazon DynamoDB batch writing - https://docs.aws.amazon.com/boto3/latest/guide/dynamodb.html
- Boto3 documentation: DynamoDB BatchWriteItem - https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/service-resource/batch_write_item.html
- AWS Glue Developer Guide: DynamoDB connections - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-connect-dynamodb-home.html
- AWS Glue Developer Guide: GlueContext class - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- Amazon DynamoDB Developer Guide: On-demand capacity mode and throttling behavior - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html

## Issues Found
- The description mentioned AWS Data Pipeline, but the post covers AWS Glue instead. Changed the description to name AWS Glue.
- The native DynamoDB import section listed "standard JSON" as a supported format. AWS documents the supported formats as CSV, DynamoDB JSON, and Amazon Ion, so the text now says DynamoDB JSON, Amazon Ion, or CSV.
- The AWS CLI `--input-format-options` example used `Delimiter` and `HeaderList` at the top level. The CLI expects CSV options under `Csv`, and specifying `HeaderList` would make DynamoDB treat the first CSV line as data. Updated the command to use `{"Csv": {"Delimiter": ","}}`, matching the sample file with a header row.
- The Lambda S3 event example used the object key directly. S3 event object keys are URL encoded, so the example now decodes the key with `urllib.parse.unquote_plus`.
- The byte-range Lambda example could split newline-delimited JSON records and attempt to parse partial lines. Updated the text and code so the handler processes complete lines, returns the next byte boundary, and raises a clear error when a record is too large for the configured read-ahead window.
- The on-demand billing tip said switching to on-demand "avoids throttling." On-demand tables can still throttle under quotas or configured maximum throughput, so the wording now says it can reduce capacity planning and throttling risk.
- The compression section did not mention that compressed native imports need the import compression type set. Added a note to use `--input-compression-type GZIP` for gzip-compressed files.

## Review Notes
The Glue example uses the documented DynamoDB sink option `dynamodb.output.tableName`. The snippet leaves throughput tuning and IAM setup implicit, which is acceptable for a high-level guide but should be expanded in a production walkthrough.
