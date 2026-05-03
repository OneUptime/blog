# How to Create AWS SQS FIFO Queues with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SQS, FIFO, Infrastructure as Code

Description: Learn how to create AWS SQS FIFO queues with OpenTofu for ordered, exactly-once message processing with deduplication and content-based grouping.

SQS FIFO queues guarantee message ordering within a group and exactly-once processing. They're ideal for financial transactions, order processing, and any workflow where message sequence matters. Managing them in OpenTofu ensures consistent queue configuration across environments.

## Creating a FIFO Queue

```hcl
resource "aws_sqs_queue" "orders" {
  name                        = "orders.fifo"  # Must end with .fifo
  fifo_queue                  = true
  content_based_deduplication = true  # Hash message body for dedup ID

  # Message visibility timeout (how long a consumer has to process)
  visibility_timeout_seconds = 300  # 5 minutes

  # How long messages are retained
  message_retention_seconds = 86400  # 24 hours

  # Maximum time a consumer waits for a message (long polling)
  receive_wait_time_seconds = 20

  tags = {
    Environment = "production"
    Team        = "backend"
  }
}
```

## FIFO Queue with Dead Letter Queue

```hcl
# Dead letter queue for failed messages

resource "aws_sqs_queue" "orders_dlq" {
  name       = "orders-dlq.fifo"
  fifo_queue = true

  # Retain failed messages for 14 days for investigation
  message_retention_seconds = 1209600

  tags = {
    Environment = "production"
  }
}

resource "aws_sqs_queue" "orders_with_dlq" {
  name                        = "orders.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failed attempts
  })
}
```

## FIFO Queue with Explicit Deduplication

```hcl
# Deduplication based on message deduplication ID (not content hash)
resource "aws_sqs_queue" "payments" {
  name                        = "payments.fifo"
  fifo_queue                  = true
  content_based_deduplication = false  # Use explicit deduplication IDs

  visibility_timeout_seconds = 60
  message_retention_seconds  = 3600

  # Deduplication window: 5 minutes
  # Messages with the same dedup ID within 5 min are deduplicated
}
```

## Encryption

```hcl
resource "aws_sqs_queue" "orders_encrypted" {
  name                        = "orders-encrypted.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  # KMS encryption
  kms_master_key_id                 = aws_kms_key.sqs.arn
  kms_data_key_reuse_period_seconds = 300
}
```

## Queue Access Policy

```hcl
resource "aws_sqs_queue_policy" "orders" {
  queue_url = aws_sqs_queue.orders.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSendFromOrderService"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.order_service.arn
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.orders.arn
      },
      {
        Sid    = "AllowReceiveFromFulfillmentService"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.fulfillment_service.arn
        }
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}
```

## Lambda Trigger from FIFO Queue

```hcl
resource "aws_lambda_event_source_mapping" "orders" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.process_orders.arn

  # FIFO-specific settings
  batch_size = 10

  # Report individual message failures (partial batch responses)
  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 5  # Limit concurrent executions for FIFO ordering
  }
}
```

## Conclusion

SQS FIFO queues in OpenTofu provide ordered, exactly-once message processing for critical workloads. Enable content-based deduplication for simplicity or use explicit deduplication IDs for control. Always configure a dead letter queue to capture failed messages, and limit Lambda concurrency on FIFO queue triggers to preserve message group ordering.
