# How to Create API Gateway WebSocket APIs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, WebSocket, Real-Time, Lambda, Infrastructure as Code

Description: Learn how to create an API Gateway WebSocket API with OpenTofu to enable real-time two-way communication between clients and Lambda functions for chat, notifications, and live updates.

## Introduction

API Gateway WebSocket APIs maintain persistent connections between clients and your backend, enabling real-time bidirectional communication without polling. AWS manages connection lifecycle-your Lambda functions handle `$connect`, `$disconnect`, and custom message routing events. Connection IDs allow you to push messages to connected clients while the connection remains open.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway v2, Lambda, DynamoDB, and IAM permissions
- Lambda functions for the `$connect`, `$disconnect`, and custom routes

## Step 1: Create DynamoDB Table for Connection Management

```hcl
resource "aws_dynamodb_table" "connections" {
  name         = "${var.project_name}-ws-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  ttl {
    attribute_name = "expireAt"
    enabled        = true
  }

  tags = {
    Name = "${var.project_name}-ws-connections"
  }
}
```

## Step 2: Create WebSocket API

```hcl
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${var.project_name}-websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"  # Route on the 'action' field

  tags = {
    Name = "${var.project_name}-websocket-api"
  }
}
```

## Step 3: Create Lambda Integrations and Routes

```hcl
# IAM role attached to the Lambda functions used by these WebSocket routes

resource "aws_iam_role" "websocket_lambda" {
  name = "${var.project_name}-websocket-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# These integrations assume the Lambda functions already exist and that
# their API Gateway invoke ARNs and Lambda function ARNs are passed in
# through variables.

# Connect route - triggered when client connects
resource "aws_apigatewayv2_integration" "connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.connect_lambda_invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_lambda_permission" "connect" {
  statement_id  = "AllowWebSocketConnectInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.connect_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$connect"
}

# Disconnect route
resource "aws_apigatewayv2_integration" "disconnect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.disconnect_lambda_invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

resource "aws_lambda_permission" "disconnect" {
  statement_id  = "AllowWebSocketDisconnectInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.disconnect_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$disconnect"
}

# Custom message route for chat messages
resource "aws_apigatewayv2_integration" "sendmessage" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.sendmessage_lambda_invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "sendmessage" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "sendMessage"  # Matches when request body contains {"action": "sendMessage"}
  target    = "integrations/${aws_apigatewayv2_integration.sendmessage.id}"
}

resource "aws_lambda_permission" "sendmessage" {
  statement_id  = "AllowWebSocketSendMessageInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.sendmessage_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/sendMessage"
}
```

## Step 4: Grant Permissions to Push Messages Back to Clients

```hcl
resource "aws_iam_role_policy" "websocket_callback" {
  name = "websocket-callback"
  role = aws_iam_role.websocket_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["execute-api:ManageConnections"]
        # ARN pattern for sending messages to connections
        Resource = "${aws_apigatewayv2_stage.prod.execution_arn}/POST/@connections/*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Scan"]
        Resource = aws_dynamodb_table.connections.arn
      }
    ]
  })
}
```

## Step 5: Create Stage

```hcl
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 1000
    logging_level          = "INFO"
    data_trace_enabled     = false
  }
}

output "websocket_url" {
  value = "${aws_apigatewayv2_stage.prod.invoke_url}"
  # Format: wss://{api-id}.execute-api.{region}.amazonaws.com/prod
}
```

## Step 6: Deploy and Test

```bash
tofu init
tofu plan
tofu apply

# Test WebSocket connection
wscat -c wss://{api-id}.execute-api.us-east-1.amazonaws.com/prod
# Send a message: {"action": "sendMessage", "data": "hello"}
```

## Conclusion

WebSocket APIs on API Gateway handle connection lifecycle management, allowing Lambda functions to focus on business logic. Store connection IDs in DynamoDB to broadcast messages to multiple clients. The `execute-api:ManageConnections` permission enables Lambda to push messages to any connected client using the POST callback URL pattern. Use connection TTL in DynamoDB to eventually clean up stale connection records.
