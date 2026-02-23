# How to Build an Event-Driven Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Event-Driven Architecture, AWS, SNS, SQS, Lambda, Infrastructure as Code

Description: A practical guide to building event-driven architecture on AWS using Terraform with SNS, SQS, Lambda, and EventBridge for scalable asynchronous systems.

---

Event-driven architecture has become the go-to pattern for building scalable, loosely coupled systems. Instead of services calling each other directly, they communicate through events. This means each service can scale independently, fail gracefully, and evolve without breaking its neighbors.

In this guide, we will build a complete event-driven architecture on AWS using Terraform. We will use SNS for fan-out, SQS for reliable message delivery, EventBridge for event routing, and Lambda for event processing.

## The Architecture Overview

Our event-driven system will have the following components:

- An API Gateway that accepts incoming requests and publishes events
- EventBridge as the central event bus for routing
- SNS topics for fan-out to multiple subscribers
- SQS queues for reliable message processing
- Lambda functions for event processing
- DynamoDB for event storage
- A dead letter queue for failed messages

## Setting Up the Event Bus

EventBridge is the backbone of our architecture. It receives events and routes them to the right targets based on rules.

```hcl
# eventbridge.tf - Central event bus
resource "aws_cloudwatch_event_bus" "main" {
  name = "${var.project_name}-events"

  tags = {
    Environment = var.environment
    Purpose     = "EventDrivenArchitecture"
  }
}

# Archive all events for replay capability
resource "aws_cloudwatch_event_archive" "main" {
  name             = "${var.project_name}-event-archive"
  event_source_arn = aws_cloudwatch_event_bus.main.arn
  retention_days   = 90
}

# Schema discovery - automatically detects event schemas
resource "aws_schemas_discoverer" "main" {
  source_arn  = aws_cloudwatch_event_bus.main.arn
  description = "Auto-discover event schemas"
}
```

## Event Routing Rules

EventBridge rules determine where events go based on their content. This is where the real power of event-driven architecture comes in.

```hcl
# rules.tf - Event routing rules
# Route order events to the order processing pipeline
resource "aws_cloudwatch_event_rule" "order_events" {
  name           = "order-events"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["com.myapp.orders"]
    detail-type = ["OrderCreated", "OrderUpdated", "OrderCancelled"]
  })
}

# Send order events to the processing SNS topic
resource "aws_cloudwatch_event_target" "order_to_sns" {
  rule           = aws_cloudwatch_event_rule.order_events.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "order-sns-target"
  arn            = aws_sns_topic.order_events.arn
}

# Route user events to the user service pipeline
resource "aws_cloudwatch_event_rule" "user_events" {
  name           = "user-events"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["com.myapp.users"]
    detail-type = ["UserRegistered", "UserUpdated", "UserDeleted"]
  })
}

resource "aws_cloudwatch_event_target" "user_to_sns" {
  rule           = aws_cloudwatch_event_rule.user_events.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "user-sns-target"
  arn            = aws_sns_topic.user_events.arn
}
```

## SNS Topics for Fan-Out

SNS topics allow a single event to be delivered to multiple subscribers. This is how you decouple producers from consumers.

```hcl
# sns.tf - Fan-out topics
resource "aws_sns_topic" "order_events" {
  name = "${var.project_name}-order-events"

  # Enable server-side encryption
  kms_master_key_id = aws_kms_key.events.id

  tags = {
    Domain = "Orders"
  }
}

resource "aws_sns_topic" "user_events" {
  name = "${var.project_name}-user-events"

  kms_master_key_id = aws_kms_key.events.id

  tags = {
    Domain = "Users"
  }
}

# Allow EventBridge to publish to SNS
resource "aws_sns_topic_policy" "order_events" {
  arn = aws_sns_topic.order_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.order_events.arn
      }
    ]
  })
}
```

## SQS Queues with Dead Letter Queues

Each consumer gets its own SQS queue. Failed messages go to a dead letter queue so you never lose events.

```hcl
# sqs.tf - Consumer queues with DLQ
# Dead letter queue for failed messages
resource "aws_sqs_queue" "order_processing_dlq" {
  name                      = "${var.project_name}-order-processing-dlq"
  message_retention_seconds = 1209600 # 14 days

  kms_master_key_id = aws_kms_key.events.id

  tags = {
    Purpose = "DeadLetterQueue"
    Domain  = "Orders"
  }
}

# Main processing queue
resource "aws_sqs_queue" "order_processing" {
  name                       = "${var.project_name}-order-processing"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400 # 1 day

  kms_master_key_id = aws_kms_key.events.id

  # Send failed messages to DLQ after 3 attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_processing_dlq.arn
    maxReceiveCount     = 3
  })
}

# Subscribe the queue to the SNS topic
resource "aws_sns_topic_subscription" "order_processing" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.order_processing.arn

  # Filter to only receive specific event types
  filter_policy = jsonencode({
    detail-type = ["OrderCreated", "OrderUpdated"]
  })
}

# Notification queue - subscribes to the same topic
resource "aws_sqs_queue" "order_notifications" {
  name                       = "${var.project_name}-order-notifications"
  visibility_timeout_seconds = 60

  kms_master_key_id = aws_kms_key.events.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_processing_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sns_topic_subscription" "order_notifications" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.order_notifications.arn
}

# Allow SNS to send messages to SQS
resource "aws_sqs_queue_policy" "order_processing" {
  queue_url = aws_sqs_queue.order_processing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.order_processing.arn
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

## Lambda Event Processors

Lambda functions process events from the SQS queues. The event source mapping connects the queue to the function.

```hcl
# lambda.tf - Event processing functions
resource "aws_lambda_function" "order_processor" {
  filename         = "order_processor.zip"
  function_name    = "${var.project_name}-order-processor"
  role             = aws_iam_role.order_processor.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      EVENT_TABLE = aws_dynamodb_table.events.name
      ENVIRONMENT = var.environment
    }
  }

  # Run inside VPC for database access
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Connect SQS queue to Lambda
resource "aws_lambda_event_source_mapping" "order_processor" {
  event_source_arn                   = aws_sqs_queue.order_processing.arn
  function_name                      = aws_lambda_function.order_processor.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5

  # Process events in order within each message group
  function_response_types = ["ReportBatchItemFailures"]
}

# Notification processor
resource "aws_lambda_function" "notification_sender" {
  filename      = "notification_sender.zip"
  function_name = "${var.project_name}-notification-sender"
  role          = aws_iam_role.notification_sender.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 128

  environment {
    variables = {
      SES_FROM_EMAIL = var.notification_email
    }
  }
}

resource "aws_lambda_event_source_mapping" "notification_sender" {
  event_source_arn = aws_sqs_queue.order_notifications.arn
  function_name    = aws_lambda_function.notification_sender.arn
  batch_size       = 1
}
```

## Event Store with DynamoDB

Keeping an event store lets you replay events and debug issues.

```hcl
# dynamodb.tf - Event store
resource "aws_dynamodb_table" "events" {
  name         = "${var.project_name}-event-store"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "eventId"
  range_key    = "timestamp"

  attribute {
    name = "eventId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "aggregateId"
    type = "S"
  }

  # Query events by aggregate (e.g., all events for an order)
  global_secondary_index {
    name            = "aggregate-index"
    hash_key        = "aggregateId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Encrypt with customer managed key
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.events.arn
  }

  # TTL for automatic cleanup of old events
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Purpose = "EventStore"
  }
}
```

## API Gateway for Event Ingestion

The API Gateway provides an HTTP endpoint for publishing events into the system.

```hcl
# api.tf - Event ingestion endpoint
resource "aws_apigatewayv2_api" "events" {
  name          = "${var.project_name}-event-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "events" {
  api_id      = aws_apigatewayv2_api.events.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      status         = "$context.status"
    })
  }
}

resource "aws_apigatewayv2_integration" "events" {
  api_id             = aws_apigatewayv2_api.events.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.event_publisher.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "publish_event" {
  api_id    = aws_apigatewayv2_api.events.id
  route_key = "POST /events"
  target    = "integrations/${aws_apigatewayv2_integration.events.id}"
}
```

## Monitoring the Event Pipeline

You need visibility into your event pipeline to catch problems early. Set up CloudWatch alarms for key metrics.

```hcl
# monitoring.tf - Event pipeline monitoring
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in dead letter queue - events are failing"

  dimensions = {
    QueueName = aws_sqs_queue.order_processing_dlq.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Key Takeaways

Building an event-driven architecture with Terraform gives you a reproducible, version-controlled infrastructure. The main components fit together naturally: EventBridge routes events, SNS fans them out, SQS ensures reliable delivery, and Lambda processes them.

The dead letter queues are critical. Never build an event-driven system without them, because messages will fail and you need a place for them to go.

For monitoring your event-driven infrastructure in production, tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can help you track message throughput, detect failures, and alert your team before small issues become big problems.
