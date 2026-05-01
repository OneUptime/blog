# How to Configure ECS Service Auto Scaling with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Auto Scaling, Fargate, Cost Optimization, Infrastructure as Code

Description: Learn how to configure ECS service auto scaling with OpenTofu using target tracking policies for CPU and memory utilization to automatically adjust task count based on demand.

## Introduction

ECS Service Auto Scaling adjusts the desired task count based on metrics like CPU utilization, memory utilization, or custom CloudWatch metrics. Target tracking policies simplify configuration by automatically creating the necessary CloudWatch alarms and scaling actions to maintain a target metric value.

## Prerequisites

- OpenTofu v1.6+
- An existing ECS service
- AWS credentials with Application Auto Scaling permissions

## Step 1: Register ECS Service as Scalable Target

```hcl
resource "aws_appautoscaling_target" "ecs_service" {
  max_capacity       = 20
  min_capacity       = 2
  resource_id        = "service/${var.ecs_cluster_name}/${var.ecs_service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

## Step 2: CPU Utilization Target Tracking Policy

```hcl
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.project_name}-ecs-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0  # Keep average CPU utilization near 70%
    scale_in_cooldown  = 300   # Wait 5 minutes before scaling in
    scale_out_cooldown = 60    # Wait 1 minute before scaling out again
  }
}
```

## Step 3: Memory Utilization Policy

```hcl
resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "${var.project_name}-ecs-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Step 4: ALB Request Count Scaling

```hcl
resource "aws_appautoscaling_policy" "ecs_alb_requests" {
  name               = "${var.project_name}-ecs-alb-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${var.alb_arn_suffix}/${var.target_group_arn_suffix}"
    }
    target_value       = 1000  # Target 1000 requests per target per minute
    scale_in_cooldown  = 300
    scale_out_cooldown = 30    # Scale out quickly for traffic spikes
  }
}
```

## Step 5: Scheduled Scaling for Known Traffic Patterns

```hcl
# Scale up before business hours

resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "${var.project_name}-morning-scale-up"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 8 ? * MON-FRI *)"  # 8 AM UTC on weekdays

  scalable_target_action {
    min_capacity = 4
    max_capacity = 20
  }
}

# Scale down after business hours
resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "${var.project_name}-evening-scale-down"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 20 ? * MON-FRI *)"  # 8 PM UTC on weekdays

  scalable_target_action {
    min_capacity = 2
    max_capacity = 20
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check current scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id "service/my-cluster/my-service"
```

## Conclusion

Configure both CPU and ALB request count scaling policies-CPU handles compute-intensive workloads while request count scaling responds faster to traffic spikes before CPU utilization climbs. Use longer `scale_in_cooldown` (5 minutes) than `scale_out_cooldown` (30-60 seconds) to prevent flapping during variable traffic and protect against scaling in too aggressively during brief traffic dips.
