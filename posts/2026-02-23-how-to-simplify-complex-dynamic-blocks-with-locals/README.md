# How to Simplify Complex Dynamic Blocks with Locals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Local, HCL, Best Practices, Infrastructure as Code

Description: Learn how to use Terraform locals to pre-process data and simplify complex dynamic blocks, making your configurations more readable and maintainable.

---

Dynamic blocks can get complicated fast. When you have nested conditionals, data transformations, and filtering all inside a `for_each` expression, the code becomes hard to read and harder to debug. Terraform locals are the solution - they let you break complex logic into named intermediate steps.

## The Problem - Inline Complexity

Here is a dynamic block that has gotten out of hand:

```hcl
# This is hard to read and debug
resource "aws_security_group" "main" {
  name   = "complex"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = {
      for rule in flatten([
        for svc in var.services : [
          for port in svc.ports : {
            name     = "${svc.name}-${port}"
            port     = port
            protocol = svc.protocol
            cidrs    = svc.public ? ["0.0.0.0/0"] : var.internal_cidrs
          }
        ]
        if svc.enabled && contains(svc.environments, var.environment)
      ]) : rule.name => rule
    }
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
      description = ingress.value.name
    }
  }
}
```

That `for_each` expression is doing too much: filtering, flattening, transforming, and converting to a map all in one place. Let us fix that.

## Step 1 - Move the Logic to Locals

Break the expression into named steps:

```hcl
locals {
  # Step 1: Filter services by enabled status and environment
  active_services = [
    for svc in var.services : svc
    if svc.enabled && contains(svc.environments, var.environment)
  ]

  # Step 2: Expand each service into individual port rules
  expanded_rules = flatten([
    for svc in local.active_services : [
      for port in svc.ports : {
        name     = "${svc.name}-${port}"
        port     = port
        protocol = svc.protocol
        cidrs    = svc.public ? ["0.0.0.0/0"] : var.internal_cidrs
      }
    ]
  ])

  # Step 3: Convert to a map keyed by rule name
  ingress_rules = {
    for rule in local.expanded_rules : rule.name => rule
  }
}

resource "aws_security_group" "main" {
  name   = "complex"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = local.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
      description = ingress.value.name
    }
  }
}
```

Now each step is named, the resource block is clean, and you can debug each local independently.

## Step 2 - Add Debug Outputs

With the logic in locals, debugging is easy:

```hcl
# Temporary debug outputs - remove after verifying
output "debug_active_services" {
  value = local.active_services
}

output "debug_expanded_rules" {
  value = local.expanded_rules
}

output "debug_ingress_rules" {
  value = local.ingress_rules
}
```

Run `terraform plan` and check each step's output to find where things go wrong.

## Practical Example - Multi-Service ALB Rules

Here is a real-world scenario where locals simplify ALB listener rule configuration:

```hcl
variable "services" {
  description = "Services behind the ALB"
  type = map(object({
    host_header     = string
    target_port     = number
    health_check_path = string
    priority        = number
    stickiness      = optional(bool, false)
    auth_required   = optional(bool, false)
  }))
}

locals {
  # Build target group configurations from services
  target_groups = {
    for name, svc in var.services : name => {
      name     = "${var.project}-${name}"
      port     = svc.target_port
      protocol = "HTTP"
      health_check = {
        path     = svc.health_check_path
        port     = svc.target_port
        protocol = "HTTP"
        matcher  = "200-299"
      }
      stickiness = svc.stickiness ? {
        enabled  = true
        duration = 3600
        type     = "lb_cookie"
      } : null
    }
  }

  # Build listener rule configurations
  listener_rules = {
    for name, svc in var.services : name => {
      priority    = svc.priority
      host_header = svc.host_header
      target_group_key = name
      authenticate = svc.auth_required ? {
        type     = "cognito"
        pool_arn = var.cognito_pool_arn
        client_id = var.cognito_client_id
        domain   = var.cognito_domain
      } : null
    }
  }
}

# Target groups from local
resource "aws_lb_target_group" "services" {
  for_each = local.target_groups

  name        = each.value.name
  port        = each.value.port
  protocol    = each.value.protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path     = each.value.health_check.path
    port     = each.value.health_check.port
    protocol = each.value.health_check.protocol
    matcher  = each.value.health_check.matcher
  }

  # Optional stickiness
  dynamic "stickiness" {
    for_each = each.value.stickiness != null ? [each.value.stickiness] : []
    content {
      enabled  = stickiness.value.enabled
      duration = stickiness.value.duration
      type     = stickiness.value.type
    }
  }
}

# Listener rules from local
resource "aws_lb_listener_rule" "services" {
  for_each = local.listener_rules

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  # Optional authentication action
  dynamic "action" {
    for_each = each.value.authenticate != null ? [each.value.authenticate] : []
    content {
      type = "authenticate-cognito"
      authenticate_cognito {
        user_pool_arn       = action.value.pool_arn
        user_pool_client_id = action.value.client_id
        user_pool_domain    = action.value.domain
      }
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.value.target_group_key].arn
  }

  condition {
    host_header {
      values = [each.value.host_header]
    }
  }
}
```

## Merging Multiple Data Sources

Locals are perfect for combining data from different sources before passing to dynamic blocks:

```hcl
variable "base_tags" {
  type = map(string)
  default = {
    ManagedBy = "terraform"
    Team      = "platform"
  }
}

variable "environment_tags" {
  type    = map(string)
  default = {}
}

variable "custom_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Merge tags from all sources with a defined precedence
  all_tags = merge(
    var.base_tags,
    {
      Environment = var.environment
      Project     = var.project_name
    },
    var.environment_tags,
    var.custom_tags  # Custom tags win over everything
  )

  # Convert to the format ASG tags expect
  asg_tags = [
    for key, value in local.all_tags : {
      key                 = key
      value               = value
      propagate_at_launch = true
    }
  ]
}

resource "aws_autoscaling_group" "main" {
  # ... ASG config ...

  dynamic "tag" {
    for_each = local.asg_tags
    content {
      key                 = tag.value.key
      value               = tag.value.value
      propagate_at_launch = tag.value.propagate_at_launch
    }
  }
}
```

## Conditional Logic in Locals

Move conditional logic out of dynamic blocks and into locals:

```hcl
locals {
  # Decide which rules to apply based on environment
  security_rules = var.environment == "production" ? concat(
    local.base_rules,
    local.production_rules,
    local.compliance_rules
  ) : var.environment == "staging" ? concat(
    local.base_rules,
    local.staging_rules
  ) : local.base_rules  # Development gets base rules only

  # Pre-compute network configuration
  subnet_config = var.multi_az ? {
    for az in var.availability_zones : az => {
      cidr   = cidrsubnet(var.vpc_cidr, 8, index(var.availability_zones, az))
      az     = az
      public = true
    }
  } : {
    (var.availability_zones[0]) = {
      cidr   = cidrsubnet(var.vpc_cidr, 8, 0)
      az     = var.availability_zones[0]
      public = true
    }
  }
}
```

## Flattening Nested Structures

One of the most common uses of locals with dynamic blocks is flattening nested structures:

```hcl
variable "vpc_config" {
  type = object({
    subnets = map(object({
      cidr = string
      az   = string
      routes = list(object({
        cidr    = string
        gateway = string
      }))
    }))
  })
}

locals {
  # Flatten subnet routes for route table entries
  all_routes = flatten([
    for subnet_name, subnet in var.vpc_config.subnets : [
      for route in subnet.routes : {
        subnet_name = subnet_name
        route_cidr  = route.cidr
        gateway     = route.gateway
        key         = "${subnet_name}-${route.cidr}"
      }
    ]
  ])

  routes_map = {
    for route in local.all_routes : route.key => route
  }
}

resource "aws_route" "custom" {
  for_each = local.routes_map

  route_table_id         = aws_route_table.main[each.value.subnet_name].id
  destination_cidr_block = each.value.route_cidr
  gateway_id             = each.value.gateway == "igw" ? aws_internet_gateway.main.id : null
  nat_gateway_id         = each.value.gateway == "nat" ? aws_nat_gateway.main.id : null
}
```

## Guidelines for Using Locals with Dynamic Blocks

A few practical guidelines:

1. If a `for_each` expression is longer than one line, move it to a local.
2. Name locals after what they represent, not how they are computed. `ingress_rules` is better than `filtered_flattened_rules`.
3. Chain locals from simple to complex. Each local should do one transformation.
4. Keep debug outputs handy during development, but remove them before merging to main.
5. Comment complex locals to explain the "why," not the "what."

## Summary

Locals are the key to keeping dynamic blocks manageable. By breaking complex logic into named intermediate values, you make your configurations readable, debuggable, and maintainable. The pattern is always the same: raw data goes in, locals transform and filter it, and the dynamic block's `for_each` receives a clean collection. For more on avoiding pitfalls, see [common dynamic block mistakes in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-avoid-common-dynamic-block-mistakes-in-terraform/view).
