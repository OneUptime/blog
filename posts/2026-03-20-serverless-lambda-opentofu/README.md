# How to Deploy Serverless Lambda Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Lambda, Serverless, AWS, Infrastructure as Code, Function

Description: Learn how to deploy AWS Lambda functions with OpenTofu - packaging code, configuring triggers, setting up IAM roles, environment variables, VPC networking, and function URLs.

## Introduction

AWS Lambda runs code in response to events without provisioning servers. OpenTofu manages the function definition, IAM execution role, CloudWatch log group, event source mappings (SQS, DynamoDB Streams, S3), and API Gateway integration - all as declarative code.

## Lambda Function with Code Archive

```hcl
# Package the function code

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/function.zip"
}

resource "aws_lambda_function" "app" {
  function_name = "${var.environment}-${var.function_name}"
  description   = "Application function for ${var.environment}"

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  runtime = "python3.12"
  handler = "main.handler"
  role    = aws_iam_role.lambda.arn

  timeout     = 30
  memory_size = 512

  environment {
    variables = {
      ENVIRONMENT = var.environment
      LOG_LEVEL   = var.environment == "production" ? "WARNING" : "DEBUG"
      DB_SECRET   = aws_secretsmanager_secret.db.name
    }
  }

  # X-Ray tracing
  tracing_config {
    mode = "Active"
  }

  tags = { Environment = var.environment }
}

# Explicitly manage the log group for retention control
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.app.function_name}"
  retention_in_days = 30
}
```

## IAM Execution Role

```hcl
resource "aws_iam_role" "lambda" {
  name = "${var.environment}-lambda-role"

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

resource "aws_iam_role_policy" "lambda_app" {
  name = "lambda-app-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.db.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.data.arn}/*"]
      }
    ]
  })
}
```

## VPC Configuration for Private Resource Access

```hcl
resource "aws_lambda_function" "vpc_app" {
  function_name    = "${var.environment}-vpc-function"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  runtime          = "python3.12"
  handler          = "main.handler"
  role             = aws_iam_role.lambda_vpc.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Allow enough time for private resource calls
  timeout     = 60
  memory_size = 512
}

# Lambda VPC requires VPC execution policy
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

## SQS Event Source Trigger

```hcl
resource "aws_sqs_queue" "trigger" {
  name                       = "${var.environment}-lambda-trigger"
  visibility_timeout_seconds = 180  # At least 6x Lambda timeout
  message_retention_seconds  = 86400
}

resource "aws_iam_role_policy_attachment" "lambda_sqs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}

resource "aws_lambda_event_source_mapping" "sqs" {
  depends_on = [aws_iam_role_policy_attachment.lambda_sqs]

  event_source_arn = aws_sqs_queue.trigger.arn
  function_name    = aws_lambda_function.app.arn
  batch_size       = 10

  function_response_types = ["ReportBatchItemFailures"]  # Partial batch success
}
```

## API Gateway v2 (HTTP API) Integration

```hcl
resource "aws_apigatewayv2_api" "app" {
  name          = "${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_origins = ["https://${var.domain_name}"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.app.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.app.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.app.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.app.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.app.execution_arn}/*/*"
}
```

## Lambda Function URL (Direct HTTPS Endpoint)

```hcl
resource "aws_lambda_function_url" "app" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "AWS_IAM"  # or "NONE" for public

  cors {
    allow_credentials = true
    allow_origins     = ["https://${var.domain_name}"]
    allow_methods     = ["*"]
    allow_headers     = ["date", "keep-alive"]
    expose_headers    = ["keep-alive", "date"]
    max_age           = 86400
  }
}

output "lambda_function_url" {
  value = aws_lambda_function_url.app.function_url
}
```

## Conclusion

Lambda with OpenTofu enables fully serverless application backends. Use `source_code_hash` from `archive_file` so OpenTofu updates the deployed package when the archive changes. Always create the CloudWatch log group explicitly with a retention policy - Lambda creates its own log group otherwise, defaulting to never-expire. For VPC Lambdas, ensure the selected subnets have available private IP addresses for Lambda-managed Hyperplane ENIs, and use `AWSLambdaVPCAccessExecutionRole` policy for ENI creation permissions.
