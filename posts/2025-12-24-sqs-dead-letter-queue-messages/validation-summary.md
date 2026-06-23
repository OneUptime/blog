# Validation Summary: How to Handle 'Dead letter queue' SQS Messages

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Amazon SQS (Standard queues, dead letter queues, redrive policy, message move tasks)
- AWS CLI (`aws sqs` commands)
- AWS CloudFormation (`AWS::SQS::Queue`, `AWS::CloudWatch::Alarm`)
- Amazon CloudWatch alarms / metrics (AWS/SQS namespace)
- AWS SDK for Python (boto3)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-sns`)
- AWS Lambda (SQS event source mapping, partial batch failure reporting)

## Sources Consulted
- AWS CLI `start-message-move-task` reference — https://docs.aws.amazon.com/cli/latest/reference/sqs/start-message-move-task.html
- AWS CLI `list-message-move-tasks` reference — https://docs.aws.amazon.com/cli/latest/reference/sqs/list-message-move-tasks.html
- SQS API `StartMessageMoveTask` — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_StartMessageMoveTask.html
- SQS API `ReceiveMessage` (AttributeNames vs MessageSystemAttributeNames) — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- AWS general knowledge of SQS redrive policy / RedriveAllowPolicy, CloudFormation `AWS::SQS::Queue` properties, CloudWatch SQS metrics, and Lambda `ReportBatchItemFailures`.

## Issues Found
No technical issues found.

All commands, configuration, and code were verified to be correct and currently functional:
- The DLQ-first creation order and `RedrivePolicy` (`deadLetterTargetArn` + `maxReceiveCount`) usage is correct, including the doubly-escaped JSON in the CLI `--attributes` string.
- Retention (`1209600` = 14 days max, `345600` = 4 days) and visibility-timeout values are valid.
- `aws sqs start-message-move-task` / `list-message-move-tasks` and the `--max-number-of-messages-per-second` flag are real and current (the value 100 is within the documented 500 max).
- The CloudFormation `RedrivePolicy` as a YAML map and the note about the `RedriveAllowPolicy` circular-dependency caveat are accurate.
- The boto3 and JS SDK v3 client/command usage is correct, as is the Lambda `batchItemFailures` partial-batch-failure response shape.

## Review Notes
- `AttributeNames` (used both in the AWS CLI `--attribute-names` flag and the boto3/JS SDK `AttributeNames` parameter) has been superseded by `MessageSystemAttributeNames` in newer SDK/API versions. It is **deprecated but still fully supported for backward compatibility**, so all examples run correctly as written. A future revision could switch to `MessageSystemAttributeNames` to stay current.
- `datetime.utcnow()` in the fix-and-reprocess example is deprecated as of Python 3.12 (prefer `datetime.now(datetime.timezone.utc)`), but it still works. Not changed to preserve the author's style; worth updating eventually.
- The `inspect_dlq_messages` loop uses `VisibilityTimeout=0`, which can return the same messages on repeated `receive_message` calls and may collect duplicates up to `max_messages`. This is a behavioral nuance of polling a small queue, not an API error; the function still terminates.
- In Step 6, `getQueueUrl(...)` is an illustrative placeholder helper (not defined), and calling `ChangeMessageVisibility` while also returning `batchItemFailures` is somewhat redundant since the partial-batch-failure response alone keeps the message for retry. These are pedagogical simplifications rather than incorrect API usage.
