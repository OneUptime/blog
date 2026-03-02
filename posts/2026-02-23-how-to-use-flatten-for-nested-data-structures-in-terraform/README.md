# How to Use flatten for Nested Data Structures in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collection

Description: Learn how to use the flatten function in Terraform to convert nested lists into flat lists for resource creation with for_each and count patterns.

---

Nested data structures are common in Terraform. You have lists of lists when working with subnet configurations across availability zones, nested module outputs, or any situation where you iterate over two dimensions. The `flatten` function collapses nested lists into a single flat list, which is essential for feeding data to `for_each` and `count`.

## What is the flatten Function?

The `flatten` function takes a list that may contain nested lists and returns a single flat list with all the nested elements at the top level.

```hcl
# Flatten a list of lists
> flatten([["a", "b"], ["c", "d"], ["e"]])
[
  "a",
  "b",
  "c",
  "d",
  "e",
]
```

It works recursively, collapsing any depth of nesting:

```hcl
# Deep nesting is fully flattened
> flatten([["a", ["b", "c"]], [["d"]], "e"])
[
  "a",
  "b",
  "c",
  "d",
  "e",
]
```

## The Classic Use Case: Cross-Product Resources

The number one reason to use `flatten` is creating resources from a cross-product of two dimensions. For example, creating subnets across multiple VPCs and availability zones:

```hcl
variable "vpcs" {
  type = map(object({
    cidr = string
    azs  = list(string)
  }))
  default = {
    main = {
      cidr = "10.0.0.0/16"
      azs  = ["us-east-1a", "us-east-1b"]
    }
    secondary = {
      cidr = "10.1.0.0/16"
      azs  = ["us-east-1a", "us-east-1c"]
    }
  }
}

locals {
  # Create a flat list of all VPC-AZ combinations
  vpc_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for az_index, az in vpc.azs : {
        key      = "${vpc_name}-${az}"
        vpc_name = vpc_name
        vpc_cidr = vpc.cidr
        az       = az
        cidr     = cidrsubnet(vpc.cidr, 8, az_index)
      }
    ]
  ])
  # Result: flat list of 4 objects (2 VPCs x 2 AZs each)
}

# Convert to a map for for_each
resource "aws_subnet" "all" {
  for_each = { for subnet in local.vpc_subnets : subnet.key => subnet }

  vpc_id            = aws_vpc.vpcs[each.value.vpc_name].id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = each.key
  }
}
```

Without `flatten`, you would have a list of lists - one inner list per VPC - which `for_each` cannot consume directly.

## Security Group Rules: Many-to-Many

Another classic scenario - creating security group rules from multiple ports and CIDR blocks:

```hcl
variable "ingress_rules" {
  type = list(object({
    ports       = list(number)
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      ports       = [80, 443]
      cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
      description = "Web traffic"
    },
    {
      ports       = [22]
      cidr_blocks = ["10.0.0.0/8"]
      description = "SSH access"
    }
  ]
}

locals {
  # Flatten into individual rules - one per port-CIDR combination
  sg_rules = flatten([
    for rule in var.ingress_rules : [
      for port in rule.ports : [
        for cidr in rule.cidr_blocks : {
          key         = "${port}-${replace(cidr, "/", "_")}"
          port        = port
          cidr        = cidr
          description = "${rule.description} - port ${port}"
        }
      ]
    ]
  ])
  # Result: 5 individual rules
  # (2 ports x 2 CIDRs) + (1 port x 1 CIDR) = 5
}

resource "aws_security_group_rule" "ingress" {
  for_each = { for rule in local.sg_rules : rule.key => rule }

  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = [each.value.cidr]
  security_group_id = aws_security_group.main.id
  description       = each.value.description
}
```

## IAM Role-Policy Attachments

Map multiple policies to multiple roles using flatten:

```hcl
variable "role_policies" {
  type = map(list(string))
  default = {
    admin = [
      "arn:aws:iam::policy/AdministratorAccess"
    ]
    developer = [
      "arn:aws:iam::policy/PowerUserAccess",
      "arn:aws:iam::policy/IAMReadOnlyAccess"
    ]
    viewer = [
      "arn:aws:iam::policy/ReadOnlyAccess"
    ]
  }
}

locals {
  # Flatten the role-policy mapping into individual attachments
  role_policy_attachments = flatten([
    for role, policies in var.role_policies : [
      for policy in policies : {
        key    = "${role}-${basename(policy)}"
        role   = role
        policy = policy
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "main" {
  for_each = { for att in local.role_policy_attachments : att.key => att }

  role       = aws_iam_role.roles[each.value.role].name
  policy_arn = each.value.policy
}
```

## Flattening Module Outputs

When multiple module instances each return a list, and you need all items together:

```hcl
module "vpc" {
  source   = "./modules/vpc"
  for_each = var.vpcs
  # ... configuration
}

locals {
  # Each module instance outputs a list of subnet IDs
  # Flatten to get all subnet IDs across all VPCs
  all_private_subnet_ids = flatten([
    for vpc_name, vpc_module in module.vpc : vpc_module.private_subnet_ids
  ])

  all_public_subnet_ids = flatten([
    for vpc_name, vpc_module in module.vpc : vpc_module.public_subnet_ids
  ])
}
```

## DNS Records from Multiple Zones and Records

```hcl
variable "dns_zones" {
  type = map(object({
    zone_id = string
    records = map(object({
      type  = string
      value = string
      ttl   = number
    }))
  }))
  default = {
    "example.com" = {
      zone_id = "Z123"
      records = {
        www  = { type = "CNAME", value = "lb.example.com", ttl = 300 }
        api  = { type = "CNAME", value = "api-lb.example.com", ttl = 300 }
      }
    }
    "example.org" = {
      zone_id = "Z456"
      records = {
        www = { type = "CNAME", value = "lb.example.org", ttl = 300 }
      }
    }
  }
}

locals {
  all_records = flatten([
    for zone_name, zone in var.dns_zones : [
      for record_name, record in zone.records : {
        key       = "${record_name}.${zone_name}"
        zone_id   = zone.zone_id
        name      = "${record_name}.${zone_name}"
        type      = record.type
        value     = record.value
        ttl       = record.ttl
      }
    ]
  ])
}

resource "aws_route53_record" "all" {
  for_each = { for record in local.all_records : record.key => record }

  zone_id = each.value.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = [each.value.value]
}
```

## flatten vs concat

People sometimes confuse these:

```hcl
# concat joins lists end-to-end (one level)
> concat(["a", "b"], ["c", "d"])
["a", "b", "c", "d"]

# concat does NOT flatten nested lists
> concat([["a", "b"]], [["c", "d"]])
[["a", "b"], ["c", "d"]]

# flatten removes ALL levels of nesting
> flatten([["a", "b"], ["c", "d"]])
["a", "b", "c", "d"]

> flatten([[["a"]], [["b", "c"]]])
["a", "b", "c"]
```

Use `concat` when joining two or more flat lists. Use `flatten` when you have nested lists that need to be collapsed.

## The flatten-for-for_each Pattern

The most important pattern to know:

```hcl
# Step 1: Use nested for expressions to generate the cross-product
# Step 2: Wrap in flatten to get a flat list
# Step 3: Convert to a map with a unique key for for_each

locals {
  items = flatten([
    for group_key, group in var.groups : [
      for item in group.items : {
        unique_key = "${group_key}-${item.name}"
        # ... all needed attributes
      }
    ]
  ])

  items_map = { for item in local.items : item.unique_key => item }
}

resource "some_resource" "example" {
  for_each = local.items_map
  # ...
}
```

This three-step pattern (nested for, flatten, convert to map) is the standard approach for creating resources from multi-dimensional data.

## Edge Cases

```hcl
# Empty nested lists are removed
> flatten([[], ["a"], []])
["a"]

# Non-list elements pass through
> flatten(["a", ["b", "c"], "d"])
["a", "b", "c", "d"]

# Empty input
> flatten([])
[]

# Already flat list
> flatten(["a", "b", "c"])
["a", "b", "c"]
```

## Summary

The `flatten` function is essential for working with multi-dimensional data in Terraform. The most important pattern is the nested-for-flatten-map pipeline, which lets you create resources from cross-products of two or more dimensions (VPCs and AZs, roles and policies, zones and records, etc.). Master this pattern and you can handle virtually any complex resource creation scenario. For related topics, see our posts on [chaining collection functions](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-collection-functions-in-terraform/view) and [data transformation pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-use-collection-functions-for-data-transformation-pipelines/view).
