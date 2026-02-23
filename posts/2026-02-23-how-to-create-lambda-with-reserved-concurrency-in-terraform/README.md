# How to Create Lambda with Reserved Concurrency in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Reserved Concurrency, Throttling, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda reserved concurrency with Terraform to guarantee capacity for critical functions and protect downstream services from overload.

---

AWS Lambda functions in an account share a regional concurrency pool (default 1,000 concurrent executions). Without reserved concurrency, a traffic spike to one function can consume all available concurrency, throttling your other functions. Reserved concurrency solves this by guaranteeing a set number of concurrent executions for a specific function while also acting as a hard cap to protect downstream services. This guide shows you how to configure reserved concurrency with Terraform.

## How Reserved Concurrency Works

Reserved concurrency has two effects. First, it reserves a portion of your account's concurrency pool exclusively for the function, so it always has capacity available. Second, it limits the function to that number of concurrent executions, preventing it from consuming more than its share. If invocations exceed the reserved concurrency limit, additional requests are throttled.

This is different from provisioned concurrency, which keeps execution environments warm to eliminate cold starts. Reserved concurrency does not prevent cold starts. It only controls how many concurrent executions a function can have.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Understanding of Lambda concurrency model

## Basic Reserved Concurrency Setup

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "lambda-reserved-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda function
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  # Reserved concurrency - guarantees AND limits to 100 concurrent executions
  reserved_concurrent_executions = 100

  tags = {
    Name        = "api-handler"
    Environment = "production"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}
```

## Setting Reserved Concurrency to Zero (Disabling a Function)

Setting reserved concurrency to 0 effectively disables a function by preventing any invocations. This is useful for emergency shutoffs.

```hcl
# Disabled function - no invocations allowed
resource "aws_lambda_function" "disabled" {
  function_name = "disabled-function"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  # Setting to 0 disables the function entirely
  reserved_concurrent_executions = 0

  tags = {
    Name   = "disabled-function"
    Status = "disabled"
  }
}
```

## Protecting Downstream Services

A common use case for reserved concurrency is protecting downstream services like databases from being overwhelmed.

```hcl
# Database query function - limited to protect the database
resource "aws_lambda_function" "db_query" {
  function_name = "database-query"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 30
  memory_size = 256

  # Limit concurrency to protect the database connection pool
  # If your database supports 100 connections, set this slightly below
  reserved_concurrent_executions = 80

  environment {
    variables = {
      DB_HOST            = var.db_host
      DB_MAX_CONNECTIONS = "80"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = {
    Name     = "database-query"
    Category = "database"
  }
}

resource "aws_security_group" "lambda" {
  name_prefix = "lambda-"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "db_host" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}
```

## Managing Concurrency Across Multiple Functions

Plan your reserved concurrency budget across all functions in a region.

```hcl
# Local values for concurrency budget planning
locals {
  # Account concurrency limit (default 1000, can be increased via support ticket)
  account_concurrency_limit = 1000

  # Reserved concurrency allocations
  function_concurrency = {
    api_handler      = 200   # High priority: API responses
    webhook_handler  = 100   # Medium: incoming webhooks
    db_query         = 80    # Limited by database connections
    email_sender     = 50    # Limited by email provider rate limits
    image_processor  = 100   # Batch processing
    report_generator = 30    # Low frequency, limited resources
  }

  # Calculate unreserved concurrency (available to functions without reservations)
  total_reserved = sum(values(local.function_concurrency))
  unreserved     = local.account_concurrency_limit - local.total_reserved
  # unreserved = 440, available to all other functions
}

# API handler - highest priority
resource "aws_lambda_function" "api_handler" {
  function_name    = "api-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  reserved_concurrent_executions = local.function_concurrency["api_handler"]

  tags = {
    Name                = "api-handler"
    ReservedConcurrency = local.function_concurrency["api_handler"]
  }
}

# Webhook handler
resource "aws_lambda_function" "webhook_handler" {
  function_name    = "webhook-handler"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  reserved_concurrent_executions = local.function_concurrency["webhook_handler"]

  tags = {
    Name                = "webhook-handler"
    ReservedConcurrency = local.function_concurrency["webhook_handler"]
  }
}

# Email sender - rate limited by provider
resource "aws_lambda_function" "email_sender" {
  function_name    = "email-sender"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  reserved_concurrent_executions = local.function_concurrency["email_sender"]

  tags = {
    Name                = "email-sender"
    ReservedConcurrency = local.function_concurrency["email_sender"]
  }
}

# Image processor - batch workload
resource "aws_lambda_function" "image_processor" {
  function_name    = "image-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 300
  memory_size = 1024

  reserved_concurrent_executions = local.function_concurrency["image_processor"]

  tags = {
    Name                = "image-processor"
    ReservedConcurrency = local.function_concurrency["image_processor"]
  }
}
```

## Monitoring Throttling

Set up alarms to detect when reserved concurrency limits are being hit.

```hcl
# SNS topic for Lambda alerts
resource "aws_sns_topic" "lambda_alerts" {
  name = "lambda-throttle-alerts"
}

# Alarm for throttled invocations
resource "aws_cloudwatch_metric_alarm" "api_throttled" {
  alarm_name          = "lambda-api-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API handler is being throttled - consider increasing reserved concurrency"
  alarm_actions       = [aws_sns_topic.lambda_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.api_handler.function_name
  }
}

# Alarm for concurrent executions approaching the limit
resource "aws_cloudwatch_metric_alarm" "api_concurrency_high" {
  alarm_name          = "lambda-api-concurrency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = local.function_concurrency["api_handler"] * 0.8  # 80% of limit
  alarm_description   = "API handler concurrency is above 80% of reserved limit"
  alarm_actions       = [aws_sns_topic.lambda_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.api_handler.function_name
  }
}

# Account-level unreserved concurrency alarm
resource "aws_cloudwatch_metric_alarm" "unreserved_concurrency_low" {
  alarm_name          = "lambda-unreserved-concurrency-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "UnreservedConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 100
  alarm_description   = "Unreserved concurrency is running low - other functions may be throttled"
  alarm_actions       = [aws_sns_topic.lambda_alerts.arn]
}
```

## Outputs

```hcl
output "concurrency_budget" {
  description = "Concurrency budget breakdown"
  value = {
    account_limit    = local.account_concurrency_limit
    total_reserved   = local.total_reserved
    unreserved       = local.unreserved
    per_function     = local.function_concurrency
  }
}

output "api_function_name" {
  value = aws_lambda_function.api_handler.function_name
}
```

## Reserved vs Provisioned Concurrency

It is important to understand the difference between reserved and provisioned concurrency:

| Feature | Reserved | Provisioned |
|---------|----------|-------------|
| Guarantees capacity | Yes | Yes |
| Eliminates cold starts | No | Yes |
| Sets hard limit | Yes | No (excess goes to on-demand) |
| Additional cost | No | Yes (pay per provisioned unit) |
| Applied to | Function | Version or Alias |

You can use both together: reserved concurrency to guarantee and limit total capacity, and provisioned concurrency within that reservation to keep some environments warm.

## Best Practices

When configuring reserved concurrency, always leave enough unreserved concurrency for functions that do not have reservations (AWS recommends at least 100). Set reserved concurrency for database-connected functions to match your connection pool size. Use reserved concurrency of 0 as an emergency kill switch for misbehaving functions. Monitor the Throttles metric to detect when limits are too low. Document your concurrency budget so team members understand the allocation. Review and adjust reservations quarterly as traffic patterns change.

## Monitoring with OneUptime

Throttled Lambda invocations can cause user-facing errors. Use [OneUptime](https://oneuptime.com) to monitor your Lambda functions from the outside, tracking response times and error rates that may indicate throttling is impacting your users.

## Conclusion

Reserved concurrency is a free and powerful tool for managing Lambda function capacity. It guarantees that critical functions always have available execution environments while preventing any single function from consuming your entire concurrency pool. By planning your concurrency budget across functions and monitoring throttling metrics, you can ensure reliable Lambda execution even under high load. Terraform makes this configuration straightforward and auditable.

For more Lambda concurrency topics, see our guides on [Lambda with provisioned concurrency](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-provisioned-concurrency-in-terraform/view) and [Lambda with dead letter queues](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-dead-letter-queue-in-terraform/view).
