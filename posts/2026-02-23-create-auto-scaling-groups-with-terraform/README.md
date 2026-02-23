# How to Create Auto Scaling Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Auto Scaling, EC2, High Availability

Description: Learn how to create and configure AWS Auto Scaling Groups with Terraform, including launch templates, health checks, instance refresh, and integration with load balancers.

---

Auto Scaling Groups (ASGs) automatically manage the number of EC2 instances based on demand. When traffic spikes, the ASG launches new instances. When it drops, it terminates them. This keeps your application responsive while minimizing costs. Combined with Terraform, you get repeatable, version-controlled scaling infrastructure.

Let's build up from a basic ASG to a production-ready configuration.

## Prerequisites

You need a launch template and networking in place. If you don't have a launch template yet, check our guide on [creating launch templates for Auto Scaling](https://oneuptime.com/blog/post/2026-02-23-create-launch-templates-for-auto-scaling-in-terraform/view).

```hcl
provider "aws" {
  region = "us-east-1"
}

# Look up existing VPC and subnets (or create them)
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}
```

## Basic Auto Scaling Group

The minimum configuration needs a launch template, subnet list, and capacity settings.

```hcl
# Launch template for the ASG
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.al2023.id
  instance_type = "t3.medium"

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(file("${path.module}/scripts/bootstrap.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name_prefix = "app-"

  # Capacity settings
  desired_capacity = 3
  min_size         = 2
  max_size         = 10

  # Deploy across multiple availability zones
  vpc_zone_identifier = data.aws_subnets.private.ids

  # Reference the launch template
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # How long to wait for a new instance to be ready
  health_check_grace_period = 300
  health_check_type         = "EC2"  # or "ELB" when using a load balancer

  # Tags propagated to launched instances
  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}
```

## ASG with Load Balancer Integration

Most production ASGs sit behind a load balancer. You connect them through target groups.

```hcl
# Target group for the load balancer
resource "aws_lb_target_group" "app" {
  name_prefix = "app-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 60

  lifecycle {
    create_before_destroy = true
  }
}

# ASG connected to the load balancer target group
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = 3
  min_size            = 2
  max_size            = 10
  vpc_zone_identifier = data.aws_subnets.private.ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Connect to the target group
  target_group_arns = [aws_lb_target_group.app.arn]

  # Use ELB health checks so unhealthy instances get replaced
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Wait for instances to pass ELB health check before marking ASG update as complete
  wait_for_elb_capacity = 2

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}
```

Setting `health_check_type = "ELB"` is important. With this, if an instance fails its load balancer health check, the ASG terminates it and launches a replacement. Without it, the ASG only watches for EC2-level issues (hardware failure, instance crash).

## Instance Refresh for Rolling Deployments

When your launch template changes (new AMI, updated user data), instance refresh replaces running instances in a controlled way.

```hcl
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = 6
  min_size            = 3
  max_size            = 12
  vpc_zone_identifier = data.aws_subnets.private.ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Rolling instance replacement when launch template changes
  instance_refresh {
    strategy = "Rolling"

    preferences {
      # Minimum percentage of healthy instances during refresh
      min_healthy_percentage = 75

      # Time to wait after an instance is launched before checking health
      instance_warmup = 300

      # Skip replacing instances that already match the new template
      skip_matching = true
    }

    # Trigger a refresh when these attributes change
    triggers = ["launch_template"]
  }

  # Ensure the new template is created before updating the ASG
  lifecycle {
    create_before_destroy = true
  }

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}
```

With `min_healthy_percentage = 75`, if you have 6 instances, the ASG will keep at least 5 (75% of 6, rounded up) healthy at all times during the refresh.

## Mixed Instance Types

For cost optimization, combine on-demand and spot instances with multiple instance types.

```hcl
resource "aws_autoscaling_group" "mixed" {
  name_prefix         = "mixed-"
  desired_capacity    = 8
  min_size            = 4
  max_size            = 20
  vpc_zone_identifier = data.aws_subnets.private.ids

  mixed_instances_policy {
    # On-demand vs Spot split
    instances_distribution {
      on_demand_base_capacity                  = 2   # First 2 are always on-demand
      on_demand_percentage_above_base_capacity = 25  # 25% on-demand above base
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Instance type alternatives
      override {
        instance_type     = "t3.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "t3a.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "m5.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "m5a.large"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "c5.large"
        weighted_capacity = "1"
      }
    }
  }

  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "mixed-app-server"
    propagate_at_launch = true
  }
}
```

## Termination Policies

Control which instances get terminated first during scale-in events.

```hcl
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = 6
  min_size            = 2
  max_size            = 12
  vpc_zone_identifier = data.aws_subnets.private.ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Termination policy order
  # 1. OldestLaunchTemplate - terminate instances using outdated templates first
  # 2. AllocationStrategy - terminate spot instances before on-demand
  # 3. OldestInstance - among the rest, terminate the oldest
  termination_policies = [
    "OldestLaunchTemplate",
    "AllocationStrategy",
    "OldestInstance",
  ]

  # Protect specific instances from scale-in
  protect_from_scale_in = false

  tag {
    key                 = "Name"
    value               = "app-server"
    propagate_at_launch = true
  }
}
```

## Warm Pool

If your instances take a long time to bootstrap, warm pools keep pre-initialized instances ready to go.

```hcl
resource "aws_autoscaling_group" "slow_start" {
  name_prefix         = "slow-start-"
  desired_capacity    = 4
  min_size            = 2
  max_size            = 20
  vpc_zone_identifier = data.aws_subnets.private.ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Warm pool keeps stopped instances ready for quick scaling
  warm_pool {
    pool_state                  = "Stopped"   # Stopped instances are free (no compute cost)
    min_size                    = 2           # Always keep 2 warm instances
    max_group_prepared_capacity = 10          # Max warm + running instances

    instance_reuse_policy {
      reuse_on_scale_in = true  # Return instances to warm pool instead of terminating
    }
  }

  tag {
    key                 = "Name"
    value               = "slow-start-server"
    propagate_at_launch = true
  }
}
```

## Lifecycle Hooks

Run custom actions when instances launch or terminate.

```hcl
# Lifecycle hook for instance launch
resource "aws_autoscaling_lifecycle_hook" "launch" {
  name                   = "launch-hook"
  autoscaling_group_name = aws_autoscaling_group.app.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_LAUNCHING"

  # How long to wait for the hook to complete
  heartbeat_timeout = 600  # 10 minutes

  # What happens if the hook times out
  default_result = "ABANDON"  # Don't put instance in service if hook fails

  # Send notification to SNS when hook fires
  notification_target_arn = aws_sns_topic.asg_events.arn
  role_arn                = aws_iam_role.lifecycle_hook.arn
}

# Lifecycle hook for instance termination
resource "aws_autoscaling_lifecycle_hook" "terminate" {
  name                   = "terminate-hook"
  autoscaling_group_name = aws_autoscaling_group.app.name
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_TERMINATING"
  heartbeat_timeout      = 300
  default_result         = "CONTINUE"  # Terminate anyway if hook times out
  notification_target_arn = aws_sns_topic.asg_events.arn
  role_arn                = aws_iam_role.lifecycle_hook.arn
}
```

## Outputs

```hcl
output "asg_name" {
  value       = aws_autoscaling_group.app.name
  description = "Name of the Auto Scaling Group"
}

output "asg_arn" {
  value       = aws_autoscaling_group.app.arn
  description = "ARN of the Auto Scaling Group"
}
```

## Summary

Auto Scaling Groups are essential for running resilient, cost-effective workloads on AWS. Start with a basic ASG connected to a load balancer, add instance refresh for rolling deployments, and mix on-demand with spot instances to optimize costs. Use warm pools if your instances have long bootstrap times, and lifecycle hooks when you need to run custom logic during scaling events. Terraform makes all of this declarative and repeatable.

For scaling policies, check our guide on [configuring Auto Scaling policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-auto-scaling-policies-in-terraform/view) and [target tracking scaling policies](https://oneuptime.com/blog/post/2026-02-23-create-target-tracking-scaling-policies-in-terraform/view).
