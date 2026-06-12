# Validation Summary: How to Use SQS for Decoupled Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon SQS standard queues
- Amazon SQS FIFO queues
- SQS dead letter queues and redrive policies
- AWS CLI
- AWS CloudFormation
- AWS SDK for JavaScript v3
- Boto3 / AWS SDK for Python
- AWS Lambda SQS event source mappings
- Amazon CloudWatch metrics and alarms
- Redis-based idempotency tracking

## Sources Consulted
- AWS SQS Developer Guide: Standard queue at-least-once delivery: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- AWS SQS Developer Guide: FIFO exactly-once processing: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- AWS SQS Developer Guide: FIFO queue delivery logic and MessageGroupId requirements: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html
- AWS SQS API Reference: CreateQueue attributes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- AWS CLI Command Reference: aws sqs create-queue: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS CloudFormation Template Reference: AWS::SQS::Queue and RedrivePolicy: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html
- AWS SQS Developer Guide: Dead-letter queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS Lambda Developer Guide: Handling errors for an SQS event source and ReportBatchItemFailures: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda Developer Guide: Reporting batch item failures for SQS triggers: https://docs.aws.amazon.com/lambda/latest/dg/example_serverless_SQS_Lambda_batch_item_failures_section.html
- AWS SDK for JavaScript v3 SQS client reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs
- Boto3 SQS client reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- Boto3 send_message_batch reference: https://boto3.amazonaws.com/v1/documentation/api/1.33.9/reference/services/sqs/client/send_message_batch.html
- AWS SQS Developer Guide: Available CloudWatch metrics for Amazon SQS: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS CloudWatch PutMetricData API Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Node.js consumer described exponential backoff but used a linear `60 * receiveCount` delay. Changed the retry delay calculation to exponential backoff with a 900-second cap.
- The Lambda SQS partial batch example implied that returning `batchItemFailures` alone enables partial batch behavior. Added the required note that the event source mapping must set `FunctionResponseTypes` to `ReportBatchItemFailures`, and removed unused manual SQS deletion code because Lambda deletes successful records through the event source mapping.
- The manual retry example processed, republished, or sent messages to a DLQ without deleting the original message. Added `DeleteMessageCommand` calls after successful processing and after retry/DLQ handoff so the original message does not become visible and get processed again.
- The retry helper described exponential backoff but used a linear `retryCount * 30` delay. Changed it to exponential delays of 30, 60, 120 seconds and so on, capped at SQS's 900-second maximum delay.
- The Python producer used `datetime.utcnow()`, which is deprecated in modern Python. Changed the examples to use timezone-aware `datetime.now(timezone.utc).isoformat()`.
- A Node.js producer comment said SQS message attributes were for filtering and routing. SQS receive operations do not filter by message attributes, so the comment now says consumers can inspect attributes for routing metadata.

## Review Notes
The examples intentionally omit application-specific functions such as `saveOrderToDatabase`, `processOrder`, `updateInventory`, and notification helpers. They are placeholders, not AWS API errors. FIFO queues require `MessageGroupId` when sending messages, but the post only demonstrates FIFO queue creation and does not include a FIFO send example.
