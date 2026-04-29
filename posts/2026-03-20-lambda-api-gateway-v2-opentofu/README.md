# How to Deploy Lambda with API Gateway v2 Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS Lambda, API Gateway, Serverless, HTTP API, Infrastructure as Code, AWS

Description: Learn how to deploy AWS Lambda functions connected to API Gateway v2 (HTTP API) using OpenTofu for a cost-effective, auto-scaling serverless backend.

---

API Gateway v2 HTTP APIs are faster, cheaper, and simpler than REST APIs for most use cases. Pairing them with Lambda gives you a serverless backend that scales to zero. OpenTofu manages the entire stack - Lambda function, IAM roles, API Gateway, routes, and permissions - as reproducible code.

## Creating the Lambda Function

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# IAM role for the Lambda function
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Package the function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/function.zip"
}

# The Lambda function
resource "aws_lambda_function" "api_handler" {
  function_name    = var.function_name
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 29
  memory_size      = 256

  environment {
    variables = {
      NODE_ENV = var.environment
    }
  }
}
```

## Creating the API Gateway v2 HTTP API

```hcl
# api_gateway.tf
# Create the HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.function_name}-api"
  protocol_type = "HTTP"
  description   = "HTTP API for ${var.function_name}"

  # Enable CORS for frontend access
  cors_configuration {
    allow_headers  = ["Content-Type", "Authorization"]
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins  = var.allowed_origins
    max_age        = 300
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.api_handler.invoke_arn
  payload_format_version = "2.0"  # Use v2 format for simplified event structure
}

# Route: catch-all proxy to Lambda
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"  # Catch all routes
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Specific route example
resource "aws_apigatewayv2_route" "users" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /users/{userId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Deploy to a stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"  # Serve requests from the API root URL
  auto_deploy = true

  # Enable access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.function_name}"
  retention_in_days = 30
}
```

## Granting API Gateway Permission to Invoke Lambda

```hcl
# permissions.tf
# Allow API Gateway to invoke the Lambda function
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"

  # Restrict to this specific API Gateway
  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## Outputs

```hcl
# outputs.tf
output "api_endpoint" {
  description = "The HTTPS endpoint for the API"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api_handler.function_name
}
```

## Best Practices

- Use payload format version 2.0 for Lambda integrations - it provides a cleaner event structure than v1.0.
- Enable access logging to CloudWatch for debugging API Gateway routing issues.
- Use `$default` stage with `auto_deploy = true` for simple deployments, or create named stages for promotion workflows.
- Set Lambda timeout lower than API Gateway's maximum (30 seconds for HTTP APIs) to get meaningful error messages when functions time out.
- Use Lambda function URLs as an alternative if you don't need API Gateway features like route-level authorizers or request validation.
