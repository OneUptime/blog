# How to Use Dynamic Blocks for CloudWatch Metric Alarms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, CloudWatch, Monitoring, Infrastructure as Code

Description: Learn how to create and manage AWS CloudWatch metric alarms at scale using Terraform dynamic blocks for consistent monitoring across your infrastructure.

---

Setting up CloudWatch alarms manually gets tedious fast, especially when you need consistent monitoring across dozens of resources. Terraform dynamic blocks let you define alarm patterns once and apply them across all your resources from variable-driven configuration.

## Why Dynamic Blocks for CloudWatch Alarms

In a typical production environment, you might have alarms for CPU utilization, memory, disk space, network throughput, and application-level metrics across multiple instances, databases, and services. Writing each alarm as a separate resource block means hundreds of nearly identical blocks. Dynamic blocks and `for_each` let you generate all of these from structured data.

## Defining Alarm Configuration as Variables

Start by defining a flexible variable structure for your alarms:

```hcl
variable "metric_alarms" {
  description = "Map of CloudWatch metric alarm configurations"
  type = map(object({
    description         = string
    namespace           = string
    metric_name         = string
    comparison_operator = string
    threshold           = number
    evaluation_periods  = number
    period              = number
    statistic           = string
    treat_missing_data  = optional(string, "missing")
    dimensions          = optional(map(string), {})
    alarm_actions       = optional(list(string), [])
    ok_actions          = optional(list(string), [])
    tags                = optional(map(string), {})
  }))
  default = {}
}
```

## Creating Alarms with for_each

The most straightforward approach uses `for_each` on the resource itself rather than a dynamic block inside it:

```hcl
resource "aws_cloudwatch_metric_alarm" "main" {
  for_each = var.metric_alarms

  alarm_name          = each.key
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric_name
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  evaluation_periods  = each.value.evaluation_periods
  period              = each.value.period
  statistic           = each.value.statistic
  treat_missing_data  = each.value.treat_missing_data
  dimensions          = each.value.dimensions
  alarm_actions       = each.value.alarm_actions
  ok_actions          = each.value.ok_actions

  tags = merge(
    { "ManagedBy" = "terraform" },
    each.value.tags
  )
}
```

Feed it like this:

```hcl
# terraform.tfvars
metric_alarms = {
  "high-cpu-web-server" = {
    description         = "CPU utilization exceeds 80% on web server"
    namespace           = "AWS/EC2"
    metric_name         = "CPUUtilization"
    comparison_operator = "GreaterThanThreshold"
    threshold           = 80
    evaluation_periods  = 3
    period              = 300
    statistic           = "Average"
    dimensions = {
      InstanceId = "i-0abc123def456"
    }
    alarm_actions = ["arn:aws:sns:us-east-1:123456789:ops-alerts"]
  }
  "high-cpu-api-server" = {
    description         = "CPU utilization exceeds 80% on API server"
    namespace           = "AWS/EC2"
    metric_name         = "CPUUtilization"
    comparison_operator = "GreaterThanThreshold"
    threshold           = 80
    evaluation_periods  = 3
    period              = 300
    statistic           = "Average"
    dimensions = {
      InstanceId = "i-0xyz789abc012"
    }
    alarm_actions = ["arn:aws:sns:us-east-1:123456789:ops-alerts"]
  }
}
```

## Dynamic Blocks for Composite Metric Alarms

Where dynamic blocks really shine is with composite alarms that use metric math expressions. These alarms can reference multiple metrics:

```hcl
variable "composite_alarms" {
  description = "Composite alarms using metric math"
  type = map(object({
    description        = string
    evaluation_periods = number
    metrics = list(object({
      id          = string
      label       = optional(string)
      expression  = optional(string)
      namespace   = optional(string)
      metric_name = optional(string)
      period      = optional(number)
      stat        = optional(string)
      dimensions  = optional(map(string))
      return_data = optional(bool, false)
    }))
    threshold           = number
    comparison_operator = string
    alarm_actions       = list(string)
  }))
}

resource "aws_cloudwatch_metric_alarm" "composite" {
  for_each = var.composite_alarms

  alarm_name          = each.key
  alarm_description   = each.value.description
  evaluation_periods  = each.value.evaluation_periods
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  alarm_actions       = each.value.alarm_actions

  # Dynamic metric_query blocks for math expressions
  dynamic "metric_query" {
    for_each = each.value.metrics
    content {
      id          = metric_query.value.id
      label       = metric_query.value.label
      expression  = metric_query.value.expression
      return_data = metric_query.value.return_data

      # Only include the metric block for actual metrics (not expressions)
      dynamic "metric" {
        for_each = metric_query.value.namespace != null ? [1] : []
        content {
          namespace   = metric_query.value.namespace
          metric_name = metric_query.value.metric_name
          period      = metric_query.value.period
          stat        = metric_query.value.stat
          dimensions  = metric_query.value.dimensions
        }
      }
    }
  }
}
```

Notice the nested dynamic block: the inner `metric` block only appears when `namespace` is set, distinguishing actual metrics from math expressions.

## Example - Anomaly Detection Alarm

Here is how to use the composite alarm structure for anomaly detection:

```hcl
composite_alarms = {
  "api-latency-anomaly" = {
    description        = "API latency is abnormally high"
    evaluation_periods = 3
    comparison_operator = "GreaterThanUpperThreshold"
    threshold          = 2  # Number of standard deviations

    metrics = [
      {
        id          = "m1"
        namespace   = "AWS/ApplicationELB"
        metric_name = "TargetResponseTime"
        period      = 300
        stat        = "Average"
        dimensions = {
          LoadBalancer = "app/my-alb/1234567890"
        }
      },
      {
        id          = "anomaly_band"
        expression  = "ANOMALY_DETECTION_BAND(m1, 2)"
        label       = "Expected latency range"
        return_data = true
      }
    ]

    alarm_actions = ["arn:aws:sns:us-east-1:123456789:ops-alerts"]
  }
}
```

## Generating Alarms from Resource Lists

A common pattern is generating standard alarms for every instance of a resource. Use locals to transform your resource data into alarm configurations:

```hcl
variable "monitored_instances" {
  description = "EC2 instances to monitor"
  type = map(object({
    instance_id = string
    name        = string
    cpu_threshold = optional(number, 80)
    memory_threshold = optional(number, 85)
  }))
}

locals {
  # Generate CPU alarms for all instances
  cpu_alarms = {
    for key, instance in var.monitored_instances :
    "cpu-${key}" => {
      description         = "High CPU on ${instance.name}"
      namespace           = "AWS/EC2"
      metric_name         = "CPUUtilization"
      comparison_operator = "GreaterThanThreshold"
      threshold           = instance.cpu_threshold
      evaluation_periods  = 3
      period              = 300
      statistic           = "Average"
      dimensions = {
        InstanceId = instance.instance_id
      }
    }
  }

  # Generate memory alarms for all instances (using CloudWatch Agent)
  memory_alarms = {
    for key, instance in var.monitored_instances :
    "memory-${key}" => {
      description         = "High memory on ${instance.name}"
      namespace           = "CWAgent"
      metric_name         = "mem_used_percent"
      comparison_operator = "GreaterThanThreshold"
      threshold           = instance.memory_threshold
      evaluation_periods  = 3
      period              = 300
      statistic           = "Average"
      dimensions = {
        InstanceId = instance.instance_id
      }
    }
  }

  # Merge all alarms together
  all_alarms = merge(local.cpu_alarms, local.memory_alarms)
}

resource "aws_cloudwatch_metric_alarm" "auto" {
  for_each = local.all_alarms

  alarm_name          = each.key
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric_name
  comparison_operator = each.value.comparison_operator
  threshold           = each.value.threshold
  evaluation_periods  = each.value.evaluation_periods
  period              = each.value.period
  statistic           = each.value.statistic
  dimensions          = each.value.dimensions

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

This creates two alarms per instance automatically. Adding a new instance to `monitored_instances` immediately creates its monitoring alarms.

## Dynamic Blocks for Dashboard Widgets

You can also use dynamic blocks to build CloudWatch dashboards that reflect your alarm configuration:

```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "infrastructure-overview"

  dashboard_body = jsonencode({
    widgets = [
      for key, alarm in local.all_alarms : {
        type   = "metric"
        x      = (index(keys(local.all_alarms), key) % 3) * 8
        y      = floor(index(keys(local.all_alarms), key) / 3) * 6
        width  = 8
        height = 6
        properties = {
          metrics = [[alarm.namespace, alarm.metric_name, keys(alarm.dimensions)[0], values(alarm.dimensions)[0]]]
          period  = alarm.period
          stat    = alarm.statistic
          title   = alarm.description
          annotations = {
            horizontal = [{
              label = "Threshold"
              value = alarm.threshold
            }]
          }
        }
      }
    ]
  })
}
```

## Summary

Using dynamic blocks and `for_each` for CloudWatch alarms lets you define monitoring patterns once and apply them uniformly. The key patterns are: structured variable maps for alarm definitions, locals to generate alarms from resource lists, and nested dynamic blocks for composite metric queries. This approach scales from a handful of alarms to hundreds without adding complexity. For related notification setup, check out [how to use dynamic blocks for notification configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-notification-configuration/view).
