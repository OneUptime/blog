# How to Create SQS Queues with Dead Letter Queues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SQS, Dead Letter Queue, Messaging, Infrastructure as Code, Reliability

Description: Learn how to create AWS SQS queues with dead letter queues (DLQ) using OpenTofu to ensure reliable message processing and isolate failed messages for investigation.

---

Dead letter queues (DLQs) capture messages that couldn't be successfully processed after a maximum number of receive attempts. Without DLQs, failed messages can be retried until they either process successfully or expire from the source queue's retention period. OpenTofu makes DLQ setup a standard part of every queue configuration.

## Creating a Queue with DLQ

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Create the Dead Letter Queue first
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "${var.environment}-orders-dlq"
  message_retention_seconds = 1209600  # Keep failed messages for 14 days

  # Encrypt at rest
  kms_master_key_id = "alias/aws/sqs"

  tags = merge(var.common_tags, {
    Purpose = "Dead letter queue for orders processor"
  })
}

# 2. Create the main processing queue with DLQ configured
resource "aws_sqs_queue" "orders" {
  name                       = "${var.environment}-orders"
  visibility_timeout_seconds = 300   # 5 minutes - should be >= 6x Lambda timeout + batch window
  message_retention_seconds  = 86400 # 1 day
  receive_wait_time_seconds  = 20    # Long polling - reduces empty receives

  kms_master_key_id = "alias/aws/sqs"

  # Redrive policy routes failed messages to the DLQ
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failed processing attempts
  })

  tags = var.common_tags
}
```

## FIFO Queue with DLQ

```hcl
# fifo_queue.tf
# FIFO DLQ must also be FIFO
resource "aws_sqs_queue" "payments_dlq" {
  name       = "${var.environment}-payments-dlq.fifo"  # Must end in .fifo
  fifo_queue = true
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "payments" {
  name                        = "${var.environment}-payments.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_dlq.arn
    maxReceiveCount     = 5
  })
}
```

## Queue Access Policies

```hcl
# policies.tf
# Allow the application role to send and receive messages
resource "aws_iam_policy" "orders_processor" {
  name        = "OrdersQueueProcessorPolicy"
  description = "Permission to read from orders queue"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility",
        ]
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}

resource "aws_iam_policy" "orders_producer" {
  name = "OrdersQueueProducerPolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
      Resource = aws_sqs_queue.orders.arn
    }]
  })
}
```

## CloudWatch Alarms for DLQ Depth

```hcl
# monitoring.tf
# Alert when messages land in the DLQ - this usually indicates processing failures
resource "aws_cloudwatch_metric_alarm" "orders_dlq_not_empty" {
  alarm_name          = "${var.environment}-orders-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0  # Alert on ANY message in the DLQ

  alarm_description = "Messages are in the orders DLQ - investigate processing failures"
  alarm_actions     = [var.alert_sns_topic_arn]
  ok_actions        = [var.alert_sns_topic_arn]

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }
}
```

## Best Practices

- Alert when any message lands in a DLQ - in most production workflows, it means something went wrong in processing and should be investigated.
- Set `maxReceiveCount` based on your processing idempotency - 3 is a common default.
- Set `visibility_timeout_seconds` to at least 6x your Lambda function timeout, plus `MaximumBatchingWindowInSeconds`, to reduce premature retries. Keep the handler idempotent because duplicate processing can still occur.
- Use long polling (`receive_wait_time_seconds = 20`) to reduce empty receives and SQS costs.
- Use DLQ redrive (replay) in the SQS console to reprocess failed messages after fixing the bug that caused them to fail.
