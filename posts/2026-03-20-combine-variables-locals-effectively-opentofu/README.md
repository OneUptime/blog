# How to Combine Variables and Locals Effectively in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Local, HCL, Best Practice, Infrastructure as Code, DevOps

Description: Learn best practices for combining input variables and local values effectively in OpenTofu to create readable, maintainable configurations.

---

Variables and locals serve distinct purposes: variables accept external input, locals compute derived values. Understanding when to use each - and how to combine them - is key to writing clean, maintainable OpenTofu configurations.

---

## The Core Distinction

| | Variables | Locals |
|---|---|---|
| Set by | External callers | Configuration author |
| Override | Yes (tfvars, CLI, env) | No |
| Purpose | Accept input | Compute derived values |
| Prefix | `var.` | `local.` |

---

## Pattern 1: Locals Derive Values from Variables

```hcl
# variables.tf - external inputs

variable "environment" {
  type = string
}

variable "project" {
  type = string
}

variable "region" {
  type    = string
  default = "us-east-1"
}

data "aws_caller_identity" "current" {}

# locals.tf - derived values (NOT configurable by callers)
locals {
  # Compute derived values from variables
  name_prefix    = "${var.project}-${var.environment}"
  is_production  = var.environment == "production"
  account_region = "${data.aws_caller_identity.current.account_id}-${var.region}"

  # Common tags built from variables
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "opentofu"
    Region      = var.region
  }
}
```

---

## Pattern 2: Locals for Environment-Specific Logic

```hcl
variable "environment" {
  type = string
}

locals {
  # Centralize all environment-specific logic in locals
  # Instead of scattering ternary expressions throughout resources

  instance_config = {
    type    = local.is_production ? "m5.xlarge" : "t3.small"
    count   = local.is_production ? 5 : 1
    backups = local.is_production
  }

  is_production = var.environment == "production"

  retention_days = {
    development = 1
    staging     = 7
    production  = 90
  }[var.environment]
}

resource "aws_instance" "web" {
  ami           = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = local.instance_config.type
  count         = local.instance_config.count
}
```

---

## Pattern 3: Locals for Computed Keys and Names

```hcl
variable "services" {
  type = list(string)
  # ["web", "api", "worker"]
}

variable "project" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "opentofu"
  }

  # Build a map from a list
  service_ports = {
    web    = 80
    api    = 8080
    worker = 0  # no port for workers
  }

  # Combine variables and static config
  service_configs = {
    for svc in var.services :
    svc => {
      name = "${local.name_prefix}-${svc}"
      port = local.service_ports[svc]
      tags = merge(local.common_tags, {Name = "${local.name_prefix}-${svc}"})
    }
  }
}

resource "aws_instance" "services" {
  for_each = local.service_configs
  ami           = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = "t3.small"
  tags = each.value.tags
}
```

---

## Pattern 4: Variables for What, Locals for How

```hcl
# Variables answer "what" - they're the knobs callers can turn
variable "enable_high_availability" {
  type    = bool
  default = false
}

variable "database_size" {
  type    = string   # "small", "medium", "large"
  default = "small"
}

# Locals answer "how" - they implement the policy based on inputs
locals {
  # Translate abstract sizes to concrete values
  db_instance_class = {
    small  = "db.t3.micro"
    medium = "db.m5.large"
    large  = "db.r5.xlarge"
  }[var.database_size]

  db_multi_az      = var.enable_high_availability
  db_backup_days   = var.enable_high_availability ? 30 : 1
}
```

---

## What Belongs in Variables vs Locals

| Put in Variables | Put in Locals |
|---|---|
| Caller-configurable settings | Derived computations |
| Environment names | Environment-specific logic |
| Feature flags (enable/disable) | Implementation details |
| Resource counts | Computed resource names |
| Secrets (with sensitive = true) | Tag maps |

---

## Summary

Variables and locals are complementary: variables expose the interface, locals implement the logic. Use variables for everything a caller might need to customize. Use locals to translate those inputs into concrete values, compute derived names and tags, and centralize environment-specific logic so it appears in one place rather than scattered throughout resource blocks.
