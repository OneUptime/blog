# Validation Summary: How to Implement Retry Logic with SQS

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS Dead Letter Queues (DLQ)
- AWS CloudFormation
- AWS Lambda (with SQS event source mapping)
- AWS DynamoDB
- AWS CloudWatch (alarms and dashboards)
- AWS SNS
- AWS SDK v3 for JavaScript (`@aws-sdk/client-sqs`, `@aws-sdk/client-dynamodb`)
- Python boto3
- Node.js
- Python 3

## Sources Consulted
- AWS SQS Developer Guide — Visibility Timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- AWS SQS Developer Guide — Dead-letter queues and redrive policy: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS SQS Quotas (max retention 14 days, max visibility timeout 12 hours): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- AWS CloudFormation `AWS::SQS::Queue` reference (RedrivePolicy, SqsManagedSseEnabled): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sqs-queues.html
- AWS Lambda — SQS event source mapping & partial batch failures (`ReportBatchItemFailures`, `batchItemFailures`): https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda runtime support policy (Node.js 18 deprecation): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS SDK for JavaScript v3 — `ReceiveMessageCommand` (deprecation of `AttributeNames` in favor of `MessageSystemAttributeNames`): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/ReceiveMessageCommand/
- boto3 SQS client `receive_message` / `change_message_visibility` / `delete_message`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- Python `datetime` documentation (deprecation of `datetime.utcnow()` in Python 3.12+): https://docs.python.org/3/library/datetime.html
- AWS Lambda `AWS::Lambda::EventSourceMapping` reference (`ScalingConfig.MaximumConcurrency`, `FunctionResponseTypes`): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html

## Issues Found

1. **AWS SDK v3 deprecated `AttributeNames` parameter** — In `ReceiveMessageCommand` (AWS SDK for JavaScript v3), the `AttributeNames` field has been deprecated and replaced by `MessageSystemAttributeNames`. Updated the Node.js consumer to use the current, non-deprecated field.

2. **Deprecated Lambda runtime `nodejs18.x`** — As of June 2026 (the current date), AWS Lambda has fully deprecated the `nodejs18.x` runtime (deprecation phase started September 2025 with create/update blocks following). Updated the CloudFormation `Runtime` to `nodejs20.x`, which is an actively supported LTS runtime.

3. **Deprecated `datetime.utcnow()` in Python** — `datetime.utcnow()` was deprecated in Python 3.12 (returns a naive datetime, which is error-prone). Replaced with `datetime.now(timezone.utc)` and imported `timezone` from the `datetime` module.

## Review Notes

- Visibility timeout maximum stated as 12 hours / 3600s cap used in code — both correct (12h is the hard SQS limit; 3600s is a reasonable per-app cap).
- `MessageRetentionPeriod` values (1209600 = 14 days for DLQ, 345600 = 4 days for main queue) are correct and within SQS limits.
- CloudFormation `RedrivePolicy` YAML structure with `maxReceiveCount` and `deadLetterTargetArn` is correct.
- Lambda partial batch failure response shape (`batchItemFailures` with `itemIdentifier`) and `FunctionResponseTypes: [ReportBatchItemFailures]` are correct.
- Minor design inconsistency (not a technical error): in the Node.js consumer, `CONFIG.maxAttempts = 5` is higher than the CloudFormation `maxReceiveCount: 3`, so the application-side `receiveCount < maxAttempts` guard will never fire — the queue will route to the DLQ first. Left as-is because the post is self-consistent (`maxAttempts` and `maxReceiveCount` are presented as independent knobs) and changing either would alter the author's example.
- The boto3 `AttributeNames` parameter on `receive_message` is still the current/supported parameter name in boto3, unlike in the JavaScript SDK v3. No change needed for the Python code.
- The "6x average processing time" guidance in the Best Practices table and the "1.5x / 3x" guidance in the Visibility Timeout Guidelines section are different rules of thumb (a conservative ceiling vs. a tighter floor); both are defensible, and the author's intent appears to be that these are different recommendation tiers, so left unchanged.
- Mermaid diagrams render correctly and accurately describe SQS retry flow.
