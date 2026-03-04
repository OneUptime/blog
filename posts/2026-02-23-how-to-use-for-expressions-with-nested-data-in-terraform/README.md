# How to Use For Expressions with Nested Data in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Expressions, Collections, Nested Data

Description: Learn how to use Terraform for expressions with nested data structures, including flatten patterns, nested iteration, and practical examples for complex infrastructure configurations.

---

Real infrastructure configurations rarely have flat data structures. You have VPCs with subnets, subnets with route tables, applications with multiple environments, and each environment with multiple services. When your data is nested, basic for expressions are not enough - you need nested iteration and the `flatten` function.

This post covers patterns for working with nested data in Terraform, from simple nested loops to the flatten pattern that shows up in almost every production Terraform codebase.

## The Problem with Nested Data

Consider this data structure for a multi-VPC deployment:

```hcl
variable "vpcs" {
  type = map(object({
    cidr    = string
    subnets = list(object({
      name = string
      cidr = string
      type = string  # "public" or "private"
    }))
  }))
  default = {
    production = {
      cidr = "10.0.0.0/16"
      subnets = [
        { name = "pub-1", cidr = "10.0.1.0/24", type = "public" },
        { name = "pub-2", cidr = "10.0.2.0/24", type = "public" },
        { name = "priv-1", cidr = "10.0.10.0/24", type = "private" },
        { name = "priv-2", cidr = "10.0.11.0/24", type = "private" },
      ]
    }
    staging = {
      cidr = "10.1.0.0/16"
      subnets = [
        { name = "pub-1", cidr = "10.1.1.0/24", type = "public" },
        { name = "priv-1", cidr = "10.1.10.0/24", type = "private" },
      ]
    }
  }
}
```

To create a subnet resource for each subnet across all VPCs, you need to flatten this nested structure. You cannot just use `for_each` on `var.vpcs` and then iterate over subnets inside the resource block - Terraform does not work that way.

## The Flatten Pattern

The standard pattern for handling nested data in Terraform is:

1. Use a nested for expression to produce a list of lists
2. Use `flatten()` to collapse it into a flat list
3. Convert to a map with unique keys for `for_each`

```hcl
locals {
  # Step 1 & 2: Flatten nested data into a list of objects
  all_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet in vpc.subnets : {
        vpc_name    = vpc_name
        vpc_cidr    = vpc.cidr
        subnet_name = subnet.name
        subnet_cidr = subnet.cidr
        subnet_type = subnet.type
      }
    ]
  ])
  # Result: [
  #   { vpc_name = "production", subnet_name = "pub-1", subnet_cidr = "10.0.1.0/24", ... },
  #   { vpc_name = "production", subnet_name = "pub-2", subnet_cidr = "10.0.2.0/24", ... },
  #   { vpc_name = "production", subnet_name = "priv-1", ... },
  #   { vpc_name = "production", subnet_name = "priv-2", ... },
  #   { vpc_name = "staging", subnet_name = "pub-1", ... },
  #   { vpc_name = "staging", subnet_name = "priv-1", ... },
  # ]

  # Step 3: Convert to a map with unique keys
  subnet_map = {
    for subnet in local.all_subnets :
    "${subnet.vpc_name}-${subnet.subnet_name}" => subnet
  }
}

# Now create resources with for_each
resource "aws_vpc" "this" {
  for_each = var.vpcs

  cidr_block = each.value.cidr

  tags = {
    Name = each.key
  }
}

resource "aws_subnet" "this" {
  for_each = local.subnet_map

  vpc_id     = aws_vpc.this[each.value.vpc_name].id
  cidr_block = each.value.subnet_cidr

  tags = {
    Name = "${each.value.vpc_name}-${each.value.subnet_name}"
    Type = each.value.subnet_type
  }
}
```

## Understanding flatten()

The `flatten` function takes a list of lists and merges them into a single flat list:

```hcl
locals {
  # Before flatten
  nested = [
    ["a", "b"],
    ["c"],
    ["d", "e", "f"]
  ]

  # After flatten
  flat = flatten(local.nested)
  # Result: ["a", "b", "c", "d", "e", "f"]

  # Flatten works recursively
  deeply_nested = [
    [["a", "b"], ["c"]],
    [["d"]]
  ]
  deep_flat = flatten(local.deeply_nested)
  # Result: ["a", "b", "c", "d"]
}
```

The nested for expression produces a list of lists (one list per outer iteration). `flatten` collapses them into a single list where every element is at the same level.

## Practical Examples

### Security Group Rules Across Multiple Groups

```hcl
variable "security_groups" {
  type = map(object({
    description = string
    rules = list(object({
      description = string
      port        = number
      protocol    = string
      cidr_blocks = list(string)
    }))
  }))
  default = {
    web = {
      description = "Web tier security group"
      rules = [
        {
          description = "HTTP"
          port        = 80
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        },
        {
          description = "HTTPS"
          port        = 443
          protocol    = "tcp"
          cidr_blocks = ["0.0.0.0/0"]
        },
      ]
    }
    api = {
      description = "API tier security group"
      rules = [
        {
          description = "API port"
          port        = 8080
          protocol    = "tcp"
          cidr_blocks = ["10.0.0.0/8"]
        },
      ]
    }
  }
}

locals {
  # Flatten all rules with their security group context
  all_rules = flatten([
    for sg_name, sg in var.security_groups : [
      for idx, rule in sg.rules : {
        sg_name     = sg_name
        rule_key    = "${sg_name}-${rule.port}-${rule.protocol}"
        description = rule.description
        port        = rule.port
        protocol    = rule.protocol
        cidr_blocks = rule.cidr_blocks
      }
    ]
  ])

  rule_map = { for rule in local.all_rules : rule.rule_key => rule }
}

resource "aws_security_group" "this" {
  for_each = var.security_groups

  name        = "${var.project}-${each.key}-sg"
  description = each.value.description
  vpc_id      = var.vpc_id
}

resource "aws_security_group_rule" "this" {
  for_each = local.rule_map

  type              = "ingress"
  description       = each.value.description
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = each.value.protocol
  cidr_blocks       = each.value.cidr_blocks
  security_group_id = aws_security_group.this[each.value.sg_name].id
}
```

### IAM Users with Multiple Policies

```hcl
variable "users" {
  type = map(object({
    groups   = list(string)
    policies = list(string)
  }))
  default = {
    alice = {
      groups   = ["developers", "devops"]
      policies = ["ReadOnlyAccess", "S3FullAccess"]
    }
    bob = {
      groups   = ["developers"]
      policies = ["ReadOnlyAccess"]
    }
    charlie = {
      groups   = ["devops", "admins"]
      policies = ["AdministratorAccess"]
    }
  }
}

locals {
  # Flatten user-group relationships
  user_groups = flatten([
    for user, config in var.users : [
      for group in config.groups : {
        user  = user
        group = group
      }
    ]
  ])

  user_group_map = {
    for ug in local.user_groups : "${ug.user}-${ug.group}" => ug
  }

  # Flatten user-policy relationships
  user_policies = flatten([
    for user, config in var.users : [
      for policy in config.policies : {
        user   = user
        policy = policy
      }
    ]
  ])

  user_policy_map = {
    for up in local.user_policies : "${up.user}-${up.policy}" => up
  }
}

resource "aws_iam_user" "this" {
  for_each = var.users
  name     = each.key
}

resource "aws_iam_user_group_membership" "this" {
  for_each = var.users

  user   = aws_iam_user.this[each.key].name
  groups = each.value.groups
}

resource "aws_iam_user_policy_attachment" "this" {
  for_each = local.user_policy_map

  user       = aws_iam_user.this[each.value.user].name
  policy_arn = "arn:aws:iam::policy/${each.value.policy}"
}
```

### Multi-Environment, Multi-Service Deployment

```hcl
variable "environments" {
  type = map(object({
    region = string
    services = map(object({
      image     = string
      port      = number
      replicas  = number
      env_vars  = map(string)
    }))
  }))
  default = {
    staging = {
      region = "us-east-1"
      services = {
        api = {
          image    = "myapp/api"
          port     = 8080
          replicas = 1
          env_vars = { LOG_LEVEL = "debug" }
        }
        web = {
          image    = "myapp/web"
          port     = 3000
          replicas = 1
          env_vars = { LOG_LEVEL = "debug" }
        }
      }
    }
    production = {
      region = "us-east-1"
      services = {
        api = {
          image    = "myapp/api"
          port     = 8080
          replicas = 3
          env_vars = { LOG_LEVEL = "warn" }
        }
        web = {
          image    = "myapp/web"
          port     = 3000
          replicas = 3
          env_vars = { LOG_LEVEL = "info" }
        }
        worker = {
          image    = "myapp/worker"
          port     = 9090
          replicas = 2
          env_vars = { LOG_LEVEL = "info" }
        }
      }
    }
  }
}

locals {
  # Flatten to get every environment-service combination
  all_services = flatten([
    for env_name, env in var.environments : [
      for svc_name, svc in env.services : {
        env_name  = env_name
        region    = env.region
        svc_name  = svc_name
        image     = svc.image
        port      = svc.port
        replicas  = svc.replicas
        env_vars  = svc.env_vars
      }
    ]
  ])

  service_map = {
    for svc in local.all_services :
    "${svc.env_name}-${svc.svc_name}" => svc
  }
}

# Now each service across all environments gets its own resource
output "service_deployments" {
  value = {
    for key, svc in local.service_map :
    key => {
      image    = "${svc.image}:${svc.env_name}"
      port     = svc.port
      replicas = svc.replicas
    }
  }
}
```

## Three Levels of Nesting

Sometimes you have three levels deep. The pattern extends naturally:

```hcl
variable "regions" {
  type = map(object({
    vpcs = map(object({
      cidr    = string
      subnets = list(object({
        name = string
        cidr = string
      }))
    }))
  }))
}

locals {
  # Three levels of nesting
  all_subnets = flatten([
    for region_name, region in var.regions : [
      for vpc_name, vpc in region.vpcs : [
        for subnet in vpc.subnets : {
          region  = region_name
          vpc     = vpc_name
          name    = subnet.name
          cidr    = subnet.cidr
          key     = "${region_name}-${vpc_name}-${subnet.name}"
        }
      ]
    ]
  ])

  subnet_map = { for s in local.all_subnets : s.key => s }
}
```

## Filtering Nested Data

Combine flatten with filtering:

```hcl
locals {
  # Get only public subnets from all VPCs
  public_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet in vpc.subnets : {
        vpc_name    = vpc_name
        subnet_name = subnet.name
        subnet_cidr = subnet.cidr
      }
      if subnet.type == "public"  # Filter at the inner level
    ]
  ])

  # Get subnets only from production VPCs
  prod_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet in vpc.subnets : {
        vpc_name    = vpc_name
        subnet_name = subnet.name
        subnet_cidr = subnet.cidr
      }
    ]
    if vpc_name == "production"  # Filter at the outer level
  ])

  # Combine both filters
  prod_public_subnets = flatten([
    for vpc_name, vpc in var.vpcs : [
      for subnet in vpc.subnets : {
        vpc_name    = vpc_name
        subnet_name = subnet.name
        subnet_cidr = subnet.cidr
      }
      if subnet.type == "public"
    ]
    if vpc_name == "production"
  ])
}
```

## The setproduct Alternative

For Cartesian products (every combination of two sets), use `setproduct` instead of nested for expressions:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "production"]
}

variable "services" {
  type    = list(string)
  default = ["api", "web", "worker"]
}

locals {
  # All environment-service combinations
  # Using setproduct (simpler for Cartesian products)
  combinations = [
    for pair in setproduct(var.environments, var.services) : {
      environment = pair[0]
      service     = pair[1]
    }
  ]
  # Result: 9 combinations (3 envs * 3 services)

  # Equivalent with nested for (more verbose)
  combinations_alt = flatten([
    for env in var.environments : [
      for svc in var.services : {
        environment = env
        service     = svc
      }
    ]
  ])
}
```

`setproduct` is cleaner when you want every possible combination. Use nested for expressions when you want to iterate over nested data that already has a parent-child relationship.

## Key Design Principles

1. **Always include parent context** in flattened objects. Each flattened item should carry enough information to trace back to its parent:

```hcl
# Good - includes vpc_name for reference
{ vpc_name = "prod", subnet_name = "pub-1", subnet_cidr = "10.0.1.0/24" }

# Bad - loses the parent context
{ subnet_name = "pub-1", subnet_cidr = "10.0.1.0/24" }
```

2. **Generate unique keys** from the combination of parent and child identifiers:

```hcl
# Good - unique across all VPCs
"${vpc_name}-${subnet_name}"

# Bad - might collide across VPCs
"${subnet_name}"
```

3. **Filter at the appropriate nesting level** to keep things clear:

```hcl
# Filter on outer: skip entire VPCs
if vpc_name == "production"

# Filter on inner: skip specific subnets
if subnet.type == "public"
```

## Summary

Working with nested data in Terraform follows a consistent pattern: use nested for expressions inside `flatten()` to produce a flat list, then convert that flat list into a map for use with `for_each`. Always include parent context in your flattened objects and generate unique composite keys. This pattern handles two, three, or more levels of nesting and can be combined with filtering at any level. For simple Cartesian products, `setproduct` is a cleaner alternative to nested for expressions.
