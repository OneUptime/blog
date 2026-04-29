# How to Set Up Lambda Function URLs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Function URLs, HTTP, Serverless, Infrastructure as Code

Description: Learn how to create Lambda Function URLs with OpenTofu to expose Lambda functions as HTTPS endpoints without API Gateway, including CORS configuration and authentication modes.

## Introduction

Lambda Function URLs provide a dedicated HTTPS endpoint for a Lambda function without needing API Gateway. They support both public (no auth) and IAM-authenticated access, CORS configuration, and streaming responses. This is ideal for simple HTTP APIs and webhooks.

## Prerequisites

- OpenTofu v1.6+
- A Lambda function, or source code you can package into one
- AWS credentials with permission to manage Lambda and IAM resources

## Step 1: Create a Lambda Function

If you're starting from source, this example packages a local `src/` directory into a Lambda deployment archive. The archive must include an `index.js` file that exports `handler`.

```hcl
resource "aws_iam_role" "lambda" {
  name = "lambda-url-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/function.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "api-function"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  tags = { Name = "api-function" }
}
```

## Step 2: Create a Public Function URL

```hcl
# Public URL with no authentication - anyone can invoke

resource "aws_lambda_function_url" "public" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"  # Public access

  cors {
    allow_credentials = false
    allow_origins     = ["https://example.com", "https://www.example.com"]
    allow_methods     = ["GET", "POST", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Custom-Header"]
    expose_headers    = ["X-Request-Id"]
    max_age           = 3600
  }
}

# Current AWS provider versions automatically add the public
# lambda:InvokeFunctionUrl and lambda:InvokeFunction permissions
# for authorization_type = "NONE".
```

## Step 3: Create an IAM-Authenticated Function URL

```hcl
# IAM-authenticated URL - only callers with proper IAM permissions can invoke
resource "aws_lambda_function_url" "private" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["date", "keep-alive"]
  }
}

# Resource-based policy for a specific caller role. For callers in another
# AWS account, the caller also needs an identity-based IAM policy that allows
# both lambda:InvokeFunctionUrl and lambda:InvokeFunction.
resource "aws_lambda_permission" "allow_caller_url" {
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = var.caller_role_arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "allow_caller_invoke" {
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.api.function_name
  principal                = var.caller_role_arn
  invoked_via_function_url = true
}
```

## Step 4: Enable Response Streaming

```hcl
# Enable streaming responses for long-running operations
resource "aws_lambda_function_url" "streaming" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"

  invoke_mode = "RESPONSE_STREAM"  # Enable streaming (default is BUFFERED)
}
```

## Step 5: Outputs

```hcl
output "function_url" {
  description = "Lambda Function URL endpoint"
  value       = aws_lambda_function_url.public.function_url
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the function URL
curl -X POST "$(tofu output -raw function_url)" \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## Conclusion

Lambda Function URLs provide the simplest path to exposing Lambda as an HTTPS endpoint. Use `NONE` auth for public webhooks and APIs, and `AWS_IAM` for internal service-to-service communication. For production APIs needing custom domains, rate limiting, caching, or request transformation, API Gateway remains the better choice.
