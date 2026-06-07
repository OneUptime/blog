# Validation Summary: How to Send Messages to SQS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- AWS CLI (`aws sqs create-queue`)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-s3`)
- Boto3 (AWS SDK for Python)
- Node.js (`crypto` module, `uuid` package)
- Python (`hashlib`, `uuid`, `datetime`, `botocore.exceptions`)
- DynamoDB (used in idempotency example)
- Mermaid diagrams

## Sources Consulted
- AWS SQS Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html
- SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- SQS SendMessageBatch API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessageBatch.html
- AWS SDK for JavaScript v3 SQS Client docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/
- Boto3 SQS Client reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs/client.html
- SQS quotas (message size, batch size, DelaySeconds, visibility timeout): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- FIFO queue documentation (MessageGroupId, MessageDeduplicationId, 5-minute deduplication, 300 TPS default): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html
- AWS CLI v2 `aws sqs create-queue` reference

## Issues Found
- **Inaccurate description of the boto3 interface** (Python "Basic Message Sending" section): The intro stated "The SQS resource provides a high-level, object-oriented interface for queue operations" but the code immediately afterward uses `boto3.client('sqs', ...)`, which is the low-level *client* interface, not the high-level `boto3.resource('sqs', ...)` interface. Corrected the description to accurately reflect that the code uses the SQS client.

## Review Notes
- The "Throughput: 300 TPS (3000 with batching)" entry for FIFO queues in the comparison table is correct for the default (non-high-throughput) FIFO mode. AWS also offers high-throughput FIFO queues with substantially higher per-region limits if enabled, but this is an advanced feature and out of scope for the post.
- The Python examples use `datetime.utcnow()`, which is deprecated starting in Python 3.12. Functionally it still works on currently supported Python versions, but a future-proof rewrite would use `datetime.now(timezone.utc)`. Left as-is since it does not break any examples.
- The Node.js retry example checks `error.name` against `['ThrottlingException', 'ServiceUnavailable', 'InternalError']`. The AWS SDK v3 surfaces error names like `ThrottlingException`/`ThrottledException` depending on the service; the list is reasonable for illustrative purposes but production code should also consider checking `$retryable` / `$metadata.httpStatusCode` (5xx) for completeness. This is a pedagogical simplification, not an error.
- The legacy `require('crypto')` import in the FIFO Node.js example is still supported; modern style prefers `require('node:crypto')`. Not a correctness issue.
- All AWS SDK v3 commands referenced (`SendMessageCommand`, `SendMessageBatchCommand`, `GetQueueAttributesCommand`, `PutObjectCommand`) and their parameter shapes match the current SDK API.
- All quoted SQS limits and defaults (256 KB message size, max 10 messages per batch, 0–900s DelaySeconds, 30s default visibility timeout, 5-minute FIFO deduplication window, `.fifo` name suffix requirement) match official AWS documentation.
