# Validation Summary: How to Build AWS SQS FIFO Advanced

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon SQS FIFO queues
- AWS SDK for JavaScript v3
- SQS message groups and deduplication
- SQS high throughput FIFO mode
- SQS dead-letter queues
- Terraform AWS provider
- Amazon CloudWatch alarms and SQS metrics

## Sources Consulted
- Amazon SQS FIFO queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
- Amazon SQS FIFO delivery logic: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- Amazon SQS exactly-once processing and deduplication: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS queue and message identifiers: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queue-message-identifiers.html
- Amazon SQS message quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- Amazon SQS CreateQueue API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- Amazon SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- Amazon SQS ReceiveMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- Amazon SQS high throughput FIFO setup: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/enable-high-throughput-fifo.html
- Amazon SQS dead-letter queue configuration: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue.html
- Amazon SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Terraform AWS provider `aws_sqs_queue` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue

## Issues Found
- The post described FIFO queues as guaranteeing exactly-once message processing. Updated this to describe SQS's actual guarantee: duplicate send attempts with the same deduplication ID are acknowledged but not delivered within the deduplication interval, while consumers still need idempotency for retries and partial failures.
- The post described ordering as queue-wide in places. Updated wording to clarify that FIFO ordering is within each `MessageGroupId`.
- The queue creation and batch examples used the older 256 KB message size limit. Updated `MaximumMessageSize` and batch-size comments to the current 1 MiB SQS limit.
- The high throughput section used outdated and incorrect per-group/per-queue throughput numbers. Updated the claims and diagram labels to match current AWS regional FIFO throughput quotas.
- The content-based deduplication example used `crypto.randomUUID()` without importing or qualifying `crypto`. Added a `node:crypto` `randomUUID` import in that standalone snippet.
- The explicit deduplication example referenced a non-documented `MessageDeduplicationIdNotProvided` error name and described duplicate messages as rejected. Updated the code to generic error logging and clarified that duplicates are acknowledged but not delivered.
- The receive-message examples used deprecated `AttributeNames` for message system attributes. Updated them to `MessageSystemAttributeNames`.
- The DLQ setup snippet imported `SetQueueAttributesCommand` without using it. Removed the unused import.
- The consumer could continue processing later messages in the same message group after an earlier message failed, and its heartbeat interval could remain active after failures. Updated the loop to stop processing that group on failure and stop the heartbeat in a `finally` block.
- The CloudWatch DLQ alarm example used a queue-name dimension without the `.fifo` suffix. Updated the DLQ queue-name override to include `.fifo`.

## Review Notes
The Terraform FIFO queue attributes, DLQ type matching, message group usage, redrive policy shape, CloudWatch metric names, and AWS SDK v3 command usage were otherwise consistent with current official documentation. The sample code remains illustrative and still requires real AWS credentials, permissions, and application-specific retry/idempotency behavior in production.
