# How to Create AWS API Gateway HTTP APIs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, HTTP API, Lambda, Infrastructure as Code

Description: Learn how to create AWS API Gateway HTTP APIs with OpenTofu for low-latency, cost-effective API hosting with JWT authorization, CORS, and Lambda integrations.

HTTP APIs are a newer API Gateway offering with lower cost, lower latency, and simpler configuration than REST APIs. They support JWT authorizers, CORS configuration, automatic deployments, and Lambda proxy integrations. Use HTTP APIs for new projects unless you specifically need REST API features like request validation models or API caching.

## HTTP API with Lambda Integration

```hcl
# Create the HTTP API

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.service_name}-http-api"
  protocol_type = "HTTP"
  description   = "HTTP API for ${var.service_name}"

  # Enable CORS for browser clients
  cors_configuration {
    allow_origins     = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Request-Id"]
    expose_headers    = ["X-Request-Id"]
    allow_credentials = true
    max_age           = 3600
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.api.invoke_arn

  payload_format_version = "2.0"  # HTTP API uses format 2.0 (simpler event structure)
  timeout_milliseconds   = 29000  # HTTP APIs support up to 30 seconds
}

# Route: GET /users
resource "aws_apigatewayv2_route" "get_users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# Route: POST /users
resource "aws_apigatewayv2_route" "create_user" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# Catch-all route for application-level 404 handling
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

## JWT Authorizer

```hcl
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "jwt-authorizer"

  jwt_configuration {
    audience = [var.jwt_audience]  # Client ID from Cognito or Auth0
    issuer   = var.jwt_issuer      # e.g., "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx"
  }
}
```

## Stage with Auto-Deploy

```hcl
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "production"
  auto_deploy = true  # Automatically deploy on changes (no manual deployment needed)

  # Access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
      responseLatency    = "$context.responseLatency"
      errorMessage       = "$context.error.message"
    })
  }

  default_route_settings {
    throttling_burst_limit   = 5000   # Concurrent requests
    throttling_rate_limit    = 10000  # Requests per second
    detailed_metrics_enabled = true
  }
}

# Allow API Gateway to invoke the Lambda function
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowHTTPAPIInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Multiple Lambda Integrations by Route

```hcl
locals {
  routes = {
    "GET /users" = {
      invoke_arn    = aws_lambda_function.list_users.invoke_arn
      function_name = aws_lambda_function.list_users.function_name
    }
    "POST /users" = {
      invoke_arn    = aws_lambda_function.create_user.invoke_arn
      function_name = aws_lambda_function.create_user.function_name
    }
    "GET /users/{id}" = {
      invoke_arn    = aws_lambda_function.get_user.invoke_arn
      function_name = aws_lambda_function.get_user.function_name
    }
    "PUT /users/{id}" = {
      invoke_arn    = aws_lambda_function.update_user.invoke_arn
      function_name = aws_lambda_function.update_user.function_name
    }
    "DELETE /users/{id}" = {
      invoke_arn    = aws_lambda_function.delete_user.invoke_arn
      function_name = aws_lambda_function.delete_user.function_name
    }
  }
}

resource "aws_apigatewayv2_integration" "functions" {
  for_each = local.routes

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "functions" {
  for_each = local.routes

  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.functions[each.key].id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# Allow API Gateway to invoke each Lambda function
resource "aws_lambda_permission" "functions" {
  for_each = local.routes

  statement_id  = "AllowHTTPAPIInvoke-${md5(each.key)}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Custom Domain

```hcl
resource "aws_apigatewayv2_domain_name" "main" {
  domain_name = "api.${var.domain_name}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.main.id
  stage       = aws_apigatewayv2_stage.production.id
}
```

## Conclusion

AWS API Gateway HTTP APIs in OpenTofu offer the simplest and most cost-effective path to Lambda-powered APIs. Use JWT authorizers with Cognito or Auth0 for authentication, configure CORS in the API resource rather than handling it in each Lambda, and use auto_deploy on stages for instant deployments. For microservice architectures, use for_each to define route-to-function mappings declaratively and scale to dozens of routes without repetitive configuration.
