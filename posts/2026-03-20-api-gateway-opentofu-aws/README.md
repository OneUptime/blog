# How to Set Up an API Gateway with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, API Gateway, Serverless

Description: Learn how to create and configure an AWS API Gateway (REST or HTTP API) using OpenTofu, including routes, integrations, and deployment stages.

## Introduction

AWS API Gateway is a fully managed service that enables you to create, publish, maintain, and secure APIs at any scale. OpenTofu makes it straightforward to define API Gateway resources in code, enabling consistent deployments across environments.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured
- An existing Lambda function

## Step 1: Configure the Provider

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Create an HTTP API Gateway (API GW v2)

```hcl
# HTTP API Gateway - lower latency, lower cost than REST API
resource "aws_apigatewayv2_api" "main" {
  name          = "my-http-api"
  protocol_type = "HTTP"
  description   = "My HTTP API backed by Lambda"

  # CORS configuration
  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["https://myapp.example.com"]
    max_age       = 300
  }

  tags = {
    Environment = "production"
  }
}
```

## Step 3: Create a Lambda Integration

```hcl
# Lambda integration for the API
resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = var.lambda_invoke_arn
  integration_method = "POST"

  # Payload format version
  payload_format_version = "2.0"
}
```

## Step 4: Define Routes

```hcl
# GET /items route
resource "aws_apigatewayv2_route" "get_items" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /items"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# POST /items route
resource "aws_apigatewayv2_route" "post_items" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /items"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# GET /items/{id} route with path parameter
resource "aws_apigatewayv2_route" "get_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /items/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

## Step 5: Create a Deployment Stage

```hcl
# Deployment stage with auto-deploy
resource "aws_apigatewayv2_stage" "production" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "production"
  auto_deploy = true

  # Access logging configuration
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn

    format = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      duration       = "$context.responseLatency"
    })
  }

  tags = {
    Environment = "production"
  }
}

# CloudWatch log group for API access logs
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/my-http-api"
  retention_in_days = 30
}
```

## Step 6: Grant API Gateway Permission to Invoke Lambda

```hcl
# Allow API Gateway to invoke the Lambda function
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Step 7: Outputs

```hcl
output "api_endpoint" {
  description = "The HTTP API endpoint URL"
  value       = aws_apigatewayv2_stage.production.invoke_url
}

output "api_id" {
  description = "The API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}
```

## Step 8: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully set up an AWS HTTP API Gateway using OpenTofu. The configuration includes CORS, Lambda integration, multiple routes, production stage with auto-deploy, and CloudWatch logging. For REST APIs requiring request validation or usage plans, consider `aws_api_gateway_rest_api` resources instead.
