# How to Create Target Tracking Scaling Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Auto Scaling, Target Tracking, CloudWatch

Description: Learn how to implement target tracking scaling policies in Terraform to automatically maintain optimal resource utilization for your Auto Scaling Groups.

---

Target tracking scaling is the recommended scaling policy type for most workloads. You tell AWS what metric value you want to maintain (e.g., keep average CPU at 60%), and it figures out how many instances to add or remove to hit that target. No need to configure CloudWatch alarms, define step adjustments, or worry about cooldown periods. It just works.

This guide covers predefined metrics, custom metrics, and practical patterns for target tracking policies in Terraform.

## How Target Tracking Works

Target tracking is conceptually simple. You set a target value for a metric, and AWS continuously adjusts capacity to keep the metric close to that target. Think of it like a thermostat - you set the desired temperature, and the system handles the rest.

Behind the scenes, AWS creates and manages two CloudWatch alarms: one for scaling out (when the metric exceeds the target) and one for scaling in (when the metric drops below the target). You don't need to create these alarms yourself.

## Predefined Metric - CPU Utilization

The most common use case: scale based on average CPU across your instances.

```hcl
# Auto Scaling Group (referenced by the policy)
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = 3
  min_size            = 2
  max_size            = 20
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}

# Target tracking policy for CPU utilization
resource "aws_autoscaling_policy" "cpu_target" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    # Target 60% average CPU utilization
    target_value = 60.0

    # Seconds to wait before including a new instance in the metric
    # Prevents scaling decisions based on startup spikes
    estimated_instance_warmup = 300
  }
}
```

AWS provides four predefined metrics:
- `ASGAverageCPUUtilization` - Average CPU across all instances
- `ASGAverageNetworkIn` - Average inbound network bytes
- `ASGAverageNetworkOut` - Average outbound network bytes
- `ALBRequestCountPerTarget` - Average request count per target in a target group

## Predefined Metric - ALB Request Count

For web applications, scaling based on request count per target often works better than CPU. It directly reflects traffic load.

```hcl
# Target tracking based on ALB request count per target
resource "aws_autoscaling_policy" "request_count" {
  name                   = "request-count-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"

      # Required for ALB metrics - identifies which target group to track
      resource_label = "${aws_lb.app.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }

    # Each instance should handle approximately 1000 requests per minute
    target_value = 1000.0

    estimated_instance_warmup = 300
  }
}
```

The `resource_label` format is `app/lb-name/xxxxxxxx/targetgroup/tg-name/yyyyyyyy`. You can construct it from the ALB and target group ARN suffixes.

## Custom Metric Target Tracking

When predefined metrics don't fit, you can track any CloudWatch metric. This is useful for application-specific metrics like queue depth, active connections, or custom business metrics.

```hcl
# Scale based on average active connections per instance
resource "aws_autoscaling_policy" "connections" {
  name                   = "connections-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    customized_metric_specification {
      metric_name = "ActiveConnections"
      namespace   = "Custom/Application"
      statistic   = "Average"

      # Filter to only this ASG's instances
      metric_dimension {
        name  = "AutoScalingGroupName"
        value = aws_autoscaling_group.app.name
      }
    }

    # Keep average connections per instance at 500
    target_value = 500.0

    estimated_instance_warmup = 180
  }
}
```

To publish custom metrics from your application:

```bash
#!/bin/bash
# Script to publish custom metric from the application
# Run this on each instance via cron or a daemon

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
ASG_NAME=$(aws ec2 describe-tags \
  --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=aws:autoscaling:groupName" \
  --query "Tags[0].Value" --output text)

# Get the active connection count from your application
CONNECTIONS=$(curl -s http://localhost:8080/metrics | jq '.active_connections')

# Publish to CloudWatch
aws cloudwatch put-metric-data \
  --namespace "Custom/Application" \
  --metric-name "ActiveConnections" \
  --dimensions "AutoScalingGroupName=$ASG_NAME" \
  --value "$CONNECTIONS" \
  --unit "Count"
```

## SQS Queue-Based Scaling

A common pattern for worker fleets is scaling based on the number of messages in an SQS queue, divided by the number of instances.

```hcl
# Custom metric: messages per instance
resource "aws_autoscaling_policy" "queue_depth" {
  name                   = "queue-depth-target"
  autoscaling_group_name = aws_autoscaling_group.workers.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    customized_metric_specification {
      metrics {
        label = "Get the queue size (the p99 of the determine the queue size)"
        id    = "m1"

        metric_stat {
          metric {
            metric_name = "ApproximateNumberOfMessagesVisible"
            namespace   = "AWS/SQS"
            dimensions {
              name  = "QueueName"
              value = aws_sqs_queue.work.name
            }
          }
          stat = "Average"
        }

        return_data = false
      }

      metrics {
        label = "Get the group size"
        id    = "m2"

        metric_stat {
          metric {
            metric_name = "GroupInServiceInstances"
            namespace   = "AWS/AutoScaling"
            dimensions {
              name  = "AutoScalingGroupName"
              value = aws_autoscaling_group.workers.name
            }
          }
          stat = "Average"
        }

        return_data = false
      }

      metrics {
        label       = "Calculate the backlog per instance"
        id          = "e1"
        expression  = "m1 / m2"
        return_data = true
      }
    }

    # Each instance should have a backlog of about 100 messages
    target_value = 100.0
  }
}
```

This is a metric math expression that divides the queue depth by the number of running instances. When the backlog per instance exceeds 100, the ASG adds more workers. When it drops below 100, it removes them.

## Multiple Target Tracking Policies

You can attach multiple target tracking policies to the same ASG. AWS uses the one that results in the highest capacity (for safety).

```hcl
# Policy 1: Track CPU utilization
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value              = 60.0
    estimated_instance_warmup = 300
  }
}

# Policy 2: Track request count
resource "aws_autoscaling_policy" "requests" {
  name                   = "request-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.app.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value              = 800.0
    estimated_instance_warmup = 300
  }
}

# Policy 3: Track network output
resource "aws_autoscaling_policy" "network" {
  name                   = "network-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageNetworkOut"
    }
    # Target 500 MB/sec average network out per instance
    target_value              = 500000000
    estimated_instance_warmup = 300
  }
}
```

With all three active, if CPU-based policy says you need 5 instances, request-based says 8, and network says 4, the ASG will run 8 instances (the maximum).

## Disabling Scale-In

Sometimes you want target tracking to scale out automatically but control scale-in manually or through a different mechanism.

```hcl
# Target tracking that only scales out, never in
resource "aws_autoscaling_policy" "scale_out_only" {
  name                   = "scale-out-only"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value     = 50.0

    # Prevent this policy from removing instances
    disable_scale_in = true
  }
}

# Separate scheduled action for scale-in
resource "aws_autoscaling_schedule" "nightly_scale_in" {
  scheduled_action_name  = "nightly-scale-in"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 2 * * *"  # 2 AM UTC daily
  desired_capacity       = 2
  min_size               = 2
  max_size               = 20
}
```

## Tuning Tips

1. **Set the right target value** - Too low causes constant scaling, too high risks poor performance. Start at 60-70% for CPU, and adjust based on your application's characteristics.

2. **Adjust instance warmup** - Set `estimated_instance_warmup` to match how long your application takes to start serving traffic. This prevents scaling decisions based on instances still booting.

3. **Don't over-combine policies** - Having too many target tracking policies creates conflicting signals. Two or three well-chosen metrics usually suffice.

4. **Monitor the managed alarms** - Even though you don't create them, the auto-generated CloudWatch alarms are visible in the console. Check them to understand when and why scaling events happen.

5. **Consider request-based over CPU** - For web applications, `ALBRequestCountPerTarget` often provides better scaling behavior than CPU because it scales based on traffic volume directly.

## Summary

Target tracking is the simplest and most effective scaling policy for most workloads. Pick the right metric (request count for web apps, CPU for compute-heavy workloads, custom metrics for specialized use cases), set a reasonable target, and let AWS handle the math. Combine it with scheduled scaling for predictable patterns, and you have a robust auto-scaling setup with minimal configuration.

For the broader picture, see our guide on [configuring auto scaling policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-auto-scaling-policies-in-terraform/view) and [creating Auto Scaling Groups](https://oneuptime.com/blog/post/2026-02-23-create-auto-scaling-groups-with-terraform/view).
