# Validation Summary: How to Trigger Lambda Functions from Kinesis Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon Kinesis Data Streams
- AWS CDK v2
- Amazon DynamoDB
- Amazon SQS
- Node.js
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda: Using Lambda to process records from Amazon Kinesis Data Streams - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda: Lambda parameters for Amazon Kinesis Data Streams event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS Lambda: Retain discarded batch records for a Kinesis Data Streams event source - https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html
- AWS CDK: KinesisEventSourceProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.KinesisEventSourceProps.html
- AWS CDK: KinesisConsumerEventSource - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.KinesisConsumerEventSource.html
- AWS CDK: Kinesis stream consumers - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis-readme.html
- Amazon Kinesis Data Streams: PutRecords API - https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- Amazon Kinesis Data Streams: Quotas and limits - https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams: Change the data retention period - https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html
- Amazon DynamoDB: DynamoDB Streams and AWS Lambda triggers - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- Amazon DynamoDB: Constraints in DynamoDB Streams - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon SQS: Message quotas - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- Amazon SQS: Visibility timeout - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html

## Issues Found
- The CDK stack claimed to be complete but the Lambda handler wrote to DynamoDB without creating the DynamoDB table or granting write permissions. Added a `ClickAggregates` table with matching `pk` and `sk` keys, wired `OUTPUT_TABLE` to the generated table name, and granted `grantWriteData` to the Lambda function.
- The key characteristics section described the default invocation model and read quotas too loosely. Clarified that Lambda uses one concurrent invocation per shard by default and that standard iterators share the Kinesis shard read quota.
- The parallelization factor section said records could be out of order within a shard. AWS Lambda preserves ordering for records with the same partition key when `ParallelizationFactor` is increased, so the text now states that multiple partition keys from a shard can be processed concurrently.
- The enhanced fan-out snippet registered a low-level stream consumer but did not show how to connect Lambda to that consumer. Replaced it with the CDK `StreamConsumer` and `KinesisConsumerEventSource` pattern.
- The comparison table listed SQS retention as 4-14 days. AWS SQS retention defaults to 4 days, but the configurable range is 1 minute to 14 days, so the table now reflects the correct range.
- The comparison table described SQS as having no multiple consumers. SQS supports multiple competing consumers, so the table now uses that terminology.

## Review Notes
The examples are technically valid after the fixes. The handler creates a DynamoDB client inside the per-record processing function; moving the client to module scope would be more efficient in production, but the current code is functionally correct.
