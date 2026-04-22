# How to Create an SNS Topic with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, SNS, Messaging

Description: Learn how to create and configure an AWS Simple Notification Service (SNS) topic with subscriptions using OpenTofu for event-driven architectures.

## Introduction

Amazon SNS is a fully managed pub/sub messaging service that enables decoupled microservices, distributed systems, and serverless applications. This guide shows you how to create SNS topics and subscriptions using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured

## Step 1: Configure the Provider

```hcl
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

## Step 2: Create an SNS Topic

```hcl
# Standard SNS topic

resource "aws_sns_topic" "main" {
  name = "my-notifications-topic"

  # Enable server-side encryption using KMS
  kms_master_key_id = "alias/aws/sns"

  # FIFO topic settings
  # fifo_topic                  = false
  # content_based_deduplication = false

  tags = {
    Environment = "production"
    Purpose     = "notifications"
  }
}
```

## Step 3: Add Email Subscription

```hcl
# Email subscription - requires manual confirmation
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.main.arn
  protocol  = "email"
  endpoint  = var.notification_email
}
```

## Step 4: Add SQS Subscription

```hcl
# SQS queue to receive SNS messages
resource "aws_sqs_queue" "notifications" {
  name = "notifications-queue"
}

# SQS subscription
resource "aws_sns_topic_subscription" "sqs" {
  topic_arn            = aws_sns_topic.main.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.notifications.arn
  raw_message_delivery = true  # Deliver raw message without SNS envelope
}

# Allow SNS to send messages to SQS
resource "aws_sqs_queue_policy" "notifications" {
  queue_url = aws_sqs_queue.notifications.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.notifications.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.main.arn
          }
        }
      }
    ]
  })
}
```

## Step 5: Add Lambda Subscription

```hcl
# Lambda subscription for processing notifications
resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.main.arn
  protocol  = "lambda"
  endpoint  = var.lambda_function_arn
}

# Allow SNS to invoke Lambda
resource "aws_lambda_permission" "sns" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.main.arn
}
```

## Step 6: Set Topic Policy

```hcl
# Topic access policy
resource "aws_sns_topic_policy" "main" {
  arn = aws_sns_topic.main.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPublishFromAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:root"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.main.arn
      }
    ]
  })
}
```

## Step 7: Outputs

```hcl
output "topic_arn" {
  description = "ARN of the SNS topic"
  value       = aws_sns_topic.main.arn
}
```

## Step 8: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created an SNS topic with multiple subscription types using OpenTofu. SNS enables fan-out messaging patterns where a single message can be delivered to multiple endpoints simultaneously. For high-throughput ordered messaging, consider using SNS FIFO topics combined with SQS FIFO queues.
