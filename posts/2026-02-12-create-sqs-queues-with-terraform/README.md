# How to Create SQS Queues with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, SQS, Messaging

Description: Learn how to create and configure Amazon SQS queues with Terraform, including dead-letter queues, FIFO queues, encryption, and access policies.

---

Amazon SQS is the easiest way to decouple services on AWS. Need to process work asynchronously? Throw a message on a queue and let a worker pick it up. Need to absorb traffic spikes? Queue the requests and process them at your own pace. SQS handles the complexity of distributed messaging so you don't have to.

In this post, we'll create SQS queues with Terraform, covering standard and FIFO queues, dead-letter queues, encryption, and the access policies that tie everything together.

## Standard Queue

A standard queue provides at-least-once delivery with best-effort ordering. It's the default and handles the vast majority of use cases.

This creates a standard SQS queue with reasonable defaults:

```hcl
# Standard SQS queue
resource "aws_sqs_queue" "orders" {
  name = "order-processing"

  # How long a consumer has to process a message before it becomes
  # visible again (in seconds)
  visibility_timeout_seconds = 60

  # How long messages stay in the queue if not consumed (in seconds)
  # Maximum is 14 days (1209600)
  message_retention_seconds = 86400  # 1 day

  # Maximum message size in bytes (max 256 KB)
  max_message_size = 262144

  # Long polling - wait up to 20 seconds for messages
  # This reduces empty responses and API costs
  receive_wait_time_seconds = 20

  # Delay delivery of new messages (0-900 seconds)
  delay_seconds = 0

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

The `visibility_timeout_seconds` setting is critical. Set it to at least as long as your longest expected processing time. If a consumer takes longer than this, the message becomes visible again and another consumer picks it up, causing duplicate processing.

`receive_wait_time_seconds = 20` enables long polling. Without it, consumers make frequent empty requests to SQS, which costs money. Long polling is almost always what you want.

## Dead-Letter Queue

When messages fail processing repeatedly, they should go somewhere instead of bouncing around forever. That's what a dead-letter queue (DLQ) is for.

First create the DLQ, then configure the main queue to send failed messages to it:

```hcl
# Dead-letter queue for failed messages
resource "aws_sqs_queue" "orders_dlq" {
  name = "order-processing-dlq"

  # Keep failed messages longer so you can investigate
  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = "production"
    Purpose     = "dead-letter-queue"
    ManagedBy   = "terraform"
  }
}

# Main queue with DLQ configured
resource "aws_sqs_queue" "orders" {
  name = "order-processing"

  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20

  # Send messages to DLQ after 3 failed processing attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Allow the DLQ to accept messages back from the main queue
resource "aws_sqs_queue_redrive_allow_policy" "orders_dlq" {
  queue_url = aws_sqs_queue.orders_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.orders.arn]
  })
}
```

The `maxReceiveCount` of 3 means a message gets three chances to be processed. If it fails all three times, it goes to the DLQ. You can then inspect the DLQ, fix the issue, and redrive the messages back.

## FIFO Queue

When message ordering and exactly-once processing matter, use a FIFO queue. FIFO queue names must end with `.fifo`.

This creates a FIFO queue with content-based deduplication:

```hcl
# FIFO queue for ordered, exactly-once processing
resource "aws_sqs_queue" "transactions" {
  name                        = "payment-transactions.fifo"
  fifo_queue                  = true
  content_based_deduplication = true

  # Throughput settings for high-throughput FIFO
  deduplication_scope   = "messageGroup"
  fifo_throughput_limit = "perMessageGroupId"

  visibility_timeout_seconds = 120
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# DLQ for FIFO queue must also be FIFO
resource "aws_sqs_queue" "transactions_dlq" {
  name       = "payment-transactions-dlq.fifo"
  fifo_queue = true

  message_retention_seconds = 1209600
}
```

Important: a FIFO DLQ must also be a FIFO queue. You can't mix standard and FIFO for redrive policies.

The `deduplication_scope = "messageGroup"` and `fifo_throughput_limit = "perMessageGroupId"` settings enable high-throughput mode. This gives you up to 3,000 messages per second per message group, compared to 300 messages per second without it.

## Encryption

SQS supports server-side encryption using either the SQS-managed key or your own KMS key:

```hcl
# Queue with KMS encryption
resource "aws_sqs_queue" "encrypted" {
  name = "sensitive-data-queue"

  # Use a custom KMS key for encryption
  kms_master_key_id                 = aws_kms_key.sqs.id
  kms_data_key_reuse_period_seconds = 300  # Cache data keys for 5 minutes

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Or use SQS-managed encryption (simpler, no KMS costs)
resource "aws_sqs_queue" "sse_encrypted" {
  name                    = "sse-encrypted-queue"
  sqs_managed_sse_enabled = true
}
```

If you don't need to manage the key yourself, `sqs_managed_sse_enabled = true` is the simplest option.

## Queue Policies

Queue policies control who can send messages to or receive messages from your queue. This is especially important for cross-account access or when other AWS services need to publish to your queue.

This policy allows an SNS topic to send messages to the queue:

```hcl
# Allow SNS to publish to this queue
resource "aws_sqs_queue_policy" "sns_access" {
  queue_url = aws_sqs_queue.orders.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSPublish"
        Effect    = "Allow"
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
      }
    ]
  })
}
```

For setting up SNS topics to publish to SQS, see our post on [creating SNS topics with Terraform](https://oneuptime.com/blog/post/create-sns-topics-with-terraform/view).

## Lambda Integration

SQS and Lambda work great together. The event source mapping triggers your Lambda function whenever messages arrive:

```hcl
# Lambda event source mapping for SQS
resource "aws_lambda_event_source_mapping" "sqs_to_lambda" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 10
  enabled          = true

  # Wait up to 5 seconds to build a batch
  maximum_batching_window_in_seconds = 5

  # Report individual message failures instead of failing the whole batch
  function_response_types = ["ReportBatchItemFailures"]
}
```

The `ReportBatchItemFailures` option is important. Without it, if one message in a batch fails, the entire batch gets retried. With it, your Lambda can report exactly which messages failed, and only those get retried.

## Using Variables for Reusable Queues

Here's a pattern for creating queue pairs (main + DLQ) that you can reuse:

```hcl
variable "queue_name" {
  type = string
}

variable "max_receive_count" {
  type    = number
  default = 3
}

# DLQ
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

# Main queue
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}
```

## Monitoring Considerations

SQS provides useful CloudWatch metrics out of the box. The ones you should always monitor are:

- **ApproximateNumberOfMessagesVisible** - messages waiting to be processed
- **ApproximateAgeOfOldestMessage** - how long the oldest message has been waiting
- **NumberOfMessagesSent** to the DLQ - indicates processing failures

If the oldest message age keeps growing, your consumers aren't keeping up. If your DLQ is getting messages, something's failing repeatedly. Both are worth alerting on.

## Wrapping Up

SQS is one of those AWS services that just works. Create a queue, wire up a producer and consumer, and you've got reliable async processing. Always use long polling, always set up a dead-letter queue, and don't forget to tune your visibility timeout. It's a simple service, but those settings make a big difference in how well your system behaves under load.
