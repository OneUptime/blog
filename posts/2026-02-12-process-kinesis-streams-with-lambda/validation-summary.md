# Validation Summary: How to Process Kinesis Streams with Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon Kinesis Data Streams
- AWS CLI
- Python
- DynamoDB
- CloudWatch metrics
- Kinesis Producer Library aggregated records

## Sources Consulted
- AWS Lambda: Using Lambda to process records from Amazon Kinesis Data Streams: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda: Lambda parameters for Amazon Kinesis Data Streams event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Lambda: Configuring partial batch response with Kinesis Data Streams and Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html
- AWS Lambda: Implementing stateful Kinesis Data Streams processing in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-windows.html
- Amazon Kinesis Data Streams: Process serialized data using AWS Lambda with the Amazon Kinesis Producer Library: https://docs.aws.amazon.com/streams/latest/dev/kinesis-record-deaggregation.html
- PyPI aws-kinesis-agg package documentation: https://pypi.org/project/aws-kinesis-agg/
- AWS Lambda API Reference: CreateEventSourceMapping: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda: Viewing metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html

## Issues Found
- The example ARNs used a 9-digit account ID. Changed them to 12-digit example account IDs so the Kinesis stream ARN and SQS destination ARN match AWS ARN account ID format.
- The `starting-position` explanation omitted `AT_TIMESTAMP`, which is valid for Kinesis event source mappings. Added it to the option list.
- The batch size explanation said only "up to 10,000" records. Added the 6 MB synchronous invocation payload limit caveat from AWS Lambda event source mapping documentation.
- The first Python handler used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with `datetime.now(timezone.utc).isoformat()`.
- The partial batch response section said Lambda retries only the specific records returned. For Kinesis streams, AWS documents that Lambda checkpoints at the lowest failed sequence number and retries from that record onward, so the wording was corrected.
- The parallelization factor section said batches may be processed out of order when parallelization is greater than 1. AWS documents that Lambda still ensures in-order processing at the partition-key level, so the wording was corrected to that behavior.
- The KPL deaggregation example attempted `json.loads(record['kinesis']['data'])` directly. The `aws-kinesis-agg` documentation shows deaggregated Lambda records still contain base64-encoded data, so the example now decodes before JSON parsing.
- The CloudWatch metric command used BSD/macOS `date -v-1H` syntax without saying so. Replaced it with GNU `date -d '1 hour ago'` syntax and explicit UTC `Z` timestamps.
- The maximum record age pitfall said Lambda retries old records "forever." Corrected this to say retries continue until the records expire from the stream when no maximum record age is set.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI flags were checked against official AWS CLI/API documentation instead of local `aws --help` output. The monitoring command now assumes GNU `date`; a future improvement could make that example explicitly platform-specific or use fixed timestamp placeholders.
