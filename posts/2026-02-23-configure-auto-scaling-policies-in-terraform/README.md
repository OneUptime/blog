# How to Configure Auto Scaling Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Auto Scaling, Scaling Policies, CloudWatch

Description: A comprehensive guide to configuring AWS Auto Scaling policies with Terraform, including simple scaling, step scaling, scheduled scaling, and predictive scaling.

---

An Auto Scaling Group without scaling policies is just a fixed-size group of instances. The real power comes from policies that automatically adjust capacity based on metrics, schedules, or predictions. Terraform supports all the scaling policy types AWS offers, and getting the right combination can make the difference between a responsive application and one that crumbles under load.

This guide covers every type of scaling policy you can configure with Terraform.

## Simple Scaling Policies

Simple scaling is the oldest and most straightforward type. It adds or removes a fixed number of instances when a CloudWatch alarm fires. The downside is the cooldown period - after a scaling action, the policy won't fire again until the cooldown expires, even if the metric is still breaching.

```hcl
# Scale out policy - add instances when CPU is high
resource "aws_autoscaling_policy" "scale_out" {
  name                   = "scale-out"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "SimpleScaling"
  adjustment_type        = "ChangeInCapacity"

  # Add 2 instances when triggered
  scaling_adjustment = 2

  # Wait 300 seconds before allowing another scaling action
  cooldown = 300
}

# Scale in policy - remove instances when CPU is low
resource "aws_autoscaling_policy" "scale_in" {
  name                   = "scale-in"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "SimpleScaling"
  adjustment_type        = "ChangeInCapacity"

  # Remove 1 instance when triggered
  scaling_adjustment = -1

  cooldown = 300
}

# CloudWatch alarm to trigger scale out
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_out.arn]
}

# CloudWatch alarm to trigger scale in
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "low-cpu-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 30

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_in.arn]
}
```

The `adjustment_type` has three options:
- `ChangeInCapacity` - add or remove a specific number (e.g., +2, -1)
- `ExactCapacity` - set capacity to a specific number
- `PercentChangeInCapacity` - adjust by a percentage of current capacity

## Step Scaling Policies

Step scaling improves on simple scaling by letting you define different actions for different severity levels of the same metric. No cooldown period is needed - it continuously evaluates and adjusts.

```hcl
# Step scaling policy for scale out
resource "aws_autoscaling_policy" "step_scale_out" {
  name                   = "step-scale-out"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "StepScaling"
  adjustment_type        = "ChangeInCapacity"

  # Estimated seconds until new instances contribute to metrics
  estimated_instance_warmup = 300

  # Step adjustments define different actions at different thresholds
  step_adjustment {
    # CPU between 60% and 75% - add 1 instance
    metric_interval_lower_bound = 0    # threshold + 0 = 60%
    metric_interval_upper_bound = 15   # threshold + 15 = 75%
    scaling_adjustment          = 1
  }

  step_adjustment {
    # CPU between 75% and 90% - add 3 instances
    metric_interval_lower_bound = 15   # threshold + 15 = 75%
    metric_interval_upper_bound = 30   # threshold + 30 = 90%
    scaling_adjustment          = 3
  }

  step_adjustment {
    # CPU above 90% - add 5 instances
    metric_interval_lower_bound = 30   # threshold + 30 = 90%
    scaling_adjustment          = 5
  }
}

# Alarm that triggers the step scaling policy
resource "aws_cloudwatch_metric_alarm" "step_cpu_alarm" {
  alarm_name          = "step-cpu-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 60  # This is the base threshold for the step adjustments

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  alarm_actions = [aws_autoscaling_policy.step_scale_out.arn]
}

# Step scaling policy for scale in
resource "aws_autoscaling_policy" "step_scale_in" {
  name                   = "step-scale-in"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "StepScaling"
  adjustment_type        = "ChangeInCapacity"

  step_adjustment {
    # CPU between 25% and 40% - remove 1 instance
    metric_interval_upper_bound = 0    # threshold + 0 = 40%
    metric_interval_lower_bound = -15  # threshold - 15 = 25%
    scaling_adjustment          = -1
  }

  step_adjustment {
    # CPU below 25% - remove 2 instances
    metric_interval_upper_bound = -15  # threshold - 15 = 25%
    scaling_adjustment          = -2
  }
}

resource "aws_cloudwatch_metric_alarm" "step_low_cpu" {
  alarm_name          = "step-low-cpu-alarm"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 40

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  alarm_actions = [aws_autoscaling_policy.step_scale_in.arn]
}
```

Step scaling is better than simple scaling in almost every scenario because it responds proportionally to the severity of the breach.

## Scheduled Scaling

For predictable traffic patterns, scheduled scaling adjusts capacity at specific times.

```hcl
# Scale up before business hours
resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning"
  autoscaling_group_name = aws_autoscaling_group.app.name

  # Cron expression: 7:00 AM UTC, Monday through Friday
  recurrence = "0 7 * * MON-FRI"

  min_size         = 4
  max_size         = 20
  desired_capacity = 8
}

# Scale down after business hours
resource "aws_autoscaling_schedule" "scale_down_evening" {
  scheduled_action_name  = "scale-down-evening"
  autoscaling_group_name = aws_autoscaling_group.app.name

  # 7:00 PM UTC, Monday through Friday
  recurrence = "0 19 * * MON-FRI"

  min_size         = 2
  max_size         = 10
  desired_capacity = 2
}

# Weekend minimal capacity
resource "aws_autoscaling_schedule" "weekend" {
  scheduled_action_name  = "weekend-scale-down"
  autoscaling_group_name = aws_autoscaling_group.app.name

  # Friday 7 PM UTC
  recurrence = "0 19 * * FRI"

  min_size         = 1
  max_size         = 5
  desired_capacity = 1
}

# Scale back up for Monday
resource "aws_autoscaling_schedule" "monday_morning" {
  scheduled_action_name  = "monday-scale-up"
  autoscaling_group_name = aws_autoscaling_group.app.name

  # Monday 6:30 AM UTC (30 min before business hours to warm up)
  recurrence = "30 6 * * MON"

  min_size         = 4
  max_size         = 20
  desired_capacity = 8
}
```

You can also use one-time schedules for known events like product launches:

```hcl
# One-time scale up for a product launch
resource "aws_autoscaling_schedule" "product_launch" {
  scheduled_action_name  = "product-launch-prep"
  autoscaling_group_name = aws_autoscaling_group.app.name

  # Specific date and time (ISO 8601 format)
  start_time = "2026-03-15T08:00:00Z"
  end_time   = "2026-03-16T08:00:00Z"

  min_size         = 10
  max_size         = 50
  desired_capacity = 20
}
```

## Predictive Scaling

Predictive scaling uses machine learning to forecast traffic and pre-scale your fleet. It analyzes the past 14 days of CloudWatch data to find patterns.

```hcl
# Predictive scaling policy
resource "aws_autoscaling_policy" "predictive" {
  name                   = "predictive-scaling"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "PredictiveScaling"

  predictive_scaling_configuration {
    # "ForecastAndScale" proactively scales
    # "ForecastOnly" just creates forecasts without scaling (good for testing)
    mode = "ForecastAndScale"

    # How far ahead to schedule scaling actions
    scheduling_buffer_time = 300  # 5 minutes before predicted need

    # Maximum capacity forecast can set (overrides max_size is not supported)
    max_capacity_breach_behavior = "HonorMaxCapacity"

    metric_specification {
      target_value = 50  # Target CPU utilization

      # Use predefined scaling metric
      predefined_scaling_metric_specification {
        predefined_metric_type = "ASGAverageCPUUtilization"
        resource_label         = ""
      }

      # Use predefined load metric for forecasting
      predefined_load_metric_specification {
        predefined_metric_type = "ASGTotalCPUUtilization"
        resource_label         = ""
      }
    }
  }
}
```

## Combining Multiple Policies

In practice, you often combine scheduled scaling with dynamic policies. Here's a pattern that works well:

```hcl
# Scheduled scaling sets the baseline
resource "aws_autoscaling_schedule" "business_hours" {
  scheduled_action_name  = "business-hours"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 7 * * MON-FRI"
  min_size               = 4
  max_size               = 20
  desired_capacity       = 6
}

# Target tracking handles dynamic load changes on top of the baseline
resource "aws_autoscaling_policy" "target_tracking" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0

    # Don't scale in too aggressively - let the scheduled policy handle it
    disable_scale_in = false
  }
}

# Predictive scaling for known patterns
resource "aws_autoscaling_policy" "predictive" {
  name                   = "predictive"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "PredictiveScaling"

  predictive_scaling_configuration {
    mode                          = "ForecastAndScale"
    scheduling_buffer_time        = 300
    max_capacity_breach_behavior  = "HonorMaxCapacity"

    metric_specification {
      target_value = 50

      predefined_scaling_metric_specification {
        predefined_metric_type = "ASGAverageCPUUtilization"
        resource_label         = ""
      }

      predefined_load_metric_specification {
        predefined_metric_type = "ASGTotalCPUUtilization"
        resource_label         = ""
      }
    }
  }
}
```

When multiple policies are active, AWS uses the one that results in the highest capacity for scale-out and the one that results in the lowest capacity for scale-in.

## Summary

Start with target tracking for most use cases - it handles the math for you. Add step scaling when you need aggressive responses to severe load spikes. Layer in scheduled scaling for predictable patterns, and consider predictive scaling for workloads with consistent daily or weekly cycles. The combination of all four gives you comprehensive coverage against any traffic pattern.

For more details on target tracking specifically, see our guide on [creating target tracking scaling policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-target-tracking-scaling-policies-in-terraform/view).
