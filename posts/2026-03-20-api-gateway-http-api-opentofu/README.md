# How to Create API Gateway HTTP API with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, HTTP API, Lambda, Low Latency, Infrastructure as Code

Description: Learn how to create an API Gateway HTTP API with OpenTofu for lower latency and cost compared to REST APIs, with JWT authorizers and Lambda integrations.

## Introduction

API Gateway HTTP API is a newer, simpler alternative to REST API with at least 71% lower cost and up to 60% lower latency. It supports JWT authorizers natively, automatic CORS, and Lambda proxy integrations. Use HTTP API when you don't need REST API-specific features like API keys, usage plans and per-client throttling, request validation, private API endpoints, or caching.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway v2, Lambda, and CloudWatch Logs permissions

## Step 1: Create HTTP API with CORS

```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
  description   = "HTTP API for ${var.project_name}"

  # Automatic CORS configuration (much simpler than REST API)
  cors_configuration {
    allow_headers = ["Content-Type", "Authorization", "X-Api-Key"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = var.cors_allow_origins  # e.g., ["https://app.example.com"]
    max_age       = 3600
  }

  tags = {
    Name        = "${var.project_name}-http-api"
    Environment = var.environment
  }
}
```

## Step 2: Create Lambda Integration

```hcl
# Lambda integration

resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda_function_invoke_arn
  integration_method = "POST"

  payload_format_version = "2.0"  # v2.0 is simpler for Lambda
}

# Lambda permission for HTTP API
resource "aws_lambda_permission" "http_api" {
  statement_id  = "AllowHTTPAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}
```

## Step 3: Create Routes

```hcl
# GET /users route
resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# POST /users route
resource "aws_apigatewayv2_route" "create_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# Catch-all route
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

## Step 4: JWT Authorizer

```hcl
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "jwt-authorizer"

  jwt_configuration {
    audience = [var.cognito_user_pool_client_id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}
```

## Step 5: Create Stage with Logging

```hcl
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "prod"
  auto_deploy = true  # Automatically deploy on configuration changes

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
    })
  }

  default_route_settings {
    throttling_burst_limit = 5000
    throttling_rate_limit  = 1000
  }

  tags = {
    Name = "${var.project_name}-http-api-prod"
  }
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.prod.invoke_url
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the endpoint
curl -H "Authorization: Bearer <token>" \
  "$(tofu output -raw api_endpoint)/users"
```

## Conclusion

API Gateway HTTP APIs are the recommended choice for new Lambda-based APIs due to their lower cost, lower latency, and simpler configuration. The JWT authorizer natively integrates with Cognito and any OpenID Connect provider without Lambda authorizer overhead. Use `auto_deploy = true` for simple setups and development stages, but consider disabling it for production to control deployment timing.
