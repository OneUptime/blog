# How to Create Lambda with Destinations in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Destinations, Event-Driven, SQS, SNS, EventBridge, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda destinations with Terraform to route successful and failed invocation results to SQS, SNS, Lambda, or EventBridge targets.

---

Lambda destinations extend the concept of dead letter queues by providing routing for both successful and failed asynchronous invocations. While a DLQ only captures failures, destinations let you send the results of every invocation to a target service. You can route successes to one destination and failures to another, creating powerful event-driven workflows without writing custom routing code. This guide shows you how to configure Lambda destinations with Terraform.

## How Lambda Destinations Work

When a Lambda function is invoked asynchronously, the execution result (success or failure) can be automatically sent to a destination. The destination receives a JSON record that includes the original event, the function response (for successes), and error details (for failures). This is more informative than DLQs, which only send the original event.

Supported destination types are:

- **SQS Queue** - For durable message processing
- **SNS Topic** - For fan-out to multiple subscribers
- **Lambda Function** - For chaining functions together
- **EventBridge Event Bus** - For flexible event routing

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Understanding of Lambda async invocations

## Basic Destination Configuration

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "lambda-destinations-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Permissions for destination targets
resource "aws_iam_role_policy" "lambda_destinations" {
  name = "lambda-destinations-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.success_queue.arn,
          aws_sqs_queue.failure_queue.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.processing_complete.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.post_processor.arn,
        ]
      }
    ]
  })
}

# Success destination - SQS queue
resource "aws_sqs_queue" "success_queue" {
  name                      = "lambda-success-results"
  message_retention_seconds = 86400  # 1 day
  sqs_managed_sse_enabled   = true

  tags = {
    Name    = "lambda-success-results"
    Purpose = "destination-success"
  }
}

# Failure destination - SQS queue
resource "aws_sqs_queue" "failure_queue" {
  name                      = "lambda-failure-results"
  message_retention_seconds = 1209600  # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name    = "lambda-failure-results"
    Purpose = "destination-failure"
  }
}
```

## Lambda Function with SQS Destinations

```hcl
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}

# Lambda function
resource "aws_lambda_function" "processor" {
  function_name = "event-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name = "event-processor"
  }
}

# On-success destination: send results to SQS
resource "aws_lambda_function_event_invoke_config" "processor" {
  function_name = aws_lambda_function.processor.function_name

  # Retry configuration
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600  # 1 hour max age

  # Success destination
  destination_config {
    on_success {
      destination = aws_sqs_queue.success_queue.arn
    }

    # Failure destination
    on_failure {
      destination = aws_sqs_queue.failure_queue.arn
    }
  }
}
```

## Chaining Lambda Functions with Destinations

Use Lambda destinations to create processing pipelines.

```hcl
# Post-processor Lambda (receives results from the processor)
resource "aws_lambda_function" "post_processor" {
  function_name = "post-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "postprocess.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name = "post-processor"
  }
}

# Notification handler for failures
resource "aws_lambda_function" "failure_handler" {
  function_name = "failure-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "failures.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 30
  memory_size = 128

  tags = {
    Name = "failure-handler"
  }
}

# Chain: processor -> post-processor (on success)
#        processor -> failure-handler (on failure)
resource "aws_lambda_function_event_invoke_config" "chain" {
  function_name = aws_lambda_function.processor.function_name

  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600

  destination_config {
    on_success {
      destination = aws_lambda_function.post_processor.arn
    }

    on_failure {
      destination = aws_lambda_function.failure_handler.arn
    }
  }
}
```

## Using SNS as a Destination

SNS destinations are useful when multiple systems need to be notified of results.

```hcl
# SNS topic for processing completion
resource "aws_sns_topic" "processing_complete" {
  name = "processing-complete"

  tags = {
    Name = "processing-complete"
  }
}

# Subscribe various endpoints to the success topic
resource "aws_sns_topic_subscription" "email_notification" {
  topic_arn = aws_sns_topic.processing_complete.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.processing_complete.arn
  protocol  = "https"
  endpoint  = var.webhook_url
}

variable "notification_email" {
  type = string
}

variable "webhook_url" {
  type = string
}

# Failure topic
resource "aws_sns_topic" "processing_failed" {
  name = "processing-failed"
}

# Lambda with SNS destinations
resource "aws_lambda_function_event_invoke_config" "sns_destinations" {
  function_name = aws_lambda_function.processor.function_name

  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 7200  # 2 hours

  destination_config {
    on_success {
      destination = aws_sns_topic.processing_complete.arn
    }

    on_failure {
      destination = aws_sns_topic.processing_failed.arn
    }
  }
}
```

## Using EventBridge as a Destination

EventBridge provides the most flexible routing for destination events.

```hcl
# Custom EventBridge event bus
resource "aws_cloudwatch_event_bus" "lambda_results" {
  name = "lambda-results-bus"

  tags = {
    Name = "lambda-results-bus"
  }
}

# IAM permission for Lambda to put events
resource "aws_iam_role_policy" "lambda_eventbridge" {
  name = "lambda-eventbridge-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = aws_cloudwatch_event_bus.lambda_results.arn
      }
    ]
  })
}

# Lambda with EventBridge destination
resource "aws_lambda_function_event_invoke_config" "eventbridge_destinations" {
  function_name = aws_lambda_function.processor.function_name

  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600

  destination_config {
    on_success {
      destination = aws_cloudwatch_event_bus.lambda_results.arn
    }

    on_failure {
      destination = aws_cloudwatch_event_bus.lambda_results.arn
    }
  }
}

# EventBridge rule to route success events
resource "aws_cloudwatch_event_rule" "success" {
  name           = "lambda-success-events"
  event_bus_name = aws_cloudwatch_event_bus.lambda_results.name

  event_pattern = jsonencode({
    source      = ["lambda"]
    detail-type = ["Lambda Function Invocation Result - Success"]
  })
}

# EventBridge rule to route failure events
resource "aws_cloudwatch_event_rule" "failure" {
  name           = "lambda-failure-events"
  event_bus_name = aws_cloudwatch_event_bus.lambda_results.name

  event_pattern = jsonencode({
    source      = ["lambda"]
    detail-type = ["Lambda Function Invocation Result - Failure"]
  })
}

# Route failures to a logging queue
resource "aws_cloudwatch_event_target" "failure_to_sqs" {
  rule           = aws_cloudwatch_event_rule.failure.name
  event_bus_name = aws_cloudwatch_event_bus.lambda_results.name
  arn            = aws_sqs_queue.failure_queue.arn
}
```

## Monitoring Destinations

```hcl
# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "lambda-destination-alerts"
}

# Monitor failure destination queue depth
resource "aws_cloudwatch_metric_alarm" "failure_queue_depth" {
  alarm_name          = "lambda-failure-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda failure destination has messages"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.failure_queue.name
  }
}

# Monitor function errors
resource "aws_cloudwatch_metric_alarm" "function_errors" {
  alarm_name          = "lambda-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda processor error rate is elevated"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }
}
```

## Outputs

```hcl
output "processor_function" {
  value = aws_lambda_function.processor.function_name
}

output "success_queue_url" {
  value = aws_sqs_queue.success_queue.url
}

output "failure_queue_url" {
  value = aws_sqs_queue.failure_queue.url
}
```

## Destinations vs Dead Letter Queues

Lambda destinations are the modern replacement for DLQs with several advantages. Destinations support both success and failure routing, while DLQs only capture failures. Destination payloads include the function response and error details, not just the original event. Destinations support four target types (SQS, SNS, Lambda, EventBridge) versus two for DLQs (SQS, SNS). However, DLQs are still useful when you only need failure capture and do not want to change existing configurations.

## Best Practices

When configuring Lambda destinations, prefer destinations over DLQs for new implementations since they provide more information. Use EventBridge for the most flexible routing, especially when you need to add new consumers without modifying the producer. Set appropriate `maximum_event_age_in_seconds` to discard stale events instead of processing them. Use separate queues for success and failure results to enable independent processing. Monitor failure destinations closely and treat any messages there as actionable incidents.

## Monitoring with OneUptime

Lambda destinations create event-driven workflows that need end-to-end monitoring. Use [OneUptime](https://oneuptime.com) to track the health of your entire event processing pipeline, from initial invocation through destination processing.

## Conclusion

Lambda destinations provide a powerful mechanism for building event-driven architectures without writing custom routing code. By automatically routing invocation results to SQS, SNS, Lambda, or EventBridge, you can create processing pipelines, notification systems, and failure handling workflows that are fully managed by AWS. Terraform makes the entire configuration declarative and reproducible.

For more Lambda event handling topics, see our guides on [Lambda with dead letter queues](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-dead-letter-queue-in-terraform/view) and [Lambda with event source mapping](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-event-source-mapping-in-terraform/view).
