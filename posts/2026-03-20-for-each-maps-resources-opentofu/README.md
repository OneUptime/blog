# How to Use for_each with Maps to Create Resources in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, for_each, Map, Infrastructure as Code, DevOps

Description: A guide to using for_each with map values in OpenTofu to create multiple uniquely-named resources.

## Introduction

`for_each` with a map creates one resource instance for each key-value pair in the map. Resources are addressed by their key, making state management more stable than `count` when items are added or removed from the middle of a collection.

## Basic for_each with Map

```hcl
# Create an S3 bucket for each environment

resource "aws_s3_bucket" "env_buckets" {
  for_each = {
    dev     = "myapp-dev-data"
    staging = "myapp-staging-data"
    prod    = "myapp-prod-data"
  }

  bucket = each.value  # The value is the bucket name; S3 bucket names must be globally unique
  # each.key = "dev", "staging", or "prod"
}

# State addresses:
# aws_s3_bucket.env_buckets["dev"]
# aws_s3_bucket.env_buckets["staging"]
# aws_s3_bucket.env_buckets["prod"]
```

## Accessing each.key and each.value

```hcl
variable "security_groups" {
  type = map(object({
    description = string
    port        = number
    cidr_block  = string
  }))
  default = {
    ssh = {
      description = "SSH access"
      port        = 22
      cidr_block  = "10.0.0.0/8"
    }
    http = {
      description = "HTTP access"
      port        = 80
      cidr_block  = "0.0.0.0/0"
    }
    https = {
      description = "HTTPS access"
      port        = 443
      cidr_block  = "0.0.0.0/0"
    }
  }
}

resource "aws_vpc_security_group_ingress_rule" "inbound" {
  for_each = var.security_groups

  security_group_id = aws_security_group.main.id
  description       = each.value.description  # From object value
  from_port         = each.value.port
  to_port           = each.value.port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value.cidr_block

  # The resource instance is addressed by each.key
}
```

## Environment-Specific Resources

```hcl
variable "environments" {
  type = map(object({
    instance_type = string
    count         = number
    region        = string
  }))
  default = {
    dev = {
      instance_type = "t3.micro"
      count         = 1
      region        = "us-east-1"
    }
    prod = {
      instance_type = "t3.large"
      count         = 3
      region        = "us-east-1"
    }
  }
}

resource "aws_autoscaling_group" "env" {
  for_each = var.environments

  name             = "asg-${each.key}"  # asg-dev, asg-prod
  region           = each.value.region
  min_size         = each.value.count
  max_size         = each.value.count * 2
  desired_capacity = each.value.count

  # launch_template { ... }
  # availability_zones = ["us-east-1a"]
}
```

## Dynamic Map Construction with for Expression

```hcl
variable "app_names" {
  type    = list(string)
  default = ["api", "worker", "scheduler"]
}

locals {
  # Build a map from a list
  app_buckets = {
    for name in var.app_names :
    name => "${var.project_name}-${name}-${var.environment}"
  }
  # Result: {"api": "myapp-api-prod", "worker": "myapp-worker-prod", ...}
}

resource "aws_s3_bucket" "app" {
  for_each = local.app_buckets

  bucket = each.value
  tags = {
    App         = each.key
    Environment = var.environment
  }
}
```

## Referencing for_each Resources

```hcl
resource "aws_s3_bucket" "app" {
  for_each = local.app_buckets
  bucket   = each.value
}

# Access specific bucket
output "api_bucket_arn" {
  value = aws_s3_bucket.app["api"].arn
}

# Get all buckets as a map
output "all_bucket_arns" {
  value = { for k, v in aws_s3_bucket.app : k => v.arn }
}

# Get all bucket ARNs as a list
output "bucket_arns_list" {
  value = values(aws_s3_bucket.app)[*].arn
}
```

## Filtering with for Expression

```hcl
variable "users" {
  type = map(object({
    email   = string
    role    = string
    active  = bool
  }))
}

locals {
  # Only create resources for active users
  active_users = {
    for name, user in var.users :
    name => user
    if user.active
  }
}

resource "aws_iam_user" "active" {
  for_each = local.active_users

  name = each.key
  tags = {
    Email = each.value.email
    Role  = each.value.role
  }
}
```

## Conclusion

`for_each` with maps is the most powerful way to create groups of related resources in OpenTofu. The map key becomes the resource's stable identity in state, so adding or removing resources from the map only affects those specific resources (unlike `count` where changing the list length can cause cascading state changes). Use maps for resources with natural names or identifiers, and use descriptive keys that will be meaningful in `tofu state list` output.
