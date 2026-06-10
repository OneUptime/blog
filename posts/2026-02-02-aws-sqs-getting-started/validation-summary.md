# Validation Summary: How to Get Started with AWS SQS

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- AWS CLI (sqs create-queue, etc.)
- Python (boto3 SDK)
- Node.js (AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs`)
- Dead Letter Queues (DLQ) and Redrive Policy
- CloudWatch-style queue metrics (ApproximateNumberOfMessages, etc.)
- Mermaid diagrams (flowchart, sequence)

## Sources Consulted
- AWS SQS Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html
- AWS SQS API Reference (SendMessage, SendMessageBatch, ReceiveMessage, DeleteMessage, ChangeMessageVisibility, GetQueueAttributes, SetQueueAttributes, CreateQueue): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/
- boto3 SQS Client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- AWS SDK for JavaScript v3 — `@aws-sdk/client-sqs`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
- AWS SQS Pricing: https://aws.amazon.com/sqs/pricing/
- AWS SQS FIFO queues (throughput, deduplication, MessageGroupId): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
- AWS SQS Dead Letter Queue documentation (RedrivePolicy, maxReceiveCount): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS SQS Long Polling docs (WaitTimeSeconds 0–20): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html

## Issues Found

1. **Example queue URLs used invalid AWS account IDs (9 digits instead of 12).**
   - Real AWS account IDs are exactly 12 digits. The post used `123456789` (9 digits) in three example queue URLs.
   - Updated all three occurrences to `123456789012` (12 digits) to match real AWS account ID format:
     - `QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-application-queue'`
     - `dlq_url = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-application-dlq'`
     - `FIFO_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/orders.fifo'`

All other technical content was verified against official AWS documentation and is accurate:
- SQS launched in 2006 ✓
- Standard queue: at-least-once delivery, best-effort ordering ✓
- FIFO queue: exactly-once processing, strict ordering ✓
- Default FIFO throughput limits 300/3000 TPS (without/with batching) ✓
- Max message size 256 KB ✓
- Max 10 messages per batch (SendMessageBatch / ReceiveMessage / DeleteMessageBatch) ✓
- Default visibility timeout 30 seconds ✓
- MessageRetentionPeriod default 345600s (4 days), max 1209600s (14 days) ✓
- Long polling WaitTimeSeconds range 0–20 seconds ✓
- Pricing: First 1M requests/month free, $0.40/M for Standard, $0.50/M for FIFO ✓
- Deduplication interval: 5 minutes ✓
- RedrivePolicy schema (`deadLetterTargetArn`, `maxReceiveCount`) ✓
- `ContentBasedDeduplication` and `FifoQueue` attributes for FIFO queues ✓
- All boto3 method names verified (`send_message`, `send_message_batch`, `receive_message`, `delete_message`, `change_message_visibility`, `get_queue_attributes`, `set_queue_attributes`, `create_queue`, `get_queue_url`) ✓
- AWS SDK for JavaScript v3 imports verified (`SQSClient`, `SendMessageCommand`, `ReceiveMessageCommand`, `DeleteMessageCommand` from `@aws-sdk/client-sqs`) ✓
- `MessageGroupId` (required) and `MessageDeduplicationId` (required unless ContentBasedDeduplication) for FIFO ✓
- Queue depth metric names (`ApproximateNumberOfMessages`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateNumberOfMessagesDelayed`) ✓
- `ApproximateReceiveCount` system attribute name ✓

## Review Notes

- The FIFO throughput claim of "300-3000 messages/second" is correct for the default FIFO mode (300 TPS without batching, up to 3,000 with batching). AWS now also offers **high-throughput mode** for FIFO queues (up to tens of thousands of TPS per queue), which the post does not mention. This is fine for a getting-started post but could be a follow-up topic.
- The `AttributeNames` parameter in `receive_message` is still valid in current boto3 and AWS SDK v3, but AWS has introduced `MessageSystemAttributeNames` as a newer alternative. Both work; the post's usage is current and not deprecated.
- The post does not call out that `MessageDeduplicationId` is required when sending to a FIFO queue unless `ContentBasedDeduplication` is enabled on the queue. The example code makes `deduplication_id` optional, which would fail at runtime if content-based deduplication is not enabled. The comment in the code (`"optional if content-based dedup enabled"`) is accurate, but a reader who copies the function without enabling content-based dedup on the queue would get a `MissingParameter` error. Not a technical inaccuracy — just a usability note.
- "Trillions of messages per week" is plausible based on AWS's public statements about SQS scale, though AWS has at various times also cited "trillions of messages per month" or "billions per day". The claim is not verifiably wrong; left as written.
