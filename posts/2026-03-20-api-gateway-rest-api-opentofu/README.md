# How to Create REST API Gateway with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, REST API, Lambda, Infrastructure as Code

Description: Learn how to create an API Gateway REST API with Lambda integrations, CORS support, and deployment stages using OpenTofu.

## Introduction

API Gateway REST API provides a fully managed service for creating, publishing, and maintaining HTTP APIs. It integrates natively with Lambda for serverless backends, supports request/response transformations, throttling, caching, and custom authorizers for a complete API management solution.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway and Lambda permissions
- An existing Lambda function
- If you enable API Gateway access logging, an API Gateway CloudWatch Logs role configured for the AWS account in that Region

## Step 1: Create REST API

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "REST API for ${var.project_name}"

  endpoint_configuration {
    types = ["REGIONAL"]  # or "EDGE" for CloudFront distribution, "PRIVATE" for VPC only
  }

  tags = {
    Name        = "${var.project_name}-api"
    Environment = var.environment
  }
}
```

## Step 2: Create Resources and Methods

```hcl
# /users resource

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "users"
}

# GET /users
resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"  # Or "AWS_IAM", "COGNITO_USER_POOLS", "CUSTOM"
}

# Lambda integration for GET /users
resource "aws_api_gateway_integration" "get_users" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.users.id
  http_method             = aws_api_gateway_method.get_users.http_method
  integration_http_method = "POST"  # Lambda is always invoked with POST
  type                    = "AWS_PROXY"  # Proxy passes full request to Lambda
  uri                     = var.lambda_function_invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/${aws_api_gateway_method.get_users.http_method}${aws_api_gateway_resource.users.path}"
}
```

## Step 3: Enable CORS

```hcl
# For Lambda proxy integrations, your Lambda function must also return
# Access-Control-Allow-Origin, Access-Control-Allow-Methods, and
# Access-Control-Allow-Headers in its responses.

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "users_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "users_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_options.http_method
  type        = "MOCK"
  passthrough_behavior = "NEVER"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "users_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "users_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_options.http_method
  status_code = aws_api_gateway_method_response.users_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
```

## Step 4: Create Stage Deployment

```hcl
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.users,
      aws_api_gateway_method.get_users,
      aws_api_gateway_integration.get_users,
      aws_api_gateway_method.users_options,
      aws_api_gateway_integration.users_options,
      aws_api_gateway_method_response.users_options_200,
      aws_api_gateway_integration_response.users_options,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }

  xray_tracing_enabled = true

  tags = {
    Name = "${var.project_name}-api-prod"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the API
curl https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/users
```

## Conclusion

API Gateway REST APIs provide comprehensive API management with built-in throttling, caching, and monitoring. Use `AWS_PROXY` integration for Lambda to pass the full request context and avoid complex mapping templates. Deploy a stage for each environment (dev/staging/prod) and use stage variables to configure environment-specific settings like Lambda aliases or backend endpoints.
