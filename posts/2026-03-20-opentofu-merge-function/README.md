# How to Use the merge Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the merge function in OpenTofu to combine multiple maps into a single map, with later values overriding earlier ones for flexible tag and configuration management.

## Introduction

The `merge` function in OpenTofu combines two or more maps into a single map. When keys overlap, later maps take precedence over earlier ones. This makes `merge` ideal for implementing layered configuration patterns, default tag merging, and environment-specific overrides.

## Syntax

```hcl
merge(map1, map2, ...)
```

- Accepts two or more maps
- Returns a single merged map
- For duplicate keys, the rightmost map wins

## Basic Examples

```hcl
output "simple_merge" {
  value = merge({a = 1, b = 2}, {c = 3, d = 4})
  # Returns {a = 1, b = 2, c = 3, d = 4}
}

output "override" {
  value = merge({a = 1, b = 2}, {b = 99, c = 3})
  # Returns {a = 1, b = 99, c = 3}  (b overridden)
}
```

## Practical Use Cases

### Default Tags with Overrides

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "extra_tags" {
  type    = map(string)
  default = {
    CostCenter = "CC-1234"
    Owner      = "platform-team"
  }
}

locals {
  default_tags = {
    ManagedBy   = "OpenTofu"
    Environment = var.environment
    Project     = "MyApp"
  }

  # Extra tags override defaults if keys conflict
  all_tags = merge(local.default_tags, var.extra_tags)
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  tags          = local.all_tags
}
```

### Environment-Specific Configuration

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

locals {
  base_config = {
    log_level    = "info"
    replicas     = 1
    storage_gb   = 10
    enable_debug = false
  }

  env_overrides = {
    prod = {
      replicas   = 5
      storage_gb = 100
    }
    staging = {
      replicas   = 2
      storage_gb = 50
    }
  }

  final_config = merge(
    local.base_config,
    lookup(local.env_overrides, var.environment, {})
  )
}

output "replicas" {
  value = local.final_config.replicas
}
```

### Building IAM Policy from Multiple Parts

```hcl
locals {
  base_permissions = {
    "s3:GetObject" = true
    "s3:ListBucket" = true
  }

  write_permissions = {
    "s3:PutObject"    = true
    "s3:DeleteObject" = true
  }

  all_permissions = merge(local.base_permissions, local.write_permissions)
}
```

### Merging Output Maps from Multiple Modules

```hcl
module "networking" {
  source = "./modules/networking"
}

module "compute" {
  source = "./modules/compute"
}

locals {
  all_outputs = merge(
    module.networking.outputs,
    module.compute.outputs
  )
}
```

## Step-by-Step Usage

1. Define base and override maps.
2. Call `merge(base, override1, override2, ...)`.
3. The rightmost map wins for conflicting keys.

```bash
tofu console

> merge({a = 1}, {b = 2}, {a = 99})
{
  "a" = 99
  "b" = 2
}
```

## Conclusion

The `merge` function enables layered, override-based configuration in OpenTofu. The most common use case is merging default tags with environment-specific or resource-specific overrides. The rightmost-wins semantics make it intuitive to implement cascading defaults.
