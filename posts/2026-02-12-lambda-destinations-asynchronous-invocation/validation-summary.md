# Validation Summary: How to Use Lambda Destinations for Asynchronous Invocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda asynchronous invocation
- Lambda Destinations
- Lambda dead-letter queues
- AWS CDK v2 for TypeScript
- AWS CLI
- Amazon SQS
- Amazon SNS
- Amazon EventBridge
- AWS IAM
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Lambda Developer Guide: Capturing records of Lambda asynchronous invocations: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda Developer Guide: Invoking a Lambda function asynchronously: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html
- AWS Lambda Developer Guide: How Lambda handles errors and retries with asynchronous invocation: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda API Reference: Invoke: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- AWS CLI Command Reference: lambda put-function-event-invoke-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-event-invoke-config.html
- AWS CDK v2 API Reference: aws_lambda FunctionProps / EventInvokeConfigOptions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.EventInvokeConfigOptions.html
- AWS CDK v2 API Reference: aws_lambda_destinations EventBridgeDestination: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_destinations.EventBridgeDestination.html
- AWS Lambda Developer Guide: Types of metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon SQS FAQs: https://aws.amazon.com/sqs/faqs/
- Amazon SNS API Reference: Publish message size limits: https://docs.aws.amazon.com/sns/latest/api/API_Publish.html

## Issues Found
- The supported destination list omitted Amazon S3, which AWS now supports for on-failure Lambda asynchronous invocation destinations. Added S3 with the on-failure-only caveat.
- The supported SQS and SNS destination wording did not specify standard queues/topics. Updated the wording because Lambda destinations do not support SQS FIFO queues or SNS FIFO topics.
- The DLQ comparison incorrectly described DLQs as catching service-level failures before code runs while destinations handle results after execution. Updated the comparison to match AWS documentation: DLQs and on-failure destinations are both used for async events that fail all processing attempts or expire, but DLQs receive the original event and destinations receive a richer invocation record.
- The DLQ use-case list included Step Functions integration without a clear Lambda DLQ-specific basis in AWS documentation. Replaced it with a supported reason: choosing DLQs when only the original discarded event is needed.
- The payload-size warning said SQS messages are limited to 256 KB. Current AWS documentation lists SQS messages up to 1 MiB, while SNS messages remain limited to 256 KB. Updated the warning to mention destination-specific limits.

## Review Notes
The CDK examples use current AWS CDK v2 properties (`onSuccess`, `onFailure`, `retryAttempts`, and `maxEventAge`) and destination classes. The AWS CLI command uses valid `put-function-event-invoke-config` flags, though AWS documentation notes that `put-function-event-invoke-config` overwrites the full async invoke configuration; `update-function-event-invoke-config` is better when changing one option without removing others.
