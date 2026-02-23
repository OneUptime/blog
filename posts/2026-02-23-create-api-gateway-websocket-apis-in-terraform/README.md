# How to Create API Gateway WebSocket APIs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, API Gateway, WebSocket, Serverless, Real-time, Infrastructure as Code

Description: Learn how to build real-time WebSocket APIs using AWS API Gateway v2 and Terraform, with Lambda integration, route handling, connection management, and custom domains.

---

WebSocket APIs on AWS API Gateway enable persistent, bidirectional communication between clients and your backend. Unlike REST or HTTP APIs where the client sends a request and gets a response, WebSocket connections stay open. The server can push messages to clients at any time without the client asking for them. This makes WebSocket APIs ideal for chat applications, live dashboards, real-time notifications, gaming backends, and collaborative editing tools.

AWS API Gateway v2 handles the WebSocket connection management, routing, and scaling for you. You define routes for different message types, connect them to Lambda functions (or other backends), and API Gateway takes care of the rest. In this post, we will build a complete WebSocket API in Terraform with Lambda integration, connection tracking in DynamoDB, and a custom domain.

## The WebSocket API Resource

The foundation is the `aws_apigatewayv2_api` resource with the `WEBSOCKET` protocol:

```hcl
# The WebSocket API
resource "aws_apigatewayv2_api" "websocket" {
  name                       = "realtime-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"

  tags = {
    ManagedBy = "terraform"
  }
}
```

The `route_selection_expression` tells API Gateway how to determine which route to invoke when a message arrives. With `$request.body.action`, API Gateway looks at the `action` field in the JSON message body. So a message like `{"action": "sendMessage", "text": "hello"}` would route to the `sendMessage` route.

## Connection Management with DynamoDB

WebSocket APIs have three special routes: `$connect`, `$disconnect`, and `$default`. You need to track active connections somewhere so your backend can send messages to connected clients. DynamoDB is the standard choice:

```hcl
# DynamoDB table to track active WebSocket connections
resource "aws_dynamodb_table" "connections" {
  name         = "websocket-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  # TTL to auto-clean stale connections
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Lambda Functions for Routes

Each route needs a handler. Here are the Lambda functions for connection management and message handling:

```hcl
# IAM role for Lambda functions
resource "aws_iam_role" "websocket_lambda" {
  name = "websocket-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# Policy for Lambda to access DynamoDB and manage connections
resource "aws_iam_role_policy" "websocket_lambda" {
  name = "websocket-lambda-policy"
  role = aws_iam_role.websocket_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # DynamoDB access for connection tracking
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.connections.arn
      },
      {
        # Allow sending messages back to connected clients
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "${aws_apigatewayv2_api.websocket.execution_arn}/*"
      },
      {
        # CloudWatch Logs
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda function for $connect route
resource "aws_lambda_function" "connect" {
  function_name = "websocket-connect"
  runtime       = "nodejs20.x"
  handler       = "connect.handler"
  role          = aws_iam_role.websocket_lambda.arn
  filename      = data.archive_file.connect_lambda.output_path

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Lambda function for $disconnect route
resource "aws_lambda_function" "disconnect" {
  function_name = "websocket-disconnect"
  runtime       = "nodejs20.x"
  handler       = "disconnect.handler"
  role          = aws_iam_role.websocket_lambda.arn
  filename      = data.archive_file.disconnect_lambda.output_path

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Lambda function for sendMessage route
resource "aws_lambda_function" "send_message" {
  function_name = "websocket-send-message"
  runtime       = "nodejs20.x"
  handler       = "sendMessage.handler"
  role          = aws_iam_role.websocket_lambda.arn
  filename      = data.archive_file.send_message_lambda.output_path

  environment {
    variables = {
      CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
      WEBSOCKET_API_URL = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_apigatewayv2_stage.production.name}"
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Lambda function for $default route (unmatched messages)
resource "aws_lambda_function" "default_handler" {
  function_name = "websocket-default"
  runtime       = "nodejs20.x"
  handler       = "default.handler"
  role          = aws_iam_role.websocket_lambda.arn
  filename      = data.archive_file.default_lambda.output_path

  tags = {
    ManagedBy = "terraform"
  }
}

data "aws_region" "current" {}
```

## Integrations and Routes

Now wire the Lambda functions to the WebSocket routes:

```hcl
# Integration for $connect
resource "aws_apigatewayv2_integration" "connect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.connect.invoke_arn
  integration_method = "POST"
}

# Integration for $disconnect
resource "aws_apigatewayv2_integration" "disconnect" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.disconnect.invoke_arn
  integration_method = "POST"
}

# Integration for sendMessage
resource "aws_apigatewayv2_integration" "send_message" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.send_message.invoke_arn
  integration_method = "POST"
}

# Integration for $default
resource "aws_apigatewayv2_integration" "default" {
  api_id             = aws_apigatewayv2_api.websocket.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.default_handler.invoke_arn
  integration_method = "POST"
}

# Route: $connect - fires when a client connects
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

# Route: $disconnect - fires when a client disconnects
resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

# Route: sendMessage - custom route for sending messages
resource "aws_apigatewayv2_route" "send_message" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "sendMessage"
  target    = "integrations/${aws_apigatewayv2_integration.send_message.id}"
}

# Route: $default - catches unmatched messages
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.default.id}"
}
```

## Lambda Permissions

API Gateway needs permission to invoke each Lambda function:

```hcl
# Permission for API Gateway to invoke connect Lambda
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

# Permission for sendMessage Lambda
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
  function_name = aws_lambda_function.default_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/$default"
}
```

## Stage and Deployment

Deploy the API to a stage:

```hcl
# Deployment - create a new deployment when routes change
resource "aws_apigatewayv2_deployment" "websocket" {
  api_id = aws_apigatewayv2_api.websocket.id

  # Trigger redeployment when routes or integrations change
  triggers = {
    redeployment = sha1(join(",", [
      jsonencode(aws_apigatewayv2_integration.connect),
      jsonencode(aws_apigatewayv2_integration.disconnect),
      jsonencode(aws_apigatewayv2_integration.send_message),
      jsonencode(aws_apigatewayv2_integration.default),
      jsonencode(aws_apigatewayv2_route.connect),
      jsonencode(aws_apigatewayv2_route.disconnect),
      jsonencode(aws_apigatewayv2_route.send_message),
      jsonencode(aws_apigatewayv2_route.default),
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Production stage
resource "aws_apigatewayv2_stage" "production" {
  api_id        = aws_apigatewayv2_api.websocket.id
  name          = "production"
  deployment_id = aws_apigatewayv2_deployment.websocket.id

  default_route_settings {
    throttling_burst_limit = 500
    throttling_rate_limit  = 1000
  }

  # Access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.websocket_access.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      connectionId   = "$context.connectionId"
      eventType      = "$context.eventType"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      error          = "$context.error.message"
    })
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# CloudWatch log group for access logs
resource "aws_cloudwatch_log_group" "websocket_access" {
  name              = "/aws/apigateway/websocket-production"
  retention_in_days = 30

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Custom Domain

For production, you want a custom domain instead of the auto-generated API Gateway URL:

```hcl
# Custom domain for the WebSocket API
resource "aws_apigatewayv2_domain_name" "websocket" {
  domain_name = "ws.example.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.websocket.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# Map the custom domain to the API stage
resource "aws_apigatewayv2_api_mapping" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  domain_name = aws_apigatewayv2_domain_name.websocket.id
  stage       = aws_apigatewayv2_stage.production.id
}

# DNS record pointing to the API Gateway domain
resource "aws_route53_record" "websocket" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "ws.example.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.websocket.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.websocket.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Outputs

```hcl
output "websocket_url" {
  value       = aws_apigatewayv2_stage.production.invoke_url
  description = "WebSocket connection URL"
}

output "websocket_custom_url" {
  value       = "wss://ws.example.com"
  description = "Custom domain WebSocket URL"
}

output "connection_management_url" {
  value       = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_apigatewayv2_stage.production.name}"
  description = "URL for posting messages back to connected clients"
}
```

## Testing the WebSocket API

You can test the deployed API using `wscat`:

```bash
# Install wscat
npm install -g wscat

# Connect to the WebSocket API
wscat -c wss://your-api-id.execute-api.us-east-1.amazonaws.com/production

# Send a message
> {"action": "sendMessage", "text": "Hello everyone!"}
```

## Wrapping Up

WebSocket APIs in API Gateway have more moving parts than REST or HTTP APIs because you need to manage connection state explicitly. The core pattern is: store connection IDs in DynamoDB on `$connect`, remove them on `$disconnect`, and iterate over stored connections when broadcasting messages.

The Terraform configuration follows this pattern with separate Lambda functions for each route, a DynamoDB table for connection tracking, and proper IAM permissions for the Lambda functions to both access DynamoDB and post messages back through the API Gateway management API.

Start simple with the three built-in routes plus one or two custom routes, then expand as your application grows. For related reading, see our post on [creating API Gateway with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-api-gateway-with-terraform/view) which covers REST and HTTP API types.
