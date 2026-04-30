# How to Use For Expressions to Transform Collections in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, For Expressions, Collection, Transformation, Infrastructure as Code, DevOps

Description: A guide to using for expressions in OpenTofu to transform lists, maps, and sets into new collection shapes.

## Introduction

For expressions in OpenTofu allow you to transform one collection into another shape by applying an expression to each element. A `for` expression produces either a tuple or an object value, which OpenTofu can automatically convert in many contexts. You can use for expressions to convert lists to maps, maps to lists, reshape data structures, and filter collections based on conditions.

## Basic For Expression Syntax

```hcl
# Tuple output: [for <item> in <collection> : <expression>]

# Object output: {for <item> in <collection> : <key> => <value>}

variable "names" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

locals {
  # Transform list to list
  upper_names = [for name in var.names : upper(name)]
  # Result: ["ALICE", "BOB", "CHARLIE"]

  # Transform list to map
  name_lengths = {for name in var.names : name => length(name)}
  # Result: {"alice" = 5, "bob" = 3, "charlie" = 7}
}
```

## Transforming Maps

```hcl
variable "environments" {
  type = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

locals {
  # Transform map values
  instance_types_upper = {
    for env, type in var.environments : env => upper(type)
  }
  # Result: {"dev" = "T3.MICRO", "staging" = "T3.SMALL", "prod" = "T3.LARGE"}

  # Transform map to list of strings
  env_summary = [
    for env, type in var.environments : "${env}: ${type}"
  ]
  # Result: ["dev: t3.micro", "prod: t3.large", "staging: t3.small"]
}
```

## Creating Resource Maps from Lists

```hcl
variable "app_names" {
  type    = list(string)
  default = ["api", "worker", "scheduler"]
}

variable "project" {
  type    = string
  default = "myapp"
}

variable "environment" {
  type    = string
  default = "dev"
}

locals {
  # Build a map of bucket configurations from a list
  bucket_config = {
    for app in var.app_names : app => {
      bucket_name = "${var.project}-${app}-${var.environment}"
      tags = {
        App         = app
        Project     = var.project
        Environment = var.environment
      }
    }
  }
}

resource "aws_s3_bucket" "app" {
  for_each = local.bucket_config

  bucket = each.value.bucket_name
  tags   = each.value.tags
}
```

## Transforming Data Source Results

```hcl
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }
  tags = { Type = "private" }
}

data "aws_subnet" "private" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

locals {
  # Build map of subnet id to availability zone
  subnet_az_map = {
    for id, subnet in data.aws_subnet.private : id => subnet.availability_zone
  }

  # Get unique AZs
  available_azs = distinct(values(local.subnet_az_map))
}
```

## Reshaping Complex Structures

```hcl
variable "service_config" {
  type = list(object({
    name  = string
    port  = number
    protocol = string
  }))
  default = [
    { name = "http",  port = 80,  protocol = "tcp" },
    { name = "https", port = 443, protocol = "tcp" },
    { name = "grpc",  port = 9090, protocol = "tcp" }
  ]
}

locals {
  # Convert list of objects to map keyed by name
  services_by_name = {
    for svc in var.service_config : svc.name => svc
  }

  # Extract just the ports as a list
  service_ports = [for svc in var.service_config : svc.port]
}
```

## Flattening Nested Structures

```hcl
variable "environments" {
  type = map(object({
    regions = list(string)
  }))
  default = {
    dev  = { regions = ["us-east-1"] }
    prod = { regions = ["us-east-1", "eu-west-1"] }
  }
}

locals {
  # Create all environment-region combinations
  env_region_pairs = flatten([
    for env, config in var.environments : [
      for region in config.regions : {
        environment = env
        region      = region
        key         = "${env}-${region}"
      }
    ]
  ])

  # Convert to map
  env_regions_map = {
    for pair in local.env_region_pairs : pair.key => pair
  }
}
```

## Inverting a Map

```hcl
variable "user_roles" {
  type = map(string)
  default = {
    alice   = "admin"
    bob     = "developer"
    charlie = "developer"
    diana   = "admin"
  }
}

locals {
  # Invert: group users by role
  roles_to_users = {
    for role in distinct(values(var.user_roles)) :
    role => [for user, r in var.user_roles : user if r == role]
  }
  # Result: {"admin" = ["alice", "diana"], "developer" = ["bob", "charlie"]}
}
```

## Conclusion

For expressions are one of the most powerful tools in OpenTofu for data transformation. They enable converting between collection shapes (list to map, map to list), reshaping data structures for use with `for_each`, extracting specific fields from complex objects, and creating computed configurations from input variables. Use square brackets `[]` to produce tuple results and curly braces `{}` to produce object results, which OpenTofu can often convert automatically to lists, maps, or sets as needed. Combine for expressions with `flatten()` for nested structures and `distinct()` for deduplication.
