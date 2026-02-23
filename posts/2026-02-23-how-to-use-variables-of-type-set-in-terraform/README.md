# How to Use Variables of Type Set in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Sets, HCL, Infrastructure as Code

Description: Learn how to declare and use set-type variables in Terraform for collections of unique values, including set operations, for_each integration, and practical examples.

---

A set in Terraform is an unordered collection of unique values. If you come from a programming background, it works exactly like a mathematical set - no duplicates, no guaranteed order. Sets are particularly useful with `for_each` and for situations where you need to ensure uniqueness in a collection of items.

This post covers how to declare set variables, how they differ from lists, the operations you can perform on them, and real-world patterns where sets are the right choice.

## Declaring Set Variables

A set variable is declared with `type = set(element_type)`:

```hcl
# variables.tf

# Set of strings
variable "allowed_ips" {
  description = "IP addresses allowed to access the application"
  type        = set(string)
  default     = ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
}

# Set of numbers
variable "open_ports" {
  description = "Ports to open in the security group"
  type        = set(number)
  default     = [80, 443, 8080]
}
```

Even though the syntax for providing values looks like a list (using square brackets), Terraform converts the values to a set internally. This means duplicates are automatically removed and ordering is not preserved.

## Sets vs Lists - What is the Difference?

The key differences between sets and lists:

| Feature | List | Set |
|---------|------|-----|
| Order | Ordered (preserved) | Unordered |
| Duplicates | Allowed | Automatically removed |
| Indexing | Yes (list[0]) | No |
| for_each | Needs toset() | Works directly |

```hcl
variable "list_example" {
  type    = list(string)
  default = ["a", "b", "a", "c"]
  # Stored as: ["a", "b", "a", "c"] - duplicates kept, order preserved
}

variable "set_example" {
  type    = set(string)
  default = ["a", "b", "a", "c"]
  # Stored as: {"a", "b", "c"} - duplicate "a" removed, order not guaranteed
}
```

## Using Sets with for_each

The primary reason to use sets in Terraform is that `for_each` works directly with sets of strings (and maps). You do not need the `toset()` conversion that lists require.

```hcl
variable "bucket_names" {
  description = "S3 buckets to create"
  type        = set(string)
  default     = ["logs", "assets", "backups", "archives"]
}

# for_each works directly with set(string) variables
resource "aws_s3_bucket" "buckets" {
  for_each = var.bucket_names

  bucket = "mycompany-${each.value}-${var.environment}"

  tags = {
    Name        = each.value
    Environment = var.environment
  }
}
```

With a list variable, you would need to convert it first:

```hcl
variable "bucket_names_list" {
  type    = list(string)
  default = ["logs", "assets", "backups"]
}

# List requires toset() conversion for for_each
resource "aws_s3_bucket" "buckets" {
  for_each = toset(var.bucket_names_list)
  bucket   = "mycompany-${each.value}-${var.environment}"
}
```

## Set Operations

Terraform provides functions for working with sets, including classic set theory operations.

### Union

Combine two sets, keeping all unique values:

```hcl
variable "team_a_ips" {
  type    = set(string)
  default = ["10.0.1.1", "10.0.1.2", "10.0.1.3"]
}

variable "team_b_ips" {
  type    = set(string)
  default = ["10.0.1.3", "10.0.1.4", "10.0.1.5"]
}

locals {
  # Union - all unique IPs from both teams
  all_ips = setunion(var.team_a_ips, var.team_b_ips)
  # Result: {"10.0.1.1", "10.0.1.2", "10.0.1.3", "10.0.1.4", "10.0.1.5"}
}
```

### Intersection

Find values that exist in both sets:

```hcl
locals {
  # Intersection - IPs shared between teams
  shared_ips = setintersection(var.team_a_ips, var.team_b_ips)
  # Result: {"10.0.1.3"}
}
```

### Subtraction (Difference)

Find values in one set but not another:

```hcl
locals {
  # Difference - IPs only in team A
  team_a_only = setsubtract(var.team_a_ips, var.team_b_ips)
  # Result: {"10.0.1.1", "10.0.1.2"}

  # IPs only in team B
  team_b_only = setsubtract(var.team_b_ips, var.team_a_ips)
  # Result: {"10.0.1.4", "10.0.1.5"}
}
```

### Product (Cartesian Product)

Generate all combinations of elements from two sets:

```hcl
variable "environments" {
  type    = set(string)
  default = ["dev", "staging", "prod"]
}

variable "services" {
  type    = set(string)
  default = ["api", "web", "worker"]
}

locals {
  # All environment-service combinations
  env_service_pairs = setproduct(var.environments, var.services)
  # Result: [["dev","api"], ["dev","web"], ["dev","worker"],
  #          ["staging","api"], ["staging","web"], ...]
}
```

## Converting Between Sets and Lists

```hcl
locals {
  # List to set (removes duplicates)
  my_set = toset(["a", "b", "a", "c"])
  # Result: {"a", "b", "c"}

  # Set to list (for functions that need a list)
  my_list = tolist(var.allowed_ips)

  # Note: tolist() on a set may produce elements in any order
}
```

## Practical Examples

### IP Allowlisting

```hcl
variable "admin_ips" {
  description = "IP addresses for admin access"
  type        = set(string)
  default     = []
}

variable "developer_ips" {
  description = "IP addresses for developer access"
  type        = set(string)
  default     = []
}

variable "monitoring_ips" {
  description = "IP addresses for monitoring tools"
  type        = set(string)
  default     = ["10.0.100.1", "10.0.100.2"]
}

locals {
  # Admins get access to everything
  admin_access_ips = var.admin_ips

  # Developers get their IPs plus monitoring IPs
  dev_access_ips = setunion(var.developer_ips, var.monitoring_ips)

  # All known IPs combined
  all_known_ips = setunion(var.admin_ips, var.developer_ips, var.monitoring_ips)
}

resource "aws_security_group_rule" "admin_ssh" {
  for_each = local.admin_access_ips

  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["${each.value}/32"]
  security_group_id = aws_security_group.admin.id
  description       = "SSH from admin IP ${each.value}"
}
```

### Creating IAM Users

```hcl
variable "engineering_team" {
  description = "Engineering team members"
  type        = set(string)
  default     = ["alice", "bob", "charlie"]
}

variable "ops_team" {
  description = "Ops team members"
  type        = set(string)
  default     = ["dave", "eve"]
}

locals {
  # Some people are on both teams
  all_users = setunion(var.engineering_team, var.ops_team)
}

resource "aws_iam_user" "users" {
  for_each = local.all_users
  name     = each.value
}

resource "aws_iam_group_membership" "engineering" {
  name  = "engineering-membership"
  group = aws_iam_group.engineering.name
  users = [for user in var.engineering_team : aws_iam_user.users[user].name]
}

resource "aws_iam_group_membership" "ops" {
  name  = "ops-membership"
  group = aws_iam_group.ops.name
  users = [for user in var.ops_team : aws_iam_user.users[user].name]
}
```

### Managing Availability Zones

```hcl
variable "compute_azs" {
  description = "AZs for compute resources"
  type        = set(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "database_azs" {
  description = "AZs for database resources"
  type        = set(string)
  default     = ["us-east-1a", "us-east-1c"]
}

locals {
  # We need subnets in all AZs used by any resource type
  all_azs = setunion(var.compute_azs, var.database_azs)
}

resource "aws_subnet" "main" {
  for_each = local.all_azs

  vpc_id            = aws_vpc.main.id
  availability_zone = each.value
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, index(tolist(local.all_azs), each.value))

  tags = {
    Name = "subnet-${each.value}"
  }
}
```

## Validation for Set Variables

```hcl
variable "allowed_regions" {
  description = "AWS regions to deploy to"
  type        = set(string)

  validation {
    condition = alltrue([
      for region in var.allowed_regions :
      can(regex("^(us|eu|ap)-(east|west|central|south|north|southeast|northeast)-[1-3]$", region))
    ])
    error_message = "All values must be valid AWS region names."
  }

  validation {
    condition     = length(var.allowed_regions) >= 1
    error_message = "At least one region must be specified."
  }
}
```

## When to Use Sets vs Lists

**Use a set when:**
- You need to guarantee uniqueness
- Order does not matter
- You want to use set operations (union, intersection, subtraction)
- You are feeding values directly to `for_each`

**Use a list when:**
- Order matters
- You need to access elements by index
- Duplicates are meaningful
- You need `count` with index-based access

## Wrapping Up

Set variables in Terraform enforce uniqueness and work naturally with `for_each`. The set operation functions - `setunion`, `setintersection`, `setsubtract`, and `setproduct` - let you combine and compare collections in clean, declarative ways. While lists are more common in everyday Terraform, sets are the right choice when you are dealing with collections where duplicates would be a bug and ordering is irrelevant.

For other collection types, see our posts on [list variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-list-in-terraform/view) and [map variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-map-in-terraform/view) in Terraform.
