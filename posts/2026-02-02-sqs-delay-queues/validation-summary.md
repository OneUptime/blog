# Validation Summary: How to Implement Delay Queues in SQS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues, delay queues, message timers, visibility timeout)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-cloudwatch`)
- Python Boto3 (`sqs`, `lambda` clients)
- AWS Lambda (SQS event source mapping, partial batch failure reporting)
- Amazon CloudWatch (metrics, alarms)

## Sources Consulted
- Amazon SQS Developer Guide — Delay queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html
- Amazon SQS Developer Guide — Message timers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html
- Amazon SQS Developer Guide — FIFO queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
- Amazon SQS API Reference — `SendMessage`, `SendMessageBatch`, `CreateQueue`, `ReceiveMessage`, `ChangeMessageVisibility`
- AWS SDK for JavaScript v3 API Reference for `@aws-sdk/client-sqs` and `@aws-sdk/client-cloudwatch`
- Boto3 SQS client documentation
- AWS Lambda SQS event source mapping documentation (partial batch failures via `ReportBatchItemFailures`)

## Issues Found

1. **FIFO queues do not support per-message timers.** The original "FIFO Queue Delays" section demonstrated `DelaySeconds` being passed per message to `SendMessage` on a FIFO queue, and the diagram annotated different per-message delays within a single message group. AWS documentation is explicit: "FIFO queues don't support timers on individual messages" (sqs-message-timers.html). Calling `SendMessage` on a FIFO queue with a non-zero `DelaySeconds` parameter raises an error; only the queue-level `DelaySeconds` attribute is permitted.
   - Updated the section's intro to state the FIFO limitation explicitly.
   - Rewrote the mermaid diagram to remove per-message delay annotations and indicate that delays are applied at the queue level.
   - Renamed `send_fifo_delayed_message` to `send_fifo_message` and removed the `DelaySeconds` parameter from the `SendMessage` call.
   - Reworked `send_ordered_workflow_steps` and `schedule_order_workflow` to drop the per-step `delay_seconds` field, since FIFO ordering is achieved through `MessageGroupId` (delays are inherited from the queue-level setting).

2. **Inaccurate docstring for the exponential backoff retry pattern.** The `schedule_with_retry_backoff` docstring claimed the delays produced were `0s, 30s, 120s, 300s, 600s, 900s`, but the formula `min(30 * (2 ** (retry_count - 1)), 900)` actually produces `0, 30, 60, 120, 240, 480, 900`. Updated the docstring to reflect the real sequence.

## Review Notes

- The Standard-queue code (Node.js and Python) is consistent with current AWS SDK v3 and Boto3 APIs. `CreateQueueCommand`, `SendMessageCommand`, `SendMessageBatchCommand`, `ReceiveMessageCommand`, `ChangeMessageVisibilityCommand`, `DeleteMessageCommand`, and the corresponding Boto3 calls accept the attributes/parameters used in the post.
- Numeric limits are correct: queue/message `DelaySeconds` max 900 seconds (15 minutes), `VisibilityTimeout` max 43,200 seconds (12 hours), `SendMessageBatch` max 10 entries per call, `MessageRetentionPeriod` example value 345,600 = 4 days.
- CloudWatch metric names (`ApproximateNumberOfMessages`, `ApproximateNumberOfMessagesDelayed`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateAgeOfOldestMessage`) and the `AWS/SQS` namespace are correct.
- Lambda event source mapping fields (`EventSourceArn`, `FunctionName`, `BatchSize`, `MaximumBatchingWindowInSeconds`, `FunctionResponseTypes: ['ReportBatchItemFailures']`) and the partial batch failure return shape (`{'batchItemFailures': [{'itemIdentifier': messageId}]}`) match the current Lambda API.
- The `requeue_scheduled_message` helper in the Lambda example references a `get_queue_url_from_arn` function that is not defined in the snippet. This is left as an exercise for the reader and not a factual error, but readers should be aware they need to derive the URL from the ARN (e.g., via `sqs.get_queue_url(QueueName=arn.split(':')[-1])` plus the account/region from the ARN) before running this code.
- `datetime.utcnow()` is used in several Python examples. It is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`. The code still runs and is semantically correct, but readers using modern Python may want to update accordingly.
- The post recommends using a re-queuing pattern for delays beyond 15 minutes. AWS now also recommends EventBridge Scheduler for delays longer than 15 minutes, which is worth a future mention.
- The unused `timedelta` import in the first Python block is harmless and was left alone.
