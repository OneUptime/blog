# How to Use the map Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn about the map function in Terraform, its deprecation in modern versions, and how to construct maps properly using current Terraform syntax and tomap.

---

If you have worked with Terraform across multiple versions, you may have encountered the `map` function. Like its sibling `list`, the `map` function was used in Terraform 0.11 and earlier to construct maps. Since Terraform 0.12, this function has been deprecated in favor of native map expressions using curly brace syntax and the `tomap` function.

This post explains the history of the `map` function, what replaced it, and how to effectively work with maps in modern Terraform.

## The Original map Function

In Terraform 0.11, the `map` function constructed a map from alternating key-value pairs.

```hcl
# Old Terraform 0.11 syntax (DEPRECATED)
# map("name", "web", "type", "t3.micro")
# This produced {name = "web", type = "t3.micro"}
```

The arguments were positional: the first was a key, the second a value, the third a key, and so on.

## Why Was map Deprecated?

Terraform 0.12 introduced first-class support for complex types, including map literals. The curly brace syntax for maps became the standard way to create them, making the `map` function redundant.

```hcl
# Terraform 0.12+ syntax - use this instead
{
  name = "web"
  type = "t3.micro"
}
```

This syntax is clearer, less error-prone, and consistent with other configuration languages.

## Modern Map Construction

In current Terraform, you create maps using curly braces.

```hcl
# Simple string map
locals {
  tags = {
    Environment = "production"
    Team        = "platform"
    ManagedBy   = "terraform"
  }
}

# Map with different value types (using object type)
locals {
  config = {
    name    = "web-server"
    count   = 3
    enabled = true
  }
}

# Empty map
locals {
  empty_map = {}
}

# Nested maps
locals {
  regions = {
    us_east = {
      cidr    = "10.0.0.0/16"
      az_count = 3
    }
    us_west = {
      cidr    = "10.1.0.0/16"
      az_count = 2
    }
  }
}
```

## The tomap Function

While the `map` function is deprecated, `tomap` is the modern function for explicit map type conversion.

```hcl
# Convert a value to a map type
> tomap({name = "web", type = "t3.micro"})
{
  "name" = "web"
  "type" = "t3.micro"
}

# Useful for ensuring consistent types in all values
> tomap({a = "1", b = "2"})
{
  "a" = "1"
  "b" = "2"
}
```

The `tomap` function is mainly useful when you need to ensure that a value is explicitly treated as a map type, particularly in module outputs and type conversions.

## Building Maps Dynamically

Modern Terraform provides powerful tools for dynamic map construction.

### Using for Expressions

```hcl
variable "instance_names" {
  type    = list(string)
  default = ["web", "api", "worker"]
}

locals {
  # Build a map from a list
  instance_configs = {
    for name in var.instance_names :
    name => {
      hostname = "${name}.example.com"
      port     = name == "web" ? 80 : 8080
    }
  }
}

output "configs" {
  value = local.instance_configs
  # {
  #   web    = { hostname = "web.example.com",    port = 80   }
  #   api    = { hostname = "api.example.com",    port = 8080 }
  #   worker = { hostname = "worker.example.com", port = 8080 }
  # }
}
```

### Using merge for Combining Maps

```hcl
locals {
  default_tags = {
    ManagedBy   = "terraform"
    Environment = "dev"
  }

  custom_tags = {
    Project     = "webapp"
    Environment = "production"  # Overrides the default
  }

  # Merge maps - later values override earlier ones
  final_tags = merge(local.default_tags, local.custom_tags)
  # {
  #   ManagedBy   = "terraform"
  #   Environment = "production"
  #   Project     = "webapp"
  # }
}
```

### Using zipmap

The `zipmap` function creates a map from two lists - one of keys and one of values.

```hcl
locals {
  names  = ["web", "api", "worker"]
  ports  = [80, 8080, 9090]

  # Create a map from parallel lists
  port_map = zipmap(local.names, local.ports)
  # { web = 80, api = 8080, worker = 9090 }
}
```

## Maps with for_each

Maps are the most natural data structure for `for_each` iteration.

```hcl
variable "buckets" {
  type = map(object({
    acl       = string
    versioned = bool
  }))
  default = {
    logs = {
      acl       = "log-delivery-write"
      versioned = false
    }
    artifacts = {
      acl       = "private"
      versioned = true
    }
  }
}

resource "aws_s3_bucket" "managed" {
  for_each = var.buckets

  bucket = "myapp-${each.key}"

  tags = {
    Name    = each.key
    Purpose = each.key
  }
}
```

## Migrating from map() to Modern Syntax

Here is how to update old code that uses the deprecated `map` function.

```hcl
# Old syntax (Terraform 0.11)
# locals {
#   tags = "${map("Name", "web", "Env", "prod")}"
# }

# New syntax (Terraform 0.12+)
locals {
  tags = {
    Name = "web"
    Env  = "prod"
  }
}

# Old syntax with variables
# locals {
#   config = "${map("region", var.region, "env", var.environment)}"
# }

# New syntax with variables
locals {
  config = {
    region = var.region
    env    = var.environment
  }
}
```

## Practical Patterns for Map Construction

### Conditional Map Entries

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

locals {
  base_tags = {
    Name      = "app-server"
    ManagedBy = "terraform"
  }

  monitoring_tags = var.enable_monitoring ? {
    MonitoringEnabled = "true"
    MonitoringAgent   = "datadog"
  } : {}

  all_tags = merge(local.base_tags, local.monitoring_tags)
}
```

### Filtering Maps

```hcl
variable "all_services" {
  type = map(object({
    enabled = bool
    port    = number
  }))
  default = {
    api    = { enabled = true, port = 8080 }
    web    = { enabled = true, port = 80 }
    debug  = { enabled = false, port = 9229 }
    admin  = { enabled = true, port = 8081 }
  }
}

locals {
  # Filter to only enabled services
  enabled_services = {
    for name, config in var.all_services :
    name => config
    if config.enabled
  }
  # Result: { api = {...}, web = {...}, admin = {...} }
}
```

### Transforming Map Values

```hcl
variable "raw_config" {
  type = map(string)
  default = {
    port     = "8080"
    timeout  = "30"
    retries  = "3"
  }
}

locals {
  # Transform all string values to include a prefix
  prefixed_config = {
    for key, value in var.raw_config :
    "APP_${upper(key)}" => value
  }
  # Result: { APP_PORT = "8080", APP_TIMEOUT = "30", APP_RETRIES = "3" }
}
```

## Map Type Declarations

When declaring map variables, always specify the type for clarity and safety.

```hcl
# Map of strings
variable "tags" {
  type = map(string)
}

# Map of numbers
variable "port_assignments" {
  type = map(number)
}

# Map of complex objects
variable "service_definitions" {
  type = map(object({
    image    = string
    cpu      = number
    memory   = number
    replicas = number
  }))
}
```

## Summary

The `map` function is deprecated and should not be used in modern Terraform. Its replacement - curly brace map syntax - is more intuitive and better integrated with Terraform's type system. The `tomap` function handles explicit type conversion when needed.

Key takeaways:

- The `map()` function is deprecated since Terraform 0.12
- Use `{ key = value }` syntax to create maps
- Use `tomap()` for explicit type conversion
- Build dynamic maps with `for` expressions
- Combine maps with `merge`
- Create maps from parallel lists with `zipmap`
- Always declare variable types explicitly

Modern Terraform provides all the map construction and manipulation tools you need without relying on the old `map` function.
