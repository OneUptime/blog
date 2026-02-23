# How to Build a Message Queue Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Message Queue, SQS, SNS, RabbitMQ, AWS, Infrastructure Patterns

Description: Build robust message queue infrastructure with Terraform using SQS, SNS, Amazon MQ, dead letter queues, and fan-out patterns for reliable async communication.

---

Message queues are the backbone of loosely coupled architectures. They let services communicate without knowing about each other, handle traffic spikes by buffering messages, and provide reliability through guaranteed delivery. Whether you are processing orders, sending notifications, or coordinating microservices, you need message queues.

In this guide, we will build a comprehensive message queue infrastructure on AWS using Terraform. We will cover SQS for point-to-point messaging, SNS for pub/sub, and Amazon MQ for teams that need RabbitMQ compatibility.

## SQS Queues

Amazon SQS is the workhorse of AWS messaging. Let us build a reusable module for creating queues with proper dead letter handling:

```hcl
# modules/sqs_queue/main.tf

# Dead letter queue catches messages that fail processing
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = 1209600 # 14 days max retention
  kms_master_key_id         = var.kms_key_id

  tags = merge(var.tags, {
    Type = "dead-letter-queue"
  })
}

# Main processing queue
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout
  message_retention_seconds  = var.message_retention
  delay_seconds              = var.delay_seconds
  receive_wait_time_seconds  = 20 # Long polling for efficiency
  max_message_size           = var.max_message_size

  kms_master_key_id                 = var.kms_key_id
  kms_data_key_reuse_period_seconds = 300

  # Send failed messages to the DLQ after max_receive_count attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Type = "processing-queue"
  })
}

# CloudWatch alarm when DLQ has messages
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.queue_name}-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Dead letter queue ${var.queue_name}-dlq has messages"
  alarm_actions       = var.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }
}

# Alarm when processing queue depth grows too large
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "${var.queue_name}-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = var.queue_depth_threshold
  alarm_description   = "Queue ${var.queue_name} depth exceeds threshold"
  alarm_actions       = var.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.main.name
  }
}
```

## FIFO Queues

When message ordering matters, use FIFO queues:

```hcl
resource "aws_sqs_queue" "fifo" {
  name                        = "${var.queue_name}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  deduplication_scope         = "messageGroup"
  fifo_throughput_limit       = "perMessageGroupId"

  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600 # 4 days

  kms_master_key_id = var.kms_key_id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "fifo_dlq" {
  name       = "${var.queue_name}-dlq.fifo"
  fifo_queue = true

  kms_master_key_id = var.kms_key_id
}
```

## SNS Topics for Fan-Out

SNS enables the fan-out pattern where one message goes to multiple consumers:

```hcl
# SNS topic for order events
resource "aws_sns_topic" "order_events" {
  name              = "${var.project_name}-order-events"
  kms_master_key_id = aws_kms_key.messaging.arn

  tags = {
    Purpose = "order-event-fanout"
  }
}

# Email notification service subscribes to order events
resource "aws_sns_topic_subscription" "email_service" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = module.email_queue.queue_arn

  # Filter to only receive order confirmation events
  filter_policy = jsonencode({
    event_type = ["order.confirmed", "order.shipped"]
  })

  raw_message_delivery = true
}

# Inventory service subscribes to order events
resource "aws_sns_topic_subscription" "inventory_service" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = module.inventory_queue.queue_arn

  filter_policy = jsonencode({
    event_type = ["order.confirmed", "order.cancelled"]
  })

  raw_message_delivery = true
}

# Analytics service gets all events
resource "aws_sns_topic_subscription" "analytics_service" {
  topic_arn            = aws_sns_topic.order_events.arn
  protocol             = "sqs"
  endpoint             = module.analytics_queue.queue_arn
  raw_message_delivery = true
}

# SQS policy allowing SNS to send messages
resource "aws_sqs_queue_policy" "sns_to_sqs" {
  for_each = {
    email     = module.email_queue.queue_url
    inventory = module.inventory_queue.queue_url
    analytics = module.analytics_queue.queue_url
  }

  queue_url = each.value

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSPublish"
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = "*"
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

## Deploying the Queues

Use the module to create all your application queues:

```hcl
module "order_processing_queue" {
  source                = "./modules/sqs_queue"
  queue_name            = "${var.project_name}-order-processing"
  visibility_timeout    = 60
  message_retention     = 345600
  max_receive_count     = 5
  kms_key_id            = aws_kms_key.messaging.arn
  queue_depth_threshold = 1000
  alarm_actions         = [aws_sns_topic.alerts.arn]
  tags                  = local.common_tags
}

module "email_queue" {
  source                = "./modules/sqs_queue"
  queue_name            = "${var.project_name}-email-notifications"
  visibility_timeout    = 30
  message_retention     = 86400
  max_receive_count     = 3
  kms_key_id            = aws_kms_key.messaging.arn
  queue_depth_threshold = 500
  alarm_actions         = [aws_sns_topic.alerts.arn]
  tags                  = local.common_tags
}

module "inventory_queue" {
  source                = "./modules/sqs_queue"
  queue_name            = "${var.project_name}-inventory-updates"
  visibility_timeout    = 45
  message_retention     = 345600
  max_receive_count     = 5
  kms_key_id            = aws_kms_key.messaging.arn
  queue_depth_threshold = 2000
  alarm_actions         = [aws_sns_topic.alerts.arn]
  tags                  = local.common_tags
}
```

## Amazon MQ for RabbitMQ

If your team already uses RabbitMQ and wants a managed service:

```hcl
resource "aws_mq_broker" "rabbitmq" {
  broker_name = "${var.project_name}-rabbitmq"
  engine_type = "RabbitMQ"
  engine_version = "3.12"
  host_instance_type = "mq.m5.large"
  deployment_mode = "CLUSTER_MULTI_AZ"

  subnet_ids         = var.private_subnet_ids
  security_groups    = [aws_security_group.mq.id]

  user {
    username = var.mq_username
    password = var.mq_password
  }

  encryption_options {
    use_aws_owned_key = false
    kms_key_id        = aws_kms_key.messaging.arn
  }

  logs {
    general = true
  }

  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }
}

resource "aws_security_group" "mq" {
  name_prefix = "${var.project_name}-mq-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    security_groups = var.app_security_group_ids
    description     = "AMQPS from application"
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.app_security_group_ids
    description     = "Management console"
  }
}
```

## Lambda Consumer Integration

Connect Lambda functions as queue consumers for serverless processing:

```hcl
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn                   = module.order_processing_queue.queue_arn
  function_name                      = aws_lambda_function.order_processor.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 50
  }
}
```

For monitoring your message queue health, see [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

Message queues are essential for building reliable, loosely coupled systems. The Terraform infrastructure we built covers SQS for point-to-point messaging, SNS for fan-out patterns, FIFO queues for ordered delivery, and Amazon MQ for RabbitMQ compatibility. Every queue gets a dead letter queue and monitoring alarms, because unprocessed messages are one of the most common sources of silent data loss. Define your messaging infrastructure in Terraform, and you get consistency, auditability, and the confidence that comes from having everything in code.
