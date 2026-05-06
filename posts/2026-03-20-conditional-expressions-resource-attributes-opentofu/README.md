# How to Use Conditional Expressions for Resource Attributes in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Conditional, HCL, Expression, Best Practice

Description: Learn how to use conditional expressions in OpenTofu to set resource attributes dynamically based on variable values, environment names, and computed conditions.

## Introduction

Conditional expressions (`condition ? true_val : false_val`) let you set individual resource attributes based on runtime conditions without duplicating resource blocks. This is the go-to pattern when you only need to vary a few attributes between configurations.

## Basic Conditional Attributes

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "multi_az" {
  type    = bool
  default = null  # null = let the environment decide
}

locals {
  is_production = var.environment == "prod"
  # Use explicit setting if provided, otherwise derive from environment
  use_multi_az  = var.multi_az != null ? var.multi_az : local.is_production
}

resource "aws_db_instance" "main" {
  identifier        = "app-db-${var.environment}"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = local.is_production ? "db.r6g.large" : "db.t3.micro"
  allocated_storage = local.is_production ? 100 : 20
  multi_az          = local.use_multi_az

  # Enable deletion protection only in production
  deletion_protection = local.is_production

  # Apply maintenance window only where it matters
  maintenance_window      = local.is_production ? "sun:03:00-sun:05:00" : null
  backup_retention_period = local.is_production ? 30 : 1

  username = var.db_username
  password = var.db_password
}
```

## Conditional Instance Sizing and Configuration

```hcl
locals {
  instance_configs = {
    dev     = { type = "t3.micro",  root_volume = 20,  ebs_optimized = false }
    staging = { type = "t3.small",  root_volume = 40,  ebs_optimized = true  }
    prod    = { type = "m5.large",  root_volume = 100, ebs_optimized = true  }
  }

  config = local.instance_configs[var.environment]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = local.config.type
  ebs_optimized = local.config.ebs_optimized

  root_block_device {
    volume_size = local.config.root_volume
    # Use GP3 in prod, GP2 elsewhere
    volume_type = var.environment == "prod" ? "gp3" : "gp2"
    iops        = var.environment == "prod" ? 3000 : null
    encrypted   = var.environment == "prod" ? true : false
  }

  # Attach monitoring only in prod
  monitoring = var.environment == "prod"
}
```

## Conditional Security Group Rules

```hcl
variable "allow_public_access" {
  type    = bool
  default = false
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.app.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  # Conditionally open to internet or restrict to internal networks
  cidr_ipv4         = var.allow_public_access ? "0.0.0.0/0" : "10.0.0.0/8"
  description       = var.allow_public_access ? "HTTPS from internet" : "HTTPS from internal"
}
```

## Conditional ARN Construction

```hcl
variable "use_custom_kms" {
  type    = bool
  default = false
}

variable "kms_key_id" {
  type    = string
  default = null
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  # Build a custom KMS key ARN only when overriding the default aws/s3 key
  kms_key_arn = var.use_custom_kms && var.kms_key_id != null ? (
    "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/${var.kms_key_id}"
  ) : null
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = local.kms_key_arn
    }
  }
}
```

## Chaining Conditionals for Complex Attribute Logic

```hcl
variable "tier" {
  type    = string
  default = "standard"
  validation {
    condition     = contains(["free", "standard", "premium"], var.tier)
    error_message = "Tier must be free, standard, or premium."
  }
}

locals {
  # Chain conditionals for multi-value selection
  max_connections = (
    var.tier == "free"    ? 10  :
    var.tier == "standard" ? 100 :
    500  # premium
  )

  storage_gb = (
    var.tier == "free"    ? 5   :
    var.tier == "standard" ? 50  :
    500
  )
}
```

## Conclusion

Conditional expressions for individual attributes are more readable than duplicating entire resource blocks. Use the ternary operator for simple two-way choices, and chain them (with parentheses and newlines for readability) for multi-way selection. Reserve resource-level conditionals (`enabled` in OpenTofu v1.11+, or `count` in older configurations) for cases where the entire resource needs to be optional.
