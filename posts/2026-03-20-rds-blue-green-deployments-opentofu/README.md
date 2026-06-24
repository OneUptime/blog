# How to Set Up RDS Blue-Green Deployments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Blue-Green Deployment, Database, Infrastructure as Code

Description: Learn how to create and manage AWS RDS Blue/Green deployments for zero-downtime database schema changes and engine upgrades using OpenTofu.

## Introduction

AWS RDS Blue/Green Deployments allow you to perform supported database instance updates with minimal downtime by creating a synchronized green environment and switching over when the update is complete. With the AWS provider used by OpenTofu, you enable this behavior on `aws_db_instance` by setting `blue_green_update.enabled = true`.

## Creating the Blue/Green Deployment

```hcl
# First, the production (blue) database must exist.
# When you later change engine_version, instance_class, or parameter_group_name,
# OpenTofu can use an RDS Blue/Green deployment for the update.

resource "aws_db_instance" "blue" {
  identifier        = "${var.app_name}-db-${var.environment}"
  engine            = "mysql"
  engine_version    = "8.0.45"
  instance_class    = "db.r6g.large"
  username          = var.db_username
  password          = var.db_password
  allocated_storage = 100
  storage_type      = "gp3"

  # Automated backups must be enabled for Blue/Green deployments.
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  multi_az               = true

  parameter_group_name = aws_db_parameter_group.mysql80.name

  blue_green_update {
    enabled = true
  }

  timeouts {
    create = "60m"
    delete = "60m"
    update = "90m"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Parameter Group

```hcl
resource "aws_db_parameter_group" "mysql80" {
  name_prefix = "${var.app_name}-mysql80-"
  family      = "mysql8.0"

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Switchover Script

After updating a supported setting in `aws_db_instance.blue`, run OpenTofu. The AWS provider creates the blue/green deployment, performs the switchover, and waits for completion during `tofu apply`.

```bash
#!/bin/bash
# scripts/bluegreen-switchover.sh

tofu plan -out=tfplan
tofu apply tfplan
```

## Cleanup After Switchover

```bash
# No separate cleanup is required when using blue_green_update on aws_db_instance.
# The AWS provider removes the temporary blue/green deployment during apply.
```

## Outputs

```hcl
output "db_instance_identifier" {
  value = aws_db_instance.blue.identifier
}

output "db_endpoint" {
  description = "Endpoint of the production database after switchover"
  value       = aws_db_instance.blue.endpoint
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

RDS Blue/Green Deployments enable safe, low-downtime RDS instance updates. With OpenTofu, enable `blue_green_update` on `aws_db_instance` and apply supported changes such as engine version, instance class, or parameter group updates; the AWS provider handles the temporary blue/green deployment, switchover, and cleanup during `tofu apply`.
