# How to Set Up SQS with Terraform (Standard and FIFO)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SQS, Terraform, Infrastructure as Code

Description: Learn how to provision both Standard and FIFO SQS queues with Terraform, including dead letter queues, encryption, access policies, and Lambda triggers.

---

SQS is one of the oldest and most reliable services in AWS. Whether you're decoupling microservices, buffering writes, or building event-driven pipelines, SQS queues are probably part of your infrastructure. Managing them with Terraform means you get consistent, repeatable deployments across all your environments.

This guide covers both Standard and FIFO queues, including all the production essentials: dead letter queues, encryption, access policies, and Lambda event source mappings.

## Standard Queue

Let's start with a Standard queue. Standard queues offer nearly unlimited throughput and at-least-once delivery. Messages might arrive out of order and occasionally be delivered more than once, so your consumers need to handle that.

This creates a production-ready Standard SQS queue with a dead letter queue.

```hcl
resource "aws_sqs_queue" "orders" {
  name = "orders-queue"

  # How long a consumer has to process a message before it becomes visible again
  visibility_timeout_seconds = 300  # 5 minutes

  # How long messages stay in the queue if not processed
  message_retention_seconds = 1209600  # 14 days (maximum)

  # Max message size (default is 256 KB, which is also the max)
  max_message_size = 262144

  # Long polling - reduces empty receives and lowers cost
  receive_wait_time_seconds = 20

  # Delay before messages become visible to consumers
  delay_seconds = 0

  # Server-side encryption with SQS-managed keys
  sqs_managed_sse_enabled = true

  # Dead letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 5  # Move to DLQ after 5 failed attempts
  })

  tags = {
    Environment = var.environment
    Service     = "order-processing"
  }
}

# Dead letter queue for failed messages
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "orders-queue-dlq"
  message_retention_seconds = 1209600  # Keep failed messages for 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Environment = var.environment
    Service     = "order-processing"
    Type        = "dead-letter-queue"
  }
}

# Allow the DLQ to receive messages from the main queue
resource "aws_sqs_queue_redrive_allow_policy" "orders_dlq" {
  queue_url = aws_sqs_queue.orders_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.orders.arn]
  })
}
```

A few important settings to understand:

**visibility_timeout_seconds**: When a consumer picks up a message, it becomes invisible to other consumers for this duration. Set this to at least 6x your average processing time. If the consumer doesn't delete the message within this window, it becomes visible again and another consumer can pick it up.

**receive_wait_time_seconds**: Setting this to 20 enables long polling. Instead of returning immediately when no messages are available, the ReceiveMessage call waits up to 20 seconds. This significantly reduces the number of empty receives, which saves money.

**maxReceiveCount**: After a message has been received this many times without being deleted (meaning it keeps failing), SQS moves it to the dead letter queue.

## FIFO Queue

FIFO queues guarantee exactly-once processing and strict ordering within a message group. The queue name must end with `.fifo`.

This creates a FIFO queue with content-based deduplication.

```hcl
resource "aws_sqs_queue" "payments" {
  name                        = "payments-queue.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  # FIFO throughput mode - "perQueue" or "perMessageGroupId"
  # perMessageGroupId enables high throughput mode (up to 70,000 msg/s)
  deduplication_scope   = "messageGroup"
  fifo_throughput_limit = "perMessageGroupId"

  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20

  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = var.environment
    Service     = "payment-processing"
  }
}

resource "aws_sqs_queue" "payments_dlq" {
  name                      = "payments-queue-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
```

Key FIFO concepts:

**Message Group ID**: Messages within the same group are delivered in order. Different groups can be processed in parallel. Use something like `customer_id` or `order_id` as your group ID.

**Deduplication**: FIFO queues reject duplicate messages within a 5-minute window. With `content_based_deduplication = true`, SQS uses the message body hash. Otherwise, you must provide a `MessageDeduplicationId`.

**High throughput mode**: Setting `fifo_throughput_limit` to `perMessageGroupId` enables up to 70,000 messages per second (across all message groups). The default `perQueue` limit is 3,000 messages per second.

## KMS Encryption

For workloads that require customer-managed encryption keys, use KMS instead of SQS-managed encryption.

```hcl
resource "aws_kms_key" "sqs" {
  description             = "KMS key for SQS queue encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "sqs" {
  name          = "alias/sqs-encryption"
  target_key_id = aws_kms_key.sqs.key_id
}

resource "aws_sqs_queue" "encrypted" {
  name              = "sensitive-data-queue"
  kms_master_key_id = aws_kms_key.sqs.id

  # How long SQS can reuse a data key before calling KMS again
  kms_data_key_reuse_period_seconds = 300
}
```

## Queue Access Policy

Control who can send messages to and receive messages from your queue.

This policy allows an SNS topic to send messages and a specific IAM role to consume.

```hcl
resource "aws_sqs_queue_policy" "orders" {
  queue_url = aws_sqs_queue.orders.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSNSPublish"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.orders.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.order_events.arn
          }
        }
      },
      {
        Sid    = "AllowConsumerRole"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.consumer.arn
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}
```

## Lambda Event Source Mapping

The most common consumer pattern is Lambda reading from SQS. Here's how to wire it up.

```hcl
resource "aws_lambda_event_source_mapping" "orders" {
  event_source_arn                   = aws_sqs_queue.orders.arn
  function_name                      = aws_lambda_function.order_processor.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5

  # Report individual message failures instead of failing the whole batch
  function_response_types = ["ReportBatchItemFailures"]

  # Scaling configuration
  scaling_config {
    maximum_concurrency = 50  # Max concurrent Lambda invocations
  }
}

# IAM permissions for Lambda to read from SQS
resource "aws_iam_role_policy" "lambda_sqs" {
  name = "lambda-sqs-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ]
      Resource = [
        aws_sqs_queue.orders.arn,
        aws_sqs_queue.orders_dlq.arn
      ]
    }]
  })
}
```

For more on handling batch processing and partial failures, see our guides on [processing SQS messages in batch with Lambda](https://oneuptime.com/blog/post/process-sqs-messages-batch-lambda/view) and [handling SQS partial batch failures](https://oneuptime.com/blog/post/handle-sqs-partial-batch-failures-lambda/view).

## Reusable Module

Wrap your queue configuration in a module for consistency across teams.

```hcl
# modules/sqs-queue/variables.tf
variable "name" { type = string }
variable "fifo" { type = bool; default = false }
variable "visibility_timeout" { type = number; default = 300 }
variable "max_receive_count" { type = number; default = 5 }
variable "environment" { type = string }

# modules/sqs-queue/main.tf
resource "aws_sqs_queue" "main" {
  name                       = var.fifo ? "${var.name}.fifo" : var.name
  fifo_queue                 = var.fifo
  visibility_timeout_seconds = var.visibility_timeout
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_sqs_queue" "dlq" {
  name                      = var.fifo ? "${var.name}-dlq.fifo" : "${var.name}-dlq"
  fifo_queue                = var.fifo
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = {
    Environment = var.environment
    Type        = "dead-letter-queue"
  }
}

output "queue_arn" { value = aws_sqs_queue.main.arn }
output "queue_url" { value = aws_sqs_queue.main.url }
output "dlq_arn" { value = aws_sqs_queue.dlq.arn }
```

Use it like this:

```hcl
module "orders_queue" {
  source             = "./modules/sqs-queue"
  name               = "orders"
  visibility_timeout = 300
  environment        = "production"
}

module "payments_queue" {
  source             = "./modules/sqs-queue"
  name               = "payments"
  fifo               = true
  visibility_timeout = 600
  environment        = "production"
}
```

## Wrapping Up

Terraform makes SQS setup reproducible and consistent. Whether you need Standard queues for high throughput or FIFO queues for ordered processing, the patterns are the same: create the queue, add a dead letter queue, configure encryption, set up access policies, and wire up your consumers. Use modules to enforce standards across your organization, and always enable long polling to reduce costs.
