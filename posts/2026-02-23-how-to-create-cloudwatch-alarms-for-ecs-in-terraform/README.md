# How to Create CloudWatch Alarms for ECS in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, ECS, Monitoring, Container, Infrastructure as Code

Description: Learn how to create CloudWatch alarms for Amazon ECS services using Terraform to monitor CPU, memory, task health, and service scaling.

---

Amazon ECS (Elastic Container Service) runs your containerized applications, and monitoring it properly is essential for reliability. Unlike traditional servers, ECS requires you to monitor at the service and task levels, tracking container-specific metrics like CPU and memory utilization, running task counts, and deployment health. This guide shows you how to build comprehensive ECS monitoring with Terraform.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
terraform {
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

# SNS topic for ECS alarm notifications
resource "aws_sns_topic" "ecs_alarms" {
  name = "ecs-alarm-notifications"
}

variable "cluster_name" {
  type        = string
  description = "ECS cluster name"
}

variable "service_name" {
  type        = string
  description = "ECS service name"
}
```

## CPU Utilization Alarms

```hcl
# High CPU alarm for the ECS service
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "ecs-cpu-high-${var.service_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service ${var.service_name} CPU utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.ecs_alarms.arn]
  ok_actions          = [aws_sns_topic.ecs_alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# Scale-up trigger alarm
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_scale_up" {
  alarm_name          = "ecs-cpu-scale-up-${var.service_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 120
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "Trigger ECS service scale-up"
  alarm_actions       = [aws_appautoscaling_policy.scale_up.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# Scale-down trigger alarm
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_scale_down" {
  alarm_name          = "ecs-cpu-scale-down-${var.service_name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 30
  alarm_description   = "Trigger ECS service scale-down"
  alarm_actions       = [aws_appautoscaling_policy.scale_down.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}
```

## Memory Utilization Alarms

```hcl
# High memory alarm
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "ecs-memory-high-${var.service_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS service ${var.service_name} memory utilization exceeds 80%"
  alarm_actions       = [aws_sns_topic.ecs_alarms.arn]
  ok_actions          = [aws_sns_topic.ecs_alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# Critical memory alarm
resource "aws_cloudwatch_metric_alarm" "ecs_memory_critical" {
  alarm_name          = "ecs-memory-critical-${var.service_name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 95
  alarm_description   = "ECS service memory critically high - potential OOM kills"
  alarm_actions       = [aws_sns_topic.ecs_alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}
```

## Running Task Count Alarms

```hcl
# Alarm when running tasks drop below desired count
resource "aws_cloudwatch_metric_alarm" "ecs_running_tasks_low" {
  alarm_name          = "ecs-tasks-low-${var.service_name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = var.desired_task_count
  alarm_description   = "ECS running tasks are below desired count"
  alarm_actions       = [aws_sns_topic.ecs_alarms.arn]
  ok_actions          = [aws_sns_topic.ecs_alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

# No running tasks alarm - critical
resource "aws_cloudwatch_metric_alarm" "ecs_no_tasks" {
  alarm_name          = "ecs-no-tasks-${var.service_name}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "No running tasks for ECS service - service is down"
  alarm_actions       = [aws_sns_topic.ecs_alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

variable "desired_task_count" {
  type    = number
  default = 2
}
```

## Auto Scaling Configuration

```hcl
# Set up auto scaling for the ECS service
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${var.cluster_name}/${var.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale-up policy
resource "aws_appautoscaling_policy" "scale_up" {
  name               = "ecs-scale-up-${var.service_name}"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300
    metric_aggregation_type = "Average"

    step_adjustment {
      scaling_adjustment          = 2
      metric_interval_lower_bound = 0
    }
  }
}

# Scale-down policy
resource "aws_appautoscaling_policy" "scale_down" {
  name               = "ecs-scale-down-${var.service_name}"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 600
    metric_aggregation_type = "Average"

    step_adjustment {
      scaling_adjustment          = -1
      metric_interval_upper_bound = 0
    }
  }
}
```

## Deployment Monitoring

```hcl
# Monitor for deployment failures using CloudWatch Events
resource "aws_cloudwatch_event_rule" "ecs_deployment_failure" {
  name        = "ecs-deployment-failure-${var.service_name}"
  description = "Detect ECS deployment failures"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Deployment State Change"]
    detail = {
      eventName = ["SERVICE_DEPLOYMENT_FAILED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "deployment_failure_alert" {
  rule      = aws_cloudwatch_event_rule.ecs_deployment_failure.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.ecs_alarms.arn
}

# Monitor task state changes
resource "aws_cloudwatch_event_rule" "ecs_task_stopped" {
  name        = "ecs-task-stopped-${var.service_name}"
  description = "Detect ECS tasks stopping unexpectedly"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Task State Change"]
    detail = {
      lastStatus    = ["STOPPED"]
      stoppedReason = [{ "anything-but": ["Scaling activity initiated by"] }]
      clusterArn    = [{ "suffix": var.cluster_name }]
    }
  })
}

resource "aws_cloudwatch_event_target" "task_stopped_alert" {
  rule      = aws_cloudwatch_event_rule.ecs_task_stopped.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.ecs_alarms.arn
}
```

## Best Practices

Monitor both CPU and memory utilization since containers can be constrained by either resource. Track running task count separately from CPU and memory since tasks can fail for reasons unrelated to resource utilization. Use CloudWatch Container Insights for deeper metrics at the task and container level. Set scale-down cooldowns longer than scale-up cooldowns to avoid flapping. Monitor deployment events to catch failed rollouts quickly.

For monitoring the load balancers fronting your ECS services, see our guide on [CloudWatch alarms for ALB](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-alb-in-terraform/view).

## Conclusion

CloudWatch alarms for ECS created through Terraform give you the monitoring foundation needed to run reliable containerized workloads. By combining resource utilization alarms, task count monitoring, auto scaling, and deployment event tracking, you build a complete observability picture for your ECS services. The auto scaling integration means your services automatically adjust to demand while alerting you to unusual conditions.
