# How to Use the setintersection Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Set Functions

Description: Learn how to use the setintersection function in Terraform to find common elements across multiple sets, with practical examples for network and access control.

---

When working with collections in Terraform, you sometimes need to find the common elements shared between two or more groups. The `setintersection` function computes the intersection of sets - it returns only the elements that appear in every input set. This is useful for finding shared permissions, common availability zones, overlapping CIDR blocks, and matching criteria across multiple data sources.

This guide covers how `setintersection` works, its relationship with other set functions, and practical use cases.

## What is the setintersection Function?

The `setintersection` function takes two or more sets and returns a new set containing only the elements that are present in all of the input sets.

```hcl
# Returns elements common to all input sets
setintersection(set1, set2, ...)
```

The result is always a set (unordered, no duplicates). If you need an ordered list, convert the result with `tolist`.

## Basic Usage in Terraform Console

```hcl
# Find common elements between two sets
> setintersection(["a", "b", "c"], ["b", "c", "d"])
toset(["b", "c"])

# No common elements
> setintersection(["a", "b"], ["c", "d"])
toset([])

# Three sets - element must be in ALL three
> setintersection(["a", "b", "c"], ["b", "c", "d"], ["c", "d", "e"])
toset(["c"])

# Identical sets return the same set
> setintersection(["a", "b", "c"], ["a", "b", "c"])
toset(["a", "b", "c"])

# Works with numbers
> setintersection([1, 2, 3, 4], [3, 4, 5, 6])
toset([3, 4])
```

Note that Terraform automatically converts lists to sets when passed to set functions.

## Finding Common Availability Zones

A practical use is finding availability zones that are available across multiple AWS accounts or regions.

```hcl
data "aws_availability_zones" "account_a" {
  provider = aws.account_a
  state    = "available"
}

data "aws_availability_zones" "account_b" {
  provider = aws.account_b
  state    = "available"
}

locals {
  # Find AZs available in both accounts
  common_azs = setintersection(
    toset(data.aws_availability_zones.account_a.names),
    toset(data.aws_availability_zones.account_b.names)
  )
}

output "shared_availability_zones" {
  value = local.common_azs
}

# Use common AZs for cross-account resources
resource "aws_subnet" "shared" {
  for_each = local.common_azs

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, index(tolist(local.common_azs), each.key))
  availability_zone = each.key

  tags = {
    Name = "shared-${each.key}"
  }
}
```

## Access Control - Shared Permissions

Find the permissions that a user has across multiple roles.

```hcl
variable "user_roles" {
  type = map(list(string))
  default = {
    admin = ["read", "write", "delete", "admin", "audit"]
    editor = ["read", "write", "delete"]
    viewer = ["read", "audit"]
  }
}

variable "user_assigned_roles" {
  type    = list(string)
  default = ["admin", "viewer"]
}

locals {
  # Get the permission sets for each assigned role
  role_permissions = [
    for role in var.user_assigned_roles :
    toset(var.user_roles[role])
  ]

  # Find permissions common to all assigned roles
  # (This represents the guaranteed minimum permissions)
  common_permissions = length(local.role_permissions) > 1 ? setintersection(
    local.role_permissions[0],
    local.role_permissions[1]
  ) : (length(local.role_permissions) > 0 ? local.role_permissions[0] : toset([]))
}

output "guaranteed_permissions" {
  value = local.common_permissions
  # toset(["audit", "read"]) - these are in both admin and viewer
}
```

## Validating Overlapping CIDR Ranges

Check which CIDR blocks appear in multiple security configurations.

```hcl
variable "firewall_rules" {
  type = map(list(string))
  default = {
    frontend = ["10.0.1.0/24", "10.0.2.0/24", "192.168.1.0/24"]
    backend  = ["10.0.2.0/24", "10.0.3.0/24", "192.168.1.0/24"]
    database = ["10.0.3.0/24", "192.168.1.0/24"]
  }
}

locals {
  # Find CIDRs that are allowed by ALL firewall rule sets
  universally_allowed = setintersection(
    toset(var.firewall_rules["frontend"]),
    toset(var.firewall_rules["backend"]),
    toset(var.firewall_rules["database"])
  )
  # toset(["192.168.1.0/24"]) - this CIDR is allowed everywhere

  # Find CIDRs shared between frontend and backend
  frontend_backend_shared = setintersection(
    toset(var.firewall_rules["frontend"]),
    toset(var.firewall_rules["backend"])
  )
  # toset(["10.0.2.0/24", "192.168.1.0/24"])
}
```

## Tag Compliance Checking

Verify which resources have all required tags by finding the intersection of actual tags with required tags.

```hcl
variable "required_tags" {
  type    = set(string)
  default = ["Environment", "Team", "CostCenter", "Project"]
}

variable "resource_tags" {
  type = map(string)
  default = {
    Environment = "production"
    Team        = "platform"
    Project     = "webapp"
    ManagedBy   = "terraform"
  }
}

locals {
  # Find which required tags are actually present
  present_required_tags = setintersection(
    var.required_tags,
    toset(keys(var.resource_tags))
  )

  # Check compliance
  missing_tags = setsubtract(var.required_tags, present_required_tags)
  is_compliant = length(local.missing_tags) == 0
}

output "tag_compliance" {
  value = {
    required = var.required_tags
    present  = local.present_required_tags
    missing  = local.missing_tags
    compliant = local.is_compliant
  }
}
```

For more on `setsubtract`, see [How to Use the setsubtract Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-setsubtract-function-in-terraform/view).

## The Set Function Family

Terraform provides three set operations that work together:

```hcl
locals {
  set_a = toset(["a", "b", "c"])
  set_b = toset(["b", "c", "d"])

  # Intersection: elements in BOTH sets
  both = setintersection(local.set_a, local.set_b)
  # toset(["b", "c"])

  # Product: all combinations of elements
  combinations = setproduct(local.set_a, local.set_b)
  # [["a","b"], ["a","c"], ["a","d"], ["b","b"], ...]

  # Subtraction: elements in A but not in B
  only_a = setsubtract(local.set_a, local.set_b)
  # toset(["a"])
}
```

## Combining setintersection with for Expressions

You can use `setintersection` inside `for` expressions for more complex filtering.

```hcl
variable "team_skills" {
  type = map(list(string))
  default = {
    alice = ["python", "terraform", "aws", "docker"]
    bob   = ["terraform", "aws", "kubernetes", "go"]
    carol = ["aws", "python", "docker", "ansible"]
    dave  = ["terraform", "aws", "python"]
  }
}

variable "required_skills" {
  type    = list(string)
  default = ["terraform", "aws"]
}

locals {
  # Find team members who have ALL required skills
  qualified_members = {
    for name, skills in var.team_skills :
    name => skills
    if length(setintersection(toset(skills), toset(var.required_skills))) == length(var.required_skills)
  }
}

output "qualified_team" {
  value = keys(local.qualified_members)
  # ["alice", "bob", "dave"]
}
```

## Converting Results to Lists

Since `setintersection` returns a set, you may need to convert to a list for index-based access or ordered output.

```hcl
locals {
  common_regions = setintersection(
    toset(["us-east-1", "us-west-2", "eu-west-1"]),
    toset(["us-west-2", "eu-west-1", "ap-southeast-1"])
  )

  # Convert to list for ordered access
  common_regions_list = tolist(local.common_regions)

  # Now you can use index-based access
  first_common_region = length(local.common_regions_list) > 0 ? local.common_regions_list[0] : null
}
```

## Edge Cases

- **Empty sets**: If any input set is empty, the result is always empty (nothing can be common to an empty set).
- **Single set**: Passing a single set returns that set unchanged.
- **Duplicate handling**: Since the inputs are sets, duplicates in the input lists are automatically removed.
- **Type consistency**: All elements must be of the same type.

```hcl
# Empty set makes result empty
> setintersection(["a", "b"], [])
toset([])

# Single set returns itself
> setintersection(["a", "b", "c"])
toset(["a", "b", "c"])
```

## Summary

The `setintersection` function finds elements common to all input sets, making it essential for overlap detection, compliance checking, and shared resource identification.

Key takeaways:

- `setintersection` returns elements present in ALL input sets
- Returns a set (unordered) - use `tolist` if you need ordering
- Lists are automatically converted to sets
- An empty input set always produces an empty result
- Works with any number of input sets (two or more)
- Part of the set function family alongside `setproduct` and `setsubtract`

Use `setintersection` whenever you need to find what multiple groups have in common.
