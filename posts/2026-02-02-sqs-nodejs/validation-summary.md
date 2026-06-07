# Validation Summary: How to Use SQS with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`)
- Node.js
- Dead-letter queues (DLQ) and redrive policies
- LocalStack (local SQS emulation)
- Docker Compose
- Jest (integration testing)

## Sources Consulted
- AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs` API reference (CreateQueueCommand, SendMessageCommand, SendMessageBatchCommand, ReceiveMessageCommand, DeleteMessageCommand, DeleteMessageBatchCommand, ChangeMessageVisibilityCommand, ChangeMessageVisibilityBatchCommand, GetQueueAttributesCommand, SetQueueAttributesCommand, GetQueueUrlCommand)
- Amazon SQS Developer Guide — queue attributes, FIFO behavior, dead-letter queues, visibility timeout, long polling, redrive policy
- Amazon SQS quotas — message size (256 KB), retention (max 14 days / 1,209,600 s), DelaySeconds (max 900 s), WaitTimeSeconds (max 20 s), MaxNumberOfMessages (1–10), batch size (max 10)
- AWS SQS FIFO throughput limits — standard FIFO ~300 ops/s per API (~3,000 msg/s with batching); high throughput mode raises the per-API-action limits significantly (well above the default ceiling)
- LocalStack documentation — `localstack/localstack` image, port 4566, `awslocal` CLI, init hooks under `/etc/localstack/init/ready.d/`

## Issues Found
- **FIFO high throughput mode comment was incorrect.** The code comment claimed "High throughput mode for FIFO (up to 3000 messages/second)". The 3,000 msg/s figure is actually the *default (non-high-throughput) FIFO* ceiling with batching; enabling high throughput mode raises the per-API-action limits well beyond that. Updated the comment to accurately describe what enabling `DeduplicationScope=messageGroup` and `FifoThroughputLimit=perMessageGroupId` does.

## Review Notes
- The `AttributeNames` parameter on `ReceiveMessageCommand` still works but has been deprecated in newer `@aws-sdk/client-sqs` releases in favor of `MessageSystemAttributeNames`. Either will work today; future versions may emit warnings.
- `ContentBasedDeduplication: String(options.contentBasedDeduplication || true)` will coerce an explicit `false` back to `'true'` because of the `||` short-circuit. Minor logical quirk in the example, not a factual error, so left as-is.
- The summary table lists FIFO throughput as "3,000 msg/s with batching" without noting that high throughput mode goes well beyond this. This is a reasonable simplification for the default mode and not actively incorrect; left unchanged.
- Several files reference helper functions defined in sibling files (`receiveMessages`, `deleteMessage`, `sendMessage`) without explicit imports. This is illustrative blog-post style and not a technical error.
- `PurgeQueueCommand` is imported in `dlq-processor.js` but never used in the shown snippets — a minor cleanliness issue, not a correctness problem.
- All AWS SDK v3 command names, parameter casing (PascalCase for command inputs, lowercase `tags` for `CreateQueueCommand`), attribute names, and value formats (all string-typed for SQS queue attributes) are correct.
- LocalStack Docker Compose configuration, port (4566), `awslocal` CLI usage, init hook path (`/etc/localstack/init/ready.d/`), and account ID convention (`000000000000`) are accurate.
- Quotas mentioned (256 KB max message size, 14 days max retention, 900 s max DelaySeconds, 20 s max WaitTimeSeconds, 10 messages per batch, 5-minute FIFO dedup window) all match current AWS limits.
