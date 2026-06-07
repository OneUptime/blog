# Validation Summary: How to Use SQS with Python (boto3)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service) — Standard queues, FIFO queues, Dead Letter Queues
- Python 3
- boto3 (AWS SDK for Python)
- botocore (Config, retry handling, exceptions)
- Amazon CloudWatch (metrics monitoring)
- Amazon SNS (referenced for fan-out pattern)
- LocalStack (local SQS testing)
- Docker (for LocalStack)

## Sources Consulted
- boto3 retries guide: https://docs.aws.amazon.com/boto3/latest/guide/retries.html
- SQS ReceiveMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- SQS SendMessageBatch API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessageBatch.html
- SQS PurgeQueue API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_PurgeQueue.html
- SQS FIFO queues / exactly-once processing: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- SQS Dead Letter Queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html

## Issues Found
- **Invalid boto3 retry `mode` value**: The original code used `'mode': 'exponential'` in the `botocore.config.Config(retries=...)` block. This is not a valid retry mode. The supported values are `'legacy'` (default in older botocore), `'standard'`, and `'adaptive'`. Changed `'mode': 'exponential'` to `'mode': 'standard'` and updated the inline comment to clarify that standard mode includes exponential backoff with jitter (which is what the author was likely trying to express).

## Review Notes
- The phrase "FIFO queues guarantee exactly-once processing and strict ordering" matches AWS's own marketing/documentation terminology, so it was left as-is. In practice, FIFO provides exactly-once **send** (deduplication within a 5-minute window) and strict per-`MessageGroupId` ordering; consumers can still see duplicates if visibility timeouts expire and a message is redelivered before deletion. The post's later sections on visibility timeouts, DLQs, and idempotent processing implicitly cover this.
- The `AttributeNames=['All']` parameter on `receive_message` is technically deprecated in favor of `MessageSystemAttributeNames`, but it is still fully supported by current boto3 for backward compatibility. No change needed, but future revisions may want to migrate.
- `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.timezone.utc)`. It still works and emits a DeprecationWarning. Not flagged as a fix here since the call sites only use the value as an ISO-formatted string and behavior is unchanged.
- All other technical claims verified correct: 256 KB max message size, 1–10 `MaxNumberOfMessages` range, 20s max long-polling wait, 900s max `DelaySeconds`, 4-day default / 14-day max `MessageRetentionPeriod`, 60-second `PurgeQueue` rate limit, SHA-256 content-based deduplication, 10-entry batch limits, `AWS/SQS` CloudWatch namespace, `deadLetterTargetArn` / `maxReceiveCount` redrive-policy field casing, and `ApproximateReceiveCount` / `ApproximateFirstReceiveTimestamp` system attributes.
