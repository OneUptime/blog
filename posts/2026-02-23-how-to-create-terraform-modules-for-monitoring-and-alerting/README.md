# How to Create Terraform Modules for Monitoring and Alerting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Monitoring, Alerting, CloudWatch, Observability

Description: Build reusable Terraform modules for monitoring and alerting infrastructure including CloudWatch dashboards, alarms, SNS topics, and metric-based alerts.

---

Monitoring and alerting infrastructure often gets bolted on as an afterthought. That means every team sets up alerts differently, thresholds are inconsistent, and critical services run without any monitoring at all. Terraform modules for monitoring solve this by packaging observability as code that ships with every deployment.

## The Monitoring Module Stack

A complete monitoring setup typically includes three layers:

1. **Notification channels** - Where alerts go (SNS, PagerDuty, Slack)
2. **Alarms and alerts** - What conditions trigger notifications
3. **Dashboards** - Visual overview of system health

Each of these works well as a separate module.

## SNS Notification Module

Start with a module that creates notification topics and subscriptions.

```hcl
# modules/notifications/variables.tf
variable "name" {
  description = "Name prefix for notification resources"
  type        = string
}

variable "email_subscribers" {
  description = "List of email addresses to subscribe"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "pagerduty_endpoint" {
  description = "PagerDuty HTTPS endpoint for critical alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/notifications/main.tf

# Topic for warning-level alerts
resource "aws_sns_topic" "warning" {
  name = "${var.name}-warning-alerts"
  tags = var.tags
}

# Topic for critical alerts
resource "aws_sns_topic" "critical" {
  name = "${var.name}-critical-alerts"
  tags = var.tags
}

# Email subscriptions for warning alerts
resource "aws_sns_topic_subscription" "warning_email" {
  count = length(var.email_subscribers)

  topic_arn = aws_sns_topic.warning.arn
  protocol  = "email"
  endpoint  = var.email_subscribers[count.index]
}

# Email subscriptions for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  count = length(var.email_subscribers)

  topic_arn = aws_sns_topic.critical.arn
  protocol  = "email"
  endpoint  = var.email_subscribers[count.index]
}

# PagerDuty subscription for critical alerts
resource "aws_sns_topic_subscription" "critical_pagerduty" {
  count = var.pagerduty_endpoint != "" ? 1 : 0

  topic_arn            = aws_sns_topic.critical.arn
  protocol             = "https"
  endpoint             = var.pagerduty_endpoint
  endpoint_auto_confirms = true
}

# Lambda for Slack integration (if webhook provided)
resource "aws_lambda_function" "slack_notifier" {
  count = var.slack_webhook_url != "" ? 1 : 0

  function_name = "${var.name}-slack-notifier"
  runtime       = "python3.11"
  handler       = "index.handler"
  role          = aws_iam_role.slack_lambda[0].arn
  timeout       = 30

  filename         = data.archive_file.slack_lambda[0].output_path
  source_code_hash = data.archive_file.slack_lambda[0].output_base64sha256

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }

  tags = var.tags
}
```

```hcl
# modules/notifications/outputs.tf
output "warning_topic_arn" {
  description = "ARN of the warning alerts SNS topic"
  value       = aws_sns_topic.warning.arn
}

output "critical_topic_arn" {
  description = "ARN of the critical alerts SNS topic"
  value       = aws_sns_topic.critical.arn
}
```

## CloudWatch Alarms Module

This module creates standard alarms for common AWS resources.

```hcl
# modules/alarms/variables.tf
variable "name" {
  description = "Name prefix for alarms"
  type        = string
}

variable "warning_sns_topic_arn" {
  description = "SNS topic ARN for warning alerts"
  type        = string
}

variable "critical_sns_topic_arn" {
  description = "SNS topic ARN for critical alerts"
  type        = string
}

# ECS monitoring inputs
variable "ecs_cluster_name" {
  description = "ECS cluster name to monitor"
  type        = string
  default     = ""
}

variable "ecs_service_name" {
  description = "ECS service name to monitor"
  type        = string
  default     = ""
}

# RDS monitoring inputs
variable "rds_instance_id" {
  description = "RDS instance identifier to monitor"
  type        = string
  default     = ""
}

# ALB monitoring inputs
variable "alb_arn_suffix" {
  description = "ALB ARN suffix for monitoring"
  type        = string
  default     = ""
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix for monitoring"
  type        = string
  default     = ""
}
```

```hcl
# modules/alarms/main.tf

# -- ECS Alarms --

# High CPU utilization on ECS service
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.ecs_service_name != "" ? 1 : 0

  alarm_name          = "${var.name}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service CPU utilization above 80% for 3 minutes"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = [var.warning_sns_topic_arn]
  ok_actions    = [var.warning_sns_topic_arn]
}

# Critical CPU - fires at 95%
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_critical" {
  count = var.ecs_service_name != "" ? 1 : 0

  alarm_name          = "${var.name}-ecs-cpu-critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 95
  alarm_description   = "ECS service CPU utilization above 95% for 2 minutes"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = [var.critical_sns_topic_arn]
  ok_actions    = [var.critical_sns_topic_arn]
}

# ECS memory utilization
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.ecs_service_name != "" ? 1 : 0

  alarm_name          = "${var.name}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS service memory utilization above 85%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = [var.warning_sns_topic_arn]
  ok_actions    = [var.warning_sns_topic_arn]
}

# -- RDS Alarms --

# RDS CPU utilization
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  count = var.rds_instance_id != "" ? 1 : 0

  alarm_name          = "${var.name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization above 80% for 15 minutes"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.warning_sns_topic_arn]
  ok_actions    = [var.warning_sns_topic_arn]
}

# RDS free storage space
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  count = var.rds_instance_id != "" ? 1 : 0

  alarm_name          = "${var.name}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120  # 5 GB in bytes
  alarm_description   = "RDS free storage below 5GB"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.critical_sns_topic_arn]
  ok_actions    = [var.critical_sns_topic_arn]
}

# RDS database connections
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  count = var.rds_instance_id != "" ? 1 : 0

  alarm_name          = "${var.name}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "RDS connection count above 100"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.warning_sns_topic_arn]
  ok_actions    = [var.warning_sns_topic_arn]
}

# -- ALB Alarms --

# ALB 5xx error rate
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count = var.alb_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB returning more than 10 5xx errors per minute"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [var.critical_sns_topic_arn]
  ok_actions    = [var.critical_sns_topic_arn]
}

# Target group unhealthy hosts
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  count = var.target_group_arn_suffix != "" ? 1 : 0

  alarm_name          = "${var.name}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "One or more targets are unhealthy"

  dimensions = {
    TargetGroup  = var.target_group_arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [var.warning_sns_topic_arn]
  ok_actions    = [var.warning_sns_topic_arn]
}
```

## CloudWatch Dashboard Module

Dashboards give teams a visual overview of their services.

```hcl
# modules/dashboard/main.tf

resource "aws_cloudwatch_dashboard" "this" {
  dashboard_name = var.name

  dashboard_body = jsonencode({
    widgets = concat(
      # ECS widgets
      var.ecs_service_name != "" ? [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "ECS CPU Utilization"
            metrics = [
              ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name]
            ]
            period = 300
            stat   = "Average"
            region = data.aws_region.current.name
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 0
          width  = 12
          height = 6
          properties = {
            title   = "ECS Memory Utilization"
            metrics = [
              ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name]
            ]
            period = 300
            stat   = "Average"
            region = data.aws_region.current.name
          }
        }
      ] : [],

      # RDS widgets
      var.rds_instance_id != "" ? [
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 8
          height = 6
          properties = {
            title   = "RDS CPU Utilization"
            metrics = [
              ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id]
            ]
            period = 300
            stat   = "Average"
          }
        }
      ] : []
    )
  })
}

data "aws_region" "current" {}
```

## Composing the Full Monitoring Stack

```hcl
# Root module - wire monitoring into your deployment

module "notifications" {
  source = "./modules/notifications"

  name              = "myapp-production"
  email_subscribers = ["oncall@mycompany.com"]
  pagerduty_endpoint = var.pagerduty_endpoint
}

module "alarms" {
  source = "./modules/alarms"

  name                   = "myapp-production"
  warning_sns_topic_arn  = module.notifications.warning_topic_arn
  critical_sns_topic_arn = module.notifications.critical_topic_arn

  ecs_cluster_name        = module.compute.cluster_name
  ecs_service_name        = module.compute.service_name
  rds_instance_id         = module.database.instance_id
  alb_arn_suffix          = module.alb.arn_suffix
  target_group_arn_suffix = module.alb.target_group_arn_suffix
}

module "dashboard" {
  source = "./modules/dashboard"

  name              = "myapp-production"
  ecs_cluster_name  = module.compute.cluster_name
  ecs_service_name  = module.compute.service_name
  rds_instance_id   = module.database.instance_id
}
```

## Conclusion

Monitoring modules ensure that every deployment ships with proper observability from day one. Build them alongside your compute and storage modules, and make them part of your standard deployment pattern. The upfront investment pays off the first time an alarm catches a problem before your users do.

For related reading, check out [how to create Terraform modules for CI/CD infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-ci-cd-infrastructure/view) and [how to create Terraform modules for compute patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-compute-patterns/view).
