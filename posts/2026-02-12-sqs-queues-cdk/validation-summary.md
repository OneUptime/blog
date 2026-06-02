# Validation Summary: How to Create SQS Queues with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS
- AWS CDK v2
- TypeScript
- AWS Lambda
- Amazon CloudWatch
- Amazon SNS
- AWS IAM
- AWS KMS

## Sources Consulted
- AWS CDK v2 `aws_sqs.Queue` / `QueueProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html
- AWS CDK v2 `SqsEventSourceProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/lambda/eventsources/SqsEventSourceProps.html
- AWS CDK v2 Lambda `Runtime` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon SQS long polling documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/best-practices-setting-up-long-polling.html
- Amazon SQS message quotas documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- Amazon SQS dead-letter queues documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Amazon SQS FIFO queues documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
- Amazon SQS server-side encryption documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html
- AWS Lambda SQS partial batch response documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html

## Issues Found
- The CDK queue examples used `receiveMessageWaitTimeSeconds`, which is not the current AWS CDK v2 `QueueProps` property. Changed both examples to `receiveMessageWaitTime: cdk.Duration.seconds(20)`.
- The property explanation used the same invalid CDK prop name. Updated it to `receiveMessageWaitTime` and clarified that the configured value is 20 seconds.
- The FIFO description said messages are "processed exactly once" and "in the order they were sent", which overstates the guarantee at the consumer level and omits message-group scope. Updated the wording to say FIFO queues support exactly-once processing semantics with deduplication and preserve ordering within each message group.
- The Lambda example used `lambda.Runtime.NODEJS_20_X`, but AWS lists Node.js 20 as deprecated as of April 30, 2026. Updated the example to `lambda.Runtime.NODEJS_22_X`.
- The reusable construct snippet imported `aws-cloudwatch` and described monitoring, but the snippet did not define any monitoring resources. Removed the unused import and adjusted the snippet comment.

## Review Notes
The remaining examples and explanations match the reviewed AWS/CDK documentation. The Lambda partial batch response example is structurally correct, but production handlers should also include dependency imports/types and logging/error handling appropriate to the application.
