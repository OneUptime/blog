# How to Merge Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Merge, Map, HCL, Function, Infrastructure as Code

Description: Learn how to use the merge() function in OpenTofu to combine multiple maps - merging tag sets, configuration objects, and default-with-override patterns.

## Introduction

`merge()` combines multiple maps into one. When keys conflict, the last map's value wins. This enables powerful patterns: default values with overrides, combining common tags with resource-specific tags, and building configuration maps from multiple sources.

## Basic merge() Usage

```hcl
locals {
  defaults = {
    ManagedBy   = "opentofu"
    Environment = var.environment
    Project     = var.project
  }

  web_tags = {
    Name = "web-server"
    Role = "frontend"
  }

  # Merge: web_tags overrides defaults if keys conflict
  combined = merge(local.defaults, local.web_tags)
  # {
  #   ManagedBy   = "opentofu"
  #   Environment = "prod"
  #   Project     = "myapp"
  #   Name        = "web-server"
  #   Role        = "frontend"
  # }
}
```

## Tag Inheritance Pattern

```hcl
# Common tags applied to all resources

locals {
  common_tags = {
    ManagedBy   = "opentofu"
    Environment = var.environment
    Team        = var.team
    CostCenter  = var.cost_center
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = merge(local.common_tags, {
    Name = "${var.environment}-vpc"
    Type = "networking"
  })
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.latest.id
  instance_type = "t3.medium"

  tags = merge(local.common_tags, {
    Name    = "${var.environment}-web-server"
    Service = "frontend"
    Backup  = "daily"
  })
}
```

## Default-with-Override Pattern

```hcl
variable "instance_config" {
  type = object({
    instance_type = optional(string)
    volume_size   = optional(number)
    monitoring    = optional(bool)
  })
  default = {}
}

locals {
  instance_defaults = {
    instance_type = "t3.medium"
    volume_size   = 20
    monitoring    = false
  }

  # User overrides take precedence over defaults
  final_config = merge(
    local.instance_defaults,
    # Remove null values from user config before merging
    { for k, v in var.instance_config : k => v if v != null }
  )
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.latest.id
  instance_type = local.final_config.instance_type

  root_block_device {
    volume_size = local.final_config.volume_size
  }

  monitoring = local.final_config.monitoring
}
```

## Merging Multiple Maps

```hcl
# merge() accepts any number of maps
locals {
  organization_tags = { Organization = "my-company" }
  environment_tags  = { Environment = var.environment }
  team_tags         = { Team = var.team }
  service_tags      = { Service = var.service_name }

  all_tags = merge(
    local.organization_tags,
    local.environment_tags,
    local.team_tags,
    local.service_tags,
    var.additional_tags   # User-provided tags (override anything above)
  )
}
```

## Conditional Merge

```hcl
variable "enable_cost_allocation" {
  type    = bool
  default = false
}

variable "cost_center" {
  type    = string
  default = null
}

locals {
  cost_tags = var.enable_cost_allocation && var.cost_center != null ? {
    CostCenter = var.cost_center
  } : {}

  resource_tags = merge(
    local.common_tags,
    local.cost_tags,    # Empty map {} has no effect on merge
    {
      Name = var.resource_name
    }
  )
}
```

## Merging Provider default_tags with Resource Tags

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "opentofu"
      Environment = var.environment
    }
  }
}

# Resource-level tags merge with default_tags automatically
# No need for explicit merge - AWS provider handles it
resource "aws_instance" "web" {
  ami           = data.aws_ami.latest.id
  instance_type = "t3.medium"

  tags = {
    # Only resource-specific tags needed
    # ManagedBy and Environment come from default_tags
    Name    = "web-server"
    Service = "frontend"
  }
}
```

## Nested Map Merge Caveat

`merge()` is a shallow merge - it doesn't recursively merge nested maps:

```hcl
locals {
  map1 = { a = { x = 1, y = 2 } }
  map2 = { a = { z = 3 } }

  # SHALLOW merge: a in map2 completely replaces a in map1
  merged = merge(local.map1, local.map2)
  # { a = { z = 3 } }   -- NOT { a = { x = 1, y = 2, z = 3 } }

  # For deep merge, use explicit nested merge:
  deep_merged = {
    a = merge(local.map1.a, local.map2.a)
  }
  # { a = { x = 1, y = 2, z = 3 } }
}
```

## Conclusion

`merge()` combines maps with last-value-wins semantics, making it ideal for tag inheritance, default-with-override patterns, and combining configuration from multiple sources. Use empty maps `{}` for conditional additions (they have no effect on the merged result). Remember that `merge()` is shallow - nested maps are replaced, not recursively merged. For deep nested merges, apply explicit nested `merge()` calls for each nested level.
