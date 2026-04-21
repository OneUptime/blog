# How to Transpose Data Tables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Function, Data Transformation, Transpose

Description: Learn how to use OpenTofu's transpose function to flip rows and columns in map-of-lists structures, enabling flexible data restructuring for infrastructure configurations.

## Introduction

The `transpose` function in OpenTofu inverts a map of lists - turning rows into columns and columns into rows. This is powerful when your data is organized one way but you need to query it another way.

## Understanding transpose

`transpose` takes a `map(list(string))` and returns a new `map(list(string))` where the keys and values are swapped.

```hcl
locals {
  # Original: role -> list of users
  role_assignments = {
    "admin"   = ["alice", "bob"]
    "reader"  = ["alice", "carol", "dave"]
    "writer"  = ["bob", "carol"]
  }

  # Transposed: user -> list of roles
  user_roles = transpose(local.role_assignments)
  # Result:
  # {
  #   "alice" = ["admin", "reader"]
  #   "bob"   = ["admin", "writer"]
  #   "carol" = ["reader", "writer"]
  #   "dave"  = ["reader"]
  # }
}
```

## Practical Example: Region-to-Service Mapping

You might define which services are enabled per region, but need to query which regions a service is deployed in.

```hcl
locals {
  # Define enabled services per region
  region_services = {
    "us-east-1"    = ["api", "worker", "scheduler"]
    "eu-west-1"    = ["api", "worker"]
    "ap-southeast-1" = ["api"]
  }

  # Transpose to get regions per service
  service_regions = transpose(local.region_services)
  # {
  #   "api"       = ["ap-southeast-1", "eu-west-1", "us-east-1"]
  #   "worker"    = ["eu-west-1", "us-east-1"]
  #   "scheduler" = ["us-east-1"]
  # }
}

# Create Route53 health checks for each service in each of its regions

resource "aws_route53_health_check" "service" {
  for_each = {
    for pair in flatten([
      for service, regions in local.service_regions : [
        for region in regions : {
          key     = "${service}-${region}"
          service = service
          region  = region
        }
      ]
    ]) : pair.key => pair
  }

  fqdn              = "${each.value.service}.${each.value.region}.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}
```

## Transposing Team-to-Account Permissions

When managing AWS account access, transpose helps pivot between team-centric and account-centric views.

```hcl
locals {
  # Team -> accounts they can access
  team_accounts = {
    "platform"  = ["prod", "staging", "dev", "tools"]
    "backend"   = ["staging", "dev"]
    "frontend"  = ["dev"]
    "security"  = ["prod", "staging", "dev", "tools", "audit"]
  }

  # Transpose: account -> teams that have access
  account_teams = transpose(local.team_accounts)
}

output "prod_account_teams" {
  description = "Teams that have access to the prod account"
  value       = local.account_teams["prod"]
}
```

## Building IAM Policies from Transposed Data

Use transposed data to construct IAM policies that can be attached to grant users access to their appropriate resources.

```hcl
locals {
  # S3 bucket -> list of IAM users with access
  bucket_users = {
    "data-lake-raw"       = ["etl-service", "data-analyst"]
    "data-lake-processed" = ["data-analyst", "ml-pipeline"]
    "ml-models"           = ["ml-pipeline", "inference-service"]
  }

  # Transposed: user -> buckets they can access
  user_buckets = transpose(local.bucket_users)
}

# Create an IAM policy for each user that can be attached to grant bucket access
resource "aws_iam_policy" "user_s3_access" {
  for_each = local.user_buckets

  name = "s3-access-${each.key}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [
          for bucket in each.value : "arn:aws:s3:::${bucket}"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = [
          for bucket in each.value : "arn:aws:s3:::${bucket}/*"
        ]
      }
    ]
  })
}
```

## Conclusion

The `transpose` function is most useful when your configuration data is naturally organized around one entity (e.g., regions, roles, services) but you need to query it from the perspective of another entity. It eliminates the need for complex nested `for` expressions in many cases, making configurations cleaner and more maintainable.
