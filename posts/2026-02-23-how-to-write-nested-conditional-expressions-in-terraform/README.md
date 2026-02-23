# How to Write Nested Conditional Expressions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Conditionals, Expressions

Description: Learn how to write nested conditional expressions in Terraform, when they make sense, when to use alternatives like maps, and how to keep complex logic readable.

---

Terraform's ternary conditional expression handles two-way decisions well. But what about three-way decisions? Or four? That is where nested conditionals come in - and where things can get ugly fast if you are not careful.

This post covers how to nest conditional expressions correctly, when nesting is appropriate, and when you should reach for alternatives instead.

## Basic Nested Conditional

A nested conditional places another ternary expression inside one of the branches of an outer ternary:

```hcl
variable "environment" {
  type = string  # "dev", "staging", "production"
}

locals {
  # Two levels of nesting
  instance_type = (
    var.environment == "production" ? "t3.large" :
    var.environment == "staging" ? "t3.small" :
    "t3.micro"  # default for dev and anything else
  )
}
```

Reading this: "If production, use t3.large. Otherwise, if staging, use t3.small. Otherwise, use t3.micro."

The parentheses are not required but strongly recommended for readability. Each line represents one check, with the final line being the default.

## How Nesting Works

Terraform's ternary is right-associative, meaning the rightmost ternary is evaluated first. But for readability, think of it as a chain of if/else-if/else:

```hcl
# This nested expression:
result = a ? x : b ? y : z

# Is equivalent to:
result = a ? x : (b ? y : z)

# Which reads as:
# if a then x
# else if b then y
# else z
```

You can also nest in the true branch, though this is less common:

```hcl
# Nesting in the true branch
result = a ? (b ? x : y) : z

# Which reads as:
# if a then
#   if b then x else y
# else z
```

## Practical Examples

### Multi-Tier Instance Sizing

```hcl
variable "tier" {
  type = string
  validation {
    condition     = contains(["free", "basic", "professional", "enterprise"], var.tier)
    error_message = "Tier must be free, basic, professional, or enterprise."
  }
}

locals {
  instance_type = (
    var.tier == "enterprise" ? "r5.2xlarge" :
    var.tier == "professional" ? "r5.xlarge" :
    var.tier == "basic" ? "t3.medium" :
    "t3.micro"  # free tier
  )

  storage_gb = (
    var.tier == "enterprise" ? 500 :
    var.tier == "professional" ? 200 :
    var.tier == "basic" ? 50 :
    20  # free tier
  )

  backup_retention = (
    var.tier == "enterprise" ? 90 :
    var.tier == "professional" ? 30 :
    var.tier == "basic" ? 7 :
    0  # free tier - no backups
  )
}
```

### Combining Multiple Conditions

```hcl
variable "environment" {
  type = string
}

variable "workload_type" {
  type = string  # "compute", "memory", "general"
}

locals {
  # Nested conditionals with compound conditions
  instance_type = (
    var.environment == "production" && var.workload_type == "compute" ? "c5.2xlarge" :
    var.environment == "production" && var.workload_type == "memory" ? "r5.2xlarge" :
    var.environment == "production" ? "m5.xlarge" :
    var.environment == "staging" ? "t3.large" :
    "t3.micro"
  )
}
```

### Conditional Resource Configuration

```hcl
variable "database_engine" {
  type = string  # "postgres", "mysql", "aurora-postgres", "aurora-mysql"
}

locals {
  # Different defaults based on engine type
  default_port = (
    var.database_engine == "postgres" || var.database_engine == "aurora-postgres" ? 5432 :
    var.database_engine == "mysql" || var.database_engine == "aurora-mysql" ? 3306 :
    5432  # fallback
  )

  is_aurora = (
    var.database_engine == "aurora-postgres" ||
    var.database_engine == "aurora-mysql"
  )

  parameter_group_family = (
    var.database_engine == "postgres" ? "postgres15" :
    var.database_engine == "mysql" ? "mysql8.0" :
    var.database_engine == "aurora-postgres" ? "aurora-postgresql15" :
    var.database_engine == "aurora-mysql" ? "aurora-mysql8.0" :
    "postgres15"  # fallback
  )
}
```

## When Nesting Gets Too Deep

Here is an example of nesting that has gone too far:

```hcl
# DON'T DO THIS - too deeply nested and hard to read
locals {
  result = (
    var.region == "us-east-1" ? (
      var.environment == "production" ? (
        var.tier == "enterprise" ? "r5.4xlarge" :
        var.tier == "professional" ? "r5.2xlarge" :
        "r5.xlarge"
      ) :
      var.environment == "staging" ? "t3.large" :
      "t3.micro"
    ) :
    var.region == "eu-west-1" ? (
      var.environment == "production" ? "r5.2xlarge" :
      "t3.medium"
    ) :
    "t3.micro"
  )
}
```

This is a sign you should use a different approach entirely.

## Better Alternatives to Deep Nesting

### Map Lookups

For simple value selection based on a key, use a map:

```hcl
locals {
  instance_types = {
    dev        = "t3.micro"
    staging    = "t3.small"
    production = "t3.large"
  }

  instance_type = local.instance_types[var.environment]
}
```

For compound keys, concatenate them:

```hcl
locals {
  instance_types = {
    "production-compute" = "c5.2xlarge"
    "production-memory"  = "r5.2xlarge"
    "production-general" = "m5.xlarge"
    "staging-compute"    = "c5.large"
    "staging-memory"     = "r5.large"
    "staging-general"    = "t3.large"
    "dev-compute"        = "t3.medium"
    "dev-memory"         = "t3.medium"
    "dev-general"        = "t3.micro"
  }

  key = "${var.environment}-${var.workload_type}"
  instance_type = lookup(local.instance_types, local.key, "t3.micro")
}
```

### Object Maps for Multi-Value Selection

When you need multiple related values, use a map of objects:

```hcl
locals {
  tier_config = {
    free = {
      instance_type    = "t3.micro"
      storage_gb       = 20
      backup_retention = 0
      multi_az         = false
      monitoring       = false
    }
    basic = {
      instance_type    = "t3.medium"
      storage_gb       = 50
      backup_retention = 7
      multi_az         = false
      monitoring       = true
    }
    professional = {
      instance_type    = "r5.xlarge"
      storage_gb       = 200
      backup_retention = 30
      multi_az         = true
      monitoring       = true
    }
    enterprise = {
      instance_type    = "r5.2xlarge"
      storage_gb       = 500
      backup_retention = 90
      multi_az         = true
      monitoring       = true
    }
  }

  config = local.tier_config[var.tier]
}

resource "aws_db_instance" "main" {
  instance_class          = local.config.instance_type
  allocated_storage       = local.config.storage_gb
  backup_retention_period = local.config.backup_retention
  multi_az                = local.config.multi_az
  # ...
}
```

### Breaking Down with Named Locals

If you must use conditionals, break complex decisions into named intermediate values:

```hcl
locals {
  is_production = var.environment == "production"
  is_staging    = var.environment == "staging"
  is_critical   = local.is_production || local.is_staging

  # Now each conditional is simple and readable
  instance_type    = local.is_production ? "t3.large" : local.is_staging ? "t3.small" : "t3.micro"
  multi_az         = local.is_critical
  backup_retention = local.is_production ? 30 : local.is_staging ? 7 : 0
  monitoring       = local.is_critical
}
```

## Nested Conditionals with count and for_each

```hcl
variable "deployment_type" {
  type = string  # "simple", "ha", "multi-region"
}

locals {
  # How many instances per AZ based on deployment type
  instances_per_az = (
    var.deployment_type == "multi-region" ? 3 :
    var.deployment_type == "ha" ? 2 :
    1
  )

  # How many AZs to use
  az_count = (
    var.deployment_type == "multi-region" ? 3 :
    var.deployment_type == "ha" ? 2 :
    1
  )

  total_instances = local.instances_per_az * local.az_count
}

resource "aws_instance" "app" {
  count = local.total_instances

  ami           = var.ami_id
  instance_type = var.instance_type

  # Distribute across AZs using modulo
  availability_zone = var.availability_zones[count.index % local.az_count]

  tags = {
    Name = "app-${count.index + 1}"
  }
}
```

## Readability Guidelines

Here are some rules of thumb for nested conditionals:

**One level of nesting is fine:**
```hcl
# Easy to read - chain of if/else-if/else
value = a ? x : b ? y : z
```

**Two levels are okay if formatted well:**
```hcl
value = (
  condition_a ? result_a :
  condition_b ? result_b :
  condition_c ? result_c :
  default_result
)
```

**Three or more levels - use a map or locals instead:**
```hcl
# Switch to a map lookup
value = local.value_map[var.key]
```

**Nesting in both branches - almost always too complex:**
```hcl
# Avoid this pattern
value = a ? (b ? x : y) : (c ? w : z)

# Break it down instead
locals {
  branch_a = b ? x : y
  branch_b = c ? w : z
  value    = a ? local.branch_a : local.branch_b
}
```

## Error Handling in Nested Conditionals

When nesting involves resource references that might not exist, use `try()`:

```hcl
locals {
  # Safe nested conditional with resources that might not exist
  endpoint = (
    var.use_custom_endpoint ? var.custom_endpoint :
    var.deploy_internal ? try(aws_lb.internal[0].dns_name, "") :
    try(aws_lb.external[0].dns_name, "")
  )
}
```

## A Real-World Example

Here is a realistic scenario with nested conditionals used appropriately:

```hcl
variable "storage_type" {
  type = string  # "standard", "performance", "archive"
}

variable "environment" {
  type = string
}

locals {
  # S3 storage class based on storage type
  storage_class = (
    var.storage_type == "archive" ? "GLACIER" :
    var.storage_type == "performance" ? "STANDARD" :
    "STANDARD_IA"  # standard uses infrequent access to save costs
  )

  # Lifecycle transition based on environment and storage type
  transition_days = (
    var.environment == "production" && var.storage_type == "standard" ? 90 :
    var.environment == "production" ? 180 :
    30  # non-production transitions quickly
  )
}
```

## Summary

Nested conditional expressions in Terraform work by chaining ternary operators to create if/else-if/else logic. They are best for 2-4 simple value choices. Format them with one condition per line and always include a default at the end. When you find yourself nesting more than two levels deep, or when the conditions become compound and hard to read, switch to map lookups or break the logic into named locals. The goal is always readability - infrastructure code should be obvious to anyone on the team, not a puzzle to decode.
