# Validation Summary: How to Configure Lambda Event Source Mapping Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda event source mappings
- Lambda event filtering
- Amazon SQS
- Amazon Kinesis Data Streams
- Amazon DynamoDB Streams
- Amazon MSK and self-managed Apache Kafka
- Amazon MQ
- AWS CLI
- Python boto3

## Sources Consulted
- AWS Lambda Developer Guide: Control which events Lambda sends to your function - https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
- AWS Lambda Developer Guide: Using event filtering with an Amazon SQS event source - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-filtering.html
- AWS Lambda Developer Guide: Using event filtering with a DynamoDB event source - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-filtering.html
- AWS Lambda Developer Guide: Using event filtering with a Kinesis event source - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-filtering.html
- AWS CLI Command Reference: create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html

## Issues Found
- The introduction said event source mapping filters could be used for "only insert operations on a DynamoDB table." DynamoDB event source mappings only support filtering on the `dynamodb` key, not the top-level `eventName`, so this was misleading. Changed the example to "records with a specific DynamoDB attribute" and "SQS messages with a specific field in the body."

## Review Notes
The AWS CLI examples use current `create-event-source-mapping`, `update-event-source-mapping`, `--filter-criteria`, `--starting-position`, and `--batch-size` options. The filter pattern syntax, supported event sources, SQS `body` filtering behavior, DynamoDB `dynamodb` filtering key, Kinesis `data` filtering key, OR behavior across multiple filters, and the default quota of five filters with an increase up to ten match the current AWS Lambda documentation.
