# How to Use the tostring Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Type Conversion

Description: Learn how to use the tostring function in Terraform to convert numbers, booleans, and other values into strings for tags, labels, and resource configurations.

---

Terraform is strongly typed, and there are many places where you need a string but have a number or boolean. Tags, labels, resource names, and many AWS resource attributes all expect string values. The `tostring` function converts other primitive types into strings.

## What is tostring?

The `tostring` function converts a value to a string type. It works with numbers, booleans, and of course strings (which are returned as-is).

```hcl
# Convert a number to string
> tostring(42)
"42"

# Convert a boolean to string
> tostring(true)
"true"

# String stays a string
> tostring("hello")
"hello"
```

The syntax:

```hcl
tostring(value)
```

## When Do You Need tostring?

The most common situations:

1. **Building tags** - Tag values must be strings in most cloud providers
2. **String interpolation alternatives** - When you want explicit conversion instead of interpolation
3. **for_each with numeric keys** - `for_each` keys must be strings
4. **Map values** - When building maps where all values must be the same type (string)

## Converting Numbers to Strings for Tags

AWS tags, for example, require both keys and values to be strings:

```hcl
variable "app_port" {
  type    = number
  default = 8080
}

variable "instance_count" {
  type    = number
  default = 3
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name     = "app-${count.index + 1}"
    Port     = tostring(var.app_port)
    Replicas = tostring(var.instance_count)
    Index    = tostring(count.index)
  }
}
```

## Building String Maps from Mixed Types

When you need a `map(string)` but your source data has different types:

```hcl
variable "app_config" {
  description = "Application configuration"
  type = object({
    name     = string
    port     = number
    debug    = bool
    replicas = number
  })
  default = {
    name     = "myapp"
    port     = 8080
    debug    = false
    replicas = 3
  }
}

locals {
  # Convert everything to strings for a flat config map
  config_map = {
    name     = var.app_config.name
    port     = tostring(var.app_config.port)
    debug    = tostring(var.app_config.debug)
    replicas = tostring(var.app_config.replicas)
  }
  # Result: {
  #   "debug"    = "false"
  #   "name"     = "myapp"
  #   "port"     = "8080"
  #   "replicas" = "3"
  # }
}
```

## tostring for for_each Keys

When you need to iterate over numbers with `for_each`, convert them to strings:

```hcl
variable "ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

resource "aws_security_group_rule" "ingress" {
  for_each = { for port in var.ports : tostring(port) => port }

  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.main.id
  description       = "Allow port ${each.key}"
}
```

## Kubernetes Labels and Annotations

Kubernetes labels and annotations are string maps, so numeric values need conversion:

```hcl
variable "app_version_major" {
  type    = number
  default = 2
}

variable "app_version_minor" {
  type    = number
  default = 5
}

resource "kubernetes_deployment" "app" {
  metadata {
    name = "myapp"
    labels = {
      app             = "myapp"
      version-major   = tostring(var.app_version_major)
      version-minor   = tostring(var.app_version_minor)
      managed-by      = "terraform"
      is-production   = tostring(var.is_production)
    }
  }

  spec {
    replicas = 3
    selector {
      match_labels = {
        app = "myapp"
      }
    }
    template {
      metadata {
        labels = {
          app = "myapp"
        }
      }
      spec {
        container {
          name  = "myapp"
          image = "myapp:${var.app_version_major}.${var.app_version_minor}"
        }
      }
    }
  }
}
```

## tostring with Boolean Values

Converting booleans to strings gives you `"true"` or `"false"`:

```hcl
> tostring(true)
"true"

> tostring(false)
"false"
```

This is useful for configuration flags stored as tags or environment variables:

```hcl
variable "enable_ssl" {
  type    = bool
  default = true
}

variable "enable_debug" {
  type    = bool
  default = false
}

resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([{
    name  = "app"
    image = "myapp:latest"
    environment = [
      {
        name  = "ENABLE_SSL"
        value = tostring(var.enable_ssl)
      },
      {
        name  = "DEBUG"
        value = tostring(var.enable_debug)
      }
    ]
  }])
}
```

## Generating Dynamic Descriptions

```hcl
variable "max_connections" {
  type    = number
  default = 100
}

variable "timeout_seconds" {
  type    = number
  default = 30
}

resource "aws_security_group" "db" {
  name        = "database-sg"
  description = "Database SG - max ${tostring(var.max_connections)} connections, ${tostring(var.timeout_seconds)}s timeout"
  vpc_id      = var.vpc_id
}
```

Note that Terraform also does automatic string conversion inside `${}` interpolation, so `tostring` is somewhat redundant in interpolation contexts. But it is useful when you are building maps or passing values to functions that require strings.

## tostring vs String Interpolation

Both achieve the same result for simple conversions:

```hcl
# Using tostring
locals {
  port_str = tostring(8080)
  # Result: "8080"
}

# Using interpolation
locals {
  port_str_v2 = "${8080}"
  # Result: "8080"
}
```

However, `tostring` is cleaner when you are not embedding the value in a larger string and makes the intent explicit.

## Converting for Output

```hcl
output "instance_count_str" {
  value       = tostring(length(aws_instance.app))
  description = "Number of instances as a string"
}

output "config_summary" {
  value = {
    instance_count = tostring(length(aws_instance.app))
    vpc_id         = aws_vpc.main.id
    is_production  = tostring(var.environment == "production")
  }
}
```

## What tostring Cannot Convert

```hcl
# Cannot convert complex types
# tostring(["a", "b"])     # Error! Use jsonencode for lists
# tostring({ a = "b" })    # Error! Use jsonencode for maps
# tostring(null)            # Error!
```

For complex types, use `jsonencode` instead:

```hcl
# For lists and maps, use jsonencode
> jsonencode(["a", "b"])
"[\"a\",\"b\"]"

> jsonencode({ a = "b" })
"{\"a\":\"b\"}"
```

## Practical Pattern: Flat Configuration Maps

A common pattern is to flatten a structured configuration into a string map for use with things like ECS environment variables or SSM parameters:

```hcl
variable "config" {
  type = object({
    db_port        = number
    db_pool_size   = number
    cache_enabled  = bool
    cache_ttl      = number
    log_level      = string
  })
  default = {
    db_port       = 5432
    db_pool_size  = 10
    cache_enabled = true
    cache_ttl     = 300
    log_level     = "info"
  }
}

locals {
  env_vars = {
    DB_PORT       = tostring(var.config.db_port)
    DB_POOL_SIZE  = tostring(var.config.db_pool_size)
    CACHE_ENABLED = tostring(var.config.cache_enabled)
    CACHE_TTL     = tostring(var.config.cache_ttl)
    LOG_LEVEL     = var.config.log_level  # Already a string
  }
}
```

## Edge Cases

```hcl
# Already a string
> tostring("hello")
"hello"

# Zero
> tostring(0)
"0"

# Negative numbers
> tostring(-42)
"-42"

# Floating point
> tostring(3.14)
"3.14"

# Empty string
> tostring("")
""
```

## Summary

The `tostring` function is a straightforward type conversion that you will reach for whenever you need to turn a number or boolean into a string. The most common use cases are building tag maps, creating environment variable configurations, and preparing values for `for_each` keys. While Terraform's string interpolation handles many conversions automatically, `tostring` is clearer and more explicit when you are doing standalone conversions. For the reverse operation, see the [tonumber function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tonumber-function-in-terraform/view), and for boolean handling, check out the [tobool function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-tobool-function-in-terraform/view).
