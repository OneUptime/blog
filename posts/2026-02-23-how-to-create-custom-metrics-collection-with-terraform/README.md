# How to Create Custom Metrics Collection with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Custom Metrics, CloudWatch, Monitoring, Observability, Infrastructure as Code

Description: Learn how to set up custom metrics collection infrastructure with Terraform using CloudWatch custom metrics, metric filters, and automated metric publishing.

---

Standard infrastructure metrics like CPU and memory utilization only tell part of the story. To truly understand your application health, you need custom metrics that track business-specific indicators like orders per minute, queue depth, cache hit rates, and user session counts. Terraform enables you to define the entire custom metrics collection infrastructure as code, including metric filters, custom namespaces, and the IAM permissions needed for publishing.

In this guide, we will build a custom metrics collection system using Terraform. We will configure CloudWatch metric filters, set up custom metric publishing through Lambda, create composite alarms, and define the dashboards to visualize everything.

## Why Terraform for Custom Metrics

Custom metrics infrastructure often grows organically. Someone adds a metric filter here, a Lambda function there, and before long the monitoring setup is a tangled web of manually created resources. Terraform brings order to this chaos by providing a single source of truth for your metrics infrastructure.

## Provider Configuration

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}
```

## Defining Custom Metric Specifications

Use a variable structure to define all your custom metrics in one place:

```hcl
# variables.tf - Custom metric definitions
variable "log_based_metrics" {
  description = "Metrics derived from log patterns"
  type = map(object({
    log_group_name = string
    pattern        = string
    metric_name    = string
    namespace      = string
    default_value  = number
  }))
  default = {
    "api_errors" = {
      log_group_name = "/app/production/api-gateway"
      pattern        = "[timestamp, level = \"ERROR\", ...]"
      metric_name    = "APIErrors"
      namespace      = "Custom/Application"
      default_value  = 0
    }
    "slow_queries" = {
      log_group_name = "/app/production/api-gateway"
      pattern        = "{ $.duration > 5000 }"
      metric_name    = "SlowQueries"
      namespace      = "Custom/Application"
      default_value  = 0
    }
    "auth_failures" = {
      log_group_name = "/app/production/user-service"
      pattern        = "{ $.event = \"AUTH_FAILURE\" }"
      metric_name    = "AuthenticationFailures"
      namespace      = "Custom/Security"
      default_value  = 0
    }
    "order_completed" = {
      log_group_name = "/app/production/order-service"
      pattern        = "{ $.event = \"ORDER_COMPLETED\" }"
      metric_name    = "OrdersCompleted"
      namespace      = "Custom/Business"
      default_value  = 0
    }
    "payment_processed" = {
      log_group_name = "/app/production/payment-service"
      pattern        = "{ $.event = \"PAYMENT_PROCESSED\" }"
      metric_name    = "PaymentsProcessed"
      namespace      = "Custom/Business"
      default_value  = 0
    }
  }
}
```

## Creating CloudWatch Metric Filters

Metric filters extract metric data from log events:

```hcl
# metric-filters.tf - Create metric filters for log-based metrics
resource "aws_cloudwatch_log_metric_filter" "custom" {
  for_each = var.log_based_metrics

  name           = each.key
  log_group_name = each.value.log_group_name
  pattern        = each.value.pattern

  metric_transformation {
    name          = each.value.metric_name
    namespace     = each.value.namespace
    value         = "1"
    default_value = each.value.default_value

    # Add dimensions for filtering
    dimensions = {
      Environment = var.environment
    }
  }
}
```

## Building a Custom Metric Publisher Lambda

For metrics that cannot be derived from logs, create a Lambda function that publishes custom metrics:

```hcl
# metric-publisher.tf - Lambda function for publishing custom metrics
resource "aws_lambda_function" "metric_publisher" {
  function_name = "custom-metric-publisher-${var.environment}"
  runtime       = "python3.11"
  handler       = "publisher.handler"
  role          = aws_iam_role.metric_publisher.arn
  timeout       = 60
  memory_size   = 256

  filename         = "${path.module}/lambda/metric_publisher.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/metric_publisher.zip")

  environment {
    variables = {
      ENVIRONMENT = var.environment
      NAMESPACE   = "Custom/Application"
      REGION      = var.aws_region
    }
  }

  tags = {
    Environment = var.environment
    Purpose     = "custom-metrics"
  }
}

# IAM role for the metric publisher
resource "aws_iam_role" "metric_publisher" {
  name = "metric-publisher-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Policy to publish CloudWatch metrics
resource "aws_iam_role_policy" "metric_publisher" {
  name = "cloudwatch-metrics"
  role = aws_iam_role.metric_publisher.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # Allow reading from DynamoDB, SQS, etc. for metric data
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:Scan",
          "sqs:GetQueueAttributes",
          "elasticache:DescribeCacheClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

# Schedule the metric publisher to run every minute
resource "aws_cloudwatch_event_rule" "metric_schedule" {
  name                = "custom-metric-schedule-${var.environment}"
  description         = "Triggers custom metric collection every minute"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "metric_publisher" {
  rule      = aws_cloudwatch_event_rule.metric_schedule.name
  target_id = "metric-publisher"
  arn       = aws_lambda_function.metric_publisher.arn
}

resource "aws_lambda_permission" "metric_schedule" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metric_publisher.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.metric_schedule.arn
}
```

## Creating Alarms for Custom Metrics

Set up alarms that trigger when custom metrics exceed thresholds:

```hcl
# alarms.tf - Alarms for custom metrics
variable "metric_alarms" {
  description = "Alarm configurations for custom metrics"
  type = map(object({
    metric_name         = string
    namespace           = string
    comparison_operator = string
    threshold           = number
    evaluation_periods  = number
    period              = number
    statistic           = string
    description         = string
  }))
  default = {
    "high_api_errors" = {
      metric_name         = "APIErrors"
      namespace           = "Custom/Application"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 50
      evaluation_periods  = 3
      period              = 300
      statistic           = "Sum"
      description         = "API error count exceeds threshold"
    }
    "auth_failure_spike" = {
      metric_name         = "AuthenticationFailures"
      namespace           = "Custom/Security"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 20
      evaluation_periods  = 2
      period              = 300
      statistic           = "Sum"
      description         = "Potential brute force attack detected"
    }
    "low_order_rate" = {
      metric_name         = "OrdersCompleted"
      namespace           = "Custom/Business"
      comparison_operator = "LessThanThreshold"
      threshold           = 10
      evaluation_periods  = 3
      period              = 300
      statistic           = "Sum"
      description         = "Order completion rate is unusually low"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "custom" {
  for_each = var.metric_alarms

  alarm_name          = "${each.key}-${var.environment}"
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  alarm_description   = each.value.description

  dimensions = {
    Environment = var.environment
  }

  alarm_actions = [aws_sns_topic.metric_alerts.arn]
  ok_actions    = [aws_sns_topic.metric_alerts.arn]
}

# SNS topic for metric alerts
resource "aws_sns_topic" "metric_alerts" {
  name = "custom-metric-alerts-${var.environment}"
}
```

## Creating Composite Alarms

Composite alarms combine multiple metric alarms to reduce alert noise:

```hcl
# composite-alarms.tf - Combine multiple signals into a single alarm
resource "aws_cloudwatch_composite_alarm" "service_degradation" {
  alarm_name = "service-degradation-${var.environment}"

  # Trigger when both error rate AND latency are high
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.custom["high_api_errors"].alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.custom["low_order_rate"].alarm_name})"

  alarm_description = "Multiple indicators suggest service degradation"
  alarm_actions     = [aws_sns_topic.metric_alerts.arn]
}

resource "aws_cloudwatch_composite_alarm" "security_incident" {
  alarm_name = "security-incident-${var.environment}"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.custom["auth_failure_spike"].alarm_name})"

  alarm_description = "Potential security incident detected"
  alarm_actions     = [aws_sns_topic.metric_alerts.arn]
}
```

## Custom Metrics Dashboard

```hcl
# dashboard.tf - Dashboard for custom metrics
resource "aws_cloudwatch_dashboard" "custom_metrics" {
  dashboard_name = "Custom-Metrics-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Custom Metrics - ${var.environment}"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title = "Business Metrics"
          metrics = [
            ["Custom/Business", "OrdersCompleted", "Environment", var.environment, { label = "Orders" }],
            ["Custom/Business", "PaymentsProcessed", "Environment", var.environment, { label = "Payments" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title = "Application Health"
          metrics = [
            ["Custom/Application", "APIErrors", "Environment", var.environment, { label = "API Errors", color = "#d62728" }],
            ["Custom/Application", "SlowQueries", "Environment", var.environment, { label = "Slow Queries", color = "#ff7f0e" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## Outputs

```hcl
# outputs.tf
output "metric_filter_names" {
  description = "Names of all metric filters"
  value       = { for k, v in aws_cloudwatch_log_metric_filter.custom : k => v.name }
}

output "alarm_arns" {
  description = "ARNs of all custom metric alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom : k => v.arn }
}

output "metric_publisher_function" {
  description = "Lambda function name for custom metric publisher"
  value       = aws_lambda_function.metric_publisher.function_name
}
```

## Conclusion

Custom metrics collection infrastructure defined in Terraform gives you a single source of truth for all your monitoring definitions. By combining log-based metric filters, scheduled Lambda publishers, and composite alarms, you create a metrics system that captures both technical and business signals. This approach scales well as you add new services and metrics, since the patterns established here can be extended through additional variable definitions. For the visualization layer, see our guide on [infrastructure health dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-infrastructure-health-dashboards-with-terraform/view).
