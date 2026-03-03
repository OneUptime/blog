# How to Build a Serverless Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Serverless, AWS Lambda, Infrastructure Patterns, Cloud Architecture

Description: Learn how to build a complete serverless architecture using Terraform, including API Gateway, Lambda functions, DynamoDB, and event-driven patterns.

---

Serverless computing has fundamentally changed how teams build and deploy applications. Instead of managing servers, you focus on writing code and let the cloud provider handle scaling, patching, and availability. But as serverless architectures grow in complexity, managing all those cloud resources by hand becomes a nightmare. That is where Terraform comes in.

In this post, we will walk through building a production-ready serverless architecture on AWS using Terraform. We will cover Lambda functions, API Gateway, DynamoDB, S3, and the glue that ties them all together.

## Why Terraform for Serverless?

You might be wondering why not just use the AWS SAM CLI or the Serverless Framework. Those tools work well for simple projects, but they tend to fall short when your infrastructure extends beyond just functions and API endpoints. Terraform gives you a unified way to manage everything - networking, IAM, databases, DNS, monitoring - alongside your serverless components. That consistency matters a lot when your team scales.

## The Architecture

Here is what we will build:

- An API Gateway (HTTP API) as the front door
- Lambda functions for business logic
- DynamoDB for data persistence
- S3 for file storage
- CloudWatch for logging and monitoring
- IAM roles with least-privilege access

## Setting Up the Terraform Project

Start with a clean project structure:

```text
serverless-infra/
  main.tf
  variables.tf
  outputs.tf
  modules/
    api_gateway/
    lambda/
    dynamodb/
    s3/
```

First, configure the AWS provider and state backend:

```hcl
# main.tf - Provider and backend configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state-bucket"
    key    = "serverless/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Building the Lambda Module

The Lambda module handles function creation, IAM roles, and CloudWatch log groups:

```hcl
# modules/lambda/main.tf
resource "aws_iam_role" "lambda_execution" {
  name = "${var.function_name}-execution-role"

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

# Attach basic execution policy for CloudWatch logging
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create the Lambda function from a zip archive
resource "aws_lambda_function" "this" {
  filename         = var.deployment_package
  function_name    = var.function_name
  role             = aws_iam_role.lambda_execution.arn
  handler          = var.handler
  runtime          = var.runtime
  memory_size      = var.memory_size
  timeout          = var.timeout
  source_code_hash = filebase64sha256(var.deployment_package)

  environment {
    variables = var.environment_variables
  }
}

# Dedicated log group with retention policy
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
}
```

## Setting Up API Gateway

AWS HTTP API (v2) is lighter and cheaper than the REST API for most serverless use cases:

```hcl
# modules/api_gateway/main.tf
resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routePath      = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }
}

# Connect Lambda to the API Gateway
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "this" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "${var.http_method} ${var.route_path}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

## Adding DynamoDB

For the data layer, DynamoDB fits naturally with serverless because it scales on demand:

```hcl
# modules/dynamodb/main.tf
resource "aws_dynamodb_table" "this" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST" # True serverless billing
  hash_key     = var.hash_key
  range_key    = var.range_key

  attribute {
    name = var.hash_key
    type = "S"
  }

  dynamic "attribute" {
    for_each = var.range_key != null ? [var.range_key] : []
    content {
      name = attribute.value
      type = "S"
    }
  }

  # Enable point-in-time recovery for production
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption with AWS managed key
  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}
```

You also need an IAM policy so your Lambda functions can read and write to the table:

```hcl
# Grant Lambda access to DynamoDB
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.function_name}-dynamodb-access"
  role = aws_iam_role.lambda_execution.id

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
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}
```

## Wiring It All Together

In your root `main.tf`, compose the modules:

```hcl
# Root main.tf - composing all modules together
module "users_table" {
  source     = "./modules/dynamodb"
  table_name = "users"
  hash_key   = "userId"
  tags       = local.common_tags
}

module "create_user_function" {
  source              = "./modules/lambda"
  function_name       = "create-user"
  handler             = "index.handler"
  runtime             = "nodejs20.x"
  memory_size         = 256
  timeout             = 30
  deployment_package  = "../dist/create-user.zip"
  dynamodb_table_arn  = module.users_table.table_arn
  environment_variables = {
    TABLE_NAME = module.users_table.table_name
  }
}

module "api" {
  source           = "./modules/api_gateway"
  api_name         = "users-api"
  lambda_invoke_arn = module.create_user_function.invoke_arn
  http_method      = "POST"
  route_path       = "/users"
  cors_origins     = ["https://myapp.example.com"]
}
```

## Event-Driven Patterns

Serverless really shines with event-driven architectures. You can trigger Lambda functions from S3 uploads, DynamoDB streams, or SQS queues:

```hcl
# Trigger a Lambda when a file is uploaded to S3
resource "aws_s3_bucket_notification" "upload_trigger" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = module.process_upload_function.function_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }
}

# Permission for S3 to invoke the Lambda
resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = module.process_upload_function.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}
```

## Monitoring Considerations

Do not forget to set up CloudWatch alarms for your functions. You want to know when error rates spike or when functions start timing out:

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function error rate is elevated"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = var.function_name
  }
}
```

For a more comprehensive monitoring setup, you might want to look into building a full [monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Deployment Workflow

Run `terraform plan` to preview changes before applying:

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Keep your Lambda deployment packages in a separate build step. Use a CI/CD pipeline to build, test, package, and then run Terraform apply. This keeps your infrastructure code clean and your deployments predictable.

## Key Takeaways

Building serverless architectures with Terraform gives you reproducibility, version control, and the ability to manage your entire cloud footprint in one place. The modular approach we walked through makes it straightforward to add new functions, tables, and API routes as your application grows. Start simple, keep your modules focused, and always follow the principle of least privilege for IAM roles.
