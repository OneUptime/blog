# How to Create APM Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, APM, Application Performance Monitoring, Observability, Infrastructure as Code

Description: Learn how to build application performance monitoring infrastructure using Terraform with CloudWatch, custom metrics, dashboards, and alerting.

---

Application Performance Monitoring (APM) gives you visibility into how your applications behave in production. It tracks response times, error rates, throughput, and resource utilization so you can identify performance bottlenecks before they affect users. Building your APM infrastructure with Terraform ensures that monitoring is deployed consistently alongside your application infrastructure.

In this guide, we will create a comprehensive APM infrastructure using Terraform. We will set up CloudWatch dashboards, custom metrics, anomaly detection, and alerting pipelines that give you complete visibility into application performance.

## Why Terraform for APM Infrastructure

APM infrastructure often grows organically, with dashboards and alarms created ad hoc when problems arise. This leads to inconsistent monitoring coverage. By defining APM resources in Terraform, you ensure every service gets the same level of monitoring. When you add a new service, the monitoring configuration is created automatically as part of the deployment.

## Defining Variables and Provider

```hcl
# variables.tf - Define APM configuration variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "services" {
  description = "Map of services with their monitoring thresholds"
  type = map(object({
    latency_threshold_ms = number
    error_rate_threshold = number
    cpu_threshold        = number
    memory_threshold     = number
  }))
  default = {
    "api-gateway" = {
      latency_threshold_ms = 200
      error_rate_threshold = 5
      cpu_threshold        = 80
      memory_threshold     = 85
    }
    "user-service" = {
      latency_threshold_ms = 300
      error_rate_threshold = 3
      cpu_threshold        = 75
      memory_threshold     = 80
    }
    "order-service" = {
      latency_threshold_ms = 500
      error_rate_threshold = 2
      cpu_threshold        = 70
      memory_threshold     = 80
    }
  }
}

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
```

## Creating Custom Metric Namespaces and Alarms

Define CloudWatch alarms for key APM metrics like latency, error rate, and resource utilization:

```hcl
# alarms.tf - Create CloudWatch alarms for each service
resource "aws_cloudwatch_metric_alarm" "latency" {
  for_each = var.services

  alarm_name          = "${each.key}-high-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = each.value.latency_threshold_ms

  # Use a metric query for percentile-based latency
  metric_query {
    id          = "latency_p99"
    expression  = "PERCENTILE(m1, 99)"
    label       = "P99 Latency"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "ResponseTime"
      namespace   = "APM/${var.environment}"
      period      = 300
      stat        = "Average"

      dimensions = {
        ServiceName = each.key
      }
    }
  }

  alarm_description = "P99 latency for ${each.key} exceeds ${each.value.latency_threshold_ms}ms"
  alarm_actions     = [aws_sns_topic.apm_alerts.arn]
  ok_actions        = [aws_sns_topic.apm_alerts.arn]

  tags = {
    Environment = var.environment
    Service     = each.key
    AlertType   = "latency"
  }
}

# Error rate alarm
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  for_each = var.services

  alarm_name          = "${each.key}-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = each.value.error_rate_threshold

  metric_query {
    id          = "error_rate"
    expression  = "(errors / requests) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "ErrorCount"
      namespace   = "APM/${var.environment}"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ServiceName = each.key
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "APM/${var.environment}"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ServiceName = each.key
      }
    }
  }

  alarm_description = "Error rate for ${each.key} exceeds ${each.value.error_rate_threshold}%"
  alarm_actions     = [aws_sns_topic.apm_alerts.arn]
}
```

## Building CloudWatch Dashboards

Create comprehensive dashboards that show APM data for all services at a glance:

```hcl
# dashboard.tf - Create a CloudWatch dashboard for APM overview
resource "aws_cloudwatch_dashboard" "apm_overview" {
  dashboard_name = "APM-Overview-${var.environment}"

  dashboard_body = jsonencode({
    widgets = concat(
      # Header widget
      [{
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# APM Dashboard - ${var.environment}\nReal-time application performance metrics"
        }
      }],

      # Generate latency widgets for each service
      [for idx, service in keys(var.services) : {
        type   = "metric"
        x      = (idx % 3) * 8
        y      = 1 + floor(idx / 3) * 6
        width  = 8
        height = 6
        properties = {
          title   = "${service} - Latency"
          metrics = [
            ["APM/${var.environment}", "ResponseTime", "ServiceName", service, { stat = "p99", label = "P99" }],
            ["APM/${var.environment}", "ResponseTime", "ServiceName", service, { stat = "p95", label = "P95" }],
            ["APM/${var.environment}", "ResponseTime", "ServiceName", service, { stat = "Average", label = "Avg" }]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
        }
      }],

      # Error rate widgets
      [for idx, service in keys(var.services) : {
        type   = "metric"
        x      = (idx % 3) * 8
        y      = 1 + (length(var.services) / 3 + 1) * 6 + floor(idx / 3) * 6
        width  = 8
        height = 6
        properties = {
          title = "${service} - Error Rate"
          metrics = [
            [{
              expression = "(m1 / m2) * 100"
              label      = "Error Rate %"
              id         = "e1"
            }],
            ["APM/${var.environment}", "ErrorCount", "ServiceName", service, { stat = "Sum", id = "m1", visible = false }],
            ["APM/${var.environment}", "RequestCount", "ServiceName", service, { stat = "Sum", id = "m2", visible = false }]
          ]
          period = 300
          region = var.aws_region
          view   = "timeSeries"
          yAxis  = { left = { min = 0, max = 100 } }
        }
      }]
    )
  })
}
```

## Setting Up Anomaly Detection

CloudWatch anomaly detection uses machine learning to automatically identify unusual patterns:

```hcl
# anomaly.tf - Configure anomaly detection for key metrics
resource "aws_cloudwatch_metric_alarm" "latency_anomaly" {
  for_each = var.services

  alarm_name          = "${each.key}-latency-anomaly-${var.environment}"
  comparison_operator = "GreaterThanUpperThreshold"
  evaluation_periods  = 3
  threshold_metric_id = "ad1"

  metric_query {
    id          = "m1"
    return_data = true
    metric {
      metric_name = "ResponseTime"
      namespace   = "APM/${var.environment}"
      period      = 300
      stat        = "Average"
      dimensions = {
        ServiceName = each.key
      }
    }
  }

  # Anomaly detection band
  metric_query {
    id          = "ad1"
    expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
    label       = "Anomaly Detection Band"
    return_data = true
  }

  alarm_description = "Anomalous latency pattern detected for ${each.key}"
  alarm_actions     = [aws_sns_topic.apm_alerts.arn]
}
```

## Creating the Alerting Pipeline

Set up SNS topics and subscriptions for APM alerts:

```hcl
# alerting.tf - Create alerting pipeline
resource "aws_sns_topic" "apm_alerts" {
  name = "apm-alerts-${var.environment}"

  tags = {
    Environment = var.environment
    Purpose     = "apm-alerting"
  }
}

# Email subscription for the ops team
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.apm_alerts.arn
  protocol  = "email"
  endpoint  = var.ops_email
}

# Lambda subscription for automated remediation
resource "aws_sns_topic_subscription" "lambda" {
  count     = var.enable_auto_remediation ? 1 : 0
  topic_arn = aws_sns_topic.apm_alerts.arn
  protocol  = "lambda"
  endpoint  = var.remediation_lambda_arn
}

variable "ops_email" {
  description = "Email address for operations alerts"
  type        = string
  default     = "ops@example.com"
}

variable "enable_auto_remediation" {
  description = "Enable automatic remediation via Lambda"
  type        = bool
  default     = false
}

variable "remediation_lambda_arn" {
  description = "ARN of the remediation Lambda function"
  type        = string
  default     = ""
}
```

## Outputs

```hcl
# outputs.tf - Export APM resource identifiers
output "dashboard_url" {
  description = "URL to the APM dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=APM-Overview-${var.environment}"
}

output "alert_topic_arn" {
  description = "SNS topic ARN for APM alerts"
  value       = aws_sns_topic.apm_alerts.arn
}

output "alarm_names" {
  description = "List of all alarm names"
  value = concat(
    [for k, v in aws_cloudwatch_metric_alarm.latency : v.alarm_name],
    [for k, v in aws_cloudwatch_metric_alarm.error_rate : v.alarm_name],
    [for k, v in aws_cloudwatch_metric_alarm.latency_anomaly : v.alarm_name]
  )
}
```

## Conclusion

Building APM infrastructure with Terraform ensures every service gets consistent, comprehensive monitoring from day one. The combination of latency tracking, error rate monitoring, anomaly detection, and automated alerting creates a powerful feedback loop that helps you maintain application health. By using Terraform variables with per-service thresholds, you can customize monitoring to each service's unique performance characteristics. Integrate this with [distributed tracing](https://oneuptime.com/blog/post/2026-02-23-how-to-create-distributed-tracing-infrastructure-with-terraform/view) and [alerting pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-create-alerting-pipelines-with-terraform/view) for end-to-end observability.
