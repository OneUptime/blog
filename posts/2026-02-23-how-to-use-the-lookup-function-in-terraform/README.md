# How to Use the lookup Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the lookup function in Terraform to retrieve values from maps with default fallbacks, with practical examples for configuration management.

---

Maps are everywhere in Terraform - from resource tags to configuration lookups. The `lookup` function retrieves a value from a map by key, with an important bonus: it lets you specify a default value to return if the key does not exist. This makes it safer than direct map access, which throws an error for missing keys.

This guide covers how `lookup` works, when to use it versus direct access, and practical patterns for real-world Terraform configurations.

## What is the lookup Function?

The `lookup` function retrieves a value from a map by its key. If the key is not found, it returns a default value.

```hcl
# lookup(map, key, default_value)
lookup(map, key, default)
```

The third argument (default) is optional in recent Terraform versions. If omitted and the key is not found, Terraform raises an error.

## Basic Usage in Terraform Console

```hcl
# Key exists - returns the value
> lookup({name = "web", size = "large"}, "name", "unknown")
"web"

# Key does not exist - returns the default
> lookup({name = "web", size = "large"}, "color", "blue")
"blue"

# Without default - errors if key is missing
> lookup({name = "web"}, "name")
"web"

# Works with different value types
> lookup({count = 5, enabled = true}, "count", 0)
5

> lookup({count = 5, enabled = true}, "missing", 0)
0
```

## Environment-Based Configuration

One of the most common patterns is using `lookup` to select configuration values based on the current environment.

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

locals {
  instance_types = {
    dev     = "t3.micro"
    staging = "t3.medium"
    prod    = "m5.large"
  }

  instance_counts = {
    dev     = 1
    staging = 2
    prod    = 3
  }

  db_storage = {
    dev     = 20
    staging = 50
    prod    = 200
  }
}

resource "aws_instance" "app" {
  count = lookup(local.instance_counts, var.environment, 1)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = lookup(local.instance_types, var.environment, "t3.micro")

  tags = {
    Name        = "app-${var.environment}-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier        = "app-db-${var.environment}"
  engine            = "postgres"
  instance_class    = lookup(local.instance_types, var.environment, "db.t3.micro")
  allocated_storage = lookup(local.db_storage, var.environment, 20)
  username          = "admin"
  password          = var.db_password
}
```

The default value in each `lookup` acts as a safety net. If someone passes an unexpected environment name, the configuration still works with reasonable defaults.

## lookup vs Direct Map Access

Terraform supports two ways to access map values. Here is how they compare.

```hcl
locals {
  config = {
    region = "us-east-1"
    tier   = "standard"
  }
}

# Direct access - errors if key missing
# local.config["region"]     -> "us-east-1"
# local.config["missing"]    -> Error!

# lookup with default - safe for missing keys
# lookup(local.config, "region", "us-west-2")   -> "us-east-1"
# lookup(local.config, "missing", "default")     -> "default"
```

Use direct access when you are certain the key exists (like accessing known object attributes). Use `lookup` when the key might not exist and you want a fallback.

## Tag Management with lookup

Reading values from tag maps with defaults is a perfect use case for `lookup`.

```hcl
variable "tags" {
  type    = map(string)
  default = {}
}

locals {
  # Ensure required tags always have values, even if not provided
  effective_tags = {
    Name        = lookup(var.tags, "Name", "unnamed")
    Environment = lookup(var.tags, "Environment", "dev")
    ManagedBy   = lookup(var.tags, "ManagedBy", "terraform")
    Team        = lookup(var.tags, "Team", "platform")
    CostCenter  = lookup(var.tags, "CostCenter", "default")
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = local.effective_tags
}
```

This guarantees that every resource gets a full set of tags, regardless of what the caller provides.

## Region-Specific AMI Lookups

A classic Terraform pattern is mapping AMIs per region.

```hcl
variable "region" {
  type    = string
  default = "us-east-1"
}

locals {
  ami_map = {
    "us-east-1"      = "ami-0123456789abcdef0"
    "us-west-2"      = "ami-abcdef0123456789a"
    "eu-west-1"      = "ami-fedcba9876543210f"
    "ap-southeast-1" = "ami-1234567890abcdef1"
  }
}

resource "aws_instance" "app" {
  # Falls back to us-east-1 AMI if region not in the map
  ami           = lookup(local.ami_map, var.region, local.ami_map["us-east-1"])
  instance_type = "t3.micro"
}
```

## Nested Map Lookups

For nested maps, you can chain `lookup` calls.

```hcl
locals {
  config = {
    production = {
      db_class = "db.r6g.xlarge"
      db_storage = 500
    }
    staging = {
      db_class = "db.r6g.large"
      db_storage = 100
    }
  }
}

variable "environment" {
  type    = string
  default = "dev"
}

locals {
  # First lookup gets the environment config (or empty map as default)
  env_config = lookup(local.config, var.environment, {})

  # Second lookup gets specific values with defaults
  db_class   = lookup(local.env_config, "db_class", "db.t3.medium")
  db_storage = lookup(local.env_config, "db_storage", 20)
}
```

## Dynamic Feature Configuration

Use `lookup` to build feature configurations from a map of settings.

```hcl
variable "feature_flags" {
  type    = map(bool)
  default = {
    monitoring = true
    backups    = true
  }
}

locals {
  # Each feature gets a safe lookup with a sensible default
  enable_monitoring = lookup(var.feature_flags, "monitoring", false)
  enable_backups    = lookup(var.feature_flags, "backups", false)
  enable_waf        = lookup(var.feature_flags, "waf", false)
  enable_cdn        = lookup(var.feature_flags, "cdn", false)
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = local.enable_monitoring ? 1 : 0

  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
}
```

## Using lookup in for Expressions

You can use `lookup` inside `for` expressions to transform maps with defaults.

```hcl
variable "service_configs" {
  type = map(map(string))
  default = {
    api = {
      port     = "8080"
      protocol = "HTTP"
    }
    worker = {
      port = "9090"
    }
    scheduler = {}
  }
}

locals {
  # Normalize service configs with defaults for all fields
  normalized_services = {
    for name, config in var.service_configs :
    name => {
      port     = lookup(config, "port", "8080")
      protocol = lookup(config, "protocol", "HTTP")
      timeout  = lookup(config, "timeout", "30")
    }
  }
}

output "service_configs" {
  value = local.normalized_services
  # {
  #   api       = { port = "8080", protocol = "HTTP", timeout = "30" }
  #   worker    = { port = "9090", protocol = "HTTP", timeout = "30" }
  #   scheduler = { port = "8080", protocol = "HTTP", timeout = "30" }
  # }
}
```

## Real-World Scenario: Multi-Region Deployment

Here is a complete example of region-specific configuration with fallbacks.

```hcl
variable "region" {
  type = string
}

locals {
  region_config = {
    "us-east-1" = {
      az_count    = 3
      nat_gateway = true
      vpc_cidr    = "10.0.0.0/16"
    }
    "us-west-2" = {
      az_count    = 3
      nat_gateway = true
      vpc_cidr    = "10.1.0.0/16"
    }
    "eu-west-1" = {
      az_count    = 3
      nat_gateway = true
      vpc_cidr    = "10.2.0.0/16"
    }
  }

  # Default config for regions not explicitly listed
  default_config = {
    az_count    = 2
    nat_gateway = false
    vpc_cidr    = "10.99.0.0/16"
  }

  # Get the config for the current region, falling back to defaults
  current_config = lookup(local.region_config, var.region, local.default_config)
}

resource "aws_vpc" "main" {
  cidr_block = local.current_config.vpc_cidr

  tags = {
    Name = "vpc-${var.region}"
  }
}
```

## Summary

The `lookup` function is the safe way to access map values in Terraform. Its default value parameter prevents errors when keys are missing, making your configurations more robust and easier to maintain.

Key takeaways:

- `lookup(map, key, default)` returns the value for key, or default if the key is missing
- Use it instead of direct map access when keys might not exist
- Ideal for environment-based configuration, tag management, and AMI lookups
- Chain lookups for nested maps
- Works well inside `for` expressions for normalizing data
- The default parameter makes configurations resilient to missing values

Whenever you access a map and there is any chance the key might not exist, `lookup` with a default is your best friend.
