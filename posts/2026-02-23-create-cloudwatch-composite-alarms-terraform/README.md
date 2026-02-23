# How to Create CloudWatch Composite Alarms in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, Monitoring, Alarms, Infrastructure as Code

Description: Learn how to create CloudWatch composite alarms in Terraform to reduce alert noise by combining multiple metric alarms with boolean logic before triggering notifications.

---

If you have been running AWS workloads for a while, you know the pain of alert fatigue. A single metric alarm fires, your on-call engineer gets paged, and it turns out it was just a brief spike that resolved on its own. Multiply that by a dozen services each with a handful of alarms, and your team starts ignoring alerts.

Composite alarms fix this by letting you combine multiple metric alarms with boolean logic - AND, OR, NOT - before triggering a notification. Instead of alerting on every individual metric breach, you can say "only page me when the error rate is high AND the latency is high AND the healthy host count is low." That is a real problem worth waking up for.

This guide covers creating composite alarms in Terraform, from basic combinations to complex multi-service health checks.

## Prerequisites

Composite alarms reference existing metric alarms, so you need those first. Let's start by creating the individual alarms we will combine.

```hcl
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
  region = "us-east-1"
}

# SNS topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  name = "service-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "oncall@example.com"
}
```

## Creating Metric Alarms

First, set up the individual metric alarms that the composite alarm will reference.

```hcl
# High error rate alarm
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API 5XX errors exceed 10 per minute for 3 consecutive minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = "app/my-alb/1234567890"
  }

  # No alarm actions here - the composite alarm handles notifications
}

# High latency alarm
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p99"
  threshold           = 2.0  # 2 seconds
  alarm_description   = "API p99 latency exceeds 2 seconds for 3 consecutive minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = "app/my-alb/1234567890"
  }
}

# Unhealthy targets alarm
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "api-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "One or more ALB targets are unhealthy"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer  = "app/my-alb/1234567890"
    TargetGroup   = "targetgroup/my-targets/1234567890"
  }
}

# High CPU alarm on ECS service
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service CPU utilization above 80% for 3 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "production"
    ServiceName = "api"
  }
}

# High memory alarm on ECS service
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS service memory utilization above 85% for 3 minutes"
  treat_missing_data  = "notBreaching"
}
```

## Basic Composite Alarm

Now create a composite alarm that only fires when multiple conditions are true at the same time.

```hcl
# Only alert when errors are high AND latency is high
# This filters out brief error spikes that don't affect user experience
resource "aws_cloudwatch_composite_alarm" "api_degraded" {
  alarm_name = "api-service-degraded"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name})"

  alarm_description = "API service is degraded - both error rate and latency are elevated"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  # Only notify once when the alarm transitions to ALARM state
  actions_enabled = true
}
```

The `alarm_rule` uses a simple expression language. You reference metric alarms by name with `ALARM()`, `OK()`, or `INSUFFICIENT_DATA()` and combine them with `AND`, `OR`, and `NOT`.

## Complex Composite Alarm with Multiple Conditions

For more sophisticated alerting, combine several signals into a single composite alarm.

```hcl
# Critical alert: errors are high AND (targets are unhealthy OR resource utilization is maxed out)
resource "aws_cloudwatch_composite_alarm" "api_critical" {
  alarm_name = "api-service-critical"

  alarm_rule = join(" AND ", [
    "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name})",
    "(ALARM(${aws_cloudwatch_metric_alarm.unhealthy_targets.alarm_name}) OR (ALARM(${aws_cloudwatch_metric_alarm.high_cpu.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_memory.alarm_name})))"
  ])

  alarm_description = "Critical: API errors high with either unhealthy targets or resource exhaustion"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

This alarm only fires when errors are high AND there is an underlying infrastructure problem (unhealthy hosts or maxed-out resources). This pattern dramatically reduces false positives.

## Suppression with NOT

You can suppress alarms during maintenance windows or when a known condition is active.

```hcl
# Metric alarm that tracks whether maintenance mode is active
# You'd publish a custom metric when maintenance starts/stops
resource "aws_cloudwatch_metric_alarm" "maintenance_mode" {
  alarm_name          = "maintenance-mode-active"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "MaintenanceMode"
  namespace           = "Custom/Operations"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
}

# Only alert when NOT in maintenance mode
resource "aws_cloudwatch_composite_alarm" "api_degraded_no_maintenance" {
  alarm_name = "api-degraded-outside-maintenance"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name}) AND NOT ALARM(${aws_cloudwatch_metric_alarm.maintenance_mode.alarm_name})"

  alarm_description = "API is degraded (not during maintenance)"

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Tiered Alerting

A common pattern is to have different severity levels that trigger different notification channels.

```hcl
# SNS topics for different severity levels
resource "aws_sns_topic" "warning" {
  name = "alerts-warning"
}

resource "aws_sns_topic" "critical" {
  name = "alerts-critical"
}

resource "aws_sns_topic" "page" {
  name = "alerts-page"  # Connects to PagerDuty or similar
}

# Warning: single metric breached
resource "aws_cloudwatch_composite_alarm" "warning" {
  alarm_name = "api-warning"

  # Any one of these signals indicates a warning
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.high_cpu.alarm_name})"

  alarm_description = "Warning: at least one API health metric is in alarm state"

  alarm_actions = [aws_sns_topic.warning.arn]
  ok_actions    = [aws_sns_topic.warning.arn]
}

# Critical: multiple metrics breached simultaneously
resource "aws_cloudwatch_composite_alarm" "critical" {
  alarm_name = "api-critical"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name})"

  alarm_description = "Critical: API has both high errors and high latency"

  alarm_actions = [aws_sns_topic.critical.arn]
  ok_actions    = [aws_sns_topic.critical.arn]
}

# Page: everything is on fire
resource "aws_cloudwatch_composite_alarm" "page" {
  alarm_name = "api-page"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.unhealthy_targets.alarm_name})"

  alarm_description = "PAGE: API errors high with unhealthy targets - service likely down"

  alarm_actions = [aws_sns_topic.page.arn]
  ok_actions    = [aws_sns_topic.page.arn]
}
```

## Nested Composite Alarms

Composite alarms can reference other composite alarms, letting you build hierarchical health checks.

```hcl
# Service-level composite alarm for the API
resource "aws_cloudwatch_composite_alarm" "api_health" {
  alarm_name = "api-service-health"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name})"

  alarm_description = "API service health check"
}

# Service-level composite alarm for the database
resource "aws_cloudwatch_metric_alarm" "db_high_cpu" {
  alarm_name          = "db-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = "production-db"
  }
}

resource "aws_cloudwatch_metric_alarm" "db_high_connections" {
  alarm_name          = "db-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = "production-db"
  }
}

resource "aws_cloudwatch_composite_alarm" "db_health" {
  alarm_name = "database-service-health"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.db_high_cpu.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.db_high_connections.alarm_name})"

  alarm_description = "Database health check"
}

# Top-level composite alarm: alert only when multiple services are unhealthy
resource "aws_cloudwatch_composite_alarm" "platform_health" {
  alarm_name = "platform-overall-health"

  # Alert when both the API and the database are unhealthy
  alarm_rule = "ALARM(${aws_cloudwatch_composite_alarm.api_health.alarm_name}) AND ALARM(${aws_cloudwatch_composite_alarm.db_health.alarm_name})"

  alarm_description = "Critical: Multiple platform services are unhealthy"

  alarm_actions = [aws_sns_topic.page.arn]
  ok_actions    = [aws_sns_topic.page.arn]
}
```

## Action Suppression

You can configure composite alarms to suppress actions from their child alarms. This prevents double-notifications where both the metric alarm and the composite alarm fire.

```hcl
resource "aws_cloudwatch_composite_alarm" "api_degraded_suppressed" {
  alarm_name = "api-degraded-with-suppression"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name})"

  # Suppress actions on child alarms when this composite is in ALARM state
  actions_suppressor                    = aws_cloudwatch_composite_alarm.api_degraded_suppressed.alarm_name
  actions_suppressor_wait_period        = 120   # Wait 2 minutes before suppressing
  actions_suppressor_extension_period   = 300   # Keep suppressing for 5 minutes after composite resolves

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

Note that action suppression on composite alarms is a feature that requires the child metric alarms to have their `alarm_actions` set. The composite alarm then prevents those actions from being executed when the suppression conditions are met.

## Best Practices

**Start with metric alarms that have no actions.** Let the composite alarm be the single point of notification. This avoids duplicate alerts.

**Use `treat_missing_data = "notBreaching"` on metric alarms.** If a metric stops publishing (maybe the service is down), you do not want that to flip to ALARM state and accidentally trigger your composite logic in unexpected ways.

**Name your alarms consistently.** Use a pattern like `{service}-{metric}-{severity}` so your alarm rules are readable. When you look at `ALARM(api-high-error-rate) AND ALARM(api-high-latency)`, you can immediately understand the logic.

**Keep the alarm rule readable.** You can use the `join` function and local variables to build complex rules without making them unreadable inline strings.

```hcl
locals {
  errors_high    = "ALARM(${aws_cloudwatch_metric_alarm.high_error_rate.alarm_name})"
  latency_high   = "ALARM(${aws_cloudwatch_metric_alarm.high_latency.alarm_name})"
  targets_down   = "ALARM(${aws_cloudwatch_metric_alarm.unhealthy_targets.alarm_name})"
}

resource "aws_cloudwatch_composite_alarm" "readable" {
  alarm_name = "api-readable-composite"
  alarm_rule = "${local.errors_high} AND (${local.latency_high} OR ${local.targets_down})"

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Wrapping Up

Composite alarms are one of the best tools in CloudWatch for reducing alert noise. Instead of getting paged for every individual metric breach, you define the conditions that actually indicate a problem worth investigating. The boolean logic is simple but powerful enough to model complex failure scenarios.

Start by identifying your most noisy alerts. Chances are you can group them into composite alarms that only fire when a genuine issue needs attention. Your on-call engineers will thank you.
