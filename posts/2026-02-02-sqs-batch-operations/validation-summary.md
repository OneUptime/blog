# Validation Summary: How to Batch Operations in SQS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`)
- AWS SDK for Python (boto3)
- SQS batch operations: `SendMessageBatch`, `ReceiveMessage`, `DeleteMessageBatch`, `ChangeMessageVisibilityBatch`
- SQS FIFO queues (MessageGroupId, MessageDeduplicationId)
- SQS long polling
- Node.js / Python concurrency patterns

## Sources Consulted
- AWS SQS API Reference — SendMessageBatch: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessageBatch.html
- AWS SQS API Reference — ReceiveMessage: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- AWS SQS API Reference — DeleteMessageBatch: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessageBatch.html
- AWS SQS API Reference — ChangeMessageVisibilityBatch: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibilityBatch.html
- AWS SQS Developer Guide — Quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- AWS SQS Developer Guide — FIFO Queues / High Throughput FIFO: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html
- AWS SDK for JavaScript v3 — @aws-sdk/client-sqs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
- boto3 SQS Client Reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- Amazon SQS Pricing: https://aws.amazon.com/sqs/pricing/

## Issues Found
- **FIFO throughput claim in Best Practices table was incorrect.** The post stated "Group IDs limit throughput to 300 messages per second per group." Per AWS docs, the 300 TPS limit applies per queue (without batching), not per message group ID. Per-group, AWS guarantees ordering but does not impose a 300 msg/sec/group throughput ceiling. With batching, standard FIFO supports up to 3,000 messages/sec per queue, and high throughput FIFO can support up to 70,000 TPS. Updated the row to: "Standard FIFO queues are limited to 300 TPS per queue (3,000 messages/sec with batching); enable high throughput mode for higher limits".

## Review Notes
- All SDK v3 imports (`SQSClient`, `SendMessageBatchCommand`, `ReceiveMessageCommand`, `DeleteMessageBatchCommand`, `ChangeMessageVisibilityBatchCommand`) are valid as of the current `@aws-sdk/client-sqs` package.
- The batch limit of 10 messages and 256 KB (262,144 bytes) combined payload, `MaxNumberOfMessages` range 1–10, `WaitTimeSeconds` max 20, and `VisibilityTimeout` max 43,200 seconds (12 hours) are all correctly stated.
- The receive-message Node.js example uses the legacy `AttributeNames: ['All']` parameter. This still works against the current SDK but the SDK v3 has been moving callers toward `MessageSystemAttributeNames`. This is not a bug; it is just a forward-looking note in case future SDK versions deprecate `AttributeNames`.
- The Python example imports `dataclasses.dataclass` but never uses it. Harmless, not a technical error.
- The Node.js consumer loop calls `deleteMessageBatch` which is defined in a separate code block in the next section. Acceptable for didactic code; readers stitching the snippets together will have both available.
- The cost claim ($0.40 → $0.04 per million messages and "up to 90%" savings) is consistent with current SQS request pricing assuming batches of 10, since SQS bills per request, not per message.
- The retry helper using `Math.random() * 0.25` adds 0–25% jitter; this is "full-jitter-lite" rather than the AWS-recommended full jitter, but the post does not claim a specific algorithm so this is fine as illustrative code.
