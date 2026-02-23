# How to Build a WebSocket Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, WebSocket, Real-Time, AWS, API Gateway

Description: A practical guide to building WebSocket infrastructure with Terraform using API Gateway WebSocket APIs, Lambda handlers, DynamoDB for connection management, and monitoring.

---

Real-time communication is everywhere. Chat applications, live dashboards, collaborative editing, stock tickers, gaming - they all need the server to push data to clients without waiting for a request. WebSockets provide that persistent, bidirectional connection. Building the infrastructure to support WebSockets at scale requires careful planning, and Terraform makes it reproducible. In this post, we will build a complete WebSocket infrastructure on AWS.

## Why WebSockets over Polling?

Long polling works, but it wastes resources. Each poll is a new HTTP request with all its overhead. WebSockets establish a single connection that stays open, allowing the server to push messages instantly. The latency difference is dramatic - milliseconds instead of seconds.

## Architecture Overview

Our WebSocket infrastructure includes:

- API Gateway WebSocket API
- Lambda functions for connect, disconnect, and message handling
- DynamoDB table for connection management
- SQS for message buffering
- CloudWatch monitoring and alarms
- Custom domain with TLS

## API Gateway WebSocket API

The WebSocket API in API Gateway handles connection lifecycle and message routing.

```hcl
# WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Deployment stage
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "production"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.websocket.arn
    format = jsonencode({
      requestId     = "$context.requestId"
      ip            = "$context.identity.sourceIp"
      requestTime   = "$context.requestTime"
      eventType     = "$context.eventType"
      routeKey      = "$context.routeKey"
      status        = "$context.status"
      connectionId  = "$context.connectionId"
    })
  }

  default_route_settings {
    throttling_burst_limit = 500
    throttling_rate_limit  = 100
  }
}
```

## Connection Management with DynamoDB

You need to track active connections so you know where to send messages.

```hcl
# DynamoDB table for tracking WebSocket connections
resource "aws_dynamodb_table" "connections" {
  name         = "websocket-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "roomId"
    type = "S"
  }

  # Find all connections for a user
  global_secondary_index {
    name            = "userId-index"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  # Find all connections in a room/channel
  global_secondary_index {
    name            = "roomId-index"
    hash_key        = "roomId"
    projection_type = "ALL"
  }

  # TTL to clean up stale connections
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}
```

## Lambda Handlers

Each WebSocket lifecycle event gets its own Lambda function.

```hcl
# Shared IAM role for WebSocket Lambda functions
resource "aws_iam_role" "websocket_lambda" {
  name = "websocket-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "websocket_lambda" {
  name = "websocket-lambda-policy"
  role = aws_iam_role.websocket_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
        ]
        Resource = [
          aws_dynamodb_table.connections.arn,
          "${aws_dynamodb_table.connections.arn}/index/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections",
        ]
        Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Connect handler - fires when a client connects
resource "aws_lambda_function" "ws_connect" {
  filename         = "ws_connect.zip"
  function_name    = "websocket-connect"
  role             = aws_iam_role.websocket_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

# Disconnect handler - fires when a client disconnects
resource "aws_lambda_function" "ws_disconnect" {
  filename         = "ws_disconnect.zip"
  function_name    = "websocket-disconnect"
  role             = aws_iam_role.websocket_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}

# Message handler - processes incoming messages
resource "aws_lambda_function" "ws_message" {
  filename         = "ws_message.zip"
  function_name    = "websocket-message"
  role             = aws_iam_role.websocket_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
      WEBSOCKET_ENDPOINT = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.production.name}"
    }
  }
}

# Default handler - catches unrouted messages
resource "aws_lambda_function" "ws_default" {
  filename         = "ws_default.zip"
  function_name    = "websocket-default"
  role             = aws_iam_role.websocket_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }
}
```

## Route Integrations

Connect the routes to their Lambda handlers.

```hcl
# Connect route integration
resource "aws_apigatewayv2_integration" "ws_connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_connect.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

# Disconnect route integration
resource "aws_apigatewayv2_integration" "ws_disconnect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_disconnect.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_disconnect.id}"
}

# Message route integration
resource "aws_apigatewayv2_integration" "ws_message" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_message.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_sendmessage" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "sendmessage"
  target    = "integrations/${aws_apigatewayv2_integration.ws_message.id}"
}

# Default route integration
resource "aws_apigatewayv2_integration" "ws_default" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ws_default.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.ws_default.id}"
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "ws_connect" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
}

resource "aws_lambda_permission" "ws_disconnect" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
}

resource "aws_lambda_permission" "ws_message" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
}

resource "aws_lambda_permission" "ws_default" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_default.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
}
```

## Message Queue for Fan-Out

When broadcasting to many connections, use SQS to buffer messages and avoid Lambda timeouts.

```hcl
# SQS queue for message fan-out
resource "aws_sqs_queue" "broadcast" {
  name                       = "websocket-broadcast"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 3600
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.broadcast_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "broadcast_dlq" {
  name                      = "websocket-broadcast-dlq"
  message_retention_seconds = 86400
}

# Lambda function to process broadcast messages
resource "aws_lambda_function" "broadcast" {
  filename         = "ws_broadcast.zip"
  function_name    = "websocket-broadcast"
  role             = aws_iam_role.websocket_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      CONNECTIONS_TABLE   = aws_dynamodb_table.connections.name
      WEBSOCKET_ENDPOINT  = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.production.name}"
    }
  }
}

# SQS trigger for broadcast Lambda
resource "aws_lambda_event_source_mapping" "broadcast" {
  event_source_arn = aws_sqs_queue.broadcast.arn
  function_name    = aws_lambda_function.broadcast.arn
  batch_size       = 10
}
```

## Monitoring

Track connection counts, message throughput, and errors.

```hcl
# CloudWatch log group
resource "aws_cloudwatch_log_group" "websocket" {
  name              = "/aws/apigateway/websocket"
  retention_in_days = 30
}

# Connection count alarm
resource "aws_cloudwatch_metric_alarm" "ws_connections" {
  alarm_name          = "websocket-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ConnectCount"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10000
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.websocket.id
  }
}

# Message error alarm
resource "aws_cloudwatch_metric_alarm" "ws_errors" {
  alarm_name          = "websocket-message-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MessageCount"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.websocket.id
  }
}
```

## Wrapping Up

WebSocket infrastructure on AWS involves more moving pieces than a simple REST API, but the pattern is clean once you understand it. API Gateway handles the connection lifecycle. Lambda functions process events. DynamoDB tracks active connections. SQS handles broadcasting at scale.

The beauty of defining all of this in Terraform is reproducibility. You can spin up identical WebSocket environments for dev, staging, and production with different variables. Connection management, message routing, and monitoring all come preconfigured.

For monitoring WebSocket connection health, message latency, and error rates in real-time, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-websocket-infrastructure-with-terraform/view) for comprehensive real-time infrastructure observability.
