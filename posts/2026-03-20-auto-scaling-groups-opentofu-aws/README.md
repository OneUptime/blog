# How to Create Auto Scaling Groups with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Auto Scaling, EC2, Infrastructure as Code, DevOps

Description: Learn how to define AWS Auto Scaling Groups with launch templates, scaling policies, and health checks using OpenTofu.

---

AWS Auto Scaling Groups (ASGs) automatically adjust the number of EC2 instances based on demand. OpenTofu lets you declare ASGs with launch templates, target tracking policies, and ALB integration as reproducible infrastructure code.

---

## Create a Launch Template

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-lt-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = aws_key_pair.deployer.key_name

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum install -y nginx
    systemctl enable --now nginx
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "web-asg"
    }
  }
}
```

---

## Create the Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "web" {
  name                      = "web-asg"
  vpc_zone_identifier       = aws_subnet.private[*].id
  target_group_arns         = [aws_lb_target_group.web.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 10
  desired_capacity = 2

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-asg"
    propagate_at_launch = true
  }
}
```

---

## Add Target Tracking Scaling Policy

```hcl
resource "aws_autoscaling_policy" "cpu_target" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }
}
```

---

## Add Step Scaling Policy

```hcl
resource "aws_autoscaling_policy" "scale_out" {
  name                   = "scale-out"
  policy_type            = "StepScaling"
  adjustment_type        = "ChangeInCapacity"
  autoscaling_group_name = aws_autoscaling_group.web.name

  step_adjustment {
    metric_interval_lower_bound = 0.0
    scaling_adjustment          = 2
  }
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.web.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_out.arn]
}
```

---

## Summary

Define a `aws_launch_template` with your AMI, instance type, and user data. Reference it in `aws_autoscaling_group` along with VPC subnets, ALB target groups, and min/max/desired capacity. Attach `aws_autoscaling_policy` resources for target tracking or step scaling, and pair step policies with CloudWatch alarms for event-driven scaling.
