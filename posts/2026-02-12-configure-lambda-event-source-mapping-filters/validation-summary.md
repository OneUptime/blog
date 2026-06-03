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
- AWS CLI Command Reference: lambda create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- Amazon DynamoDB Developer Guide: Evaluate your DynamoDB streams usage - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CostOptimization_StreamsUsage.html

## Issues Found
- Removed Amazon DocumentDB change streams from the supported event sources list because AWS Lambda event filtering does not support DocumentDB.
- Narrowed the general "any field" filtering claim to "supported fields" because each event source has specific filterable data keys.
- Corrected the SQS body filtering explanation. SQS event source mappings only support filtering on the `body` key; they do not support filtering on SQS message attributes.
- Corrected DynamoDB examples that filtered on top-level `eventName`. DynamoDB event source filtering only supports the `dynamodb` key, so the examples now filter on `dynamodb.NewImage` and explain that `eventName` checks belong in the handler when needed.
- Added the caveat that old/new DynamoDB image filtering requires the stream view to include both images.
- Updated the filter pattern quota statement to note the default limit of 5 and possible quota increase up to 10.
- Corrected the cost discussion to avoid implying that Lambda filtering reduces event source polling or DynamoDB stream read charges for Lambda consumers.
- Clarified the Kinesis debugging note so it refers to the decoded record payload using the `data` filter key.

## Review Notes
The AWS CLI commands and JSON filter structures are otherwise consistent with the official Lambda and AWS CLI documentation. The examples use Unix-style shell quoting and would need quoting adjustments for some Windows shells.
