# How to Configure AWS Auto Scaling Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Auto Scaling, AWS, EC2, Infrastructure as Code, Compute

Description: Learn how to configure AWS Auto Scaling Groups with OpenTofu - defining launch templates, scaling policies, lifecycle hooks, and mixed instance policies for cost-optimized compute fleets.

## Introduction

Auto Scaling Groups (ASGs) automatically adjust EC2 fleet size based on demand. OpenTofu manages the full ASG lifecycle: launch templates, target tracking and step scaling policies, lifecycle hooks for graceful draining, and mixed instance policies that blend On-Demand and Spot capacity.

## Launch Template

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "${var.environment}-app-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    environment = var.environment
    region      = var.region
  }))

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2 required
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.environment}-app"
      Environment = var.environment
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "${var.environment}-app-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"  # Use ALB health checks, not EC2 status
  health_check_grace_period = 300

  min_size         = var.asg_min_size
  max_size         = var.asg_max_size
  desired_capacity = var.asg_desired_capacity

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 300
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.environment}-app"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

## Target Tracking Scaling Policy

```hcl
# Scale to maintain 60% CPU utilization

resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${var.environment}-cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value       = 60.0
    disable_scale_in   = false
  }
}

# Scale based on ALB request count per target
resource "aws_autoscaling_policy" "request_count" {
  name                   = "${var.environment}-request-count"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.app.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value = 1000  # Requests per target per minute
  }
}
```

## Lifecycle Hooks for Graceful Draining

```hcl
# Hook that fires before termination - allows graceful shutdown
resource "aws_autoscaling_lifecycle_hook" "termination" {
  name                   = "${var.environment}-termination-hook"
  autoscaling_group_name = aws_autoscaling_group.app.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_TERMINATING"
  heartbeat_timeout      = 300  # 5 minutes to complete shutdown
  default_result         = "CONTINUE"

  notification_target_arn = aws_sqs_queue.lifecycle.arn
  role_arn                = aws_iam_role.lifecycle.arn
}

# Hook that fires during launch - allows initialization before traffic
resource "aws_autoscaling_lifecycle_hook" "launch" {
  name                   = "${var.environment}-launch-hook"
  autoscaling_group_name = aws_autoscaling_group.app.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_LAUNCHING"
  heartbeat_timeout      = 600  # 10 minutes to initialize
  default_result         = "CONTINUE"

  notification_target_arn = aws_sqs_queue.lifecycle.arn
  role_arn                = aws_iam_role.lifecycle.arn
}
```

## Mixed Instance Policy (Spot + On-Demand)

```hcl
resource "aws_autoscaling_group" "mixed" {
  name                = "${var.environment}-mixed-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  min_size            = 2
  max_size            = 20
  desired_capacity    = 4

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2     # Minimum On-Demand count
      on_demand_percentage_above_base_capacity = 20    # 20% On-Demand, 80% Spot above base
      spot_allocation_strategy                 = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = aws_launch_template.app.latest_version
      }

      # Allow multiple instance types for better Spot availability
      override {
        instance_type = "t3.medium"
      }
      override {
        instance_type = "t3a.medium"
      }
      override {
        instance_type = "t2.medium"
      }
    }
  }
}
```

## Scheduled Scaling

```hcl
# Scale up before business hours
resource "aws_autoscaling_schedule" "scale_up" {
  scheduled_action_name  = "scale-up-business-hours"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 7 * * MON-FRI"  # 7 AM weekdays UTC
  min_size               = 4
  max_size               = 20
  desired_capacity       = 6
}

# Scale down after business hours
resource "aws_autoscaling_schedule" "scale_down" {
  scheduled_action_name  = "scale-down-off-hours"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 19 * * MON-FRI"  # 7 PM weekdays UTC
  min_size               = 1
  max_size               = 20
  desired_capacity       = 2
}
```

## Conclusion

AWS Auto Scaling Groups with OpenTofu provide elastic compute capacity that responds to real demand. Use target tracking policies for simple CPU/request scaling, lifecycle hooks for graceful instance draining, and mixed instance policies to blend Spot and On-Demand capacity for up to 70% cost savings. The `instance_refresh` block enables rolling deployments when the launch template version changes, and using `aws_launch_template.app.latest_version` lets OpenTofu trigger a rolling refresh automatically on apply.
