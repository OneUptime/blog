# How to Create an SQS Queue with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, SQS, Messaging

Description: Learn how to create and configure an AWS Simple Queue Service (SQS) standard and FIFO queues with dead-letter queues using OpenTofu.

## Introduction

Amazon SQS is a fully managed message queuing service that enables decoupled and fault-tolerant distributed systems. This guide covers creating standard queues, FIFO queues, and dead-letter queues using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured

## Step 1: Configure the Provider

```hcl
variable "aws_region" {
  description = "AWS Region for the SQS queues"
  type        = string
  default     = "us-east-1"
}

variable "publisher_role_arn" {
  description = "IAM role ARN allowed to publish to the queue"
  type        = string
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Create a Dead-Letter Queue

```hcl
# Dead-letter queue for failed message processing

resource "aws_sqs_queue" "dlq" {
  name = "my-queue-dlq"

  # Retain messages for 14 days (maximum)
  message_retention_seconds = 1209600

  tags = {
    Purpose = "dead-letter-queue"
  }
}
```

## Step 3: Create the Main Standard Queue

```hcl
resource "aws_sqs_queue" "main" {
  name = "my-main-queue"

  # Message visibility timeout (seconds)
  # Should be > Lambda timeout or processing time
  visibility_timeout_seconds = 30

  # How long messages are retained
  message_retention_seconds = 86400  # 1 day

  # Maximum message size (bytes)
  max_message_size = 262144  # 256 KiB

  # Long polling - wait time for receiving messages
  receive_wait_time_seconds = 20

  # Server-side encryption
  sqs_managed_sse_enabled = true

  # Dead-letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5  # Move to DLQ when ReceiveCount exceeds 5
  })

  tags = {
    Environment = "production"
  }
}
```

## Step 4: Create a FIFO Queue

```hcl
# FIFO queue for ordered message processing
resource "aws_sqs_queue" "fifo" {
  name                        = "my-queue.fifo"  # FIFO queues must end in .fifo
  fifo_queue                  = true
  content_based_deduplication = true  # Auto-dedup based on message body

  # FIFO DLQ
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "fifo_dlq" {
  name       = "my-queue-dlq.fifo"
  fifo_queue = true
}
```

## Step 5: Set Queue Policy

```hcl
resource "aws_sqs_queue_policy" "main" {
  queue_url = aws_sqs_queue.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = var.publisher_role_arn }
        Action    = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
        Resource  = aws_sqs_queue.main.arn
      }
    ]
  })
}
```

## Step 6: Outputs

```hcl
output "queue_url" {
  value = aws_sqs_queue.main.url
}

output "queue_arn" {
  value = aws_sqs_queue.main.arn
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created SQS queues using OpenTofu, including standard queues with dead-letter queues and FIFO queues for ordered processing. The dead-letter queue pattern is critical for handling failed message processing without data loss. Enable long polling to reduce empty receive calls and lower costs.
