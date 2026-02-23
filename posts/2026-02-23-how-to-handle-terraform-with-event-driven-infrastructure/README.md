# How to Handle Terraform with Event-Driven Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Event-Driven, Serverless, Lambda, Infrastructure as Code

Description: Learn how to use Terraform to build event-driven infrastructure with Lambda functions, SQS queues, EventBridge rules, SNS topics, and streaming pipelines that respond to events automatically.

---

Event-driven infrastructure processes events asynchronously through loosely coupled services. Instead of direct service-to-service calls, events flow through message queues, event buses, and streaming platforms. Terraform manages this infrastructure by defining the event sources, processing functions, routing rules, and dead-letter queues that make event-driven architectures work.

In this guide, we will cover how to build event-driven infrastructure with Terraform.

## EventBridge-Based Event Routing

```hcl
# event-driven/eventbridge.tf
# Central event bus with routing rules

resource "aws_cloudwatch_event_bus" "main" {
  name = "app-events-${var.environment}"
}

# Route order events to the order processing Lambda
resource "aws_cloudwatch_event_rule" "order_created" {
  name           = "order-created"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["app.orders"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_cloudwatch_event_target" "process_order" {
  rule           = aws_cloudwatch_event_rule.order_created.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "process-order"
  arn            = aws_lambda_function.process_order.arn

  # Dead letter queue for failed event delivery
  dead_letter_config {
    arn = aws_sqs_queue.dlq.arn
  }

  # Retry policy
  retry_policy {
    maximum_event_age_in_seconds = 3600
    maximum_retry_attempts       = 3
  }
}

# Route payment events to multiple targets
resource "aws_cloudwatch_event_rule" "payment_completed" {
  name           = "payment-completed"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["app.payments"]
    detail-type = ["PaymentCompleted"]
  })
}

# Fan-out to multiple consumers
resource "aws_cloudwatch_event_target" "update_inventory" {
  rule           = aws_cloudwatch_event_rule.payment_completed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "update-inventory"
  arn            = aws_lambda_function.update_inventory.arn
}

resource "aws_cloudwatch_event_target" "send_notification" {
  rule           = aws_cloudwatch_event_rule.payment_completed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "send-notification"
  arn            = aws_sqs_queue.notifications.arn
}
```

## Lambda Functions for Event Processing

```hcl
# event-driven/lambda.tf
# Lambda functions for event processing

resource "aws_lambda_function" "process_order" {
  function_name = "process-order-${var.environment}"
  runtime       = "python3.11"
  handler       = "handler.process_order"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
      EVENT_BUS   = aws_cloudwatch_event_bus.main.name
      DLQ_URL     = aws_sqs_queue.dlq.url
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  tracing_config {
    mode = "Active"  # X-Ray tracing for debugging
  }
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_order.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.order_created.arn
}
```

## SQS Queue Infrastructure

```hcl
# event-driven/queues.tf
# SQS queues with dead-letter queues

resource "aws_sqs_queue" "orders" {
  name                       = "orders-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20       # Long polling

  # Encryption
  sqs_managed_sse_enabled = true

  # Redrive policy to DLQ after 3 failed attempts
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = var.environment
    Purpose     = "order-processing"
  }
}

resource "aws_sqs_queue" "orders_dlq" {
  name                      = "orders-dlq-${var.environment}"
  message_retention_seconds = 1209600  # 14 days

  tags = {
    Environment = var.environment
    Purpose     = "dead-letter-queue"
  }
}

# CloudWatch alarm for DLQ messages
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "orders-dlq-has-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in DLQ indicate processing failures"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }
}
```

## SNS Topics for Fan-Out Patterns

For broadcasting events to multiple consumers, SNS topics provide reliable fan-out:

```hcl
# event-driven/sns.tf
# SNS topics for event fan-out

resource "aws_sns_topic" "order_events" {
  name = "order-events-${var.environment}"

  # Encryption at rest
  kms_master_key_id = aws_kms_key.events.id

  tags = {
    Environment = var.environment
    Purpose     = "event-fanout"
  }
}

# Subscribe multiple consumers to the same event
resource "aws_sns_topic_subscription" "order_processor" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.orders.arn

  # Filter to only receive specific event types
  filter_policy = jsonencode({
    event_type = ["order.created", "order.updated"]
  })
}

resource "aws_sns_topic_subscription" "analytics" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.analytics.arn

  # Analytics receives all events
  filter_policy = jsonencode({})
}

resource "aws_sns_topic_subscription" "notification_service" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.send_notification.arn

  filter_policy = jsonencode({
    event_type = ["order.completed", "order.failed"]
  })
}
```

## Event Schema Registry

Maintain a schema registry to ensure event consumers can parse events correctly:

```hcl
# event-driven/schema-registry.tf
# EventBridge schema registry for event contracts

resource "aws_schemas_registry" "app_events" {
  name        = "app-events-${var.environment}"
  description = "Schema registry for application events"
}

resource "aws_schemas_schema" "order_created" {
  name          = "OrderCreated"
  registry_name = aws_schemas_registry.app_events.name
  type          = "JSONSchemaDraft4"
  description   = "Schema for order created events"

  content = jsonencode({
    "$schema" = "http://json-schema.org/draft-04/schema#"
    title     = "OrderCreated"
    type      = "object"
    properties = {
      order_id    = { type = "string" }
      customer_id = { type = "string" }
      total       = { type = "number" }
      items       = { type = "array" }
      created_at  = { type = "string", format = "date-time" }
    }
    required = ["order_id", "customer_id", "total", "created_at"]
  })
}
```

## Best Practices

Always configure dead-letter queues for every event processor. Unhandled events should not be silently dropped. Monitor DLQ depth to detect processing failures early.

Use X-Ray tracing to debug event flow across services. Without tracing, debugging event-driven systems is extremely difficult because events pass through multiple services asynchronously.

Monitor queue depths and processing latencies. Growing queue depths indicate that consumers cannot keep up with producers. Set up auto-scaling for consumer functions based on queue depth.

Implement idempotent event handlers. Events may be delivered more than once, so handlers must be safe to run multiple times with the same input. Use deduplication IDs where available.

Set appropriate retry policies and timeouts. Too many retries waste resources and can create cascading failures. Too few retries lose events that could have been processed successfully on a subsequent attempt.

Use filter policies on SNS subscriptions to reduce unnecessary event processing. Not every consumer needs every event. Filtering at the subscription level is more efficient than filtering in application code.

Design events to be self-contained. Each event should carry enough information for consumers to process it without making additional API calls. This reduces coupling and improves reliability.

## Conclusion

Event-driven infrastructure with Terraform provides a scalable, loosely coupled architecture that responds to events in real time. By managing EventBridge rules, Lambda functions, SQS queues, SNS topics, and their interconnections as code, you create an event-driven system that is repeatable, testable, and maintainable. The key is thorough monitoring, proper error handling through dead-letter queues and alerting, and well-defined event schemas that ensure producers and consumers can communicate reliably.
