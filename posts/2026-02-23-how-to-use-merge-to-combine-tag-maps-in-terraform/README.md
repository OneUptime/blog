# How to Use merge to Combine Tag Maps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Maps, Tagging

Description: Learn how to use the merge function in Terraform to combine multiple tag maps, implement tag inheritance, and build consistent tagging strategies across resources.

---

Tagging is one of those things that starts simple and gets complicated fast. You have default tags, environment-specific tags, team tags, compliance tags, and resource-specific tags - all of which need to be combined into a single tag map for each resource. The `merge` function is the backbone of any tagging strategy in Terraform.

## What is the merge Function?

The `merge` function takes two or more maps and combines them into a single map. If the same key exists in multiple maps, the last one wins.

```hcl
# Combine two maps
> merge({ a = "1", b = "2" }, { b = "3", c = "4" })
{
  "a" = "1"
  "b" = "3"
  "c" = "4"
}
```

Notice that key `"b"` appeared in both maps, but the value from the second map (`"3"`) won.

The syntax:

```hcl
merge(map1, map2, ...)
```

## The Last-Wins Rule

The order of arguments matters because later maps override earlier ones:

```hcl
> merge(
    { Name = "original" },
    { Name = "override" }
  )
{
  "Name" = "override"
}
```

This is extremely useful for implementing a tag hierarchy where more specific tags override more general ones.

## Building a Tag Hierarchy

The most common pattern is layering tags from general to specific:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "project" {
  type    = string
  default = "myapp"
}

# Layer 1: Organization-wide defaults
locals {
  org_tags = {
    ManagedBy    = "terraform"
    Organization = "mycompany"
  }
}

# Layer 2: Environment tags
locals {
  env_tags = {
    Environment = var.environment
  }
}

# Layer 3: Project tags
locals {
  project_tags = {
    Project   = var.project
    Team      = "platform"
    CostCenter = "12345"
  }
}

# Combine all layers - more specific tags override less specific ones
locals {
  common_tags = merge(
    local.org_tags,
    local.env_tags,
    local.project_tags
  )
  # Result: {
  #   "CostCenter"   = "12345"
  #   "Environment"   = "production"
  #   "ManagedBy"     = "terraform"
  #   "Organization"  = "mycompany"
  #   "Project"       = "myapp"
  #   "Team"          = "platform"
  # }
}

# Every resource gets the common tags plus resource-specific tags
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = merge(local.common_tags, {
    Name = "web-server"
    Role = "web"
  })
}

resource "aws_instance" "api" {
  ami           = var.ami_id
  instance_type = "t3.large"

  tags = merge(local.common_tags, {
    Name = "api-server"
    Role = "api"
  })
}
```

## Module-Level Tagging

When writing modules, accept tags as input and merge them with module-specific tags:

```hcl
# Module: modules/vpc/variables.tf
variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply to all resources"
}

variable "vpc_name" {
  type = string
}

# Module: modules/vpc/main.tf
locals {
  module_tags = {
    Module    = "vpc"
    VPCName   = var.vpc_name
  }

  # Merge caller tags with module tags - caller can override module defaults
  all_tags = merge(local.module_tags, var.tags)
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = merge(local.all_tags, {
    Name = var.vpc_name
  })
}

resource "aws_subnet" "public" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)

  tags = merge(local.all_tags, {
    Name = "${var.vpc_name}-public-${count.index}"
    Tier = "public"
  })
}
```

Usage:

```hcl
module "vpc" {
  source   = "./modules/vpc"
  vpc_name = "main"

  tags = {
    Environment = "production"
    Team        = "infrastructure"
  }
}
```

## Conditional Tags with merge

Add tags conditionally based on environment or configuration:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

locals {
  base_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Conditional production tags
  production_tags = var.environment == "production" ? {
    BackupPolicy = "daily"
    SLA          = "99.9"
    OnCall       = "platform-team"
  } : {}

  # Conditional monitoring tags
  monitoring_tags = var.enable_monitoring ? {
    Monitoring   = "enabled"
    AlertChannel = "pagerduty"
  } : {}

  # Merge base with conditional tags
  all_tags = merge(
    local.base_tags,
    local.production_tags,
    local.monitoring_tags
  )
}
```

## Merging Tags from Multiple Modules

When you aggregate outputs from several modules:

```hcl
module "network" {
  source = "./modules/network"
}

module "security" {
  source = "./modules/security"
}

module "compliance" {
  source = "./modules/compliance"
}

locals {
  # Each module might output its own set of required tags
  combined_tags = merge(
    module.network.required_tags,
    module.security.required_tags,
    module.compliance.required_tags,
    {
      # Your own tags override module tags
      Name = "my-resource"
    }
  )
}
```

## Dynamic Tag Generation with for and merge

Generate tags dynamically and merge them:

```hcl
variable "service_owners" {
  type = map(string)
  default = {
    web    = "frontend-team"
    api    = "backend-team"
    worker = "platform-team"
  }
}

variable "service_name" {
  type    = string
  default = "web"
}

locals {
  auto_tags = {
    ServiceName  = var.service_name
    ServiceOwner = lookup(var.service_owners, var.service_name, "unknown")
    CreatedAt    = timestamp()
  }

  final_tags = merge(local.common_tags, local.auto_tags)
}
```

## Merging with Provider Default Tags

AWS provider supports default tags, and merge works nicely alongside them:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# Resource-specific tags merge with provider defaults automatically
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # These merge with the provider's default_tags
  tags = merge(local.project_tags, {
    Name = "web-server"
  })
}
```

## Merging More Than Two Maps

`merge` accepts any number of arguments:

```hcl
locals {
  final_tags = merge(
    local.org_tags,           # Organization defaults
    local.env_tags,           # Environment overrides
    local.team_tags,          # Team overrides
    local.project_tags,       # Project overrides
    local.compliance_tags,    # Compliance requirements
    local.resource_tags       # Resource-specific (highest priority)
  )
}
```

Priority goes from left (lowest) to right (highest).

## Merging Non-Tag Maps

While tagging is the most common use case, `merge` works with any maps:

```hcl
# Merge environment variables for containers
locals {
  base_env = {
    LOG_LEVEL = "info"
    NODE_ENV  = "production"
  }

  app_env = {
    PORT      = "8080"
    DB_HOST   = aws_db_instance.main.endpoint
  }

  all_env_vars = merge(local.base_env, local.app_env)
}
```

## Edge Cases

```hcl
# Empty maps are valid
> merge({}, { a = "1" })
{ "a" = "1" }

# Merging with empty effectively copies
> merge({ a = "1" }, {})
{ "a" = "1" }

# Single map argument
> merge({ a = "1" })
{ "a" = "1" }

# All maps empty
> merge({}, {}, {})
{}
```

## merge vs Object Spread

Terraform does not have a spread operator like JavaScript, so `merge` is the standard way to combine maps. Some people try to use variable-length arguments or splat expressions, but `merge` is the correct approach.

## Summary

The `merge` function is the foundation of any tagging strategy in Terraform. Use it to build tag hierarchies from organization defaults through environment-specific overrides to resource-level tags. The last-wins rule makes it natural to express precedence - put your defaults first and your overrides last. When writing modules, always accept a `tags` variable and merge it with your module's required tags so callers can add their own. For related map operations, see our posts on the [lookup function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-lookup-with-default-values-in-terraform/view) and the [values function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-values-function-in-terraform/view).
