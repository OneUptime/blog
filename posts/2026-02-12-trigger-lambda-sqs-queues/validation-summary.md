# Validation Summary: How to Trigger Lambda Functions from SQS Queues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon SQS standard queues
- Amazon SQS FIFO queues
- AWS CDK v2
- AWS CLI
- AWS SDK for JavaScript v3
- DynamoDB conditional writes for idempotency
- CloudWatch metrics

## Sources Consulted
- AWS Lambda Developer Guide: Creating and configuring an Amazon SQS event source mapping - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda Developer Guide: Lambda parameters for Amazon SQS event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda Developer Guide: Handling errors for an SQS event source in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS CLI Command Reference: lambda update-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-event-source-mapping.html
- Amazon SQS Developer Guide: Exactly-once processing in Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS Developer Guide: Available CloudWatch metrics for Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS CDK API Reference: SqsEventSourceProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.SqsEventSourceProps.html

## Issues Found
- The batch size limits for standard and FIFO queues were reversed. Updated the post to state that standard queues support up to 10,000 records per batch and FIFO queues support up to 10.
- The standard queue visibility timeout example used 90 seconds while also configuring a 5-second batching window. Updated it to 95 seconds and corrected the text to match AWS guidance: Lambda timeout must not exceed the visibility timeout, and AWS recommends 6x the function timeout plus the batching window.
- The post said Lambda adds 60 concurrent invocations per minute for SQS. Updated this to the current AWS documented rate of up to 300 per minute and the default maximum of 1,250 concurrent invokes for standard queues.
- The AWS CLI example used `MaxConcurrency=10`. Updated it to the documented shorthand key `MaximumConcurrency=10`.
- The FIFO CDK example set `maxBatchingWindow` even though batching windows are not supported for FIFO SQS event source mappings. Removed that property.
- Added the FIFO-specific partial batch response caveat: stop processing after the first failure and return failed plus unprocessed messages in `batchItemFailures` to preserve ordering.
- The monitoring section referenced `NumberOfMessagesSent to DLQ`, which is not an exact CloudWatch metric and is unreliable for automatic redrive. Updated it to monitor `ApproximateNumberOfMessagesVisible` on the DLQ.

## Review Notes
The CDK and JavaScript examples otherwise use current APIs and are syntactically plausible. The `maxReceiveCount: 3` setting is valid, although AWS documentation recommends at least 5 for SQS Lambda source queues to give Lambda more retry opportunities before redriving messages.
