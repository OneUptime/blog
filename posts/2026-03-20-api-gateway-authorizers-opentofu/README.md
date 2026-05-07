# How to Create API Gateway Authorizers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Authorizers, Lambda, Cognito, Security, Infrastructure as Code

Description: Learn how to configure Lambda and Cognito authorizers for API Gateway REST APIs with OpenTofu to protect endpoints with custom authentication logic or user pool tokens.

## Introduction

API Gateway authorizers control access to API endpoints. Lambda authorizers execute custom authentication code and return IAM policies, while Cognito User Pool authorizers validate JWT tokens from a Cognito user pool. Lambda authorizers support request-based (header/query params) and token-based (Bearer token) validation patterns.

## Prerequisites

- OpenTofu v1.6+
- An existing API Gateway REST API
- AWS credentials with Lambda, API Gateway, and Cognito permissions

## Step 1: Create Lambda Authorizer Function

```hcl
# Lambda function that validates tokens and returns IAM policy

resource "aws_lambda_function" "authorizer" {
  filename         = "authorizer.zip"
  function_name    = "${var.project_name}-api-authorizer"
  role             = aws_iam_role.authorizer.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("authorizer.zip")

  environment {
    variables = {
      JWT_SECRET   = var.jwt_secret_arn
      ALLOWED_APPS = join(",", var.allowed_app_ids)
    }
  }
}

resource "aws_iam_role" "authorizer" {
  name = "${var.project_name}-authorizer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "authorizer_basic" {
  role       = aws_iam_role.authorizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Step 2: Token-Based Lambda Authorizer

```hcl
# Token authorizer - validates Bearer token from Authorization header
resource "aws_api_gateway_authorizer" "token" {
  name                             = "token-authorizer"
  rest_api_id                      = var.api_gateway_id
  authorizer_uri                   = aws_lambda_function.authorizer.invoke_arn
  authorizer_credentials           = aws_iam_role.api_gateway_authorizer.arn
  type                             = "TOKEN"
  identity_source                  = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300  # Cache result for 5 minutes

  # Optional: regex validation before invoking Lambda
  identity_validation_expression = "^Bearer [-A-Za-z0-9._~+/]+=*$"
}

# IAM role allowing API Gateway to invoke the authorizer Lambda
resource "aws_iam_role" "api_gateway_authorizer" {
  name = "${var.project_name}-apigw-authorizer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "invoke_authorizer" {
  name = "invoke-authorizer"
  role = aws_iam_role.api_gateway_authorizer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.authorizer.arn
    }]
  })
}
```

## Step 3: Request-Based Lambda Authorizer

```hcl
# Request authorizer - passes full request context (headers, query params, etc.)
resource "aws_api_gateway_authorizer" "request" {
  name                             = "request-authorizer"
  rest_api_id                      = var.api_gateway_id
  authorizer_uri                   = aws_lambda_function.authorizer.invoke_arn
  authorizer_credentials           = aws_iam_role.api_gateway_authorizer.arn
  type                             = "REQUEST"
  # Comma-separated identity sources that form the cache key
  identity_source                  = "method.request.header.X-Api-Key, method.request.querystring.version"
  authorizer_result_ttl_in_seconds = 300
}
```

## Step 4: Cognito User Pool Authorizer

```hcl
# Cognito authorizer - validates JWT tokens from Cognito User Pool
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "cognito-authorizer"
  rest_api_id   = var.api_gateway_id
  type          = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"

  # ARN of the Cognito User Pool
  provider_arns = [var.cognito_user_pool_arn]
}

# Use the Cognito authorizer on a method
resource "aws_api_gateway_method" "protected" {
  rest_api_id   = var.api_gateway_id
  resource_id   = var.resource_id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  # Require an access token with a configured OAuth scope
  authorization_scopes = ["photos/read"]
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test with a valid token
curl -H "Authorization: Bearer <your-jwt-token>" \
  https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/users
```

## Conclusion

Lambda authorizers provide maximum flexibility for custom authentication logic, including API key validation, OAuth token introspection, or multi-tenant isolation checks. Cognito authorizers are simpler when your user base is already in Cognito. Both support result caching (up to 3600 seconds) to reduce Lambda invocations and latency-use a cache TTL that balances security (token revocation visibility) with performance.
