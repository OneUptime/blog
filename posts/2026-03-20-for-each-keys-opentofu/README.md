# How to Use for_each Keys in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, for_each, Each.key, Each.value, HCL, Infrastructure as Code

Description: Learn how to use for_each with maps and sets in OpenTofu - understanding each.key, each.value, and how key selection affects state stability and resource naming.

## Introduction

`for_each` creates one resource instance per element in a map or set. Each instance is identified by `each.key` (the map key or set value), making instances stable even when other elements are added or removed. This is generally preferred over `count` for production resources.

## for_each with a Set of Strings

```hcl
variable "environments" {
  type    = set(string)
  default = ["dev", "staging", "prod"]
}

resource "aws_s3_bucket" "env_config" {
  for_each = var.environments

  bucket = "myapp-config-${each.key}"   # each.key == each.value for sets

  tags = {
    Environment = each.key
  }
}

# State addresses:

# aws_s3_bucket.env_config["dev"]
# aws_s3_bucket.env_config["staging"]
# aws_s3_bucket.env_config["prod"]
```

## for_each with a Map

```hcl
variable "services" {
  type = map(object({
    instance_type = string
    count        = number
    environment  = string
  }))
  default = {
    web = { instance_type = "t3.small",  count = 2, environment = "prod" }
    api = { instance_type = "t3.medium", count = 3, environment = "prod" }
    db  = { instance_type = "t3.large",  count = 1, environment = "prod" }
  }
}

resource "aws_ecs_service" "services" {
  for_each = var.services

  name            = each.key                    # "web", "api", "db"
  desired_count   = each.value.count
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn

  tags = {
    Service     = each.key
    Environment = each.value.environment
    Size        = each.value.instance_type
  }
}

# Access a specific service
output "web_service_id" {
  value = aws_ecs_service.services["web"].id
}
```

## Choosing Good Keys

Key selection directly affects stability:

```hcl
# GOOD: Stable, meaningful keys
locals {
  subnets = {
    "us-east-1a-public"  = { cidr = "10.0.1.0/24", az = "us-east-1a", public = true }
    "us-east-1b-public"  = { cidr = "10.0.2.0/24", az = "us-east-1b", public = true }
    "us-east-1a-private" = { cidr = "10.0.10.0/24", az = "us-east-1a", public = false }
  }
}

resource "aws_subnet" "main" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  map_public_ip_on_launch = each.value.public

  tags = { Name = each.key }
}

# BAD: Index-based keys (unstable, no better than count)
# for_each = { "0" = subnet1, "1" = subnet2 }
```

## for_each with toset()

```hcl
# Convert a list to a set for for_each
variable "bucket_names" {
  type    = list(string)
  default = ["assets", "backups", "logs"]
}

resource "aws_s3_bucket" "buckets" {
  for_each = toset(var.bucket_names)
  bucket   = "mycompany-${each.key}-${var.environment}"
}
```

Note: `toset()` removes duplicates and loses ordering. If your source data contains duplicates or needs explicit instance identities, build a map with stable, unique keys instead of using a set.

## for_each with a for Expression

Build the map inline with a for expression:

```hcl
variable "users" {
  default = [
    { username = "alice", role = "admin" },
    { username = "bob",   role = "viewer" },
  ]
}

resource "aws_iam_user" "team" {
  # Convert list to map, keyed by username
  for_each = { for user in var.users : user.username => user }

  name = each.key  # each.key = username, each.value = full user object
  tags = { Role = each.value.role }
}
```

## Referencing for_each Resources

```hcl
# Get all IDs
output "all_bucket_arns" {
  value = { for k, v in aws_s3_bucket.buckets : k => v.arn }
  # {"assets" = "arn:...", "backups" = "arn:...", "logs" = "arn:..."}
}

# Get a specific instance
output "assets_bucket_arn" {
  value = aws_s3_bucket.buckets["assets"].arn
}

# Get all values as a list
output "bucket_arn_list" {
  value = values(aws_s3_bucket.buckets)[*].arn
}
```

## Removing an Instance

With `for_each`, removing a key only affects that one instance:

```hcl
# Before: services = { web = {...}, api = {...}, db = {...} }
# After:  services = { web = {...}, db = {...} }  # Remove "api"

# OpenTofu will:
# - Destroy aws_ecs_service.services["api"]
# - Leave aws_ecs_service.services["web"] and ["db"] unchanged

# With count: removing "api" from the middle would also affect "db"
# because its index shifts from 2 to 1
```

## Conclusion

`for_each` with maps and sets creates stable, named resource instances. Use `each.key` for the resource identifier (name, tags, IDs) and `each.value` for configuration. Choose meaningful, stable keys - the key becomes part of the state address, and changing keys means destroy-and-recreate. Use `toset()` for simple string lists, for-expressions to convert lists of objects to maps, and always prefer `for_each` over `count` when resources have meaningful names.
