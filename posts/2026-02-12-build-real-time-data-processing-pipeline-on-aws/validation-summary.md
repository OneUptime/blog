# Validation Summary: How to Build a Real-Time Data Processing Pipeline on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon DynamoDB
- Amazon SNS
- Amazon CloudWatch
- AWS CLI
- AWS SDK for JavaScript v3
- Boto3
- Serverless Framework
- Node.js
- Python

## Sources Consulted
- AWS CLI Command Reference: `kinesis create-stream` - https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- Amazon Kinesis Data Streams quotas and limits - https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams `PutRecords` API Reference - https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- AWS SDK for JavaScript v3 Kinesis examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_kinesis_code_examples.html
- AWS Lambda tutorial for Kinesis Data Streams event payloads - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html
- AWS Lambda Kinesis event source mapping permissions - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-create.html
- Amazon Kinesis Data Streams service authorization reference - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkinesisdatastreams.html
- AWS Lambda partial batch response for Kinesis Data Streams - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html
- Serverless Framework stream event documentation - https://www.serverless.com/framework/docs/providers/aws/events/streams
- Amazon Kinesis Data Streams CloudWatch metrics - https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- AWS CLI Command Reference: `cloudwatch get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS announcement: Amazon Data Firehose formerly known as Amazon Kinesis Data Firehose - https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/

## Issues Found
- The architecture diagram and explanation included a Firehose-to-S3 archival path that was not implemented anywhere in the Lambda code or Serverless configuration. Removed the Firehose/S3 path from the diagram and description so the architecture matches the tutorial's actual implementation.
- The Python producer used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with `datetime.now(timezone.utc)` and preserved the ISO timestamp format ending in `Z`.
- The transform Lambda caught per-record errors and returned a normal result object. For a Kinesis event source, that would checkpoint the batch as successful and drop failed records. Updated the handler to return `batchItemFailures` with failed Kinesis sequence numbers.
- The Serverless stream event did not enable `ReportBatchItemFailures`, so Lambda would ignore partial batch failure responses. Added `functionResponseType: ReportBatchItemFailures` to the transform stream event.
- The Serverless IAM example did not explicitly grant the Lambda execution role the Kinesis read permissions required by Lambda event source mappings. Added the documented Kinesis read actions for the stream.
- The CloudWatch monitoring command used BSD/macOS `date -v-1H`, which fails on common Linux environments. Replaced it with GNU `date -d '1 hour ago'` and explicit UTC `Z` timestamps.

## Review Notes
- Kinesis shard throughput claims, `PutRecords` batch size, partition key behavior, Kinesis Lambda event decoding, DynamoDB table definitions, SNS publishing, and CloudWatch metric names were checked against official documentation and are technically correct after the edits above.
- The producer retry logic is still intentionally shown as a placeholder. A production implementation should add bounded exponential backoff and inspect individual `PutRecords` error codes.
