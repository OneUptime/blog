# How to Implement Pilot Light DR Strategy with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Pilot Light, OpenTofu, AWS, DR Strategy

Description: Learn how to implement the Pilot Light disaster recovery strategy using OpenTofu to maintain minimal critical infrastructure in a DR region and scale it up during a failover event.

## Overview

The Pilot Light DR strategy keeps core critical components, such as a database replica, running at minimal capacity in the DR region and keeps pre-built AMIs ready for failover. During failover, additional resources are provisioned rapidly from pre-configured templates. OpenTofu manages both the steady-state "pilot light" and the failover scale-up process.

## Step 1: Pilot Light - Database Replica

```hcl
# main.tf - Pilot light DR setup

# The database replica stays warm continuously in DR
resource "aws_db_instance" "pilot_light" {
  provider            = aws.dr
  identifier          = "app-db-pilot-light"
  replicate_source_db = var.promote_dr_db ? null : aws_db_instance.primary.arn
  instance_class      = "db.t3.micro"  # Minimal size - just keeping replica warm

  # No multi-AZ in pilot light (cost saving)
  multi_az = false

  # Keep backups off in steady state, but enable them when promoting
  backup_retention_period = var.promote_dr_db ? 1 : 0
}
```

## Step 2: Pre-built AMI for Fast Recovery

```hcl
# Build and copy AMI to DR region (updated regularly)
resource "aws_ami_copy" "pilot_light" {
  provider          = aws.dr
  name              = "app-pilot-light"
  description       = "Pre-built AMI for Pilot Light DR"
  source_ami_id     = data.aws_ami.app_current.id
  source_ami_region = "us-east-1"
  encrypted         = true
  kms_key_id        = aws_kms_key.dr.arn
}

# Launch template ready to use DR AMI
resource "aws_launch_template" "pilot_light" {
  provider      = aws.dr
  name          = "app-pilot-light-lt"
  image_id      = aws_ami_copy.pilot_light.id
  instance_type = "m5.xlarge"

  vpc_security_group_ids = [aws_security_group.app_dr.id]
  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    db_endpoint = aws_db_instance.pilot_light.address
    region      = "us-west-2"
  }))
}
```

## Step 3: DR Infrastructure Variables (Normally Zero Capacity)

```hcl
# Variable controlling DR capacity
variable "dr_mode" {
  type        = bool
  default     = false
  description = "Set to true during DR failover to scale up DR resources"
}

# Pre-created ALB in DR keeps the endpoint ready (incurs hourly and LCU charges)
resource "aws_lb" "dr" {
  provider           = aws.dr
  name               = "app-dr-alb"
  load_balancer_type = "application"
  subnets            = module.vpc_dr.public_subnets
  security_groups    = [aws_security_group.alb_dr.id]
  internal           = false
}

# ASG with 0 capacity in steady state, scales up during DR
resource "aws_autoscaling_group" "pilot_light" {
  provider    = aws.dr
  name        = "app-pilot-light-asg"
  vpc_zone_identifier = module.vpc_dr.private_subnets

  min_size         = var.dr_mode ? 2 : 0  # 0 in normal, 2 in DR
  max_size         = var.dr_mode ? 20 : 0
  desired_capacity = var.dr_mode ? 4 : 0

  launch_template {
    id      = aws_launch_template.pilot_light.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.dr.arn]
}
```

## Step 4: Failover Execution

```hcl
# Promote DR replica to standalone during failover.
# OpenTofu promotes the replica by omitting replicate_source_db from aws_db_instance.pilot_light.
# Run this only after the pilot-light replica already exists:
# tofu apply -var="dr_mode=true" -var="promote_dr_db=true"
# Wait for the DB instance to return to "available" before routing traffic.
variable "promote_dr_db" {
  type    = bool
  default = false
}
```

## Summary

The Pilot Light DR strategy configured with OpenTofu minimizes DR costs by keeping the database replica continuously available in the recovery Region while application compute stays at zero capacity. Supporting resources such as launch templates, AMIs, and the ALB are pre-created so failover can scale quickly. During failover, `tofu apply -var="dr_mode=true" -var="promote_dr_db=true"` promotes the replica and provisions the application tier from pre-built AMIs and pre-configured launch templates. Because Amazon RDS read replicas use asynchronous replication, actual RTO and RPO depend on replica lag, promotion time, and application startup time, but Pilot Light typically targets recovery in the tens of minutes at a lower cost than warm standby environments.
