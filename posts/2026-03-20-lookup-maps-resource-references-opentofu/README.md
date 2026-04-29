# How to Create Lookup Maps for Resource References in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Lookup, Map, Data Transformation

Description: Learn how to build lookup maps in OpenTofu to reference resources by logical names, simplifying complex cross-resource dependencies and reducing hard-coded IDs.

## Introduction

Hard-coded resource IDs create brittle configurations. Lookup maps let you define a logical name-to-resource mapping once, then reference it consistently throughout your configuration - making your code more readable and easier to update.

## Basic Lookup Map Pattern

Use `locals` to define a map that translates logical names to resource attributes.

```hcl
# Define AMI IDs per region as a lookup map

locals {
  ami_ids = {
    "us-east-1"    = "ami-0c55b159cbfafe1f0"
    "us-west-2"    = "ami-0892d3c7ee96c0bf7"
    "eu-west-1"    = "ami-0d71ea30463e0ff49"
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

resource "aws_instance" "app" {
  # Look up the correct AMI for the current region
  ami           = local.ami_ids[var.region]
  instance_type = "t3.micro"
}
```

## Building Lookup Maps from Data Sources

Construct lookup maps dynamically from data source results rather than hard-coding values.

```hcl
variable "vpc_id" {
  type = string
}

# Fetch all subnets with a specific tag in the target VPC
data "aws_subnets" "by_tier" {
  for_each = toset(["public", "private", "database"])

  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  filter {
    name   = "tag:Tier"
    values = [each.key]
  }
}

locals {
  # Build a lookup map: tier -> list of subnet IDs
  subnet_ids_by_tier = {
    for tier, data in data.aws_subnets.by_tier :
    tier => data.ids
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  # Reference database subnets via the lookup map
  subnet_ids = local.subnet_ids_by_tier["database"]
}
```

## Cross-Module Resource Lookup

When modules output maps, use them as lookup tables in root configurations.

```hcl
module "networking" {
  source = "./modules/networking"
  # ...
}

# networking module outputs a map of environment -> VPC ID
# module.networking.vpc_ids = {
#   "dev"     = "vpc-0a1b2c3d4e5f6a7b8"
#   "staging" = "vpc-1a2b3c4d5e6f7a8b9"
#   "prod"    = "vpc-2a3b4c5d6e7f8a9b0"
# }

variable "environment" {
  type = string
}

locals {
  # Look up VPC for current environment
  current_vpc_id = module.networking.vpc_ids[var.environment]
}

resource "aws_security_group" "app" {
  name   = "app-sg-${var.environment}"
  vpc_id = local.current_vpc_id
}
```

## Instance Type Lookup by Environment

Different environments may require different instance sizes. A lookup map makes this clean.

```hcl
variable "app_ami_id" {
  type = string
}

locals {
  # Map environment names to instance configurations
  instance_config = {
    "dev" = {
      instance_type = "t3.micro"
      volume_size   = 20
    }
    "staging" = {
      instance_type = "t3.small"
      volume_size   = 50
    }
    "prod" = {
      instance_type = "t3.large"
      volume_size   = 100
    }
  }

  # Look up config for the current environment, with a default
  env_config = lookup(local.instance_config, var.environment, local.instance_config["dev"])
}

resource "aws_launch_template" "app" {
  name_prefix   = "app-${var.environment}-"
  image_id      = var.app_ami_id
  instance_type = local.env_config.instance_type

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = local.env_config.volume_size
    }
  }
}
```

## Using lookup() for Safe Access with Defaults

The `lookup` function provides a safe way to access map values with a fallback default.

```hcl
variable "feature_flags" {
  type = map(bool)
  default = {
    "enable_waf" = true
    "enable_cdn" = false
  }
}

locals {
  # Safe lookups with defaults for missing keys
  enable_waf      = lookup(var.feature_flags, "enable_waf", false)
  enable_cdn      = lookup(var.feature_flags, "enable_cdn", false)
  enable_firewall = lookup(var.feature_flags, "enable_firewall", false)
}
```

## Conclusion

Lookup maps transform hard-coded values into maintainable, readable configuration. By centralizing mappings in `locals` and using `lookup` for safe access, you reduce duplication, prevent configuration drift, and make your OpenTofu configurations easier to extend.
