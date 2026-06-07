# Validation Summary: How to Configure SQS DLQ Redrive Policies

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- Dead Letter Queues (DLQ)
- AWS CLI
- Terraform (AWS Provider)
- Python (boto3 SDK)
- Node.js (@aws-sdk/client-sqs v3)
- AWS Lambda
- Amazon CloudWatch (Metrics & Alarms)
- Amazon SNS
- IAM Policies
- Mermaid diagrams

## Sources Consulted
- AWS SQS Developer Guide — Dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS SQS Developer Guide — Configuring a DLQ redrive: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html
- AWS CLI Reference — `start-message-move-task`: https://docs.aws.amazon.com/cli/latest/reference/sqs/start-message-move-task.html
- AWS CLI Reference — `list-message-move-tasks`: https://docs.aws.amazon.com/cli/latest/reference/sqs/list-message-move-tasks.html
- AWS CLI Reference — `cancel-message-move-task`: https://docs.aws.amazon.com/cli/latest/reference/sqs/cancel-message-move-task.html
- AWS SQS API Reference — RedrivePolicy & RedriveAllowPolicy attributes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SetQueueAttributes.html
- Terraform AWS Provider — `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS Provider — `aws_sqs_queue_redrive_allow_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_allow_policy
- Terraform AWS Provider — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- boto3 SQS client docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- AWS SDK for JavaScript v3 — @aws-sdk/client-sqs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
- AWS SQS Monitoring Metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS IAM Action Reference for SQS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsqs.html

## Issues Found
No technical issues found.

All code samples, AWS CLI commands, Terraform resources, IAM action names, CloudWatch metric/namespace identifiers, and DLQ-related API parameters check out against current AWS documentation:

- `RedrivePolicy` JSON structure with `deadLetterTargetArn` and string-quoted `maxReceiveCount` matches the canonical form in AWS examples.
- `aws_sqs_queue_redrive_allow_policy` is a real resource in the AWS provider (introduced in 4.50.0) and uses the correct `redrivePermission` / `sourceQueueArns` fields.
- `sqs:StartMessageMoveTask`, `sqs:CancelMessageMoveTask`, and `sqs:ListMessageMoveTasks` are valid IAM actions; permissions are correctly scoped to the DLQ ARN (the source of the move).
- The IAM policy also correctly grants `sqs:SendMessage` on the destination queue, which is required by `StartMessageMoveTask`.
- Python `boto3` and Node.js AWS SDK v3 (`@aws-sdk/client-sqs`) API calls and parameter names are accurate.
- CloudWatch SQS metrics `ApproximateNumberOfMessagesVisible` and `ApproximateAgeOfOldestMessage` exist under the `AWS/SQS` namespace with the documented dimensions.

## Review Notes
- The Python boto3 and Node.js SDK v3 code both use `AttributeNames=['All']` for `ReceiveMessage`. Both SDKs continue to support this parameter, though newer SDK releases introduce `MessageSystemAttributeNames` as a preferred alternative. The post's usage still works correctly.
- The Lambda example uses `datetime.now()`. AWS Lambda runs in UTC by default, so this matches the UTC `SentTimestamp` from SQS in practice; using `datetime.now(timezone.utc)` or `datetime.utcnow()` would be marginally more explicit but is not required for correctness.
- The Lambda skip-old-messages path leaves skipped messages in the DLQ. They become invisible for the duration of the visibility timeout (60s) and will reappear on subsequent invocations to be skipped again. This is functionally correct (skipped messages are preserved for manual review), just slightly inefficient under repeated scheduled invocations.
- The post references "CloudWatch Events" for scheduling, which has been renamed to "Amazon EventBridge." The mechanism still works under either name; not a technical inaccuracy.
