# How to Create Container Service Auto Scaling in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Auto Scaling, ECS, Kubernetes, Performance

Description: Learn how to configure container service auto scaling in Terraform using target tracking, step scaling, and scheduled scaling for ECS, Kubernetes, and other platforms.

---

Auto scaling is essential for container services that need to handle variable traffic loads. Without auto scaling, you either over-provision resources (wasting money) or under-provision them (risking poor performance during traffic spikes). Terraform provides comprehensive support for configuring auto scaling policies across different container platforms, from AWS ECS to Kubernetes Horizontal Pod Autoscalers.

This guide covers how to create container service auto scaling configurations in Terraform, including target tracking, step scaling, custom metrics, and scheduled scaling.

## ECS Service Auto Scaling

### Setting Up the Scalable Target

```hcl
# Register the ECS service as a scalable target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 20
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

### Target Tracking Scaling

Target tracking is the simplest and most common scaling approach:

```hcl
# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "ecs-cpu-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    # Target 70% CPU utilization
    target_value = 70.0

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    # Cooldown periods to prevent rapid scaling
    scale_in_cooldown  = 300  # Wait 5 minutes before scaling in
    scale_out_cooldown = 60   # Wait 1 minute before scaling out
  }
}

# Scale based on memory utilization
resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "ecs-memory-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 80.0

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scale based on ALB request count per target
resource "aws_appautoscaling_policy" "ecs_alb_requests" {
  name               = "ecs-alb-request-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    # Target 1000 requests per target per minute
    target_value = 1000.0

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb_target_group.api.arn_suffix}/${aws_lb.main.arn_suffix}"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### Step Scaling for Fine-Grained Control

```hcl
# CloudWatch alarm for high CPU
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 60
  alarm_description   = "ECS service CPU is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }

  alarm_actions = [aws_appautoscaling_policy.ecs_step_up.arn]
}

# Step scaling policy for scaling out
resource "aws_appautoscaling_policy" "ecs_step_up" {
  name               = "ecs-step-scale-up"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    # CPU 60-75%: add 2 tasks
    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 15
      scaling_adjustment          = 2
    }

    # CPU 75-90%: add 4 tasks
    step_adjustment {
      metric_interval_lower_bound = 15
      metric_interval_upper_bound = 30
      scaling_adjustment          = 4
    }

    # CPU > 90%: add 6 tasks
    step_adjustment {
      metric_interval_lower_bound = 30
      scaling_adjustment          = 6
    }
  }
}

# Step scaling policy for scaling in
resource "aws_appautoscaling_policy" "ecs_step_down" {
  name               = "ecs-step-scale-down"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300
    metric_aggregation_type = "Average"

    # CPU < 30%: remove 1 task
    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}
```

### Scheduled Scaling

```hcl
# Scale up during business hours
resource "aws_appautoscaling_scheduled_action" "scale_up_business_hours" {
  name               = "scale-up-business-hours"
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension

  # Every weekday at 8 AM UTC
  schedule = "cron(0 8 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 5
    max_capacity = 20
  }
}

# Scale down outside business hours
resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "scale-down-evening"
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension

  # Every day at 10 PM UTC
  schedule = "cron(0 22 ? * * *)"

  scalable_target_action {
    min_capacity = 2
    max_capacity = 5
  }
}
```

## Kubernetes Horizontal Pod Autoscaler

### Basic HPA with CPU and Memory

```hcl
# Horizontal Pod Autoscaler for Kubernetes
resource "kubernetes_horizontal_pod_autoscaler_v2" "api" {
  metadata {
    name      = "api-hpa"
    namespace = "default"
  }

  spec {
    # Target deployment to scale
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.api.metadata[0].name
    }

    min_replicas = 2
    max_replicas = 20

    # Scale based on CPU utilization
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    # Scale based on memory utilization
    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }

    # Scaling behavior configuration
    behavior {
      # Scale-out behavior
      scale_up {
        stabilization_window_seconds = 60
        select_policy                = "Max"

        policy {
          type           = "Pods"
          value          = 4
          period_seconds = 60
        }

        policy {
          type           = "Percent"
          value          = 100
          period_seconds = 60
        }
      }

      # Scale-in behavior (more conservative)
      scale_down {
        stabilization_window_seconds = 300
        select_policy                = "Min"

        policy {
          type           = "Pods"
          value          = 1
          period_seconds = 120
        }
      }
    }
  }
}
```

### Custom Metrics HPA

```hcl
# HPA with custom metrics from Prometheus
resource "kubernetes_horizontal_pod_autoscaler_v2" "custom_metrics" {
  metadata {
    name      = "api-custom-hpa"
    namespace = "default"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.api.metadata[0].name
    }

    min_replicas = 3
    max_replicas = 30

    # Scale based on requests per second (custom metric)
    metric {
      type = "Pods"
      pods {
        metric {
          name = "http_requests_per_second"
        }
        target {
          type          = "AverageValue"
          average_value = "100"
        }
      }
    }

    # Scale based on queue depth (external metric)
    metric {
      type = "External"
      external {
        metric {
          name = "sqs_queue_depth"
          selector {
            match_labels = {
              queue = "orders"
            }
          }
        }
        target {
          type  = "Value"
          value = "50"
        }
      }
    }
  }
}
```

## KEDA-Based Scaling

```hcl
# KEDA ScaledObject for event-driven scaling
resource "kubernetes_manifest" "keda_scaledobject" {
  manifest = {
    apiVersion = "keda.sh/v1alpha1"
    kind       = "ScaledObject"
    metadata = {
      name      = "worker-scaledobject"
      namespace = "default"
    }
    spec = {
      scaleTargetRef = {
        name = kubernetes_deployment.worker.metadata[0].name
      }
      minReplicaCount = 0    # Scale to zero when idle
      maxReplicaCount = 50
      cooldownPeriod  = 300
      triggers = [
        {
          type = "aws-sqs-queue"
          metadata = {
            queueURL       = aws_sqs_queue.jobs.url
            queueLength    = "5"
            awsRegion      = var.region
          }
          authenticationRef = {
            name = "aws-credentials"
          }
        }
      ]
    }
  }
}
```

## Reusable Scaling Module

```hcl
# Reusable module for ECS auto scaling
variable "scaling_config" {
  description = "Auto scaling configuration"
  type = object({
    min_capacity           = number
    max_capacity           = number
    cpu_target             = number
    memory_target          = number
    scale_in_cooldown      = number
    scale_out_cooldown     = number
  })
  default = {
    min_capacity           = 2
    max_capacity           = 20
    cpu_target             = 70
    memory_target          = 80
    scale_in_cooldown      = 300
    scale_out_cooldown     = 60
  }
}
```

## Monitoring with OneUptime

Auto scaling helps handle traffic changes, but you need to know when scaling events occur and whether they are keeping up with demand. OneUptime monitors your service response times and availability during scaling events, alerting you when auto scaling is not fast enough to handle traffic spikes. Visit [OneUptime](https://oneuptime.com) for scaling-aware monitoring.

## Conclusion

Container service auto scaling in Terraform gives you predictable, version-controlled scaling behavior. Target tracking is the best starting point for most workloads, automatically adjusting capacity to maintain your target metric. Step scaling offers finer control for workloads with specific scaling requirements. Scheduled scaling handles predictable traffic patterns. Kubernetes HPA with custom metrics and KEDA enable event-driven scaling beyond simple CPU and memory. By defining all scaling policies in Terraform, you ensure consistent scaling behavior across environments and make it easy to adjust thresholds as your application evolves.

For more container topics, see [How to Create Container Resource Limits in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-resource-limits-in-terraform/view) and [How to Handle Container Networking with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-networking-with-terraform/view).
