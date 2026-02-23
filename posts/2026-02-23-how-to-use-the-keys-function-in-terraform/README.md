# How to Use the keys Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the keys function in Terraform to extract all keys from a map, with practical examples for iteration, validation, and dynamic resource creation.

---

Maps are a fundamental data structure in Terraform, used for everything from tags to configuration objects. The `keys` function extracts all the keys from a map and returns them as a list. This is essential for iterating over map entries, validating map structure, and building dynamic configurations based on map keys.

This post walks through the `keys` function, its behavior, and practical patterns you will encounter in real Terraform projects.

## What is the keys Function?

The `keys` function takes a map and returns a list of all its keys, sorted in lexicographic (alphabetical) order.

```hcl
# Returns a sorted list of all keys in the map
keys(map)
```

The sorting is important - it means the order of keys in the result is deterministic, regardless of the order they were defined.

## Basic Usage in Terraform Console

```hcl
# Get keys from a map
> keys({name = "web", type = "t3.micro", region = "us-east-1"})
["name", "region", "type"]

# Notice the alphabetical sorting
> keys({z = 1, a = 2, m = 3})
["a", "m", "z"]

# Empty map returns empty list
> keys({})
[]

# Works with any value types
> keys({enabled = true, count = 5, name = "test"})
["count", "enabled", "name"]
```

## Iterating Over Map Keys

One of the primary uses of `keys` is iterating over map entries for resource creation.

```hcl
variable "buckets" {
  type = map(object({
    acl               = string
    versioning        = bool
    lifecycle_days    = number
  }))
  default = {
    logs = {
      acl            = "log-delivery-write"
      versioning     = false
      lifecycle_days = 90
    }
    artifacts = {
      acl            = "private"
      versioning     = true
      lifecycle_days = 365
    }
    backups = {
      acl            = "private"
      versioning     = true
      lifecycle_days = 730
    }
  }
}

# Create a bucket for each key in the map
resource "aws_s3_bucket" "managed" {
  for_each = var.buckets

  bucket = "${var.project_name}-${each.key}"

  tags = {
    Name    = each.key
    Purpose = each.key
  }
}

# List all bucket names using keys
output "bucket_names" {
  value = keys(var.buckets)
  # Result: ["artifacts", "backups", "logs"]
}
```

## Validating Required Map Keys

You can use `keys` combined with `contains` to verify that a map has all the required keys.

```hcl
variable "database_config" {
  type = map(string)

  # Validate that required keys are present
  validation {
    condition = alltrue([
      for key in ["host", "port", "name", "username"] :
      contains(keys(var.database_config), key)
    ])
    error_message = "Database config must include host, port, name, and username keys."
  }
}
```

This validation ensures that anyone using the module provides all the necessary database configuration fields.

## Comparing Map Structures

The `keys` function helps compare the structure of two maps.

```hcl
variable "expected_tags" {
  type    = map(string)
  default = {
    Environment = ""
    Team        = ""
    CostCenter  = ""
  }
}

variable "actual_tags" {
  type    = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
  }
}

locals {
  required_keys = keys(var.expected_tags)
  provided_keys = keys(var.actual_tags)

  # Find missing keys
  missing_keys = [
    for key in local.required_keys :
    key if !contains(local.provided_keys, key)
  ]
}

output "missing_tags" {
  value = local.missing_keys
  # Result: ["CostCenter"]
}
```

## Dynamic Block Generation from Maps

When creating dynamic blocks, `keys` helps you iterate over a map's entries.

```hcl
variable "environment_variables" {
  type = map(string)
  default = {
    DATABASE_URL = "postgres://localhost:5432/app"
    REDIS_URL    = "redis://localhost:6379"
    LOG_LEVEL    = "info"
    APP_ENV      = "production"
  }
}

resource "aws_lambda_function" "app" {
  function_name = "my-app"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda.arn
  filename      = "function.zip"

  environment {
    variables = var.environment_variables
  }
}

output "configured_env_vars" {
  value = keys(var.environment_variables)
  # Result: ["APP_ENV", "DATABASE_URL", "LOG_LEVEL", "REDIS_URL"]
}
```

## Using keys with for Expressions

The `keys` function works naturally with `for` expressions for transforming map data.

```hcl
variable "services" {
  type = map(object({
    port     = number
    protocol = string
    public   = bool
  }))
  default = {
    api = { port = 8080, protocol = "HTTP", public = true }
    admin = { port = 8081, protocol = "HTTP", public = false }
    grpc = { port = 9090, protocol = "gRPC", public = false }
  }
}

locals {
  # Get only public service names
  public_services = [
    for name in keys(var.services) :
    name if var.services[name].public
  ]
  # Result: ["api"]

  # Create a port mapping
  port_map = {
    for name in keys(var.services) :
    name => var.services[name].port
  }
  # Result: {api = 8080, admin = 8081, grpc = 9090}
}
```

## keys with Nested Maps

When working with nested maps, you can use `keys` at different levels.

```hcl
variable "config" {
  type = map(map(string))
  default = {
    database = {
      host = "db.example.com"
      port = "5432"
    }
    cache = {
      host = "cache.example.com"
      port = "6379"
    }
  }
}

locals {
  # Top-level keys
  config_sections = keys(var.config)
  # Result: ["cache", "database"]

  # Keys from a specific section
  database_fields = keys(var.config["database"])
  # Result: ["host", "port"]

  # All keys at all levels
  all_field_keys = distinct(flatten([
    for section in keys(var.config) :
    keys(var.config[section])
  ]))
  # Result: ["host", "port"]
}
```

## Counting and Summarizing

Use `keys` with `length` to count map entries.

```hcl
variable "instances" {
  type = map(object({
    type   = string
    ami    = string
  }))
}

locals {
  instance_count = length(keys(var.instances))

  # This is equivalent to just using length on the map directly
  also_count = length(var.instances)
}
```

While `length(var.instances)` works directly on maps, `keys` is still useful when you need the actual key list for further processing.

## Real-World Scenario: DNS Records from Map

Here is a complete example using `keys` to create DNS records from a map configuration.

```hcl
variable "dns_records" {
  type = map(object({
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {
    "api.example.com" = {
      type    = "A"
      ttl     = 300
      records = ["203.0.113.1"]
    }
    "www.example.com" = {
      type    = "CNAME"
      ttl     = 3600
      records = ["example.com"]
    }
    "mail.example.com" = {
      type    = "MX"
      ttl     = 3600
      records = ["10 mail.example.com"]
    }
  }
}

resource "aws_route53_record" "managed" {
  for_each = var.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}

output "managed_records" {
  value = keys(var.dns_records)
  # Result: ["api.example.com", "mail.example.com", "www.example.com"]
}

output "record_count" {
  value = "Managing ${length(keys(var.dns_records))} DNS records"
}
```

## Companion Function: values

While `keys` returns the keys, the `values` function returns the values. Together, they let you decompose a map completely.

```hcl
locals {
  tags = {
    Environment = "production"
    Team        = "platform"
    Project     = "webapp"
  }

  tag_keys   = keys(local.tags)    # ["Environment", "Project", "Team"]
  tag_values = values(local.tags)  # ["production", "webapp", "platform"]
}
```

Note that both `keys` and `values` sort by key, so the values align with their corresponding keys.

## Summary

The `keys` function is a fundamental building block for working with maps in Terraform. It gives you the list of keys from any map, sorted alphabetically, ready for iteration, validation, or further processing.

Key takeaways:

- `keys(map)` returns an alphabetically sorted list of all map keys
- Essential for validation - checking that required keys exist
- Pairs with `for` expressions for filtering and transforming maps
- Returns are always sorted, making output deterministic
- Use with `contains` to check for specific key presence
- Combine with `length` for counting map entries
- Works at any nesting level of your map structures

You will reach for `keys` every time you need to work with the structure of a map rather than just its values.
