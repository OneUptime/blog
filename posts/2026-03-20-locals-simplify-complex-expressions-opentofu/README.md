# How to Use Locals to Simplify Complex Expressions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local, HCL, Infrastructure as Code, Best Practice, DevOps

Description: Learn how to use local values to break down complex expressions, reduce duplication, and make your OpenTofu configurations more readable.

---

Local values are named expressions defined in a `locals` block. They let you define an expression once and reference it multiple times - and more importantly, they let you break a complex expression into named, readable steps. This guide shows practical patterns for using locals to clarify configuration intent.

---

## Before and After: The Value of Locals

```hcl
# BEFORE: Repeated complex expressions scattered through the config

resource "aws_instance" "web" {
  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

resource "aws_db_instance" "main" {
  tags = {
    Name        = "${var.project}-${var.environment}-db"   # duplicated logic
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

```hcl
# AFTER: Locals capture reusable expressions
locals {
  # Define once, reuse everywhere
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
    Project     = var.project
  }
}

resource "aws_instance" "web" {
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web"
  })
}

resource "aws_db_instance" "main" {
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db"
  })
}
```

---

## Breaking Down Complex Expressions

```hcl
# A complex AMI selection logic - without locals it's hard to read
resource "aws_instance" "web" {
  ami = var.custom_ami != null ? var.custom_ami : (
    var.os == "ubuntu" ? data.aws_ami.ubuntu.id : data.aws_ami.amazon_linux.id
  )
}

# WITH locals - each step is named and readable
locals {
  default_ami = var.os == "ubuntu" ? data.aws_ami.ubuntu.id : data.aws_ami.amazon_linux.id
  selected_ami = var.custom_ami != null ? var.custom_ami : local.default_ami
}

resource "aws_instance" "web" {
  ami = local.selected_ami  # clear and readable
}
```

---

## Environment-Based Configuration Logic

```hcl
locals {
  is_production = var.environment == "production"

  # Larger instances for production
  instance_type = local.is_production ? "m5.large" : "t3.micro"

  # More replicas for production
  replica_count = local.is_production ? 5 : 1

  # Enable deletion protection in production only
  deletion_protection = local.is_production

  # Compute derived values
  full_domain = "${var.app_name}.${var.base_domain}"
  https_url   = "https://${local.full_domain}"
}
```

---

## Computing Lists and Maps

```hcl
locals {
  # Compute subnet IDs dynamically
  all_subnet_ids = concat(
    module.networking.public_subnet_ids,
    module.networking.private_subnet_ids
  )

  # Build a map of instance configs from a list
  instance_map = {
    for i, zone in var.availability_zones :
    zone => {
      subnet_id = module.networking.private_subnet_ids[i]
      az        = zone
    }
  }

  # Filter a list
  production_regions = [
    for region in var.regions :
    region
    if region != "us-east-1-development"
  ]
}
```

---

## Locals with Functions

```hcl
locals {
  # String manipulation
  app_name_lower = lower(replace(var.app_name, " ", "-"))
  s3_bucket_name = "${local.app_name_lower}-${var.environment}-data"

  # Flatten nested lists
  all_ingress_ports = flatten([
    var.web_ports,
    var.api_ports,
    var.monitoring_ports
  ])

  # Safe value access with defaults
  backup_retention = lookup(var.overrides, "backup_retention", 7)
}
```

---

## Summary

Use locals whenever an expression is repeated more than once, is too complex to read inline, or benefits from a descriptive name. They're not variables - callers can't override them - they're named expressions that exist only within the current module. A config with well-named locals reads almost like documentation.
