# How to Chain Data Transformations in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Transformation, HCL, Local, Function, Infrastructure as Code

Description: Learn how to chain multiple data transformations in OpenTofu locals blocks - building complex data structures from simple inputs through a series of clear, composable transformation steps.

## Introduction

Complex OpenTofu configurations often need to transform input variables through multiple steps before they're ready to use in resources. Chaining transformations through `locals` blocks keeps each step clear and testable - each local variable is a named intermediate result.

## The Transformation Chain Pattern

```hcl
# INPUT: flat list of servers

variable "servers" {
  default = [
    { name = "web-1",  type = "web", az = "us-east-1a", size = "small" },
    { name = "web-2",  type = "web", az = "us-east-1b", size = "small" },
    { name = "api-1",  type = "api", az = "us-east-1a", size = "medium" },
    { name = "db-1",   type = "db",  az = "us-east-1a", size = "large" },
    { name = "db-2",   type = "db",  az = "us-east-1b", size = "large" }
  ]
}

locals {
  # STEP 1: Convert to map keyed by name (for for_each)
  servers_by_name = { for s in var.servers : s.name => s }

  # STEP 2: Group by type
  servers_by_type = {
    for s in var.servers : s.type => s.name...
  }
  # {"web" = ["web-1", "web-2"], "api" = ["api-1"], "db" = ["db-1", "db-2"]}

  # STEP 3: Resolve size to actual instance type
  size_map = {
    small  = "t3.small"
    medium = "t3.medium"
    large  = "t3.large"
  }

  # STEP 4: Final enriched server configs with resolved instance types
  enriched_servers = {
    for name, s in local.servers_by_name : name => merge(s, {
      instance_type = local.size_map[s.size]
    })
  }
}

resource "aws_instance" "servers" {
  for_each = local.enriched_servers

  ami           = data.aws_ami.latest.id
  instance_type = each.value.instance_type  # Resolved from size

  tags = {
    Name = each.key
    Type = each.value.type
  }
}
```

## Flatten + Enrich + Group Chain

```hcl
# Start: nested structure from variable
variable "teams" {
  default = {
    platform = {
      members = ["alice", "bob"]
      slack   = "#platform"
    }
    app = {
      members = ["carol", "dave"]
      slack   = "#app-team"
    }
  }
}

locals {
  # STEP 1: Flatten to list of {member, team, slack}
  all_members = flatten([
    for team_name, team_config in var.teams : [
      for member in team_config.members : {
        username = member
        team     = team_name
        slack    = team_config.slack
      }
    ]
  ])

  # STEP 2: Convert to map for for_each
  members_map = { for m in local.all_members : m.username => m }

  # STEP 3: Filter to specific teams if needed
  platform_members = {
    for username, m in local.members_map : username => m
    if m.team == "platform"
  }
}

resource "aws_iam_user" "team" {
  for_each = local.members_map

  name = each.key
  tags = {
    Team  = each.value.team
    Slack = each.value.slack
  }
}
```

## Subnet CIDR Allocation Chain

```hcl
variable "vpc_cidr" { default = "10.0.0.0/16" }
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  # STEP 1: Generate one public and one private subnet CIDR per AZ
  all_cidrs = cidrsubnets(
    var.vpc_cidr,
    [for _ in range(length(var.availability_zones) * 2) : 8]...
  )

  # STEP 2: Split into public and private
  public_cidrs  = slice(local.all_cidrs, 0, length(var.availability_zones))
  private_cidrs = slice(local.all_cidrs, length(var.availability_zones), length(var.availability_zones) * 2)

  # STEP 3: Pair CIDRs with AZs
  public_subnet_configs = {
    for i, az in var.availability_zones : "public-${az}" => {
      cidr = local.public_cidrs[i]
      az   = az
      type = "public"
    }
  }

  private_subnet_configs = {
    for i, az in var.availability_zones : "private-${az}" => {
      cidr = local.private_cidrs[i]
      az   = az
      type = "private"
    }
  }

  # STEP 4: Combine all subnet configs
  all_subnet_configs = merge(
    local.public_subnet_configs,
    local.private_subnet_configs
  )
}

resource "aws_subnet" "main" {
  for_each = local.all_subnet_configs

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  map_public_ip_on_launch = each.value.type == "public"

  tags = { Name = each.key, Type = each.value.type }
}
```

## Debugging Transformation Chains

```hcl
# Add output blocks to inspect intermediate values during development
output "debug_step1" {
  value = local.servers_by_name
}

output "debug_step2" {
  value = local.servers_by_type
}

# Run tofu apply and inspect the outputs
# Remove debug outputs before committing
```

## Conclusion

Chaining transformations through named `locals` variables keeps complex data manipulation readable and maintainable. Each step has a name that describes its purpose, making it easy to trace the data flow from raw input variables to the final structures used in resources. Common transformation patterns include: list-to-map conversion (for `for_each`), flatten+enrich (for nested data), group-by (for categorization), and cidrsubnets+slice (for IP allocation). Debug intermediate steps with temporary `output` blocks.
