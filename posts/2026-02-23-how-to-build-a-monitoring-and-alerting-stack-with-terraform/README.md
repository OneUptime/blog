# How to Build a Monitoring and Alerting Stack with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Monitoring, Alerting, CloudWatch, Prometheus, Grafana, Infrastructure Patterns

Description: Learn how to build a complete monitoring and alerting stack with Terraform covering CloudWatch, Prometheus, Grafana dashboards, and multi-channel alert routing.

---

You cannot fix what you cannot see. Monitoring is the eyes and ears of your infrastructure, and alerting is the voice that tells you when something is wrong. Without a proper monitoring stack, you find out about outages from your customers instead of your dashboards.

In this guide, we will build a comprehensive monitoring and alerting stack using Terraform. We will cover both AWS-native tools (CloudWatch) and open-source alternatives (Prometheus and Grafana), giving you the flexibility to choose what works for your team.

## Architecture Overview

Our monitoring stack includes:

- CloudWatch for AWS resource metrics and alarms
- Prometheus for application-level metrics
- Grafana for visualization
- SNS for alert routing to Slack, PagerDuty, and email
- CloudWatch Synthetics for uptime monitoring

## CloudWatch Alarms

Start with the fundamentals. CloudWatch alarms on key infrastructure metrics:

```hcl
# Module for creating standardized alarms
# modules/cloudwatch_alarm/main.tf
resource "aws_cloudwatch_metric_alarm" "this" {
  alarm_name          = var.alarm_name
  comparison_operator = var.comparison_operator
  evaluation_periods  = var.evaluation_periods
  metric_name         = var.metric_name
  namespace           = var.namespace
  period              = var.period
  statistic           = var.statistic
  threshold           = var.threshold
  alarm_description   = var.alarm_description
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  treat_missing_data  = var.treat_missing_data
  dimensions          = var.dimensions

  tags = var.tags
}
```

Use the module to create alarms across your infrastructure:

```hcl
# EC2 CPU alarm
module "ec2_cpu_alarm" {
  source              = "./modules/cloudwatch_alarm"
  alarm_name          = "${var.project_name}-ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU utilization exceeds 80% for 15 minutes"
  alarm_actions       = [aws_sns_topic.critical.arn]
  ok_actions          = [aws_sns_topic.resolved.arn]

  dimensions = {
    InstanceId = var.instance_id
  }
}

# RDS connection count alarm
module "rds_connections_alarm" {
  source              = "./modules/cloudwatch_alarm"
  alarm_name          = "${var.project_name}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.max_db_connections * 0.8
  alarm_description   = "RDS connections approaching limit"
  alarm_actions       = [aws_sns_topic.warning.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}

# ALB 5xx error rate
module "alb_5xx_alarm" {
  source              = "./modules/cloudwatch_alarm"
  alarm_name          = "${var.project_name}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB target 5xx errors exceeding threshold"
  alarm_actions       = [aws_sns_topic.critical.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}
```

## SNS Topics for Alert Routing

Create separate topics for different severity levels:

```hcl
# Critical alerts go to PagerDuty and Slack
resource "aws_sns_topic" "critical" {
  name = "${var.project_name}-critical-alerts"
}

# Warning alerts go to Slack only
resource "aws_sns_topic" "warning" {
  name = "${var.project_name}-warning-alerts"
}

# Resolved notifications
resource "aws_sns_topic" "resolved" {
  name = "${var.project_name}-resolved-alerts"
}

# Email subscription for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "email"
  endpoint  = var.oncall_email
}

# HTTPS subscription to PagerDuty
resource "aws_sns_topic_subscription" "critical_pagerduty" {
  topic_arn = aws_sns_topic.critical.arn
  protocol  = "https"
  endpoint  = var.pagerduty_endpoint
}

# Lambda subscription for Slack notifications
resource "aws_sns_topic_subscription" "warning_slack" {
  topic_arn = aws_sns_topic.warning.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier.arn
}
```

## Prometheus on ECS

For application-level metrics that CloudWatch does not cover, deploy Prometheus:

```hcl
# ECS task definition for Prometheus
resource "aws_ecs_task_definition" "prometheus" {
  family                   = "${var.project_name}-prometheus"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.prometheus_task.arn

  container_definitions = jsonencode([
    {
      name      = "prometheus"
      image     = "prom/prometheus:v2.50.0"
      essential = true

      portMappings = [
        {
          containerPort = 9090
          protocol      = "tcp"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "prometheus-config"
          containerPath = "/etc/prometheus"
          readOnly      = true
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.prometheus.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "prometheus"
        }
      }
    }
  ])

  volume {
    name = "prometheus-config"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.prometheus.id
      root_directory = "/prometheus-config"
    }
  }
}

# EFS for persistent Prometheus storage
resource "aws_efs_file_system" "prometheus" {
  creation_token = "${var.project_name}-prometheus"
  encrypted      = true

  tags = {
    Name = "${var.project_name}-prometheus-data"
  }
}

resource "aws_efs_mount_target" "prometheus" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.prometheus.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}
```

## Grafana for Dashboards

Deploy Grafana alongside Prometheus for visualization:

```hcl
resource "aws_ecs_task_definition" "grafana" {
  family                   = "${var.project_name}-grafana"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.grafana_task.arn

  container_definitions = jsonencode([
    {
      name      = "grafana"
      image     = "grafana/grafana:10.3.0"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "GF_SERVER_ROOT_URL"
          value = "https://grafana.${var.domain_name}"
        },
        {
          name  = "GF_DATABASE_TYPE"
          value = "postgres"
        },
        {
          name  = "GF_DATABASE_HOST"
          value = var.grafana_db_endpoint
        }
      ]

      secrets = [
        {
          name      = "GF_DATABASE_PASSWORD"
          valueFrom = aws_secretsmanager_secret.grafana_db.arn
        },
        {
          name      = "GF_SECURITY_ADMIN_PASSWORD"
          valueFrom = aws_secretsmanager_secret.grafana_admin.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.grafana.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "grafana"
        }
      }
    }
  ])
}
```

## CloudWatch Synthetics

Use canaries to monitor your application from the outside:

```hcl
resource "aws_synthetics_canary" "api_health" {
  name                 = "${var.project_name}-api-health"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/canary/"
  execution_role_arn   = aws_iam_role.canary.arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = data.archive_file.canary_script.output_path
  runtime_version      = "syn-nodejs-puppeteer-7.0"

  schedule {
    expression = "rate(5 minutes)"
  }

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960

    environment_variables = {
      TARGET_URL = "https://api.${var.domain_name}/health"
    }
  }

  success_retention_period = 7
  failure_retention_period = 14
}

# Alarm when the canary fails
resource "aws_cloudwatch_metric_alarm" "canary_failed" {
  alarm_name          = "${var.project_name}-canary-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "API health canary success rate below 90%"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    CanaryName = aws_synthetics_canary.api_health.name
  }
}
```

## CloudWatch Dashboard

Create an operational dashboard to give your team an at-a-glance view:

```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "API Response Time"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "p99"
          region = var.region
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Request Count"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "Sum"
          region = var.region
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Error Rate"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "Sum"
          region = var.region
        }
      }
    ]
  })
}
```

For log-based monitoring and analysis, see our guide on [building a log aggregation pipeline with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-log-aggregation-pipeline-with-terraform/view).

## Wrapping Up

A solid monitoring and alerting stack is non-negotiable for production infrastructure. The approach we covered here gives you multiple layers of observability: infrastructure metrics with CloudWatch, application metrics with Prometheus, visualization with Grafana, and synthetic monitoring for external health checks. Define it all in Terraform so that every environment gets the same monitoring coverage, and you never deploy something you cannot observe.
