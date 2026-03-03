# How to Create Wrapper Modules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Wrapper Modules, IaC, Architecture

Description: Learn how to build wrapper modules in Terraform that provide opinionated defaults on top of community or base modules for organizational standards and consistency.

---

A wrapper module sits on top of another module and adds your organization's opinions. It takes a community module (or your own base module) and narrows down its interface, sets default values that match your standards, and enforces policies that everyone on your team should follow.

Think of it like this: the community `terraform-aws-modules/rds/aws` module has 80+ variables because it needs to support every possible RDS configuration. Your team uses PostgreSQL with specific encryption, backup, and networking requirements. A wrapper module exposes only the variables your team actually varies and hardcodes everything else.

## When to Use Wrapper Modules

Wrapper modules make sense when:

- You are using a community module but need organizational defaults
- Multiple teams create the same resource type and you want consistency
- You want to reduce the number of variables callers need to set
- You need to enforce standards (encryption, tagging, naming) on top of a flexible base module

They do not make sense when:

- You only have one instance of the resource
- The base module is simple enough on its own
- You need full flexibility of the underlying module

## Wrapper Module Structure

A wrapper module calls the base module and passes through a simplified interface:

```text
modules/
  rds-postgres/          # Wrapper module (your opinionated version)
    main.tf              # Calls the base module
    variables.tf         # Simplified interface
    outputs.tf           # Pass through outputs
    versions.tf
  # OR wraps a community module
```

## Example: Wrapping the Community RDS Module

Here is a wrapper that turns the complex community RDS module into a simple "give me a PostgreSQL database" call:

```hcl
# modules/rds-postgres/variables.tf

variable "name" {
  description = "Database identifier"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production"
  }
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Storage in GB"
  type        = number
  default     = 50
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect"
  type        = list(string)
}
```

```hcl
# modules/rds-postgres/main.tf

locals {
  # Environment-specific defaults
  env_config = {
    dev = {
      multi_az              = false
      backup_retention      = 1
      deletion_protection   = false
      monitoring_interval   = 0
      performance_insights  = false
    }
    staging = {
      multi_az              = false
      backup_retention      = 7
      deletion_protection   = false
      monitoring_interval   = 60
      performance_insights  = true
    }
    production = {
      multi_az              = true
      backup_retention      = 35
      deletion_protection   = true
      monitoring_interval   = 30
      performance_insights  = true
    }
  }

  config = local.env_config[var.environment]
}

# Security group for the database
resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.name}-db"
  }
}

resource "aws_security_group_rule" "db_ingress" {
  count = length(var.allowed_security_group_ids)

  type                     = "ingress"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = var.allowed_security_group_ids[count.index]
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
}

# Wrap the community module with our standards
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.4.0"

  identifier = var.name

  # Hardcoded: always PostgreSQL 16
  engine               = "postgres"
  engine_version       = "16.2"
  family               = "postgres16"
  major_engine_version = "16"

  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"

  # Hardcoded: always encrypted with default KMS key
  storage_encrypted = true

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Environment-specific settings from lookup
  multi_az                = local.config.multi_az
  backup_retention_period = local.config.backup_retention
  deletion_protection     = local.config.deletion_protection
  monitoring_interval     = local.config.monitoring_interval

  performance_insights_enabled = local.config.performance_insights

  # Hardcoded: standard maintenance window
  maintenance_window = "Mon:03:00-Mon:04:00"
  backup_window      = "01:00-02:00"

  # Hardcoded: always enable auto minor version upgrades
  auto_minor_version_upgrade = true

  # Hardcoded: standard tagging
  tags = {
    Name        = var.name
    Environment = var.environment
    ManagedBy   = "terraform"
    Engine      = "postgresql"
  }
}

resource "aws_db_subnet_group" "this" {
  name_prefix = "${var.name}-"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = var.name
  }
}
```

```hcl
# modules/rds-postgres/outputs.tf

output "endpoint" {
  description = "Database connection endpoint"
  value       = module.rds.db_instance_endpoint
}

output "port" {
  description = "Database port"
  value       = module.rds.db_instance_port
}

output "database_name" {
  description = "Database name"
  value       = module.rds.db_instance_name
}

output "security_group_id" {
  description = "Security group ID for the database"
  value       = aws_security_group.db.id
}
```

## Usage

Now callers have a much simpler interface:

```hcl
# Before: 30+ lines with the community module directly
# After: 8 lines with the wrapper
module "orders_db" {
  source = "./modules/rds-postgres"

  name        = "orders"
  environment = "production"

  instance_class = "db.r6g.large"
  allocated_storage = 200

  vpc_id     = module.vpc.id
  subnet_ids = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.api_sg.id]
}
```

The wrapper handles 20+ settings that the caller never needs to think about: encryption, backups, maintenance windows, monitoring, engine version, and more.

## Wrapper Module Design Principles

**Hardcode what should not change.** If every database in your organization must use encryption, do not make it a variable. Hardcode `storage_encrypted = true`.

**Derive what can be computed.** Environment-specific settings like multi-AZ and backup retention can be derived from an environment variable instead of being set individually.

**Expose what varies.** Instance class and storage size change per use case. Keep those as variables.

**Pass through outputs.** Expose the outputs that callers need. You do not need to expose everything the base module outputs.

## Wrapping Multiple Base Modules

A wrapper module can call multiple base modules to create a complete stack:

```hcl
# modules/web-service/main.tf
# This wrapper creates everything needed for a web service

module "alb" {
  source = "./modules/alb"
  # ... configured with company standards
}

module "ecs_service" {
  source = "./modules/ecs-service"
  # ... configured with company standards
  target_group_arn = module.alb.target_group_arns[0]
}

module "dns" {
  source = "./modules/dns-record"
  # ... points to the ALB
  alias = {
    name    = module.alb.dns_name
    zone_id = module.alb.zone_id
  }
}
```

This is where wrapper modules really shine. A single module call creates an ALB, ECS service, DNS record, security groups, and IAM roles, all wired together correctly.

## Versioning Wrapper Modules

Version your wrapper modules separately from the base modules they wrap. When the community RDS module releases a new version, you update your wrapper module, test it, and release a new version of the wrapper. Your callers only see the wrapper version.

For more on module composition, see [how to handle module dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-handle-module-dependencies-in-terraform/view).
