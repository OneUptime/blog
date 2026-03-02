# How to Use setintersection to Find Common Elements in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection, set

Description: Learn how to use the setintersection function in Terraform to find common elements between sets for permission management, tag validation, and resource filtering.

---

Finding what two or more groups have in common is a fundamental operation in infrastructure management. Which permissions do both teams share? Which subnets exist in both environments? Which tags are applied to all resources? The `setintersection` function answers these questions by returning only the elements that appear in every input set.

## What is setintersection?

The `setintersection` function takes two or more sets and returns a new set containing only the elements that are present in all of them.

```hcl
# Find common elements between two sets
> setintersection(["a", "b", "c"], ["b", "c", "d"])
toset([
  "b",
  "c",
])
```

Only `"b"` and `"c"` appear in both sets, so those are the only elements in the result.

The syntax:

```hcl
setintersection(set1, set2, ...)
```

## Multiple Sets

When you pass more than two sets, an element must appear in all of them to be included:

```hcl
> setintersection(["a", "b", "c"], ["b", "c", "d"], ["c", "d", "e"])
toset([
  "c",
])
```

Only `"c"` appears in all three sets.

## Practical Example: Shared Permissions

Find which permissions are common across teams:

```hcl
variable "team_permissions" {
  type = map(set(string))
  default = {
    frontend = toset(["read", "write", "deploy-frontend"])
    backend  = toset(["read", "write", "deploy-backend", "database-access"])
    devops   = toset(["read", "write", "deploy-frontend", "deploy-backend", "admin"])
  }
}

locals {
  # Permissions shared by ALL teams
  universal_permissions = setintersection(
    var.team_permissions["frontend"],
    var.team_permissions["backend"],
    var.team_permissions["devops"]
  )
  # Result: toset(["read", "write"])

  # Permissions shared between frontend and devops
  frontend_devops_shared = setintersection(
    var.team_permissions["frontend"],
    var.team_permissions["devops"]
  )
  # Result: toset(["deploy-frontend", "read", "write"])
}
```

## Finding Common Availability Zones

When deploying across multiple regions, you might need to find shared AZ patterns:

```hcl
data "aws_availability_zones" "region_a" {
  provider = aws.us_east_1
  state    = "available"
}

data "aws_availability_zones" "region_b" {
  provider = aws.us_west_2
  state    = "available"
}

locals {
  # Extract just the AZ suffixes (a, b, c, etc.)
  region_a_suffixes = toset([
    for az in data.aws_availability_zones.region_a.names :
    replace(az, data.aws_availability_zones.region_a.names[0], "")
  ])

  region_b_suffixes = toset([
    for az in data.aws_availability_zones.region_b.names :
    replace(az, data.aws_availability_zones.region_b.names[0], "")
  ])
}
```

## Validating Required Tags

Check that resources have all required tags:

```hcl
variable "required_tags" {
  type    = set(string)
  default = ["Environment", "Team", "Project", "ManagedBy"]
}

variable "resource_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
    Project     = "myapp"
    ManagedBy   = "terraform"
    CostCenter  = "12345"
  }
}

locals {
  # Check which required tags are present
  present_required_tags = setintersection(
    var.required_tags,
    toset(keys(var.resource_tags))
  )

  # Verify all required tags are present
  all_required_present = length(local.present_required_tags) == length(var.required_tags)

  # Find missing required tags
  missing_tags = setsubtract(var.required_tags, toset(keys(var.resource_tags)))
}

output "tag_validation" {
  value = {
    all_present  = local.all_required_present
    missing_tags = local.missing_tags
  }
}
```

## Finding Common CIDR Blocks

Identify overlapping network ranges across environments:

```hcl
variable "prod_allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

variable "staging_allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

variable "dev_allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "192.168.1.0/24"]
}

locals {
  # CIDRs allowed in ALL environments
  universal_cidrs = setintersection(
    var.prod_allowed_cidrs,
    var.staging_allowed_cidrs,
    var.dev_allowed_cidrs
  )
  # Result: toset(["10.0.0.0/8"])

  # CIDRs shared between prod and staging
  prod_staging_cidrs = setintersection(
    var.prod_allowed_cidrs,
    var.staging_allowed_cidrs
  )
  # Result: toset(["10.0.0.0/8", "172.16.0.0/12"])
}
```

## Service Discovery: Common Dependencies

Find services that are dependencies of multiple applications:

```hcl
variable "app_dependencies" {
  type = map(set(string))
  default = {
    web_app = toset(["redis", "postgres", "elasticsearch", "s3"])
    api_app = toset(["redis", "postgres", "sqs", "s3"])
    worker  = toset(["redis", "postgres", "sqs"])
  }
}

locals {
  # Services needed by ALL apps - these are critical dependencies
  critical_services = setintersection(
    var.app_dependencies["web_app"],
    var.app_dependencies["api_app"],
    var.app_dependencies["worker"]
  )
  # Result: toset(["postgres", "redis"])
}

# Create monitoring for critical shared services
resource "aws_cloudwatch_metric_alarm" "critical_service" {
  for_each = local.critical_services

  alarm_name          = "${each.value}-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "Custom/Services"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Critical service ${each.value} is unhealthy - affects all applications"
}
```

## Combining setintersection with Other Set Functions

Build complex logic by chaining set operations:

```hcl
variable "user_roles" {
  type    = set(string)
  default = ["developer", "deployer"]
}

variable "required_for_deploy" {
  type    = set(string)
  default = ["deployer", "reviewer"]
}

variable "required_for_admin" {
  type    = set(string)
  default = ["admin", "super-admin"]
}

locals {
  # Check if user has deploy permissions
  has_deploy_role = length(setintersection(var.user_roles, var.required_for_deploy)) > 0
  # Result: true (user has "deployer")

  # Check if user has admin permissions
  has_admin_role = length(setintersection(var.user_roles, var.required_for_admin)) > 0
  # Result: false

  # Get the specific matching roles
  matching_deploy_roles = setintersection(var.user_roles, var.required_for_deploy)
  # Result: toset(["deployer"])
}
```

## setintersection with Dynamic Sets

Using `for` expressions to build sets before intersecting:

```hcl
variable "environments" {
  type = map(object({
    features = list(string)
  }))
  default = {
    dev = {
      features = ["feature-a", "feature-b", "feature-c"]
    }
    staging = {
      features = ["feature-b", "feature-c", "feature-d"]
    }
    production = {
      features = ["feature-c", "feature-d", "feature-e"]
    }
  }
}

locals {
  # Find features enabled in all environments
  universal_features = setintersection(
    [for env in values(var.environments) : toset(env.features)]...
  )
  # The ... expands the list into separate arguments
  # Result: toset(["feature-c"])
}
```

Note the `...` operator that expands a list into individual function arguments. This is very useful when you have a dynamic number of sets to intersect.

## Edge Cases

```hcl
# Intersection with empty set is always empty
> setintersection(["a", "b"], [])
toset([])

# Intersection of identical sets is the set itself
> setintersection(["a", "b"], ["a", "b"])
toset([
  "a",
  "b",
])

# No common elements
> setintersection(["a", "b"], ["c", "d"])
toset([])

# Single set - returns itself (as a set)
> setintersection(["a", "b", "a"])
toset([
  "a",
  "b",
])
```

## setintersection vs Manual Filtering

You could achieve similar results with `for` expressions, but `setintersection` is cleaner:

```hcl
# Using setintersection (clean)
locals {
  common = setintersection(local.set_a, local.set_b)
}

# Using for expression (verbose)
locals {
  common_v2 = toset([
    for item in local.set_a : item
    if contains(tolist(local.set_b), item)
  ])
}
```

## Summary

The `setintersection` function is your go-to for finding common elements across groups in Terraform. It is essential for permission validation, tag compliance checking, identifying shared dependencies, and any logic that requires knowing what multiple groups have in common. Remember that the result is always a set, and an element must appear in every input set to be included. For the opposite operation (combining all elements), see [setunion](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-setunion-function-in-terraform/view), and for finding elements unique to one set, use `setsubtract`.
