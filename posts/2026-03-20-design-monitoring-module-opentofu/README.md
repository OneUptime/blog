# How to Design a Monitoring Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CloudWatch, Monitoring, AWS, Module, Observability

Description: Learn how to design a reusable CloudWatch monitoring module for OpenTofu that creates dashboards, alarms, and SNS notification topics from service configuration data.

## Introduction

A monitoring module should create a consistent observability setup: CloudWatch alarms for key metrics, an SNS topic for notifications, and a dashboard showing service health. It should be configurable per service but enforce organizational standards.

## variables.tf

```hcl
variable "service_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enabled" {
  type    = bool
  default = true
}

variable "alarm_email_endpoints" {
  type    = list(string)
  default = []
}

variable "alarms" {
  type = map(object({
    metric_name         = string
    namespace           = string
    statistic           = string
    comparison_operator = string
    threshold           = number
    evaluation_periods  = number
    period              = number
    dimensions          = map(string)
    alarm_description   = string
    treat_missing_data  = optional(string, "notBreaching")
  }))
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
locals {
  tags = merge({ Service = var.service_name, Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

# SNS topic for alarm notifications

resource "aws_sns_topic" "alerts" {
  count = var.enabled ? 1 : 0
  name  = "${var.service_name}-${var.environment}-alerts"
  tags  = local.tags
}

resource "aws_sns_topic_subscription" "email" {
  for_each = var.enabled ? toset(var.alarm_email_endpoints) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = each.key
}

# CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "alarms" {
  for_each = var.enabled ? var.alarms : {}

  alarm_name          = "${var.service_name}-${each.key}-${var.environment}"
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  statistic           = each.value.statistic
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  evaluation_periods  = each.value.evaluation_periods
  period              = each.value.period
  alarm_description   = each.value.alarm_description
  treat_missing_data  = each.value.treat_missing_data
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  ok_actions          = [aws_sns_topic.alerts[0].arn]

  dimensions = each.value.dimensions
  tags       = local.tags
}

# CloudWatch dashboard
resource "aws_cloudwatch_dashboard" "service" {
  count          = var.enabled ? 1 : 0
  dashboard_name = "${var.service_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = length(aws_cloudwatch_metric_alarm.alarms) > 0 ? [
      {
        type       = "alarm"
        properties = {
          title  = "${var.service_name} Alarms"
          alarms = [for alarm in aws_cloudwatch_metric_alarm.alarms : alarm.arn]
        }
      }
    ] : []
  })
}
```

## Example Usage

```hcl
module "monitoring" {
  source       = "./modules/monitoring"
  service_name = "payment-api"
  environment  = "prod"
  enabled      = true
  alarm_email_endpoints = ["oncall@example.com"]

  alarms = {
    "cpu-high" = {
      metric_name         = "CPUUtilization"
      namespace           = "AWS/ECS"
      statistic           = "Average"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 80
      evaluation_periods  = 3
      period              = 60
      alarm_description   = "CPU above 80% for 3 consecutive minutes"
      dimensions = {
        ClusterName = var.cluster_name
        ServiceName = "payment-api"
      }
    }
    "error-rate" = {
      metric_name         = "HTTPCode_ELB_5XX_Count"
      namespace           = "AWS/ApplicationELB"
      statistic           = "Sum"
      comparison_operator = "GreaterThanThreshold"
      threshold           = 10
      evaluation_periods  = 2
      period              = 60
      alarm_description   = "More than 10 ELB-generated 5xx errors for 2 consecutive minutes"
      dimensions = { LoadBalancer = var.alb_arn_suffix }
    }
  }
}
```

## outputs.tf

```hcl
output "sns_topic_arn"    { value = var.enabled ? aws_sns_topic.alerts[0].arn : null }
output "dashboard_name"   { value = var.enabled ? aws_cloudwatch_dashboard.service[0].dashboard_name : null }
output "alarm_arns" {
  value = { for k, alarm in aws_cloudwatch_metric_alarm.alarms : k => alarm.arn }
}
```

## Conclusion

This monitoring module creates a standardized observability setup per service. The `enabled` flag lets you skip monitoring for dev environments, and the `alarms` map makes it easy to add or remove metrics without changing module code. Teams can define their alarm thresholds as variables and the module handles SNS integration, naming conventions, and dashboard creation.
