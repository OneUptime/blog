# How to Create SNS Topics and Subscriptions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SNS, Pub/Sub, Messaging, Infrastructure as Code, Notification

Description: Learn how to create AWS SNS topics, subscriptions, and access policies using OpenTofu for reliable pub/sub messaging between services and notification delivery.

---

Amazon SNS is the fully managed pub/sub messaging service that fans out messages to multiple subscribers simultaneously. With OpenTofu, you define your entire messaging topology - topics, subscriptions, filter policies, and access controls - as reproducible infrastructure code.

## Creating SNS Topics

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

# Standard topic for application notifications
resource "aws_sns_topic" "notifications" {
  name         = "${var.environment}-app-notifications"
  display_name = "Application Notifications"

  # Enable server-side encryption. Use a customer-managed KMS key
  # if AWS services such as CloudWatch alarms publish to this topic.
  kms_master_key_id = var.sns_kms_key_id

  tags = var.common_tags
}

# FIFO topic for ordered, deduplicated delivery to FIFO-compatible subscribers
resource "aws_sns_topic" "orders_fifo" {
  name                        = "${var.environment}-orders.fifo"  # Must end in .fifo
  fifo_topic                  = true
  content_based_deduplication = true

  tags = var.common_tags
}
```

## Creating Subscriptions

```hcl
# subscriptions.tf
# Email subscription for operational notifications
resource "aws_sns_topic_subscription" "ops_email" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# SQS subscription for application processing
resource "aws_sqs_queue" "processor" {
  name = "${var.environment}-notification-processor"
}

resource "aws_sqs_queue_policy" "processor_policy" {
  queue_url = aws_sqs_queue.processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.processor.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.notifications.arn
        }
      }
    }]
  })
}

resource "aws_sns_topic_subscription" "sqs_processor" {
  topic_arn            = aws_sns_topic.notifications.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.processor.arn
  raw_message_delivery = true  # Send raw message without SNS JSON wrapper
}

# Lambda subscription
resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.notifications.arn
}

resource "aws_sns_topic_subscription" "lambda" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.processor.arn
}

# HTTPS webhook subscription
resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "https"
  endpoint  = var.webhook_url
}
```

## Message Filter Policies

Filter policies let each subscriber receive only the messages it cares about.

```hcl
# filter_policies.tf
# This SQS queue only receives order.created events for high-value orders
resource "aws_sns_topic_subscription" "high_value_orders" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.high_value_processor.arn

  filter_policy = jsonencode({
    event_type = ["order.created"]
    order_value = [{ numeric = [">", 1000] }]  # Only orders over $1000
  })

  filter_policy_scope = "MessageAttributes"
}
```

## Topic Access Policy

```hcl
# access_policy.tf
# Allow specific AWS services to publish to the topic
resource "aws_sns_topic_policy" "notifications" {
  arn = aws_sns_topic.notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCurrentAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "SNS:*"
        Resource = aws_sns_topic.notifications.arn
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.notifications.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alarm:*"
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

## Best Practices

- Use SQS as a subscriber rather than HTTP/HTTPS for reliable processing - SQS buffers messages and handles retries automatically.
- Use `raw_message_delivery = true` for SQS subscribers when your consumer doesn't need SNS metadata.
- Set filter policies to route messages to the right subscribers without building complex routing logic in consumers.
- Enable KMS encryption for topics containing sensitive business data.
- Use FIFO topics with SQS FIFO subscribers when strict ordering and duplicate suppression are required (e.g., financial transactions).
