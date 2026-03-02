# How to Configure ECS Auto Scaling in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Auto Scaling, Fargate, Container, Performance

Description: Learn how to configure auto scaling for ECS Fargate services using Terraform, covering target tracking, step scaling, scheduled scaling, and scaling policies for different workload patterns.

---

Running a fixed number of containers works until traffic changes. At 3 AM, you are paying for capacity nobody uses. At peak traffic, you do not have enough containers and response times spike. Auto scaling adjusts the number of tasks in your ECS service based on demand - scaling out when load increases and scaling in when it drops.

ECS auto scaling uses Application Auto Scaling under the hood. You define scaling policies that react to CloudWatch metrics like CPU utilization, memory usage, or request count. This guide covers setting up each type of scaling policy in Terraform and the practical decisions around thresholds, cooldowns, and scaling limits.

## Registering the Scalable Target

Before creating scaling policies, register the ECS service as a scalable target:

```hcl
# Register the ECS service as a scalable target
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_tasks
  min_capacity       = var.min_tasks
  resource_id        = "service/${var.ecs_cluster_name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

variable "min_tasks" {
  description = "Minimum number of tasks"
  type        = number
  default     = 2
}

variable "max_tasks" {
  description = "Maximum number of tasks"
  type        = number
  default     = 20
}
```

The `min_capacity` and `max_capacity` set the bounds. Auto scaling will never go below or above these values, no matter what the metrics say.

## Target Tracking Scaling (Recommended)

Target tracking is the simplest and most effective scaling policy. You set a target value for a metric, and AWS automatically adjusts the task count to maintain that target:

```hcl
# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "cpu" {
  name               = "myapp-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70  # Keep CPU at 70% utilization

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 300  # Wait 5 minutes before scaling in
    scale_out_cooldown = 60   # Wait 1 minute before scaling out
  }
}

# Scale based on memory utilization
resource "aws_appautoscaling_policy" "memory" {
  name               = "myapp-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 75  # Keep memory at 75% utilization

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

You can use both CPU and memory scaling policies together. AWS will scale to satisfy whichever policy requires more capacity.

## Scale Based on Request Count

For web services, scaling on request count per target is often more effective than CPU:

```hcl
# Scale based on ALB request count per target
resource "aws_appautoscaling_policy" "requests" {
  name               = "myapp-request-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 1000  # 1000 requests per target per minute

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Scale on Custom Metrics

For application-specific scaling (like queue depth or active WebSocket connections), use a custom metric:

```hcl
# Scale based on SQS queue depth
resource "aws_appautoscaling_policy" "queue_depth" {
  name               = "myapp-queue-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 100  # 100 messages per task

    customized_metric_specification {
      metric_name = "BacklogPerTask"
      namespace   = "Custom/MyApp"
      statistic   = "Average"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

You would publish the custom metric from your application or a Lambda function that calculates `queue_depth / running_tasks`.

## Step Scaling

Step scaling gives you more control over how aggressively to scale at different thresholds. It is useful when you need non-linear scaling behavior:

```hcl
# Step scaling policy - scale out
resource "aws_appautoscaling_policy" "scale_out" {
  name               = "myapp-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    # Add 2 tasks when CPU is between 70-85%
    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 15
      scaling_adjustment          = 2
    }

    # Add 4 tasks when CPU is between 85-95%
    step_adjustment {
      metric_interval_lower_bound = 15
      metric_interval_upper_bound = 25
      scaling_adjustment          = 4
    }

    # Add 6 tasks when CPU is above 95%
    step_adjustment {
      metric_interval_lower_bound = 25
      scaling_adjustment          = 6
    }
  }
}

# CloudWatch alarm to trigger the step scaling
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "myapp-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = aws_ecs_service.app.name
  }

  alarm_actions = [aws_appautoscaling_policy.scale_out.arn]
}

# Step scaling policy - scale in
resource "aws_appautoscaling_policy" "scale_in" {
  name               = "myapp-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300
    metric_aggregation_type = "Average"

    # Remove 1 task when CPU drops below 30%
    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "myapp-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 30

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = aws_ecs_service.app.name
  }

  alarm_actions = [aws_appautoscaling_policy.scale_in.arn]
}
```

## Scheduled Scaling

If your traffic patterns are predictable (like business hours), schedule scaling changes:

```hcl
# Scale up for business hours (weekdays 8 AM - 6 PM EST)
resource "aws_appautoscaling_scheduled_action" "scale_up" {
  name               = "myapp-scale-up-business-hours"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension

  schedule = "cron(0 13 ? * MON-FRI *)"  # 8 AM EST = 1 PM UTC

  scalable_target_action {
    min_capacity = 6
    max_capacity = 20
  }
}

# Scale down for off-hours
resource "aws_appautoscaling_scheduled_action" "scale_down" {
  name               = "myapp-scale-down-off-hours"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension

  schedule = "cron(0 23 ? * MON-FRI *)"  # 6 PM EST = 11 PM UTC

  scalable_target_action {
    min_capacity = 2
    max_capacity = 10
  }
}

# Scale down further on weekends
resource "aws_appautoscaling_scheduled_action" "weekend" {
  name               = "myapp-weekend-scale"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension

  schedule = "cron(0 0 ? * SAT *)"  # Saturday midnight UTC

  scalable_target_action {
    min_capacity = 2
    max_capacity = 6
  }
}
```

## Important: Update the Service Lifecycle

When using auto scaling, tell Terraform to ignore changes to `desired_count` so it does not fight with the auto scaler:

```hcl
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.min_tasks  # Initial count

  # ... other config ...

  lifecycle {
    ignore_changes = [desired_count]
  }
}
```

Without this, every `terraform apply` would reset the task count to whatever is in your Terraform config, overriding the auto scaler's adjustments.

## Choosing Scaling Thresholds

The right thresholds depend on your application, but here are guidelines:

- **CPU target tracking at 70%** leaves headroom for traffic spikes while still using resources efficiently
- **Scale-out cooldown of 60 seconds** lets you respond quickly to growing demand
- **Scale-in cooldown of 300 seconds** prevents premature scale-in during temporary dips
- **Always keep minimum tasks >= 2** for availability across AZs
- Use **ALBRequestCountPerTarget** for web services - it responds to load before CPU saturates

## Outputs

```hcl
output "scaling_target_resource_id" {
  value = aws_appautoscaling_target.ecs.resource_id
}

output "min_capacity" {
  value = aws_appautoscaling_target.ecs.min_capacity
}

output "max_capacity" {
  value = aws_appautoscaling_target.ecs.max_capacity
}
```

## Summary

ECS auto scaling in Terraform starts with `aws_appautoscaling_target` to register the service, then `aws_appautoscaling_policy` for the scaling logic. Target tracking is the best default - set a CPU or request count target and let AWS handle the math. Use step scaling for more control over scaling speed at different thresholds. Use scheduled scaling for predictable traffic patterns. Combine all three for the most responsive setup. And always set `lifecycle { ignore_changes = [desired_count] }` on the ECS service so Terraform does not override the auto scaler.
