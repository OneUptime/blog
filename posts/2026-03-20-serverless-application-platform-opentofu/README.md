# How to Build a Serverless Application Platform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Serverless, Lambda, API Gateway, SQS, Infrastructure as Code

Description: Learn how to build a serverless application platform on AWS with OpenTofu using Lambda, API Gateway, SQS, DynamoDB, and EventBridge for event-driven architecture.

## Introduction

A serverless application platform provides the foundational services for building event-driven, serverless applications: Lambda for compute, API Gateway for HTTP APIs, SQS for message queuing, DynamoDB for low-latency data storage, and EventBridge for event routing. This guide provisions a complete serverless platform.

## DynamoDB Table

```hcl
resource "aws_dynamodb_table" "app" {
  name         = "myapp-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1"
    projection_type = "ALL"

    key_schema {
      attribute_name = "gsi1pk"
      key_type       = "HASH"
    }
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## SQS Queues with Dead Letter Queues

```hcl
resource "aws_sqs_queue" "main" {
  name                       = "myapp-${var.environment}-main"
  visibility_timeout_seconds = 1800   # 6x Lambda timeout
  message_retention_seconds  = 86400  # 1 day
  receive_wait_time_seconds  = 20     # long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })

  kms_master_key_id = aws_kms_key.sqs.id
}

resource "aws_sqs_queue" "dlq" {
  name                      = "myapp-${var.environment}-main-dlq"
  message_retention_seconds = 1209600  # 14 days for investigation
}

resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "myapp-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in DLQ - investigate failed processing"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = { QueueName = aws_sqs_queue.dlq.name }
}
```

## Lambda Functions

```hcl
locals {
  lambda_functions = {
    api_handler = {
      handler  = "api.handler"
      memory   = 512
      timeout  = 30
    }
    event_processor = {
      handler  = "processor.handler"
      memory   = 256
      timeout  = 300
    }
    scheduled_job = {
      handler  = "scheduler.handler"
      memory   = 256
      timeout  = 900
    }
  }
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name = "myapp-${var.environment}-${each.key}"
  s3_bucket     = aws_s3_bucket.lambda_code.bucket
  s3_key        = "${each.key}.zip"
  handler       = each.value.handler
  runtime       = "nodejs22.x"
  role          = aws_iam_role.lambda.arn
  memory_size   = each.value.memory
  timeout       = each.value.timeout

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      TABLE_NAME     = aws_dynamodb_table.app.name
      QUEUE_URL      = aws_sqs_queue.main.url
    }
  }

  tracing_config {
    mode = "Active"  # X-Ray tracing
  }
}

# SQS → Lambda event source mapping

resource "aws_lambda_event_source_mapping" "sqs_processor" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.functions["event_processor"].arn
  batch_size       = 10

  function_response_types = ["ReportBatchItemFailures"]  # partial batch failure support
}
```

## HTTP API Gateway

```hcl
resource "aws_apigatewayv2_api" "app" {
  name          = "myapp-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Api-Key"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.app.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      latency        = "$context.integrationLatency"
    })
  }
}

resource "aws_apigatewayv2_integration" "api_handler" {
  api_id                 = aws_apigatewayv2_api.app.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.functions["api_handler"].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.app.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api_handler.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["api_handler"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.app.execution_arn}/*/*"
}
```

## EventBridge for Event Routing

```hcl
resource "aws_cloudwatch_event_bus" "app" {
  name = "myapp-${var.environment}"
}

resource "aws_cloudwatch_event_rule" "order_created" {
  event_bus_name = aws_cloudwatch_event_bus.app.name
  name           = "order-created"

  event_pattern = jsonencode({
    source      = ["myapp.orders"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_cloudwatch_event_target" "order_processor" {
  event_bus_name = aws_cloudwatch_event_bus.app.name
  rule           = aws_cloudwatch_event_rule.order_created.name
  target_id      = "process-order"
  arn            = aws_lambda_function.functions["event_processor"].arn
}

resource "aws_lambda_permission" "eventbridge_order_processor" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["event_processor"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.order_created.arn
}
```

## Summary

A serverless application platform uses DynamoDB for low-latency data storage with point-in-time recovery, SQS with dead letter queues for reliable message processing, Lambda functions for compute with X-Ray tracing, HTTP API Gateway with CORS configuration, and EventBridge for event-driven routing between services. Configure SQS `ReportBatchItemFailures` on Lambda event source mappings and return `batchItemFailures` from the function to enable partial batch failure handling - failed messages return to the queue for retry rather than causing successfully processed messages to be retried with the entire batch.
