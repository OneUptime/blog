# Validation Summary: How to Handle SQS Message Visibility Timeout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS CloudWatch (metrics and alarms)
- Python (boto3 AWS SDK)
- Redis (for deduplication / idempotency)
- Dead Letter Queues (DLQ)
- `concurrent.futures.ThreadPoolExecutor`

## Sources Consulted
- Amazon SQS Developer Guide — Visibility Timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS API Reference — `SetQueueAttributes`, `ChangeMessageVisibility`, `ChangeMessageVisibilityBatch`, `ReceiveMessage`: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/
- Amazon SQS Developer Guide — Dead Letter Queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- boto3 SQS client reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- boto3 CloudWatch client reference (`put_metric_alarm`, `put_metric_data`): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch.html
- Amazon SQS Developer Guide — Available CloudWatch Metrics for Amazon SQS: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- redis-py client documentation (`SET` with `nx`/`ex`): https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

Verified specifically:
- Default visibility timeout (30 s), minimum (0 s) and maximum (12 h / 43,200 s) values are correct.
- The 14-day (1,209,600 s) `MessageRetentionPeriod` is the documented maximum.
- `change_message_visibility_batch` supports up to 10 messages per call — correct.
- All boto3 SQS method names, parameter names (`QueueUrl`, `ReceiptHandle`, `VisibilityTimeout`, `Attributes`, `RedrivePolicy`, `Entries`, `WaitTimeSeconds`, `MaxNumberOfMessages`) match the current SDK.
- Queue `Attributes` values must be strings (e.g., `'VisibilityTimeout': '120'`) — correctly shown.
- `RedrivePolicy` JSON shape (`deadLetterTargetArn`, `maxReceiveCount`) matches AWS API reference; AWS accepts the string form of `maxReceiveCount` as shown in the official API reference examples.
- All CloudWatch SQS metric names (`ApproximateNumberOfMessagesVisible`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateAgeOfOldestMessage`, `NumberOfMessagesReceived`, `NumberOfMessagesDeleted`) exist under the `AWS/SQS` namespace.
- `put_metric_alarm` and `put_metric_data` parameter shapes (`Statistic='Sum'`, `Unit='Milliseconds'`, `ComparisonOperator='GreaterThanThreshold'`, `Dimensions` list) are valid.
- The Redis idempotency pattern using `SET key value NX EX 300` is correct; `redis-py` returns `True` on success and `None` when the key already exists, so `if not lock_acquired` behaves as intended.
- Standard SQS at-least-once delivery semantics are correctly described, including the requirement for idempotent processing.

## Review Notes
- `datetime.utcnow()` (in the idempotent processing example) is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. The code still works but will emit a `DeprecationWarning` on Python 3.12+. Worth modernizing in a future revision.
- `receive_message(AttributeNames=['All'], ...)` uses the legacy parameter name. boto3 has introduced `MessageSystemAttributeNames` as the preferred replacement; `AttributeNames` still functions but emits a deprecation warning in recent SDK versions.
- The heartbeat pattern in `process_with_heartbeat` relies on closure reads of a mutable boolean (`stop_heartbeat`) reassigned by the outer function. This works correctly in Python because the inner function only reads the name from the enclosing scope, but using `threading.Event` would be more idiomatic and avoid subtle bugs if someone later tries to set the flag from inside the worker.
- The `heartbeat_future` variable is assigned but never awaited or used; not a bug, but dead code.
- The recommendation of "6x average processing time" for visibility timeout is a heuristic, not a hard AWS guideline — reasonable advice but readers should still measure their actual p99 processing time.
- The `process_dlq_messages` example references `main_queue_url`, `can_be_fixed`, and `fix_message` without defining them; these are clearly illustrative placeholders, which is fine for the context.
