# How to Create WebSocket API with API Gateway in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, WebSocket, API Gateway, AWS, Lambda, Serverless, Real-Time

Description: Learn how to create a WebSocket API using AWS API Gateway v2 and Terraform for real-time bidirectional communication in serverless applications.

---

WebSocket APIs enable real-time, bidirectional communication between clients and servers. Unlike REST APIs where the client must initiate every request, WebSocket connections stay open, allowing the server to push data to clients at any time. AWS API Gateway v2 supports WebSocket APIs, and when combined with Lambda functions for handling connections and messages, you get a fully serverless real-time communication system. Terraform makes it straightforward to define this entire stack as code.

## How WebSocket API Gateway Works

API Gateway WebSocket APIs use routes to direct messages to different Lambda functions based on the message content. There are three built-in routes: `$connect` (when a client connects), `$disconnect` (when a client disconnects), and `$default` (for messages that do not match any other route). You can also define custom routes based on a route selection expression, typically a field in the JSON message body.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and basic familiarity with Lambda functions.

## Setting Up the WebSocket API

Create the WebSocket API Gateway:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Create the WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = {
    Name = "websocket-api"
  }
}
```

The `route_selection_expression` tells API Gateway how to determine which route to use for incoming messages. With `$request.body.action`, a message like `{"action": "sendMessage", "data": "hello"}` would be routed to the `sendMessage` route.

## Creating Lambda Functions

Define the Lambda functions that handle WebSocket events:

```hcl
# IAM role for Lambda functions
resource "aws_iam_role" "lambda" {
  name = "websocket-lambda-role"

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

# Policy for Lambda to manage WebSocket connections
resource "aws_iam_role_policy" "lambda_websocket" {
  name = "websocket-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:GetItem",
        ]
        Resource = aws_dynamodb_table.connections.arn
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

# DynamoDB table to store active connections
resource "aws_dynamodb_table" "connections" {
  name         = "websocket-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  tags = { Name = "websocket-connections" }
}

# Connect handler Lambda
resource "aws_lambda_function" "connect" {
  filename         = "lambda/connect.zip"
  function_name    = "websocket-connect"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("lambda/connect.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.connections.name
    }
  }

  tags = { Name = "websocket-connect" }
}

# Disconnect handler Lambda
resource "aws_lambda_function" "disconnect" {
  filename         = "lambda/disconnect.zip"
  function_name    = "websocket-disconnect"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("lambda/disconnect.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.connections.name
    }
  }

  tags = { Name = "websocket-disconnect" }
}

# Message handler Lambda
resource "aws_lambda_function" "send_message" {
  filename         = "lambda/sendMessage.zip"
  function_name    = "websocket-send-message"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("lambda/sendMessage.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.connections.name
    }
  }

  tags = { Name = "websocket-send-message" }
}

# Default route handler Lambda
resource "aws_lambda_function" "default" {
  filename         = "lambda/default.zip"
  function_name    = "websocket-default"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("lambda/default.zip")

  tags = { Name = "websocket-default" }
}
```

## Creating Integrations

Connect the Lambda functions to the API Gateway:

```hcl
# Integration for the connect handler
resource "aws_apigatewayv2_integration" "connect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.connect.invoke_arn
}

# Integration for the disconnect handler
resource "aws_apigatewayv2_integration" "disconnect" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.disconnect.invoke_arn
}

# Integration for the send message handler
resource "aws_apigatewayv2_integration" "send_message" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.send_message.invoke_arn
}

# Integration for the default handler
resource "aws_apigatewayv2_integration" "default" {
  api_id           = aws_apigatewayv2_api.websocket.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.default.invoke_arn
}
```

## Creating Routes

Define the WebSocket routes:

```hcl
# $connect route
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

# $disconnect route
resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

# $default route (catch-all)
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.default.id}"
}

# Custom route for sending messages
resource "aws_apigatewayv2_route" "send_message" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "sendMessage"
  target    = "integrations/${aws_apigatewayv2_integration.send_message.id}"
}
```

## Lambda Permissions

Grant API Gateway permission to invoke the Lambda functions:

```hcl
# Permission for connect Lambda
resource "aws_lambda_permission" "connect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$connect"
}

# Permission for disconnect Lambda
resource "aws_lambda_permission" "disconnect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$disconnect"
}

# Permission for send message Lambda
resource "aws_lambda_permission" "send_message" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/sendMessage"
}

# Permission for default Lambda
resource "aws_lambda_permission" "default" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.default.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$default"
}
```

## Deploying the API

Create a stage and deploy the API:

```hcl
# Deploy the WebSocket API
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "production"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 500
    throttling_rate_limit  = 1000
  }

  tags = { Name = "production-stage" }
}
```

## Outputs

```hcl
output "websocket_url" {
  description = "WebSocket connection URL"
  value       = aws_apigatewayv2_stage.production.invoke_url
}

output "websocket_api_id" {
  description = "WebSocket API ID"
  value       = aws_apigatewayv2_api.websocket.id
}
```

## Monitoring WebSocket APIs

Monitor your WebSocket API connections and message throughput with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-websocket-api-with-api-gateway-in-terraform/view) to track connection counts, message delivery rates, and Lambda execution errors.

## Best Practices

Store connection IDs in DynamoDB for tracking active connections. Implement proper error handling in Lambda functions. Set throttling limits to protect against abuse. Use the `$default` route to handle unexpected message formats gracefully. Clean up stale connections by handling the `$disconnect` event properly.

## Conclusion

Creating a WebSocket API with API Gateway and Terraform gives you a fully serverless real-time communication system. The combination of API Gateway WebSocket support, Lambda functions, and DynamoDB for connection management provides a scalable architecture without any servers to manage. Terraform ensures this entire stack is defined as code, making it reproducible and easy to deploy across environments.
