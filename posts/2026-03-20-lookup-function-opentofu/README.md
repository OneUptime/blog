# How to Use the lookup Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Lookup, Map Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the lookup function in OpenTofu to retrieve values from a map with a fallback default when the key is not found.

---

`lookup()` retrieves a value from a map by key. Unlike direct map access (`map["key"]`), `lookup()` accepts a default value to return when the key is not present, preventing errors from missing keys.

---

## Syntax

```hcl
lookup(map, key, default)
```

If `key` exists in `map`, its value is returned. If not, `default` is returned. (For historical reasons, the `default` argument is optional, but omitting it is deprecated, so you should provide it.)

---

## Basic Examples

```hcl
locals {
  instance_types = {
    production = "m5.large"
    staging    = "t3.medium"
    dev        = "t3.micro"
  }

  # Returns "m5.large"
  prod_type = lookup(local.instance_types, "production", "t3.micro")

  # Returns "t3.micro" (the default) - "test" key doesn't exist
  test_type = lookup(local.instance_types, "test", "t3.micro")
}
```

---

## Environment-Specific Configuration

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

locals {
  instance_type_map = {
    production  = "m5.2xlarge"
    staging     = "t3.large"
    dev         = "t3.micro"
  }

  db_class_map = {
    production  = "db.r5.large"
    staging     = "db.t3.medium"
    dev         = "db.t3.micro"
  }

  instance_type = lookup(local.instance_type_map, var.environment, "t3.micro")
  db_class      = lookup(local.db_class_map, var.environment, "db.t3.micro")
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.instance_type
}
```

---

## Looking Up Tag Values

```hcl
variable "resource_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
  }
}

locals {
  # Safely get a tag value with a default
  env  = lookup(var.resource_tags, "Environment", "unknown")
  team = lookup(var.resource_tags, "Team", "unassigned")
  cost = lookup(var.resource_tags, "CostCenter", "default")
  # "default" - CostCenter key doesn't exist
}
```

---

## AMI Lookup by Region

```hcl
variable "region" {
  type    = string
  default = "us-east-1"
}

locals {
  # Map of region → AMI ID
  regional_amis = {
    "us-east-1" = "ami-0abcdef1234567890"
    "us-west-2" = "ami-0fedcba0987654321"
    "eu-west-1" = "ami-0123456789abcdef0"
  }

  # Get the AMI for the current region, fall back to us-east-1
  ami_id = lookup(local.regional_amis, var.region, local.regional_amis["us-east-1"])
}
```

---

## lookup vs Direct Map Access

```hcl
variable "config" {
  type = map(string)
  default = { key1 = "value1" }
}

locals {
  # Direct access - errors if key missing

  value1 = var.config["key1"]     # "value1"
  # value2 = var.config["key2"]   # Error: key not found

  # lookup - returns default if key missing
  value1_lookup = lookup(var.config, "key1", "default")  # "value1"
  value2_lookup = lookup(var.config, "key2", "default")  # "default" (no error)
}
```

---

## Summary

`lookup(map, key, default)` safely retrieves a value from a map, returning the default when the key doesn't exist. Use it for environment-specific configurations, optional tag value retrieval, region-specific AMI lookups, and any situation where a map might not have all possible keys. Prefer `lookup()` over direct map access (`map["key"]`) when the key might be absent. For strict enforcement that a key must exist, use direct access and let OpenTofu error.
