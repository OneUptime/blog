# Validation Summary: How to Use Kinesis Firehose Data Transformation with Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Data Firehose
- AWS Lambda
- Amazon S3
- Amazon DynamoDB
- Amazon CloudWatch
- AWS CLI
- Python 3.12

## Sources Consulted
- AWS Data Firehose data transformation documentation: https://docs.aws.amazon.com/firehose/latest/dev/data-transformation.html
- AWS Data Firehose required parameters for Lambda transformation: https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-status-model.html
- AWS Data Firehose transformation failure handling: https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-failure-handling.html
- AWS CLI create-delivery-stream command reference: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- AWS Lambda CreateFunction API reference: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Data Firehose CloudWatch metrics documentation: https://docs.aws.amazon.com/firehose/latest/dev/monitoring-with-cloudwatch-metrics.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The first Lambda example used `datetime.utcnow()` while the deployment command specifies Python 3.12. Python 3.12 deprecates `utcnow()`, so it was replaced with `datetime.now(timezone.utc)`.
- The first Lambda example description said it enriched records with geo information, but the code enriches records with processing metadata and event categories. The description was corrected to match the code.
- Sample AWS ARNs used a 9-digit account ID. AWS account IDs in IAM, Lambda, and SNS ARNs are 12 digits, so the examples were updated to use `123456789012`.
- The Lambda payload constraint said Firehose sends up to 6 MB per Lambda invocation. AWS documents a 6 MB synchronous Lambda request and response payload limit, while Firehose's Lambda buffer size hint ranges from 0.2 MB to 3 MB. The wording was corrected to distinguish those limits.

## Review Notes
- The Firehose Lambda transformation response statuses, required `recordId`, `result`, and base64-encoded `data` fields are accurate for Direct PUT and Kinesis Data Streams sources.
- The Firehose processor parameter names in the CLI example, including `LambdaArn`, `BufferSizeInMBs`, `BufferIntervalInSeconds`, and `NumberOfRetries`, match the AWS CLI documentation.
- The `@lru_cache` DynamoDB example is technically valid, but the cache is per Lambda execution environment and does not persist across cold starts or all concurrent execution environments.
