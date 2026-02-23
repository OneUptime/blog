# How to Use the format Function for Dynamic Resource Names

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, format Function, Resource Naming, Infrastructure as Code, Best Practices

Description: Learn how to use Terraform's format function to build consistent, dynamic resource names with padding, prefixes, and environment-specific conventions.

---

Naming resources consistently across your infrastructure is harder than it sounds. You need names that are human-readable, machine-parseable, unique within their scope, and compliant with each cloud provider's naming rules. Terraform's `format` function is your best tool for building these names systematically. It works like `printf` or `sprintf` from other languages, giving you precise control over how values get assembled into strings.

## How the format Function Works

The `format` function takes a format string followed by arguments that get substituted into the placeholders:

```hcl
# format(spec, values...)

# Simple string substitution
format("Hello, %s!", "Terraform")
# Result: "Hello, Terraform!"

# Multiple values
format("%s-%s-%s", "myapp", "prod", "us-east-1")
# Result: "myapp-prod-us-east-1"
```

## Format Specifiers

The format string uses verbs (placeholders) that control how each value gets rendered:

```hcl
locals {
  # %s - String
  name = format("resource-%s", "alpha")
  # Result: "resource-alpha"

  # %d - Integer (decimal)
  count_label = format("instance-%d", 42)
  # Result: "instance-42"

  # %04d - Integer with zero padding (4 digits wide)
  padded = format("server-%04d", 3)
  # Result: "server-0003"

  # %f - Float
  version_float = format("v%.1f", 2.0)
  # Result: "v2.0"

  # %t - Boolean
  flag = format("debug=%t", true)
  # Result: "debug=true"

  # %q - Quoted string
  quoted = format("name=%q", "my app")
  # Result: "name=\"my app\""

  # %v - Default representation
  any_value = format("value=%v", 123)
  # Result: "value=123"
}
```

## Building a Naming Convention

Most teams adopt a naming convention like `{project}-{environment}-{resource_type}-{identifier}`. Here is how to enforce it with `format`:

```hcl
variable "project" {
  type    = string
  default = "ecommerce"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

locals {
  # Short forms for cleaner names
  env_short = {
    development = "dev"
    staging     = "stg"
    production  = "prd"
  }

  region_short = {
    "us-east-1" = "use1"
    "us-west-2" = "usw2"
    "eu-west-1" = "euw1"
  }

  # Base prefix used across all resources
  prefix = format("%s-%s-%s",
    var.project,
    local.env_short[var.environment],
    local.region_short[var.region]
  )
}

# Now use the prefix everywhere
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = format("%s-vpc", local.prefix)
    # Result: "ecommerce-prd-use1-vpc"
  }
}

resource "aws_subnet" "private" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet("10.0.0.0/16", 8, count.index)

  tags = {
    Name = format("%s-private-subnet-%02d", local.prefix, count.index + 1)
    # Results: "ecommerce-prd-use1-private-subnet-01"
    #          "ecommerce-prd-use1-private-subnet-02"
    #          "ecommerce-prd-use1-private-subnet-03"
  }
}
```

## Zero-Padded Numbering

When creating multiple resources, zero-padded numbers keep them sorted correctly in UIs and CLI output:

```hcl
resource "aws_instance" "worker" {
  count         = 12
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    # Without padding: worker-1, worker-10, worker-11, worker-2 (bad sorting)
    # With padding: worker-01, worker-02, ... worker-12 (correct sorting)
    Name = format("worker-%02d", count.index + 1)
  }
}

# For larger fleets, use more padding digits
resource "aws_instance" "node" {
  count         = 100
  ami           = var.ami_id
  instance_type = "t3.small"

  tags = {
    Name = format("node-%03d", count.index + 1)
    # node-001, node-002, ... node-100
  }
}
```

## Using format with for_each

When using `for_each` instead of `count`, you often build names from the map keys:

```hcl
variable "services" {
  type = map(object({
    port          = number
    instance_type = string
    replicas      = number
  }))
  default = {
    api = {
      port          = 8080
      instance_type = "t3.medium"
      replicas      = 3
    }
    worker = {
      port          = 0
      instance_type = "t3.large"
      replicas      = 2
    }
    scheduler = {
      port          = 0
      instance_type = "t3.small"
      replicas      = 1
    }
  }
}

resource "aws_security_group" "service" {
  for_each = var.services

  name        = format("%s-%s-sg", local.prefix, each.key)
  description = format("Security group for %s service in %s", each.key, var.environment)
  vpc_id      = aws_vpc.main.id

  tags = {
    Name    = format("%s-%s-sg", local.prefix, each.key)
    Service = each.key
  }
}
```

## Cloud Provider Naming Constraints

Different cloud resources have different naming rules. The `format` function helps you stay within bounds.

### S3 Bucket Names

S3 bucket names must be globally unique, lowercase, and between 3-63 characters:

```hcl
locals {
  # Build a unique S3 bucket name
  bucket_name = format("%s-%s-%s-%s",
    lower(var.project),
    lower(local.env_short[var.environment]),
    "assets",
    data.aws_caller_identity.current.account_id
  )
  # Result: "ecommerce-prd-assets-123456789012"
}

resource "aws_s3_bucket" "assets" {
  bucket = local.bucket_name
}
```

### Azure Resource Names

Azure has specific length limits per resource type. You can use `substr` combined with `format` to enforce them:

```hcl
locals {
  # Azure storage account names: 3-24 chars, lowercase alphanumeric only
  raw_storage_name = format("%s%s%s",
    lower(replace(var.project, "-", "")),
    lower(local.env_short[var.environment]),
    "stor"
  )
  # Truncate to 24 characters
  storage_account_name = substr(local.raw_storage_name, 0, min(24, length(local.raw_storage_name)))
}

resource "azurerm_storage_account" "main" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Creating a Naming Module

For large projects, wrap your naming logic in a local module:

```hcl
# modules/naming/main.tf

variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "region" {
  type = string
}

locals {
  env_short = {
    development = "dev"
    staging     = "stg"
    production  = "prd"
  }

  base = format("%s-%s", var.project, local.env_short[var.environment])
}

output "vpc" {
  value = format("%s-vpc", local.base)
}

output "subnet" {
  # Returns a function-like value using a template
  value = format("%s-subnet", local.base)
}

output "prefix" {
  value = local.base
}

output "s3_bucket" {
  # S3 names are more restricted
  value = lower(format("%s-%s", local.base, var.region))
}

# Usage in the root module:
# module.naming.vpc => "ecommerce-prd-vpc"
# module.naming.prefix => "ecommerce-prd"
```

## formatlist for Bulk Naming

When you need to apply the same format to a list of values, `formatlist` is more concise than a `for` expression:

```hcl
locals {
  service_names = ["api", "web", "worker", "cron"]

  # Generate tagged names for all services
  tagged_names = formatlist("%s-%s-%s", var.project, var.environment, local.service_names)
  # Result: ["myapp-prod-api", "myapp-prod-web", "myapp-prod-worker", "myapp-prod-cron"]

  # Generate IAM role names
  role_names = formatlist("role-%s-%s", var.environment, local.service_names)
  # Result: ["role-prod-api", "role-prod-web", "role-prod-worker", "role-prod-cron"]
}
```

## Conditional Naming Parts

Sometimes a name component should only appear in certain environments:

```hcl
locals {
  # Include region in multi-region deployments, omit in single-region
  name_with_region = var.multi_region ? format("%s-%s-%s", var.project, var.environment, var.region) : format("%s-%s", var.project, var.environment)

  # Add a "temp" marker for non-production resources
  resource_name = var.environment == "production" ? format("%s-db", local.prefix) : format("%s-db-temp", local.prefix)
}
```

## Summary

The `format` function is the foundation of consistent resource naming in Terraform. It gives you printf-style control over string formatting with support for padding, type conversion, and precision. Combined with local values for abbreviations and a clear naming convention, you can make every resource in your infrastructure instantly identifiable by its name. Start by defining your naming convention, encode it in locals with `format`, and apply it consistently across every resource.
