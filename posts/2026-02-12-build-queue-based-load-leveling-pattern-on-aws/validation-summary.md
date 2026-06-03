# Validation Summary: How to Build a Queue-Based Load Leveling Pattern on AWS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS SQS
- AWS Lambda
- AWS CDK
- API Gateway
- DynamoDB
- CloudWatch
- JavaScript / TypeScript

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda SQS event source configuration: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda SQS scaling and maximum concurrency: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html
- AWS Lambda SQS partial batch failure handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS SQS standard queue documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- AWS SQS FIFO throughput FAQ: https://aws.amazon.com/sqs/faqs/
- AWS CDK SQS event source props: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda_event_sources/SqsEventSourceProps.html
- AWS CDK DynamoDB Table construct: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS Lambda Node.js SDK guidance: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- Referenced OneUptime post: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- The CDK examples used `lambda.Runtime.NODEJS_18_X`, which is deprecated as of September 1, 2025. Updated both Lambda functions to `lambda.Runtime.NODEJS_22_X`, a supported Amazon Linux 2023 runtime.
- The queue visibility timeout was exactly six times the Lambda timeout but did not account for the configured 5-second batching window. Updated it from 90 seconds to 95 seconds.
- The DLQ `maxReceiveCount` was 3, while AWS recommends at least 5 for Lambda SQS source queues. Updated it to 5.
- The CDK stack referenced DynamoDB behavior in the consumer code but did not create tables or grant permissions. Added two DynamoDB tables, table-name environment variables, and write grants for the consumer Lambda.
- The CloudWatch alarm snippet used `cloudwatch` without importing the CDK CloudWatch module. Added the import.
- Partial batch response handling returned `batchItemFailures`, but the event source mapping did not enable `reportBatchItemFailures`. Enabled it in the main event source mapping.
- The producer accepted missing `userId` and non-array `items`, which would cause DynamoDB write failures or invalid order messages downstream. Tightened validation and added invalid JSON handling.
- The consumer hardcoded DynamoDB table names even though the CDK stack should provide deployed table names. Updated the code to use `ORDERS_TABLE` and `ORDER_STATUS_TABLE`.
- The post described reserved concurrency as capping messages processed simultaneously. Corrected this to function invocations processing batches.
- The scaling example raised event source `maxConcurrency` above the earlier function reserved concurrency without noting the interaction. Added guidance to raise or remove reserved concurrency for that example.
- The post made absolute "no lost requests" / "no requests get dropped" claims. Reworded these to refer to accepted requests being buffered for asynchronous processing.
- The FIFO throughput sentence omitted high throughput mode. Updated it to distinguish the default 3000 messages per second with batching from higher throughput mode.

## Review Notes
- The examples are now technically consistent for the described pattern. In production, the consumer should also be idempotent because SQS standard queues use at-least-once delivery and can redeliver messages.
