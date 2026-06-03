# Validation Summary: How to Build a Log Aggregation System on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch Logs
- Amazon Data Firehose / Kinesis Data Firehose
- AWS Lambda
- Amazon S3
- Amazon OpenSearch Service
- OpenSearch Dashboards and Index State Management
- Amazon Athena
- Amazon API Gateway
- Fluent Bit
- Amazon SNS
- AWS CLI
- JavaScript / Node.js

## Sources Consulted
- AWS CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CLI `logs put-subscription-filter`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- AWS CLI `firehose create-delivery-stream`: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Data Firehose CloudWatch Logs delivery and decompression: https://docs.aws.amazon.com/firehose/latest/dev/writing-with-cloudwatch-logs.html
- Amazon Data Firehose processor types: https://docs.aws.amazon.com/firehose/latest/APIReference/API_Processor.html
- Amazon Data Firehose Lambda transformation status model: https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-status-model.html
- AWS CLI `apigatewayv2 update-stage`: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/update-stage.html
- API Gateway HTTP API access logging: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- Fluent Bit CloudWatch Logs output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch
- Fluent Bit Firehose output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/firehose
- OpenSearch Index State Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- OpenSearch bulk API: https://docs.opensearch.org/latest/api-reference/document-apis/bulk/
- Athena OpenX JSON SerDe: https://docs.aws.amazon.com/athena/latest/ug/openx-json-serde.html

## Issues Found
- The original architecture showed Firehose transforming logs and sending them directly to both OpenSearch and S3, while the Firehose command configured only an S3 destination and the OpenSearch indexer code expected Kinesis Data Streams events. Updated the architecture and Step 4 so Firehose archives normalized logs to S3 and an S3-triggered Lambda indexes those objects into OpenSearch.
- The CloudWatch Logs subscription filter command omitted the required IAM role for delivery to Firehose. Added `--role-arn` and renamed the filter from `forward-to-kinesis` to `forward-to-firehose`.
- The original pipeline did not account for CloudWatch Logs subscription payloads being gzip-compressed CloudWatch Logs envelopes. Added Firehose `Decompression` and `CloudWatchLogProcessing` processors before the Lambda transformer.
- The Fluent Bit container example sent directly to Firehose, which conflicted with the corrected CloudWatch Logs subscription pipeline. Changed it to use the `cloudwatch_logs` output plugin and CloudWatch log group settings.
- The OpenSearch indexer used `record.kinesis.data`, but the corrected pipeline indexes from S3 archive objects. Replaced it with an S3 event handler using `GetObjectCommand`, gzip handling, newline-delimited JSON parsing, and OpenSearch bulk indexing.
- Several example ARNs used a 9-digit placeholder account ID instead of the 12-digit AWS account ID format. Updated affected examples to `123456789012`.
- The ISM policy comment said indices were warm for 30 days, but the policy transitioned to read-only after 7 days and deleted after 90 days. Updated the comment to match the policy.
- The article described OpenSearch availability as real-time after moving indexing behind S3 archive delivery. Changed wording to near-real-time.

## Review Notes
The snippets are illustrative and still omit production IAM policies, Lambda permissions, S3 event notification setup, OpenSearch authentication/signing, retry/dead-letter handling, and index template configuration. Those omissions are acceptable for this guide, but they would be important in a production implementation.
