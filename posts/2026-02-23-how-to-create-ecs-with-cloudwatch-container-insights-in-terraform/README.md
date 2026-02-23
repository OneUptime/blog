# How to Create ECS with CloudWatch Container Insights in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, CloudWatch, Container Insights, Monitoring, Observability, Infrastructure as Code

Description: Learn how to enable and configure CloudWatch Container Insights for ECS using Terraform to get detailed metrics, logs, and performance data for your containers.

---

Running containers without proper observability is like flying blind. CloudWatch Container Insights provides detailed performance metrics, automated dashboards, and diagnostic information for your ECS clusters, services, and tasks. It collects metrics at the cluster, service, and task level, giving you visibility into CPU usage, memory consumption, network traffic, and storage utilization. This guide shows you how to enable and configure Container Insights for ECS using Terraform.

## What Container Insights Provides

Container Insights collects and aggregates metrics at multiple levels:

- **Cluster level** - Overall CPU and memory utilization, task counts, service counts
- **Service level** - Per-service CPU, memory, running task count, deployment status
- **Task level** - Individual task CPU, memory, network I/O, and storage metrics
- **Container level** - Per-container resource utilization within a task

It also provides automated CloudWatch dashboards and the ability to set alarms on any of these metrics.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with subnets
- Understanding of ECS and CloudWatch concepts

## Enabling Container Insights on the ECS Cluster

The simplest step is enabling Container Insights at the cluster level.

```hcl
provider "aws" {
  region = "us-east-1"
}

# ECS Cluster with Container Insights enabled
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  # Enable Container Insights
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  # Optionally enable enhanced Container Insights
  # for more detailed metrics with shorter collection intervals
  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Name        = "production-cluster"
    Environment = "production"
  }
}

# Log group for ECS Exec (optional, but useful for debugging)
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/exec/production-cluster"
  retention_in_days = 7
}
```

## Setting Up Task Logging

Configure CloudWatch Logs for your ECS tasks to complement Container Insights metrics with application logs.

```hcl
# Log group for application logs
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/production/app"
  retention_in_days = 30

  tags = {
    Service     = "app"
    Environment = "production"
  }
}

# Log group for sidecar/monitoring containers
resource "aws_cloudwatch_log_group" "monitoring" {
  name              = "/ecs/production/monitoring"
  retention_in_days = 14

  tags = {
    Service     = "monitoring"
    Environment = "production"
  }
}

# IAM role for task execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role for application
resource "aws_iam_role" "ecs_task" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Allow task role to push custom metrics
resource "aws_iam_role_policy" "task_cloudwatch" {
  name = "task-cloudwatch-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Task Definition with Detailed Logging

```hcl
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Task definition with comprehensive logging
resource "aws_ecs_task_definition" "app" {
  family                   = "production-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "your-account.dkr.ecr.us-east-1.amazonaws.com/app:latest"
      cpu       = 448
      memory    = 896
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]

      # CloudWatch Logs configuration
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
          # Enable multiline log pattern matching
          "awslogs-multiline-pattern" = "^\\d{4}-\\d{2}-\\d{2}"
        }
      }

      # Health check for Container Insights health reporting
      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
    {
      # CloudWatch agent sidecar for custom metrics
      name      = "cloudwatch-agent"
      image     = "amazon/cloudwatch-agent:latest"
      cpu       = 64
      memory    = 128
      essential = false

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.monitoring.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "cwagent"
        }
      }

      environment = [
        {
          name  = "CW_CONFIG_CONTENT"
          value = jsonencode({
            metrics = {
              namespace = "ECS/CustomMetrics"
              metrics_collected = {
                statsd = {
                  service_address = ":8125"
                }
              }
            }
          })
        }
      ]
    }
  ])

  tags = {
    Name = "production-app"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "production-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  tags = {
    Name = "production-app-service"
  }
}
```

## CloudWatch Alarms Based on Container Insights Metrics

Create alarms that trigger on Container Insights metrics.

```hcl
# SNS topic for alerts
resource "aws_sns_topic" "ecs_alerts" {
  name = "ecs-container-alerts"
}

# High CPU utilization at the service level
resource "aws_cloudwatch_metric_alarm" "service_cpu_high" {
  alarm_name          = "ecs-service-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CpuUtilized"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.ecs_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# High memory utilization at the service level
resource "aws_cloudwatch_metric_alarm" "service_memory_high" {
  alarm_name          = "ecs-service-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilized"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service memory utilization is above 80%"
  alarm_actions       = [aws_sns_topic.ecs_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# Running task count below desired
resource "aws_cloudwatch_metric_alarm" "running_tasks_low" {
  alarm_name          = "ecs-running-tasks-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 3  # Should match desired_count
  alarm_description   = "Running task count is below desired"
  alarm_actions       = [aws_sns_topic.ecs_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# High network transmit errors
resource "aws_cloudwatch_metric_alarm" "network_errors" {
  alarm_name          = "ecs-network-tx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkTxDropped"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Network transmit drops exceed threshold"
  alarm_actions       = [aws_sns_topic.ecs_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

# Cluster-level CPU reservation alarm
resource "aws_cloudwatch_metric_alarm" "cluster_cpu_reservation" {
  alarm_name          = "ecs-cluster-cpu-reservation-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CpuReserved"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Cluster CPU reservation is above 85% - may need more capacity"
  alarm_actions       = [aws_sns_topic.ecs_alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
  }
}
```

## CloudWatch Dashboard

Create a custom dashboard that visualizes Container Insights data.

```hcl
# CloudWatch Dashboard for ECS Container Insights
resource "aws_cloudwatch_dashboard" "ecs" {
  dashboard_name = "ECS-Container-Insights"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "CpuUtilized", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name],
            ["ECS/ContainerInsights", "CpuReserved", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "Service CPU (Utilized vs Reserved)"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "MemoryUtilized", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name],
            ["ECS/ContainerInsights", "MemoryReserved", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "Service Memory (Utilized vs Reserved)"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name],
            ["ECS/ContainerInsights", "DesiredTaskCount", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 60
          stat   = "Average"
          region = "us-east-1"
          title  = "Task Count (Running vs Desired)"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "NetworkRxBytes", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name],
            ["ECS/ContainerInsights", "NetworkTxBytes", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.app.name]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Network I/O"
          view   = "timeSeries"
        }
      }
    ]
  })
}
```

## Log Insights Queries

Use CloudWatch Logs Insights to query your ECS logs for troubleshooting.

```hcl
# Save common Logs Insights queries as query definitions
resource "aws_cloudwatch_query_definition" "error_logs" {
  name = "ECS/ErrorLogs"

  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /error|Error|ERROR/
    | sort @timestamp desc
    | limit 50
  EOT
}

resource "aws_cloudwatch_query_definition" "slow_requests" {
  name = "ECS/SlowRequests"

  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]

  query_string = <<-EOT
    fields @timestamp, @message
    | parse @message "duration=* ms" as duration
    | filter duration > 1000
    | sort duration desc
    | limit 20
  EOT
}
```

## Outputs

```hcl
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "dashboard_url" {
  value = "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.ecs.dashboard_name}"
}

output "log_group" {
  value = aws_cloudwatch_log_group.app.name
}
```

## Best Practices

When configuring Container Insights, enable it on every ECS cluster, including development and staging, as the cost is minimal and the visibility is valuable. Set appropriate log retention periods to control costs. Create alarms for key metrics like CPU, memory, and running task count. Use CloudWatch dashboards for at-a-glance visibility. Configure log groups with appropriate retention and consider exporting logs to S3 for long-term storage. Use structured logging (JSON format) in your applications to make Logs Insights queries more powerful.

## Monitoring with OneUptime

While Container Insights provides AWS-native monitoring, [OneUptime](https://oneuptime.com) complements it with external uptime monitoring, synthetic checks, and a unified view across all your services. Combine both for comprehensive observability of your ECS workloads.

## Conclusion

CloudWatch Container Insights is an essential component of any ECS deployment. It provides the metrics, logs, and dashboards you need to understand how your containers are performing and to quickly diagnose issues. With Terraform, you can automate the entire observability setup alongside your infrastructure, ensuring every cluster and service is monitored from day one. By combining Container Insights metrics with well-configured alarms and dashboards, you get comprehensive visibility into your containerized applications.

For more ECS monitoring and configuration topics, see our guides on [ECS with App Mesh](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-with-app-mesh-integration-in-terraform/view) and [ECS blue-green deployment](https://oneuptime.com/blog/post/2026-02-23-how-to-create-ecs-blue-green-deployment-in-terraform/view).
