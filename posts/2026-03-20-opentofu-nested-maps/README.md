# How to Create Nested Maps from Flat Data in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Map, Collection, Data Transformation, Infrastructure

Description: Learn how to build nested map structures from flat data in OpenTofu using for expressions, enabling hierarchical configuration management and multi-dimensional resource lookups.

## Overview

Flat lists of key-value pairs are easy to pass around but hard to query by multiple dimensions. Building nested maps from flat data - for example, grouping instance sizes by region and then by environment - enables cleaner lookups and more expressive resource configurations in OpenTofu.

## Building a Two-Level Nested Map

```hcl
# Flat source data

locals {
  instance_configs = [
    { region = "us-east-1", env = "prod",    type = "t3.large",  count = 3 },
    { region = "us-east-1", env = "staging", type = "t3.medium", count = 1 },
    { region = "us-west-2", env = "prod",    type = "t3.large",  count = 3 },
    { region = "us-west-2", env = "staging", type = "t3.medium", count = 1 },
    { region = "eu-west-1", env = "prod",    type = "t3.xlarge", count = 5 },
  ]

  # Build nested map: region -> env -> config
  config_by_region_env = {
    for region in distinct([for c in local.instance_configs : c.region]) :
    region => {
      for cfg in local.instance_configs :
      cfg.env => cfg
      if cfg.region == region
    }
  }
}

# Lookup: config_by_region_env["us-east-1"]["prod"].type == "t3.large"
output "prod_us_east_1_type" {
  value = local.config_by_region_env["us-east-1"]["prod"].type
}
```

## Nested Map from YAML Configuration

```hcl
# config/environments.yaml
# environments:
#   prod:
#     us-east-1:
#       vpc_cidr: "10.0.0.0/16"
#       az_count: 3
#     eu-west-1:
#       vpc_cidr: "10.1.0.0/16"
#       az_count: 2
#   staging:
#     us-east-1:
#       vpc_cidr: "10.10.0.0/16"
#       az_count: 2

locals {
  env_config = yamldecode(file("${path.module}/config/environments.yaml"))

  # The YAML already provides nested structure; flatten to a list of objects
  # for iteration with for_each
  flat_env_region_list = flatten([
    for env, regions in local.env_config.environments : [
      for region, cfg in regions : {
        key    = "${env}/${region}"
        env    = env
        region = region
        config = cfg
      }
    ]
  ])

  flat_env_region_map = {
    for item in local.flat_env_region_list :
    item.key => item
  }
}

# Create a VPC for each env/region combination
resource "aws_vpc" "env_vpcs" {
  for_each   = local.flat_env_region_map
  cidr_block = each.value.config.vpc_cidr

  tags = {
    Name        = "vpc-${each.value.env}-${each.value.region}"
    Environment = each.value.env
    Region      = each.value.region
  }
}
```

## Building Hierarchical Tag Policies

```hcl
# Define tag requirements per environment tier
locals {
  tag_policy_matrix = {
    required_tags = {
      prod = {
        Environment  = { allowed_values = ["prod", "production"] }
        CostCenter   = { allowed_values = [] }  # Any value required
        Owner        = { allowed_values = [] }
        DataClass    = { allowed_values = ["public", "internal", "confidential", "restricted"] }
      }
      staging = {
        Environment  = { allowed_values = ["staging", "stage"] }
        Owner        = { allowed_values = [] }
      }
      dev = {
        Environment  = { allowed_values = ["dev", "development"] }
      }
    }
  }

  # Flatten to a list for aws_organizations_policy or similar resources
  tag_rules_flat = flatten([
    for env, tags in local.tag_policy_matrix.required_tags : [
      for tag_key, rule in tags : {
        key            = "${env}/${tag_key}"
        environment    = env
        tag_key        = tag_key
        allowed_values = rule.allowed_values
      }
    ]
  ])
}

output "prod_required_tags" {
  value = keys(local.tag_policy_matrix.required_tags["prod"])
  # keys() returns lexicographical order:
  # ["CostCenter", "DataClass", "Environment", "Owner"]
}
```

## Multi-Dimensional Subnet Planning

```hcl
variable "network_plan" {
  type = object({
    base_cidr = string
    tiers = list(object({
      name  = string
      index = number
      zones = list(string)
    }))
  })
  default = {
    base_cidr = "10.0.0.0/16"
    tiers = [
      { name = "public",  index = 0, zones = ["a", "b", "c"] },
      { name = "private", index = 1, zones = ["a", "b", "c"] },
      { name = "data",    index = 2, zones = ["a", "b"] },
    ]
  }
}

locals {
  # Build nested map: tier -> zone -> subnet_cidr
  subnet_plan = {
    for tier in var.network_plan.tiers :
    tier.name => {
      for zi, zone in tier.zones :
      zone => cidrsubnet(
        cidrsubnet(var.network_plan.base_cidr, 4, tier.index),
        4,
        zi
      )
    }
  }
}

# Create subnets from the nested plan
resource "aws_subnet" "planned" {
  for_each = {
    for combo in flatten([
      for tier, zones in local.subnet_plan : [
        for zone, cidr in zones : {
          key  = "${tier}-${zone}"
          tier = tier
          zone = zone
          cidr = cidr
        }
      ]
    ]) : combo.key => combo
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = "us-east-1${each.value.zone}"

  tags = {
    Name = "subnet-${each.value.tier}-${each.value.zone}"
    Tier = each.value.tier
  }
}

output "subnet_plan" {
  value = local.subnet_plan
  # {
  #   public  = { a = "10.0.0.0/24",  b = "10.0.1.0/24",   c = "10.0.2.0/24"  }
  #   private = { a = "10.0.16.0/24", b = "10.0.17.0/24",  c = "10.0.18.0/24" }
  #   data    = { a = "10.0.32.0/24", b = "10.0.33.0/24" }
  # }
}
```

## Summary

Building nested maps from flat data transforms linear lists into multi-dimensional lookup structures. The core technique combines `distinct` to extract unique top-level keys with inner `for` loops filtered by equality. These patterns are especially valuable for multi-region, multi-environment configurations where each dimension independently drives resource creation, enabling clean lookups like `config["us-east-1"]["prod"].instance_type` rather than searching through a flat list.
