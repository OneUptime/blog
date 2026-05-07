# How to Deploy an Auto Scaling Group with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Auto Scaling, EC2, Infrastructure as Code

Description: Learn how to deploy an AWS Auto Scaling Group with OpenTofu using launch templates, target tracking policies, and ALB integration.

## Introduction

Auto Scaling Groups (ASGs) automatically adjust the number of EC2 instances based on demand. Combined with a Launch Template and target tracking policies, they provide elastic compute capacity without manual intervention.

## Launch Template

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "${var.name}-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata.sh.tftpl", {
    environment = var.environment
  }))

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_type           = "gp3"
      volume_size           = 30
      encrypted             = true
      delete_on_termination = true
    }
  }

  monitoring { enabled = true }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = var.name, Environment = var.environment }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "${var.name}-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
    }
  }

  dynamic "tag" {
    for_each = {
      Name        = var.name
      Environment = var.environment
    }
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}
```

## Target Tracking Scaling Policy

```hcl
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${var.name}-cpu-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0  # Maintain 60% average CPU
  }
}
```

## Scheduled Scaling

```hcl
# Scale down overnight to save costs

resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 22 * * *"  # 10pm UTC
  min_size               = 1
  max_size               = 4
  desired_capacity       = 1
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 7 * * MON-FRI"  # 7am UTC weekdays
  min_size               = var.min_size
  max_size               = var.max_size
  desired_capacity       = var.desired_capacity
}
```

## Conclusion

Auto Scaling Groups with Launch Templates and target tracking policies provide elastic, cost-efficient compute. Use instance refresh for rolling AMI or configuration updates, and combine target tracking with scheduled scaling for predictable workload patterns.
