# How to Create AWS SNS Topics and Subscriptions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SNS, Notification, Infrastructure as Code, Pub/Sub

Description: Learn how to create AWS SNS topics, configure subscriptions for email, SQS, Lambda, and HTTP endpoints, and manage access policies with OpenTofu.

## Introduction

Amazon Simple Notification Service (SNS) is a managed pub/sub messaging service. OpenTofu lets you declare SNS topics and their subscriptions as code, enabling consistent notification infrastructure across environments.

## Creating an SNS Topic

```hcl
# Standard SNS topic with server-side encryption

resource "aws_sns_topic" "alerts" {
  name              = "application-alerts"
  kms_master_key_id = "alias/aws/sns"  # enable SSE

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Configuring a Topic Access Policy

Restrict which services and accounts can publish to the topic.

```hcl
resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "SNS:Publish"
        Resource  = aws_sns_topic.alerts.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:cloudwatch:${var.region}:${var.account_id}:alarm:*"
          }
        }
      }
    ]
  })
}
```

## Email Subscription

```hcl
# Email subscription – requires manual confirmation by the recipient
resource "aws_sns_topic_subscription" "email_ops" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "ops-team@example.com"
}
```

## SQS Subscription

Connect SNS to an SQS queue for fan-out messaging patterns.

```hcl
resource "aws_sqs_queue" "alerts_queue" {
  name = "alerts-processing-queue"
}

resource "aws_sns_topic_subscription" "sqs_alerts" {
  topic_arn            = aws_sns_topic.alerts.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.alerts_queue.arn
  raw_message_delivery = true  # skip SNS JSON envelope
}

# Allow SNS to send messages to SQS
resource "aws_sqs_queue_policy" "alerts_queue" {
  queue_url = aws_sqs_queue.alerts_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.alerts_queue.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.alerts.arn }
      }
    }]
  })
}
```

## Lambda Subscription

Invoke a Lambda function when messages arrive on the topic.

```hcl
resource "aws_sns_topic_subscription" "lambda_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_processor.arn
  depends_on = [aws_lambda_permission.sns_invoke]
}

# Grant SNS permission to invoke the Lambda
resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}
```

## FIFO Topic for Ordered Messaging

```hcl
resource "aws_sns_topic" "ordered_events" {
  name                        = "order-events.fifo"
  fifo_topic                  = true
  content_based_deduplication = true
}
```

## Variables and Outputs

```hcl
variable "environment" { type = string }
variable "region"      { type = string }
variable "account_id"  { type = string }

output "topic_arn" {
  value = aws_sns_topic.alerts.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

OpenTofu makes it straightforward to manage SNS topics and their subscriptions as code. By combining topics, access policies, and subscriptions you can build reliable fan-out notification systems for alarms, events, and inter-service communication.
