# How to Create CloudWatch Log Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Terraform, Logging

Description: Step-by-step guide to creating and configuring AWS CloudWatch Log Groups with Terraform, including retention policies, KMS encryption, and metric filters.

---

CloudWatch Log Groups are where your AWS logs live. Whether it's Lambda function output, ECS container logs, or VPC flow logs, they all end up in a log group somewhere. Creating them manually through the console is quick for testing, but for production infrastructure you want Terraform handling this so your log groups have consistent naming, retention policies, and encryption from day one.

This guide walks through creating log groups, setting up retention, encrypting logs with KMS, configuring metric filters, and subscription filters for log forwarding.

## Basic Log Group Creation

At its simplest, a CloudWatch log group just needs a name. But you should always set a retention policy - unlimited retention is the default, and that gets expensive fast.

This creates a log group with a 30-day retention period:

```hcl
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/app/production/api"
  retention_in_days = 30

  tags = {
    Environment = "production"
    Service     = "api"
    ManagedBy   = "terraform"
  }
}
```

The `retention_in_days` parameter accepts specific values: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, or 3653. Setting it to 0 means logs are kept forever. For most applications, 30 or 90 days strikes a good balance between cost and the ability to investigate past issues.

## Encrypting Log Groups with KMS

By default, CloudWatch encrypts logs with a service-managed key. If your compliance requirements need customer-managed keys, you'll need to create a KMS key and attach it.

This configuration creates a KMS key with the right policy for CloudWatch Logs, then uses it to encrypt the log group:

```hcl
# KMS key for log encryption
resource "aws_kms_key" "log_encryption" {
  description             = "KMS key for CloudWatch log encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncryptFrom",
          "kms:ReEncryptTo",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:*"
          }
        }
      }
    ]
  })
}

resource "aws_kms_alias" "log_encryption" {
  name          = "alias/cloudwatch-logs"
  target_key_id = aws_kms_key.log_encryption.key_id
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Log group with KMS encryption
resource "aws_cloudwatch_log_group" "encrypted_logs" {
  name              = "/app/production/secure-api"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.log_encryption.arn

  tags = {
    Environment = "production"
    Encryption  = "customer-managed"
  }
}
```

The KMS policy is the part that trips most people up. CloudWatch Logs needs explicit permission to use the key, and the condition block scopes that permission to log groups in your account.

## Creating Log Groups for Multiple Services

When you have a bunch of services that all need log groups with the same settings, `for_each` keeps things clean.

This creates log groups for multiple services with identical retention and tagging:

```hcl
variable "services" {
  type = map(object({
    retention_days = number
    environment    = string
  }))
  default = {
    "api" = {
      retention_days = 30
      environment    = "production"
    }
    "worker" = {
      retention_days = 14
      environment    = "production"
    }
    "scheduler" = {
      retention_days = 14
      environment    = "production"
    }
    "web" = {
      retention_days = 7
      environment    = "production"
    }
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each = var.services

  name              = "/app/${each.value.environment}/${each.key}"
  retention_in_days = each.value.retention_days

  tags = {
    Environment = each.value.environment
    Service     = each.key
    ManagedBy   = "terraform"
  }
}
```

## Metric Filters

Metric filters let you extract numeric values from log data and turn them into CloudWatch metrics. This is powerful for creating alarms based on log content - think error rates, latency percentiles, or custom business metrics.

This metric filter counts ERROR-level log entries and publishes them as a CloudWatch metric:

```hcl
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  pattern        = "[timestamp, level = \"ERROR\", ...]"
  log_group_name = aws_cloudwatch_log_group.app_logs.name

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "Custom/Application"
    value         = "1"
    default_value = "0"
  }
}

# You can then alarm on this custom metric
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorCount"
  namespace           = "Custom/Application"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "More than 50 errors in 5 minutes"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "application-alerts"
}
```

For JSON-structured logs (which you should be using), the filter pattern syntax is different:

```hcl
# Filter for JSON logs where statusCode is 500
resource "aws_cloudwatch_log_metric_filter" "server_errors_json" {
  name           = "server-errors"
  pattern        = "{ $.statusCode = 500 }"
  log_group_name = aws_cloudwatch_log_group.app_logs.name

  metric_transformation {
    name      = "ServerErrors"
    namespace = "Custom/Application"
    value     = "1"
  }
}

# Filter for slow requests (response time > 3000ms)
resource "aws_cloudwatch_log_metric_filter" "slow_requests" {
  name           = "slow-requests"
  pattern        = "{ $.responseTime > 3000 }"
  log_group_name = aws_cloudwatch_log_group.app_logs.name

  metric_transformation {
    name      = "SlowRequests"
    namespace = "Custom/Application"
    value     = "1"
  }
}
```

## Subscription Filters

Subscription filters stream log data to other destinations in real-time. Common targets include Lambda functions, Kinesis streams, and Elasticsearch/OpenSearch.

This subscription filter sends all ERROR logs to a Lambda function for processing:

```hcl
resource "aws_cloudwatch_log_subscription_filter" "error_to_lambda" {
  name            = "errors-to-lambda"
  log_group_name  = aws_cloudwatch_log_group.app_logs.name
  filter_pattern  = "ERROR"
  destination_arn = aws_lambda_function.log_processor.arn
}

# Lambda needs permission to be invoked by CloudWatch Logs
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.log_processor.function_name
  principal     = "logs.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.app_logs.arn}:*"
}
```

For streaming to a Kinesis Data Stream (useful for sending logs to third-party tools or S3):

```hcl
resource "aws_cloudwatch_log_subscription_filter" "to_kinesis" {
  name            = "all-logs-to-kinesis"
  log_group_name  = aws_cloudwatch_log_group.app_logs.name
  filter_pattern  = ""  # Empty pattern matches everything
  destination_arn = aws_kinesis_stream.log_stream.arn
  role_arn        = aws_iam_role.cloudwatch_to_kinesis.arn
}
```

## Log Group for Lambda Functions

Lambda automatically creates log groups, but you should create them in Terraform first to control retention and encryption. If Terraform creates the log group before the Lambda function runs, Lambda will use the existing group.

This creates a log group matching the Lambda naming convention so Lambda uses it instead of creating its own:

```hcl
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.my_function.function_name}"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.log_encryption.arn

  tags = {
    Service = "my-lambda-function"
  }
}
```

## Log Group for ECS Services

ECS tasks using the `awslogs` log driver need log groups too. Creating them in advance prevents issues where the task fails because the log group doesn't exist.

This creates log groups for ECS and configures the task definition to use them:

```hcl
resource "aws_cloudwatch_log_group" "ecs_app" {
  name              = "/ecs/production/my-service"
  retention_in_days = 30
}

# Reference in your ECS task definition
resource "aws_ecs_task_definition" "app" {
  family                = "my-service"
  # ... other config ...

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "my-app:latest"
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}
```

## Cost Optimization Tips

CloudWatch Logs charges for ingestion and storage separately. Here are some practical tips:

1. **Set retention on every log group.** Unmanaged log groups with unlimited retention are the biggest cost driver.
2. **Use log levels wisely.** Don't log DEBUG in production unless you're actively troubleshooting.
3. **Consider tiered retention.** Keep application logs for 30 days, audit logs for 365 days, and debug logs for 7 days.
4. **Export to S3 for long-term storage.** It's dramatically cheaper than CloudWatch retention for logs you rarely query.

For broader monitoring cost management, our guide on [managing your monitoring costs](https://oneuptime.com/blog/post/2026-02-06-reduce-observability-costs-intelligent-sampling/view) covers strategies that apply beyond just CloudWatch.

## Wrapping Up

CloudWatch Log Groups are simple resources, but getting them right from the start saves you from cost surprises and compliance headaches later. Always set retention, encrypt with KMS when required, and use metric filters to turn log data into actionable metrics. The Terraform configurations in this guide give you a solid foundation that you can adapt to your specific services and requirements.
