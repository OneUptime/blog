# How to Use Set Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Set, Collection, Infrastructure as Code, DevOps

Description: A guide to using set type variables in OpenTofu for unique, unordered collections of values.

## Introduction

Set variables hold unique, unordered collections of values of the same type. Unlike lists, sets do not allow duplicate values and have no guaranteed order. Sets of strings are particularly useful with `for_each` for creating resources where each item needs a stable, unique identifier.

## Declaring Set Variables

```hcl
# Set of strings

variable "allowed_instance_types" {
  type = set(string)
}

# Set with default
variable "availability_zones" {
  type    = set(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Set with validation
variable "environments" {
  type        = set(string)
  description = "Set of deployment environments"
  default     = ["dev", "staging", "prod"]

  validation {
    condition     = length(var.environments) >= 1
    error_message = "At least one environment is required."
  }
}
```

## Using Sets with for_each

```hcl
variable "allowed_instance_types" {
  type = set(string)
  default = ["t3.micro", "t3.small", "t3.medium"]
}

# for_each works naturally with sets of strings
# Each element becomes a unique resource key
resource "aws_iam_policy" "instance_policy" {
  for_each = var.allowed_instance_types

  name        = "allow-${each.value}"
  description = "Policy allowing ${each.value} instances"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "ec2:RunInstances"
      Resource = "*"
      Condition = {
        StringEquals = {
          "ec2:InstanceType" = each.value
        }
      }
    }]
  })
}
```

## Set vs List Comparison

```hcl
locals {
  # Lists can have duplicates and are ordered
  my_list = ["a", "b", "a", "c"]  # ["a", "b", "a", "c"]

  # Sets remove duplicates and are unordered
  my_set = toset(["a", "b", "a", "c"])  # {"a", "b", "c"}

  # Converting list to set removes duplicates
  unique_azs = toset(var.az_list)

  # Converting set to list makes it orderable
  sorted_azs = sort(tolist(var.az_set))
}
```

## Set Functions

```hcl
variable "team_members" {
  type    = set(string)
  default = ["alice", "bob", "charlie"]
}

locals {
  # Length of set
  team_size = length(var.team_members)  # 3

  # Check membership
  has_alice = contains(var.team_members, "alice")  # true

  # Set operations (using built-in functions)
  # Intersection-like
  active_members    = toset(["alice", "bob", "dave"])
  team_set          = var.team_members
  common_members    = setintersection(active_members, team_set)

  # Subtraction-like
  inactive_in_team  = setsubtract(team_set, active_members)

  # Union
  all_people        = setunion(team_set, active_members)
}
```

## Security Group Rules with Sets

```hcl
variable "allowed_ports" {
  type        = set(number)
  description = "Set of ports to allow inbound traffic"
  default     = [80, 443, 8080]
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "inbound" {
  for_each = { for port in var.allowed_ports : tostring(port) => port }

  security_group_id = aws_security_group.app.id
  from_port         = each.value
  to_port           = each.value
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}
```

## Conclusion

Set variables are ideal for collections that need uniqueness guarantees and will be used to build `for_each` collections. Unlike lists, string sets or maps derived from sets provide stable keys for resource addressing, making state management more predictable when items are added or removed. Use sets when order doesn't matter and uniqueness is important, such as for port numbers, environment names, or unique identifiers.
