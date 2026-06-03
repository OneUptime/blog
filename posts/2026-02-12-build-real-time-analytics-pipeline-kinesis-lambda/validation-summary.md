# Validation Summary: How to Build a Real-Time Analytics Pipeline with Kinesis and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Kinesis Data Streams
- AWS Lambda
- AWS Lambda event source mappings
- Amazon DynamoDB
- Amazon SNS
- Amazon Data Firehose
- Amazon S3
- AWS Glue Data Catalog
- Amazon Athena
- Amazon CloudWatch
- Amazon Managed Service for Apache Flink
- Python and boto3
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `aws kinesis create-stream` - https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- AWS CLI Command Reference: `aws lambda create-event-source-mapping` - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS Lambda Developer Guide: Configuring partial batch response with Kinesis Data Streams and Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html
- AWS Lambda Developer Guide: Lambda parameters for Amazon Kinesis Data Streams event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- Amazon Data Firehose Developer Guide: Convert input data format in Amazon Data Firehose - https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html
- AWS CLI Command Reference: `aws firehose create-delivery-stream` - https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Kinesis Data Streams pricing - https://aws.amazon.com/kinesis/data-streams/pricing/
- Amazon Managed Service for Apache Flink Developer Guide - https://docs.aws.amazon.com/managed-flink/latest/java/what-is.html

## Issues Found
- The introduction and conclusion said the stack "costs nothing" when idle. Kinesis Data Streams can still have stream-hour or shard-hour charges, so the wording was changed to describe lower compute/request costs while noting ongoing Kinesis charges.
- The architecture diagram used the older "Kinesis Analytics" label. It was updated to "Managed Service for Apache Flink" to match the current AWS service naming.
- The producer's batch helper said it would retry failed records but only printed a warning. It now retries failed `put_records` entries once and reports any records that still fail.
- The Lambda processor caught per-record exceptions but always returned an empty `batchItemFailures` list, which tells Lambda the batch succeeded. It now returns failed Kinesis sequence numbers using the `ReportBatchItemFailures` response shape.
- The explanation of `ReportBatchItemFailures` said only individual failed records are retried. For Kinesis, Lambda checkpoints at the failed sequence number and retries from there, so the wording was corrected.
- The `bisect-batch-on-function-error` explanation was clarified to apply when the function returns an error.
- The Firehose example combined Parquet serializer compression with a top-level `CompressionFormat: GZIP`. The top-level compression setting was removed so the example relies on the Parquet `SNAPPY` serializer compression.
- The CloudWatch examples used BSD/macOS `date -v-1H`, which is not portable for common Linux shells used with AWS CLI examples. They now use GNU `date -d '1 hour ago'`.
- An unused `time` import was removed from the Python producer example.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI documentation instead of local `aws --help` output.
- The Lambda deployment command assumes `lambda.zip` has already been built and that the IAM roles and S3 bucket exist. This is acceptable for the post's scope but could be expanded in a future tutorial.
