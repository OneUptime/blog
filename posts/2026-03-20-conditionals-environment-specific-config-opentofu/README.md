# How to Use Conditionals for Environment-Specific Configuration in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Environment, Conditional, HCL, Best Practice

Description: Learn how to use OpenTofu conditionals to manage environment-specific configurations for dev, staging, and production without duplicating resource definitions.

## Introduction

Managing multiple environments (dev, staging, prod) without duplicating HCL code is a core challenge in infrastructure management. OpenTofu conditionals let you encode environment differences as data rather than duplicating resource blocks.

## Environment Config Map Pattern

Define all environment configurations in a single map and select the appropriate one.

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

locals {
  env_config = {
    dev = {
      instance_type     = "t3.micro"
      min_capacity      = 1
      max_capacity      = 2
      db_instance_class = "db.t3.micro"
      enable_deletion_protection = false
      log_retention_days = 7
      enable_waf        = false
    }
    staging = {
      instance_type     = "t3.small"
      min_capacity      = 1
      max_capacity      = 4
      db_instance_class = "db.t3.small"
      enable_deletion_protection = false
      log_retention_days = 14
      enable_waf        = true
    }
    prod = {
      instance_type     = "m5.large"
      min_capacity      = 3
      max_capacity      = 20
      db_instance_class = "db.r6g.large"
      enable_deletion_protection = true
      log_retention_days = 90
      enable_waf        = true
    }
  }

  # Select the config for the current environment
  config = local.env_config[var.environment]
}

resource "aws_autoscaling_group" "app" {
  min_size = local.config.min_capacity
  max_size = local.config.max_capacity
  # ...
}

resource "aws_db_instance" "app" {
  instance_class      = local.config.db_instance_class
  deletion_protection = local.config.enable_deletion_protection
  # ...
}
```

## Environment-Based Resource Toggling

Some resources should only exist in specific environments.

```hcl
locals {
  is_prod = var.environment == "prod"
  is_dev  = var.environment == "dev"
}

# Read replicas only in production

resource "aws_db_instance" "read_replica" {
  count = local.is_prod ? var.read_replica_count : 0

  replicate_source_db = aws_db_instance.app.identifier
  instance_class      = local.config.db_instance_class
  publicly_accessible = false
}

# Relaxed security groups in dev for easier debugging
resource "aws_vpc_security_group_ingress_rule" "dev_ssh" {
  count = local.is_dev ? 1 : 0

  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "10.0.0.0/8"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  description       = "Dev SSH access"
}
```

## Environment-Specific Naming and Tagging

```hcl
locals {
  # Resource naming convention varies by environment
  name_prefix = var.environment == "prod" ? "myapp" : "myapp-${var.environment}"

  # Production resources get stricter tagging
  base_tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
    Project     = var.project_name
  }

  prod_tags = local.is_prod ? {
    CostCenter      = var.cost_center
    DataClassification = "confidential"
    BackupRequired  = "true"
  } : {}

  tags = merge(local.base_tags, local.prod_tags)
}

resource "aws_s3_bucket" "app" {
  bucket = "${local.name_prefix}-app-data"
  tags   = local.tags
}
```

## Variable Files Per Environment

Structure your workspace with environment-specific variable files.

```hcl
# environments/dev.tfvars
environment    = "dev"
project_name   = "myapp"
aws_region     = "us-east-1"
vpc_cidr       = "10.10.0.0/16"
```

```hcl
# environments/prod.tfvars
environment    = "prod"
project_name   = "myapp"
aws_region     = "us-east-1"
vpc_cidr       = "10.0.0.0/16"
```

```bash
# Apply to specific environment
tofu apply -var-file="environments/prod.tfvars"
```

## Conclusion

The environment config map pattern centralizes all environment differences in one place, making it easy to see and audit what differs between environments. Combined with resource toggling and environment-specific variable files, this approach scales cleanly from two to many environments without code duplication.
