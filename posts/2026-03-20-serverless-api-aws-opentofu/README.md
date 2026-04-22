# How to Build a Serverless API Backend with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Serverless, Lambda, API Gateway, OpenTofu, DynamoDB

Description: Learn how to build a serverless API backend on AWS using OpenTofu with Lambda functions, API Gateway, DynamoDB, and Cognito authentication.

## Overview

A serverless API on AWS combines API Gateway for request routing, Lambda for compute, DynamoDB for data storage, and Cognito for authentication. OpenTofu provisions the complete stack with proper IAM permissions and API Gateway integrations.

## Step 1: DynamoDB Table

```hcl
# main.tf - DynamoDB table for serverless API

resource "aws_dynamodb_table" "items" {
  name           = "api-items"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
```

## Step 2: Lambda Functions

```hcl
data "aws_region" "current" {}

# IAM role for Lambda functions
resource "aws_iam_role" "lambda" {
  name = "serverless-api-lambda"

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

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
                "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"]
      Resource = [aws_dynamodb_table.items.arn, "${aws_dynamodb_table.items.arn}/index/*"]
    }]
  })
}

# Lambda function for CRUD operations
resource "aws_lambda_function" "api_handler" {
  filename      = "lambda.zip"
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 512

  source_code_hash = filebase64sha256("lambda.zip")

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
      REGION     = data.aws_region.current.id
    }
  }

  tracing_config {
    mode = "Active"  # X-Ray tracing
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_xray
  ]
}

# Lambda URL for IAM-protected direct invocation (no API Gateway)
resource "aws_lambda_function_url" "api_handler" {
  function_name      = aws_lambda_function.api_handler.function_name
  authorization_type = "AWS_IAM"

  cors {
    allow_origins = ["https://app.example.com"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}
```

## Step 3: API Gateway with Lambda Integration

```hcl
# HTTP API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "serverless-api"
  protocol_type = "HTTP"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/apigateway/serverless-api"
  retention_in_days = 14
}

resource "aws_iam_role" "api_gw_cloudwatch" {
  name = "api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_gw_cloudwatch" {
  role       = aws_iam_role.api_gw_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "api_gw" {
  cloudwatch_role_arn = aws_iam_role.api_gw_cloudwatch.arn

  depends_on = [aws_iam_role_policy_attachment.api_gw_cloudwatch]
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format          = jsonencode({
      requestId = "$context.requestId"
      status    = "$context.status"
      error     = "$context.error.message"
    })
  }

  depends_on = [aws_api_gateway_account.api_gw]
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.api_handler.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "items_root" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "ANY /items"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "items" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "ANY /items/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_lambda_permission" "api_gw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
```

## Step 4: Cognito for Authentication

```hcl
# Cognito user pool for authentication
resource "aws_cognito_user_pool" "api" {
  name = "api-users"

  password_policy {
    minimum_length    = 12
    require_uppercase = true
    require_numbers   = true
  }

  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "api" {
  name         = "api-client"
  user_pool_id = aws_cognito_user_pool.api.id

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]
  callback_urls = ["https://app.example.com/callback"]
  supported_identity_providers = ["COGNITO"]
}

# JWT authorizer using Cognito
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-jwt"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.api.id]
    issuer   = "https://${aws_cognito_user_pool.api.endpoint}"
  }
}
```

## Summary

A serverless API on AWS built with OpenTofu eliminates server management entirely. Lambda scales to zero when idle and handles millions of requests without capacity planning. DynamoDB's on-demand pricing matches the serverless cost model. Cognito JWT authorization protects endpoints without writing authentication logic, and CloudWatch access logs with X-Ray tracing for Lambda help you observe requests through the backend.
