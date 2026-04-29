# How to Manage Dev Environments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Development Environment, Infrastructure as Code, AWS, Workspaces, DevOps, Cost Optimization

Description: Learn how to manage development environments with OpenTofu using right-sized resources, automatic teardown, and environment isolation to balance developer productivity with cost control.

---

Development environments are often the most neglected part of infrastructure management. They grow organically, accumulate resources, and become expensive. OpenTofu brings the same rigor to dev environments as production - consistent configuration, cost control, and easy teardown.

## Dev Environment Principles

- Right-size everything: dev doesn't need production capacity
- Auto-shutdown: stop resources at end of day to reduce costs
- Isolated: each developer or team has their own environment
- Reproducible: recreate from scratch in minutes

## Dev Environment Configuration

```hcl
# environments/dev/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.8"
    }
  }

  backend "s3" {
    bucket = "my-tofu-state"
    key    = "dev/${terraform.workspace}/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
      Workspace   = terraform.workspace
      ManagedBy   = "opentofu"
      AutoShutdown = "true"
    }
  }
}

locals {
  # Developer name from workspace (e.g., workspace "alice" creates "dev-alice" resources)
  developer = terraform.workspace
  env_prefix = "dev-${local.developer}"
}

# Right-sized EC2 for development
resource "aws_instance" "dev_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.medium"  # Not the production r5.xlarge
  subnet_id              = var.dev_subnet_id
  vpc_security_group_ids = [aws_security_group.dev.id]
  iam_instance_profile   = aws_iam_instance_profile.dev.name

  tags = {
    Name = "${local.env_prefix}-server"
    Owner = local.developer
  }
}

# Small RDS instance for development
resource "aws_db_instance" "dev" {
  identifier        = "${local.env_prefix}-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"  # Not db.r5.large
  allocated_storage = 20
  db_name           = "appdev"
  username          = "admin"
  password          = random_password.dev_db.result

  # Dev-specific settings - no multi-AZ, shorter backup retention
  multi_az                = false
  backup_retention_period = 1
  skip_final_snapshot     = true  # OK to skip for dev environments

  db_subnet_group_name   = var.dev_db_subnet_group
  vpc_security_group_ids = [aws_security_group.dev_db.id]
}

resource "random_password" "dev_db" {
  length  = 16
  special = false
}
```

## Automatic Shutdown Scheduling

```hcl
# auto_shutdown.tf
# Stop dev instances outside business hours to save costs

# EventBridge Scheduler schedule to stop instances at 7pm weekdays
resource "aws_scheduler_schedule" "stop_dev_instances" {
  name       = "${local.env_prefix}-stop-schedule"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 19 ? * MON-FRI *)"  # 7pm UTC weekdays
  schedule_expression_timezone = "UTC"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      InstanceIds = [aws_instance.dev_server.id]
    })
  }
}

# EventBridge Scheduler schedule to start instances at 8am weekdays
resource "aws_scheduler_schedule" "start_dev_instances" {
  name       = "${local.env_prefix}-start-schedule"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 8 ? * MON-FRI *)"  # 8am UTC weekdays
  schedule_expression_timezone = "UTC"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      InstanceIds = [aws_instance.dev_server.id]
    })
  }
}
```

## Developer Workflow

```bash
# Initialize providers and backend
tofu init

# Create your personal dev environment
tofu workspace new alice
tofu apply -var-file=dev.tfvars

# Output connection details
tofu output dev_server_ip
tofu output db_connection_string

# Tear down at end of sprint (or let scheduler handle daily stop/start)
tofu destroy -var-file=dev.tfvars
tofu workspace select default
tofu workspace delete alice
```

## Best Practices

- Use smaller instance classes for dev servers and databases - for example, `t3.small`/`t3.medium` for EC2 and `db.t3.micro`/`db.t3.small` for RDS - avoid the temptation to match production sizing.
- Enable auto-shutdown schedules - dev environments running 24/7 cost 3x more than those running only during business hours.
- Use `skip_final_snapshot = true` and `backup_retention_period = 1` for dev databases - speed over durability.
- Set spending alerts at the developer level using AWS Budgets with workspace-based tags.
- Create a Makefile or script wrapper for common operations (`make dev-up`, `make dev-down`) to lower the barrier to environment management.
