# How to Configure CloudWatch Alarms with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Terraform, Infrastructure as Code, Alarms

Description: A practical guide to defining CloudWatch Alarms in Terraform with examples for EC2, RDS, Lambda, ALB, and composite alarms for reliable infrastructure monitoring.

---

Clicking through the CloudWatch console to create alarms works for one or two, but when you need consistent monitoring across dozens of services and multiple environments, you want those alarms defined in code. Terraform makes CloudWatch alarms reproducible, version-controlled, and reviewable - just like the infrastructure they monitor.

This guide covers the Terraform resources you need, practical examples for common AWS services, and patterns for scaling alarm management across large environments.

## Basic Alarm Structure

The core Terraform resource is `aws_cloudwatch_metric_alarm`. Here's the basic structure:

```hcl
# Basic CloudWatch alarm for EC2 CPU utilization
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-web-server"
  alarm_description   = "CPU utilization exceeds 80% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "missing"

  dimensions = {
    InstanceId = aws_instance.web_server.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

Let's break down the key parameters:

- `evaluation_periods` and `period` work together. 2 evaluation periods of 300 seconds means the threshold must be breached for 10 minutes before the alarm fires.
- `treat_missing_data` controls what happens when data points are absent. Options are `missing`, `breaching`, `notBreaching`, and `ignore`.
- `alarm_actions` fires when the alarm enters ALARM state. `ok_actions` fires when it returns to OK.

## SNS Topic for Alarm Notifications

You'll need an SNS topic to receive notifications:

```hcl
# SNS topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  name = "cloudwatch-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Separate topic for critical alerts
resource "aws_sns_topic" "critical_alerts" {
  name = "cloudwatch-critical-alerts"
}
```

## EC2 Alarms

```hcl
# CPU alarm
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "${var.environment}-ec2-high-cpu-${aws_instance.app.id}"
  alarm_description   = "EC2 instance CPU is too high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# Status check alarm - detects hardware/software issues
resource "aws_cloudwatch_metric_alarm" "ec2_status" {
  alarm_name          = "${var.environment}-ec2-status-check-${aws_instance.app.id}"
  alarm_description   = "EC2 instance failed status check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
}
```

## RDS Alarms

```hcl
# RDS CPU alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.environment}-rds-high-cpu"
  alarm_description   = "RDS CPU utilization is too high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# RDS free storage alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.environment}-rds-low-storage"
  alarm_description   = "RDS free storage below 10GB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10000000000  # 10 GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
}

# RDS connection count alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.environment}-rds-high-connections"
  alarm_description   = "RDS connection count is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_max_connections * 0.8

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## ALB Alarms

```hcl
# ALB 5xx error rate alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.environment}-alb-high-5xx"
  alarm_description   = "ALB target 5xx errors exceed threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 50

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# ALB target response time alarm
resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "${var.environment}-alb-high-latency"
  alarm_description   = "ALB P99 response time exceeds 3 seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 3

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Unhealthy targets alarm
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy" {
  alarm_name          = "${var.environment}-alb-unhealthy-targets"
  alarm_description   = "ALB has unhealthy targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0

  dimensions = {
    LoadBalancer  = aws_lb.main.arn_suffix
    TargetGroup   = aws_lb_target_group.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

## Lambda Alarms

```hcl
# Lambda error rate alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.environment}-lambda-errors-${aws_lambda_function.processor.function_name}"
  alarm_description   = "Lambda function error rate is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5

  # Using metric math to calculate error percentage
  metric_query {
    id          = "error_rate"
    expression  = "IF(invocations > 0, errors / invocations * 100, 0)"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = aws_lambda_function.processor.function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = aws_lambda_function.processor.function_name
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Lambda duration alarm
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.environment}-lambda-slow-${aws_lambda_function.processor.function_name}"
  alarm_description   = "Lambda function duration approaching timeout"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p95"
  threshold           = aws_lambda_function.processor.timeout * 1000 * 0.8  # 80% of timeout

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Composite Alarms

Composite alarms combine multiple alarms with AND/OR logic to reduce noise:

```hcl
# Composite alarm that only fires when both CPU and error rate are high
resource "aws_cloudwatch_composite_alarm" "service_degraded" {
  alarm_name        = "${var.environment}-service-degraded"
  alarm_description = "Service is degraded - high CPU AND high error rate"

  alarm_rule = "ALARM(\"${aws_cloudwatch_metric_alarm.ec2_cpu.alarm_name}\") AND ALARM(\"${aws_cloudwatch_metric_alarm.alb_5xx.alarm_name}\")"

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
```

## Reusable Module Pattern

For large environments, create a reusable module:

```hcl
# modules/cloudwatch-alarms/variables.tf
variable "environment" {
  type = string
}

variable "service_name" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}

variable "ec2_instance_ids" {
  type    = list(string)
  default = []
}

variable "cpu_threshold" {
  type    = number
  default = 80
}
```

```hcl
# modules/cloudwatch-alarms/main.tf
resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = toset(var.ec2_instance_ids)

  alarm_name          = "${var.environment}-${var.service_name}-cpu-${each.value}"
  alarm_description   = "CPU utilization for ${var.service_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_threshold

  dimensions = {
    InstanceId = each.value
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
    Service     = var.service_name
  }
}
```

Use the module:

```hcl
# Use the alarms module for each service
module "web_alarms" {
  source = "./modules/cloudwatch-alarms"

  environment     = "production"
  service_name    = "web-api"
  sns_topic_arn   = aws_sns_topic.alerts.arn
  ec2_instance_ids = [aws_instance.web[0].id, aws_instance.web[1].id]
  cpu_threshold   = 75
}
```

## Best Practices

**Use `treat_missing_data` wisely.** For scaling metrics, `missing` is usually right. For health checks, `breaching` may be more appropriate.

**Name alarms consistently.** Use a pattern like `{environment}-{service}-{metric}-{resource}`. This makes them sortable and searchable.

**Version control your alarm definitions.** This is the whole point of using Terraform. Review alarm changes in PRs just like code changes.

**Use variables for thresholds.** Different environments need different thresholds. Production might alert at 80% CPU, while dev alerts at 95%.

**Always include ok_actions.** Your team needs to know when things recover, not just when they break.

For building dashboards alongside your alarms, check out our guide on [CloudWatch dashboards with Terraform](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-dashboards-terraform/view).

## Wrapping Up

Terraform brings discipline to CloudWatch alarm management. Instead of manually creating alarms and hoping someone documented them, you have versioned, reviewed, and reproducible alarm definitions. The module pattern makes it easy to apply consistent monitoring across all your services. Start with the essentials - CPU, errors, latency - and expand from there as you learn what your applications need.
