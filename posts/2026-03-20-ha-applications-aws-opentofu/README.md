# How to Deploy Highly Available Applications with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, High Availability, OpenTofu, Multi-AZ, Auto Scaling, Load Balancer

Description: Learn how to deploy highly available applications on AWS using OpenTofu with multi-AZ deployment, Auto Scaling Groups, health checks, and circuit breakers.

## Overview

High availability on AWS distributes workloads across multiple Availability Zones, uses Auto Scaling to replace failed instances, and places ALBs in front for health-check based routing. OpenTofu provisions the complete HA stack.

## Step 1: Multi-AZ VPC Configuration

```hcl
# main.tf - HA VPC spanning 3 AZs

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "ha-app-vpc"
  cidr = "10.0.0.0/16"

  # Use the first 3 available AZs in the region
  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  # One NAT Gateway per AZ for HA outbound traffic
  enable_nat_gateway     = true
  single_nat_gateway     = false  # Critical for HA
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

## Step 2: Multi-AZ Auto Scaling Group

```hcl
resource "aws_autoscaling_group" "ha_app" {
  name                = "ha-app-asg"
  vpc_zone_identifier = module.vpc.private_subnets  # All 3 AZs
  target_group_arns   = [aws_lb_target_group.app.arn]

  min_size         = 3   # 1 per AZ minimum
  max_size         = 30
  desired_capacity = 6   # 2 per AZ

  health_check_type         = "ELB"  # Use ALB health checks
  health_check_grace_period = 300

  # Deploy across AZs evenly
  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Use mixed instance types for cost and availability
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
      override {
        instance_type = "m4.large"
      }
    }

    instances_distribution {
      on_demand_percentage_above_base_capacity = 50
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }

  # Rolling instance refresh during updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
      instance_warmup        = 300
    }
  }
}
```

## Step 3: ALB with Health Checks

```hcl
resource "aws_lb" "ha_app" {
  name               = "ha-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection       = true
  enable_cross_zone_load_balancing = true  # ALBs always use cross-zone load balancing
}

resource "aws_lb_target_group" "app" {
  name     = "ha-app-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    enabled             = true
    path                = "/health/ready"  # Readiness endpoint
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-299"
  }

  deregistration_delay = 30  # Fast deregistration for HA
}
```

## Step 4: Auto Scaling Policy

```hcl
# Target 70% average CPU utilization
resource "aws_autoscaling_policy" "scale_out" {
  name                   = "scale-out"
  autoscaling_group_name = aws_autoscaling_group.ha_app.name
  policy_type            = "TargetTrackingScaling"

  estimated_instance_warmup = 300

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 70.0

    disable_scale_in = false
  }
}
```

## Summary

Highly available applications on AWS built with OpenTofu can span three AZs so a single-AZ failure does not take down the entire fleet, provided the remaining AZs have enough healthy capacity. One NAT Gateway per AZ prevents a single NAT Gateway from becoming a single point of failure for private subnet outbound traffic. The ALB health check with a readiness endpoint helps keep traffic on healthy instances during normal operation, and the instance refresh with a 90% minimum healthy percentage reduces deployment-time disruption.
