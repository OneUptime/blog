# How to Set Up CloudWatch Alarms with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch, Monitoring, Alarms, Infrastructure as Code, Observability

Description: Learn how to create CloudWatch metric alarms in AWS using OpenTofu to automatically detect and notify your team when infrastructure or application metrics exceed defined thresholds.

---

CloudWatch metric alarms watch a single metric over a time period and perform actions when the metric crosses a threshold. With OpenTofu, you can define your entire alerting strategy as code, ensuring every environment has consistent monitoring.

## Creating a Basic CPU Utilization Alarm

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

# SNS topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  name = "infrastructure-alerts"
}

resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Alarm triggers when EC2 CPU exceeds 80% for 2 consecutive 5-minute periods
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.instance_name}-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2           # Must breach for 2 periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300         # 5 minutes per period
  statistic           = "Average"
  threshold           = 80

  alarm_description = "CPU utilization has been above 80% for 10 minutes"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  tags = var.common_tags
}
```

## Creating Multiple Alarms with for_each

When you have multiple services, use `for_each` to create alarms without repeating code.

```hcl
# multi_alarm.tf
variable "services" {
  description = "Map of service names to ECS cluster/service details and alarm thresholds"
  type = map(object({
    cluster_name = string
    service_name = string
    cpu_threshold = number
    memory_threshold = number
  }))
}

# Create CPU alarms for all services
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  for_each = var.services

  alarm_name          = "${each.key}-ecs-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.cpu_threshold

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = each.value.cluster_name
    ServiceName = each.value.service_name
  }
}

# Create memory alarms for all services
resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  for_each = var.services

  alarm_name          = "${each.key}-ecs-memory-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = each.value.memory_threshold

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = each.value.cluster_name
    ServiceName = each.value.service_name
  }
}
```

## Composite Alarms

Composite alarms combine multiple alarms with AND/OR logic to reduce alert noise.

```hcl
# composite_alarm.tf
# Only trigger a combined alert if BOTH CPU AND memory are high simultaneously
resource "aws_cloudwatch_composite_alarm" "app_overloaded" {
  alarm_name = "app-overloaded"
  alarm_description = "Trigger only when both CPU and memory are high - indicates genuine overload"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_cpu.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.ecs_memory["app"].alarm_name})"

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## RDS Alarm Example

```hcl
# rds_alarms.tf
resource "aws_cloudwatch_metric_alarm" "rds_connection_count" {
  alarm_name          = "${var.db_identifier}-high-connections"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = var.max_db_connections * 0.8  # Alert at 80% of max

  alarm_description = "RDS connection count approaching maximum"
  alarm_actions     = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_identifier
  }
}
```

## Best Practices

- Consider setting `evaluation_periods` to at least 2 for metrics prone to transient spikes, or use `datapoints_to_alarm` for M out of N alarms.
- Always set both `alarm_actions` and `ok_actions` so you know when an alarm resolves.
- Use `treat_missing_data = "notBreaching"` for metrics that may have gaps (like Lambda invocations).
- Tag all alarms with environment and team labels so they're easy to filter in the CloudWatch console.
- Test alarms by using `aws cloudwatch set-alarm-state` to verify notifications work before relying on them in production.
