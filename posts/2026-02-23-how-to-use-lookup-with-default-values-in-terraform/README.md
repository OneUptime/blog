# How to Use lookup with Default Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Maps

Description: Learn how to use the lookup function with default values in Terraform to safely retrieve map values with fallbacks for robust configurations.

---

Map lookups are everywhere in Terraform - environment-specific settings, feature flags, instance type selections, and more. The `lookup` function provides a clean way to get a value from a map with a built-in fallback if the key does not exist. This is one of the most practical functions you will use in day-to-day Terraform work.

## What is the lookup Function?

The `lookup` function retrieves a value from a map by key. If the key does not exist, it returns a default value instead of crashing.

```hcl
# lookup(map, key, default_value)
> lookup({ a = "apple", b = "banana" }, "a", "unknown")
"apple"

> lookup({ a = "apple", b = "banana" }, "c", "unknown")
"unknown"
```

The syntax:

```hcl
lookup(map, key, default)
```

The third argument (the default) is optional but highly recommended. Without it, a missing key causes an error.

## lookup vs Direct Map Access

You might wonder why you would use `lookup` instead of just `map["key"]`:

```hcl
variable "config" {
  type = map(string)
  default = {
    region = "us-east-1"
    env    = "production"
  }
}

# Direct access - crashes if key does not exist
# var.config["nonexistent"]  # Error!

# lookup with default - returns fallback safely
lookup(var.config, "nonexistent", "default-value")
# Result: "default-value"
```

Use `lookup` when the key might not exist. Use direct access `map[key]` when you know the key must be there and want an error if it is not.

## Practical Example: Environment-Specific Instance Types

The classic use case - selecting settings based on environment:

```hcl
variable "environment" {
  type    = string
  default = "development"
}

variable "instance_types" {
  type = map(string)
  default = {
    development = "t3.small"
    staging     = "t3.medium"
    production  = "t3.large"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = lookup(var.instance_types, var.environment, "t3.medium")

  tags = {
    Environment = var.environment
  }
}
```

If someone passes an environment that is not in the map (say, `"testing"`), the instance type falls back to `"t3.medium"` instead of erroring out.

## Nested Lookups for Complex Configuration

You can chain lookups for multi-dimensional configuration:

```hcl
variable "region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "ami_ids" {
  type = map(map(string))
  default = {
    "us-east-1" = {
      production  = "ami-prod-east"
      staging     = "ami-stg-east"
      development = "ami-dev-east"
    }
    "us-west-2" = {
      production  = "ami-prod-west"
      staging     = "ami-stg-west"
      development = "ami-dev-west"
    }
  }
}

locals {
  # Nested lookup: first get the region map, then the environment AMI
  region_amis = lookup(var.ami_ids, var.region, {})
  selected_ami = lookup(local.region_amis, var.environment, "ami-default")
}

resource "aws_instance" "app" {
  ami           = local.selected_ami
  instance_type = "t3.medium"
}
```

## Scaling Configuration with Defaults

```hcl
variable "environment" {
  type    = string
  default = "development"
}

variable "min_sizes" {
  type = map(number)
  default = {
    production = 3
    staging    = 2
  }
}

variable "max_sizes" {
  type = map(number)
  default = {
    production = 20
    staging    = 5
  }
}

variable "desired_sizes" {
  type = map(number)
  default = {
    production = 5
    staging    = 2
  }
}

resource "aws_autoscaling_group" "app" {
  name             = "app-${var.environment}"
  min_size         = lookup(var.min_sizes, var.environment, 1)
  max_size         = lookup(var.max_sizes, var.environment, 3)
  desired_capacity = lookup(var.desired_sizes, var.environment, 1)

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

For `development` (not in any of the maps), this creates an ASG with min=1, max=3, desired=1.

## Feature Flags with lookup

```hcl
variable "environment" {
  type    = string
  default = "development"
}

variable "feature_flags" {
  type = map(map(bool))
  default = {
    production = {
      enable_waf       = true
      enable_cdn       = true
      enable_multi_az  = true
    }
    staging = {
      enable_waf       = false
      enable_cdn       = true
      enable_multi_az  = false
    }
  }
}

locals {
  env_features = lookup(var.feature_flags, var.environment, {})

  # Each feature has its own default
  enable_waf      = lookup(local.env_features, "enable_waf", false)
  enable_cdn      = lookup(local.env_features, "enable_cdn", false)
  enable_multi_az = lookup(local.env_features, "enable_multi_az", false)
}

resource "aws_wafv2_web_acl" "main" {
  count = local.enable_waf ? 1 : 0

  name  = "main-waf"
  scope = "REGIONAL"
  # ... configuration
}
```

## DNS Record Mapping

```hcl
variable "service_name" {
  type    = string
  default = "api"
}

variable "service_ports" {
  type = map(number)
  default = {
    web       = 80
    api       = 8080
    admin     = 8443
    metrics   = 9090
  }
}

variable "service_health_paths" {
  type = map(string)
  default = {
    web   = "/"
    api   = "/api/health"
    admin = "/admin/health"
  }
}

resource "aws_lb_target_group" "service" {
  name     = var.service_name
  port     = lookup(var.service_ports, var.service_name, 8080)
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path = lookup(var.service_health_paths, var.service_name, "/health")
    port = lookup(var.service_ports, var.service_name, 8080)
  }
}
```

## lookup in for Expressions

Use `lookup` inside `for` to handle optional fields:

```hcl
variable "services" {
  type = map(map(string))
  default = {
    web = {
      port = "80"
      path = "/"
    }
    api = {
      port = "8080"
      # Note: no "path" key
    }
    worker = {
      # Note: no "port" or "path" keys
    }
  }
}

locals {
  normalized_services = {
    for name, config in var.services : name => {
      port = lookup(config, "port", "8080")
      path = lookup(config, "path", "/health")
    }
  }
  # Result: {
  #   "api"    = { "path" = "/health", "port" = "8080" }
  #   "web"    = { "path" = "/",       "port" = "80" }
  #   "worker" = { "path" = "/health", "port" = "8080" }
  # }
}
```

## lookup with Dynamic Tags

A common pattern for building resource tags with optional overrides:

```hcl
variable "tag_overrides" {
  type    = map(string)
  default = {}
}

locals {
  tags = {
    Name        = lookup(var.tag_overrides, "Name", "default-name")
    Environment = lookup(var.tag_overrides, "Environment", var.environment)
    Team        = lookup(var.tag_overrides, "Team", "platform")
    ManagedBy   = "terraform"  # Always terraform, no override allowed
  }
}
```

## lookup vs try

Both can handle missing keys, but they work differently:

```hcl
variable "config" {
  type = map(string)
  default = { region = "us-east-1" }
}

# lookup - specifically for maps, has a default parameter
lookup(var.config, "missing_key", "default")

# try - more general, works with any expression
try(var.config["missing_key"], "default")
```

Use `lookup` for simple map access with defaults. Use `try` for more complex expressions or deeply nested access.

## lookup with Computed Keys

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "cluster_sizes" {
  type = map(number)
  default = {
    "production-us-east-1" = 5
    "production-eu-west-1" = 3
    "staging-us-east-1"    = 2
  }
}

locals {
  # Build the key dynamically
  cluster_key  = "${var.environment}-${var.region}"
  cluster_size = lookup(var.cluster_sizes, local.cluster_key, 1)
}
```

## Edge Cases

```hcl
# Empty map with default
> lookup({}, "anything", "default")
"default"

# Key exists with empty string value (returns the empty string, not the default)
> lookup({ key = "" }, "key", "default")
""

# Key exists with null value
> lookup({ key = null }, "key", "default")
null  # Returns null, NOT the default
```

That last one is a common gotcha. If the key exists but its value is `null`, `lookup` returns `null`, not the default. For null handling, combine with `coalesce`:

```hcl
# Handle both missing keys AND null values
coalesce(lookup(var.config, "key", null), "default")
```

## Summary

The `lookup` function is one of the most practical tools in Terraform for building flexible, default-driven configurations. It shines in environment-specific settings, feature flags, and any situation where you need safe map access with a fallback value. Use it for simple one-level map lookups, and reach for `try` when you need deeper nested access. The key thing to remember is that `lookup` does not protect against null values - only missing keys. For more on working with maps, see our posts on [merge for tag maps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-merge-to-combine-tag-maps-in-terraform/view) and the [values function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-values-function-in-terraform/view).
