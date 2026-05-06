# How to Create CloudWatch Log Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Logging, Log Groups, Infrastructure as Code, Observability

Description: Learn how to create and configure CloudWatch Log Groups using OpenTofu, including retention policies, KMS encryption, and metric filters for structured log monitoring.

---

CloudWatch Log Groups are the containers for log streams in AWS. Without explicit management, logs pile up indefinitely, driving up costs. OpenTofu lets you define log groups with proper retention, encryption, and metric filters as part of your infrastructure definitions.

## Creating a Basic Log Group

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

# Create a log group with 30-day retention
resource "aws_cloudwatch_log_group" "app" {
  name              = "/app/${var.environment}/${var.service_name}"
  retention_in_days = 30  # Automatically delete logs older than 30 days

  tags = {
    Environment = var.environment
    Service     = var.service_name
    ManagedBy   = "opentofu"
  }
}
```

## Encrypting Log Groups with KMS

```hcl
# encrypted_log_group.tf
# Create a KMS key for log encryption
resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch log encryption"
  deletion_window_in_days = 7

  # Allow CloudWatch Logs to use this key
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowAccountRoot"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "encrypted_app" {
  name              = "/app/${var.environment}/encrypted"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}
```

## Creating Multiple Log Groups with for_each

```hcl
# multi_log_groups.tf
variable "log_groups" {
  description = "Log group configurations"
  type = map(object({
    retention_days = number
    encrypted      = bool
  }))
  default = {
    "/app/production/api" = {
      retention_days = 90
      encrypted      = true
    }
    "/app/production/worker" = {
      retention_days = 30
      encrypted      = false
    }
    "/app/production/nginx" = {
      retention_days = 14
      encrypted      = false
    }
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = var.log_groups

  name              = each.key
  retention_in_days = each.value.retention_days
  kms_key_id        = each.value.encrypted ? aws_kms_key.logs.arn : null
}
```

## Adding Metric Filters

Metric filters turn log data into CloudWatch metrics for alarming.

```hcl
# metric_filter.tf
# Create a metric filter that counts ERROR log lines
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  pattern        = "[timestamp, requestId, level = ERROR, ...]"
  log_group_name = aws_cloudwatch_log_group.app.name

  metric_transformation {
    name      = "ErrorCount"
    namespace = "App/${var.service_name}"
    value     = "1"

    # Default value 0 publishes a zero when logs are ingested but no events match
    default_value = "0"
  }
}

# Alarm on the error count metric
resource "aws_cloudwatch_metric_alarm" "high_errors" {
  alarm_name          = "${var.service_name}-high-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorCount"
  namespace           = "App/${var.service_name}"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_description = "More than 10 errors in a 5-minute period"
  alarm_actions     = [var.alert_sns_topic_arn]
}
```

## Log Group Subscription Filters

Route logs to Lambda or Kinesis for processing.

```hcl
# subscription_filter.tf
# Allow CloudWatch Logs to invoke the processor Lambda
resource "aws_lambda_permission" "allow_cloudwatch_logs" {
  statement_id   = "AllowExecutionFromCloudWatchLogs"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.log_processor.function_name
  principal      = "logs.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
  source_arn     = "${aws_cloudwatch_log_group.app.arn}:*"
}

# Send all logs matching a pattern to a Lambda function for processing
resource "aws_cloudwatch_log_subscription_filter" "to_lambda" {
  name            = "forward-errors-to-processor"
  log_group_name  = aws_cloudwatch_log_group.app.name
  filter_pattern  = "ERROR"
  destination_arn = aws_lambda_function.log_processor.arn

  depends_on = [aws_lambda_permission.allow_cloudwatch_logs]
}
```

## Best Practices

- Always set `retention_in_days` - the default is to never expire logs, which can be costly.
- Use consistent naming conventions like `/app/{env}/{service}` to make log discovery predictable.
- Encrypt sensitive log groups (those containing PII or credentials) using KMS.
- Use metric filters to turn operational signals (error rates, latency) into actionable alarms.
- Set `depends_on` if a service depends on the log group existing before it starts.
