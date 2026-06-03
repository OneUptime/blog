# Validation Summary: How to Build a Decoupled Architecture with SQS and SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Simple Queue Service (SQS)
- AWS Simple Notification Service (SNS)
- AWS Cloud Development Kit (CDK) v2
- AWS Lambda
- AWS SDK for JavaScript v3
- Amazon CloudWatch alarms
- JavaScript and TypeScript

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Building Lambda functions with Node.js: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS CDK Runtime API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK SqsSubscription API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.SqsSubscription.html
- AWS CDK SqsEventSource API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.SqsEventSource.html
- AWS CDK CloudWatch Alarm API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- Amazon SQS standard queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- Amazon SQS dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SNS subscription filter policies: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS FIFO message grouping: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-grouping.html
- Amazon SNS FIFO message deduplication: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-dedup.html
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Handling errors for an SQS event source in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html

## Issues Found
- The CDK Lambda examples used `lambda.Runtime.NODEJS_18_X`. AWS lists Node.js 18 as deprecated as of September 1, 2025, so the examples were updated to `lambda.Runtime.NODEJS_22_X`.
- The CloudWatch alarm snippet used `cloudwatch.Alarm` without importing the CDK CloudWatch module. Added `import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';` to the CDK imports.
- The SQS batch consumer examples used `return` when an event type did not match. In a batched Lambda invocation this can stop processing the remaining records in the batch, so those checks were changed to `continue`.

## Review Notes
The examples are intentionally partial and assume application-specific helpers such as `saveOrder`, `chargePayment`, `publishEvent`, `reserveInventory`, and `logFailedMessage` exist. For production Lambda SQS integrations with batch sizes greater than one, consider enabling partial batch responses with `reportBatchItemFailures` and returning `batchItemFailures` so successfully processed messages are not retried when one record fails.
