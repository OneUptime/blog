# How to Deploy an Auto Scaling Group with OpenTofu on AWS - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, Auto Scaling, EC2

Description: Learn how to create an AWS Auto Scaling Group with launch templates, scaling policies, and lifecycle hooks using OpenTofu for elastic compute capacity.

## Introduction

AWS Auto Scaling Groups automatically adjust EC2 capacity based on demand. Combined with launch templates and scaling policies, ASGs ensure your application scales seamlessly with traffic. This guide covers setting up a complete ASG using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured
- Existing VPC with subnets and security groups

## Step 1: Create a Launch Template

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-launch-template-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  # Network interface
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.app_security_group_id]
  }

  # IAM instance profile
  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  # EBS root volume
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # IMDSv2 enforcement
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Enforce IMDSv2
    http_put_response_hop_limit = 1
  }

  # User data script
  user_data = base64encode(<<-USERDATA
    #!/bin/bash
    yum update -y
    yum install -y amazon-cloudwatch-agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -s -c ssm:/cloudwatch-agent-config
  USERDATA
  )

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "app-launch-template"
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}
```

## Step 2: Create the Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  vpc_zone_identifier = var.private_subnet_ids

  desired_capacity = 2
  min_size         = 1
  max_size         = 10

  # Launch template
  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  # Target group attachment for load balancer
  target_group_arns = [var.target_group_arn]

  # Health check
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Termination policies
  termination_policies = ["OldestInstance", "Default"]

  # Warm pool for faster scaling
  warm_pool {
    pool_state                  = "Stopped"
    min_size                    = 1
    max_group_prepared_capacity = 3
  }

  # Instance refresh for rolling updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 300
    }
  }

  tag {
    key                 = "Name"
    value               = "app-instance"
    propagate_at_launch = true
  }
}
```

## Step 3: Add Target Tracking Scaling Policy

```hcl
resource "aws_autoscaling_policy" "cpu_tracking" {
  name                      = "cpu-target-tracking"
  autoscaling_group_name    = aws_autoscaling_group.app.name
  policy_type               = "TargetTrackingScaling"
  estimated_instance_warmup = 300

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0  # Keep CPU around 60%
  }
}
```

## Step 4: Add Lifecycle Hook

```hcl
resource "aws_autoscaling_lifecycle_hook" "termination" {
  name                   = "app-termination-hook"
  autoscaling_group_name = aws_autoscaling_group.app.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_TERMINATING"
  heartbeat_timeout      = 300  # 5 minutes to complete graceful shutdown
  default_result         = "CONTINUE"

  notification_target_arn = aws_sns_topic.asg_events.arn
  role_arn                = aws_iam_role.asg_lifecycle.arn
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully deployed an Auto Scaling Group using OpenTofu with launch templates, target tracking policies, warm pools, and lifecycle hooks. Instance refresh enables rolling updates when your launch template changes. Use ELB health checks when you want the Auto Scaling Group to replace instances based on load balancer-reported application health.
