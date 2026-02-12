# How to Set Up SNS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SNS, Terraform, Infrastructure as Code

Description: A step-by-step guide to provisioning and configuring Amazon SNS topics, subscriptions, and policies using Terraform for reproducible infrastructure.

---

Setting up SNS through the AWS console is quick, but it doesn't scale. When you're managing dozens of topics across multiple environments, clicking through a UI becomes a liability. Terraform lets you define your SNS infrastructure as code - version controlled, reviewable, and repeatable across dev, staging, and production.

Let's build out a complete SNS setup with Terraform, covering topics, subscriptions, access policies, filtering, and dead letter queues.

## Basic Topic Setup

Let's start with the simplest possible SNS topic.

This creates a standard SNS topic with a display name.

```hcl
resource "aws_sns_topic" "order_events" {
  name         = "order-events"
  display_name = "Order Events"

  tags = {
    Environment = var.environment
    Team        = "platform"
  }
}
```

That's it for a basic topic. But in production, you'll want more. Let's add encryption, delivery policies, and logging.

## Production-Ready Topic

This configuration adds KMS encryption, delivery status logging, and a custom delivery policy.

```hcl
resource "aws_sns_topic" "order_events" {
  name         = "order-events"
  display_name = "Order Events"

  # Encrypt messages at rest with KMS
  kms_master_key_id = aws_kms_key.sns.id

  # Delivery status logging
  sqs_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  sqs_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  sqs_success_feedback_sample_rate = 100

  lambda_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  lambda_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  lambda_success_feedback_sample_rate = 100

  http_success_feedback_role_arn    = aws_iam_role.sns_logging.arn
  http_failure_feedback_role_arn    = aws_iam_role.sns_logging.arn
  http_success_feedback_sample_rate = 50

  # Custom delivery policy for HTTP subscribers
  delivery_policy = jsonencode({
    http = {
      defaultHealthyRetryPolicy = {
        minDelayTarget     = 20
        maxDelayTarget     = 20
        numRetries         = 3
        numMaxDelayRetries = 0
        numNoDelayRetries  = 0
        backoffFunction    = "linear"
      }
      disableSubscriptionOverrides = false
    }
  })

  tags = {
    Environment = var.environment
    Team        = "platform"
  }
}

# KMS key for SNS encryption
resource "aws_kms_key" "sns" {
  description             = "KMS key for SNS topic encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow SNS to use the key"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## FIFO Topics

When you need message ordering and deduplication, use a FIFO topic. The name must end with `.fifo`.

```hcl
resource "aws_sns_topic" "payment_events" {
  name                        = "payment-events.fifo"
  fifo_topic                  = true
  content_based_deduplication = true

  tags = {
    Environment = var.environment
  }
}
```

Content-based deduplication uses a SHA-256 hash of the message body to detect duplicates within the 5-minute deduplication window. If your messages might have identical bodies but different meanings (like multiple heartbeat messages), set this to `false` and provide a `MessageDeduplicationId` when publishing.

## Adding Subscriptions

Subscriptions connect your topic to consumers. Let's set up several types.

### SQS Subscription

This is the most common pattern. SNS delivers to an SQS queue for reliable buffering.

```hcl
resource "aws_sqs_queue" "fulfillment" {
  name                       = "fulfillment-queue"
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fulfillment_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_sqs_queue" "fulfillment_dlq" {
  name = "fulfillment-dlq"
}

resource "aws_sns_topic_subscription" "fulfillment" {
  topic_arn            = aws_sns_topic.order_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.fulfillment.arn
  raw_message_delivery = true  # Deliver the raw message, not wrapped in SNS envelope

  # Only receive specific event types
  filter_policy = jsonencode({
    event_type = ["order_placed", "order_updated"]
  })

  # Dead letter queue for failed deliveries
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sns_dlq.arn
  })
}

# SQS policy to allow SNS to send messages
resource "aws_sqs_queue_policy" "fulfillment" {
  queue_url = aws_sqs_queue.fulfillment.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.fulfillment.arn
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = aws_sns_topic.order_events.arn
        }
      }
    }]
  })
}
```

### Lambda Subscription

```hcl
resource "aws_sns_topic_subscription" "processor" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.processor.arn
}

# Lambda permission to allow SNS to invoke
resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.order_events.arn
}
```

### Email Subscription

```hcl
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "oncall@example.com"
}
```

Note that email subscriptions require manual confirmation. The recipient will receive an email and must click the confirmation link. Terraform can't automate this step.

## Filter Policies

Filter policies let subscribers receive only the messages they care about. SNS evaluates the filter against message attributes.

This filter policy uses the newer filter policy scope feature to filter on the message body.

```hcl
resource "aws_sns_topic_subscription" "high_value_orders" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.high_value.arn

  # Filter on message body (not just attributes)
  filter_policy_scope = "MessageBody"
  filter_policy = jsonencode({
    total = [{ numeric = [">", 1000] }]
    country = ["US", "CA", "UK"]
  })
}
```

## Topic Access Policy

Control who can publish to and subscribe to your topic.

This policy allows a specific AWS account to publish and specific services to subscribe.

```hcl
resource "aws_sns_topic_policy" "order_events" {
  arn = aws_sns_topic.order_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPublishFromOrderService"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/order-service"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.order_events.arn
      },
      {
        Sid    = "AllowSubscribeFromSameAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "SNS:Subscribe",
          "SNS:Receive"
        ]
        Resource = aws_sns_topic.order_events.arn
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.order_events.arn
      }
    ]
  })
}
```

## Module for Reuse

If you're creating many topics with similar configurations, wrap it in a Terraform module.

This module creates a topic with standard settings and optional SQS subscriptions.

```hcl
# modules/sns-topic/main.tf

variable "name" {
  type = string
}

variable "environment" {
  type = string
}

variable "kms_key_id" {
  type    = string
  default = null
}

variable "sqs_subscriptions" {
  type = map(object({
    queue_arn     = string
    filter_policy = optional(string, null)
    raw_delivery  = optional(bool, true)
  }))
  default = {}
}

resource "aws_sns_topic" "this" {
  name              = var.name
  kms_master_key_id = var.kms_key_id

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_sns_topic_subscription" "sqs" {
  for_each = var.sqs_subscriptions

  topic_arn            = aws_sns_topic.this.arn
  protocol             = "sqs"
  endpoint             = each.value.queue_arn
  raw_message_delivery = each.value.raw_delivery
  filter_policy        = each.value.filter_policy
}

output "topic_arn" {
  value = aws_sns_topic.this.arn
}
```

Use the module like this:

```hcl
module "order_events" {
  source      = "./modules/sns-topic"
  name        = "order-events"
  environment = "production"
  kms_key_id  = aws_kms_key.sns.id

  sqs_subscriptions = {
    fulfillment = {
      queue_arn     = aws_sqs_queue.fulfillment.arn
      filter_policy = jsonencode({ event_type = ["order_placed"] })
    }
    notifications = {
      queue_arn = aws_sqs_queue.notifications.arn
    }
  }
}
```

## Monitoring the Setup

Once your infrastructure is deployed, make sure you're monitoring it. For detailed guidance on tracking delivery metrics and setting up alarms, check out our post on [monitoring SNS with CloudWatch](https://oneuptime.com/blog/post/monitor-sns-cloudwatch/view).

## Wrapping Up

Terraform gives you reproducible, version-controlled SNS infrastructure. Start with the basics - topic, subscriptions, and access policies - then layer in encryption, delivery logging, and filter policies as your needs grow. Use modules to standardize configurations across teams, and always include dead letter queues for production subscriptions. Your future self will thank you when you need to spin up a new environment or debug a delivery issue.
