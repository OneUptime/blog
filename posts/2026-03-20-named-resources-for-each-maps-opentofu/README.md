# How to Create Named Resources with for_each and Maps in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, Map, HCL, Resource Creation

Description: Learn how to use for_each with maps in OpenTofu to create named resources with stable identities, avoiding the index-shifting problems of count-based iteration.

## Introduction

`for_each` with a map creates one resource per map entry, identified by the map key rather than a numeric index. This gives resources stable identities - adding or removing entries only affects those specific resources, not the entire collection.

## Basic for_each with a Map

```hcl
variable "s3_buckets" {
  description = "Map of S3 bucket names to their configurations"
  type = map(object({
    versioning = bool
    public     = bool
    region     = string
  }))
  default = {
    "assets"  = { versioning = false, public = true,  region = "us-east-1" }
    "backups" = { versioning = true,  public = false, region = "us-east-1" }
    "logs"    = { versioning = false, public = false, region = "us-east-1" }
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.s3_buckets

  # each.key is the map key ("assets", "backups", "logs")
  bucket = "myapp-${each.key}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name   = each.key
    Public = each.value.public
  }
}

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = {
    # Only configure versioning for buckets that have it enabled
    for name, config in var.s3_buckets : name => config
    if config.versioning
  }

  bucket = aws_s3_bucket.buckets[each.key].id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Map of Objects for Complex Resources

```hcl
variable "environments" {
  type = map(object({
    vpc_cidr       = string
    instance_type  = string
    min_size       = number
    max_size       = number
    az_count       = number
  }))
  default = {
    "dev" = {
      vpc_cidr      = "10.10.0.0/16"
      instance_type = "t3.micro"
      min_size      = 1
      max_size      = 3
      az_count      = 2
    }
    "prod" = {
      vpc_cidr      = "10.0.0.0/16"
      instance_type = "m5.large"
      min_size      = 3
      max_size      = 15
      az_count      = 3
    }
  }
}

resource "aws_vpc" "envs" {
  for_each   = var.environments
  cidr_block = each.value.vpc_cidr

  tags = {
    Name        = "${each.key}-vpc"
    Environment = each.key
  }
}

resource "aws_autoscaling_group" "envs" {
  for_each = var.environments

  name     = "${each.key}-asg"
  min_size = each.value.min_size
  max_size = each.value.max_size

  vpc_zone_identifier = [
    for i in range(each.value.az_count) :
    aws_subnet.private["${each.key}-${i}"].id
  ]

  launch_template {
    id      = aws_launch_template.app[each.key].id
    version = "$Latest"
  }
}
```

## Accessing for_each Resources by Key

```hcl
# Reference a specific resource by its map key

output "prod_vpc_id" {
  value = aws_vpc.envs["prod"].id
}

# Collect all VPC IDs as a map
output "all_vpc_ids" {
  value = {
    for env, vpc in aws_vpc.envs : env => vpc.id
  }
}

# Collect a list of all VPC IDs
output "vpc_id_list" {
  value = values(aws_vpc.envs)[*].id
}
```

## Merging Maps from Multiple Sources

```hcl
variable "team_specific_buckets" {
  type    = map(object({ versioning = bool, public = bool }))
  default = {}
}

locals {
  # Standard buckets always created
  standard_buckets = {
    "shared-assets" = { versioning = false, public = true  }
    "audit-logs"    = { versioning = true,  public = false }
  }

  # Merge standard and team-specific buckets
  all_buckets = merge(local.standard_buckets, var.team_specific_buckets)
}

resource "aws_s3_bucket" "all" {
  for_each = local.all_buckets
  bucket   = "myapp-${each.key}"
}
```

## Conclusion

`for_each` with maps creates resources with stable string identities rather than numeric indices. Adding a new entry to the map creates only that new resource; removing one destroys only that resource. This makes map-based `for_each` the preferred approach whenever your resources have meaningful names or identifiers.
