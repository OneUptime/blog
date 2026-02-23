# How to Create Serverless API Backend with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Serverless, API Gateway, Lambda, DynamoDB

Description: Learn how to create a complete serverless API backend with Terraform using API Gateway, Lambda functions, and DynamoDB for scalable, cost-effective API deployments.

---

Building a serverless API backend eliminates the need to manage servers, reduces costs for variable workloads, and scales automatically with demand. The typical serverless API stack on AWS combines API Gateway for HTTP routing, Lambda functions for business logic, and DynamoDB for data storage. Terraform ties these components together in a reproducible, version-controlled configuration.

This guide walks through building a complete serverless API backend with Terraform, from API Gateway configuration to Lambda functions and DynamoDB tables.

## Architecture Overview

The serverless API backend consists of:

- **API Gateway (HTTP API)**: Routes HTTP requests to Lambda functions
- **Lambda Functions**: Handle business logic for each endpoint
- **DynamoDB**: Provides a fast, serverless NoSQL database
- **IAM Roles**: Control access between services
- **CloudWatch**: Captures logs and metrics

## Setting Up the DynamoDB Table

Start with the data layer:

```hcl
# DynamoDB table for the API
resource "aws_dynamodb_table" "items" {
  name         = "api-items"
  billing_mode = "PAY_PER_REQUEST"  # Serverless billing
  hash_key     = "id"
  range_key    = "created_at"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # Global secondary index for querying by user
  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Enable server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}
```

## Creating IAM Roles

Define the IAM role for Lambda functions:

```hcl
# IAM role for Lambda functions
resource "aws_iam_role" "lambda_api" {
  name = "serverless-api-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "lambda-dynamodb-access"
  role = aws_iam_role.lambda_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.items.arn,
          "${aws_dynamodb_table.items.arn}/index/*"
        ]
      }
    ]
  })
}
```

## Creating Lambda Functions

Define the Lambda functions for CRUD operations:

```hcl
# Package the Lambda function code
data "archive_file" "api_functions" {
  type        = "zip"
  source_dir  = "${path.module}/functions"
  output_path = "${path.module}/functions.zip"
}

# Create Item function
resource "aws_lambda_function" "create_item" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "api-create-item"
  role             = aws_iam_role.lambda_api.arn
  handler          = "create.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
  }
}

# Get Item function
resource "aws_lambda_function" "get_item" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "api-get-item"
  role             = aws_iam_role.lambda_api.arn
  handler          = "get.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
  }
}

# List Items function
resource "aws_lambda_function" "list_items" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "api-list-items"
  role             = aws_iam_role.lambda_api.arn
  handler          = "list.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
  }
}

# Update Item function
resource "aws_lambda_function" "update_item" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "api-update-item"
  role             = aws_iam_role.lambda_api.arn
  handler          = "update.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
  }
}

# Delete Item function
resource "aws_lambda_function" "delete_item" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "api-delete-item"
  role             = aws_iam_role.lambda_api.arn
  handler          = "delete.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.items.name
    }
  }
}
```

## Setting Up API Gateway

Create the HTTP API and routes:

```hcl
# HTTP API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "serverless-api"
  protocol_type = "HTTP"
  description   = "Serverless API backend"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization", "X-Api-Key"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["https://myapp.example.com"]
    max_age       = 3600
  }
}

# API stage with auto-deploy
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
    })
  }

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

# Lambda integrations
resource "aws_apigatewayv2_integration" "create_item" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_item.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "get_item" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_item.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "list_items" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.list_items.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "update_item" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_item.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "delete_item" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.delete_item.invoke_arn
  payload_format_version = "2.0"
}

# API routes
resource "aws_apigatewayv2_route" "create_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /items"
  target    = "integrations/${aws_apigatewayv2_integration.create_item.id}"
}

resource "aws_apigatewayv2_route" "get_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /items/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.get_item.id}"
}

resource "aws_apigatewayv2_route" "list_items" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /items"
  target    = "integrations/${aws_apigatewayv2_integration.list_items.id}"
}

resource "aws_apigatewayv2_route" "update_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /items/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.update_item.id}"
}

resource "aws_apigatewayv2_route" "delete_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /items/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.delete_item.id}"
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  for_each = {
    create = aws_lambda_function.create_item.function_name
    get    = aws_lambda_function.get_item.function_name
    list   = aws_lambda_function.list_items.function_name
    update = aws_lambda_function.update_item.function_name
    delete = aws_lambda_function.delete_item.function_name
  }

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

## CloudWatch Logging

```hcl
# Log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/serverless-api"
  retention_in_days = 14
}
```

## Outputs

```hcl
output "api_url" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "dynamodb_table" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.items.name
}
```

## Monitoring with OneUptime

A serverless API has many moving parts that need monitoring. OneUptime can monitor your API Gateway endpoints for availability and response time, alert you on elevated error rates, and track the health of your entire serverless stack. Visit [OneUptime](https://oneuptime.com) to set up API monitoring.

## Conclusion

Building a serverless API backend with Terraform gives you a scalable, cost-effective, and fully managed infrastructure. API Gateway handles routing and throttling, Lambda functions process business logic, and DynamoDB provides fast NoSQL storage. All of this scales automatically and you only pay for actual usage. By defining the entire stack in Terraform, you can reproduce the same API backend across development, staging, and production environments with a single command.

For related serverless patterns, see [How to Create Serverless Web Application Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-web-application-backend-with-terraform/view) and [How to Create Serverless Data Processing Pipeline with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-data-processing-pipeline-with-terraform/view).
