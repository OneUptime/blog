# How to Replace Complex Dynamic Blocks with Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Modules, Refactoring, HCL, Infrastructure as Code

Description: Learn when and how to refactor complex dynamic blocks into Terraform modules for better maintainability, reusability, and testability.

---

Dynamic blocks are great for generating repeated nested configuration. But when they get too complex - deeply nested, full of conditional logic, spanning dozens of lines - they become a maintenance burden. At that point, it is often better to extract the logic into a module. This post covers when to make that switch and how to do it.

## Signs That a Dynamic Block Has Outgrown Itself

You should consider replacing a dynamic block with a module when:

- The `for_each` expression spans multiple lines of logic
- You have three or more levels of nested dynamic blocks
- The same dynamic block pattern appears in multiple places
- You need to test the generated configuration independently
- The content block has extensive conditional logic
- You find yourself adding debug outputs just to understand what the block generates

## Before - Complex Dynamic Blocks

Here is a realistic example of a resource that has gotten too complex:

```hcl
resource "aws_lb" "main" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  dynamic "access_logs" {
    for_each = var.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }

  dynamic "subnet_mapping" {
    for_each = var.subnet_mappings != null ? var.subnet_mappings : []
    content {
      subnet_id            = subnet_mapping.value.subnet_id
      allocation_id        = subnet_mapping.value.allocation_id
      private_ipv4_address = subnet_mapping.value.private_ipv4_address
    }
  }
}

resource "aws_lb_listener" "main" {
  for_each = var.listeners

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.port
  protocol          = each.value.protocol
  ssl_policy        = each.value.ssl_policy
  certificate_arn   = each.value.certificate_arn

  default_action {
    type             = each.value.default_action.type
    target_group_arn = each.value.default_action.type == "forward" ? aws_lb_target_group.main[each.value.default_action.target_group_key].arn : null

    dynamic "redirect" {
      for_each = each.value.default_action.redirect != null ? [each.value.default_action.redirect] : []
      content {
        port        = redirect.value.port
        protocol    = redirect.value.protocol
        status_code = redirect.value.status_code
      }
    }

    dynamic "fixed_response" {
      for_each = each.value.default_action.fixed_response != null ? [each.value.default_action.fixed_response] : []
      content {
        content_type = fixed_response.value.content_type
        message_body = fixed_response.value.message_body
        status_code  = fixed_response.value.status_code
      }
    }
  }
}

# ... plus target groups, listener rules, etc.
# This can easily reach 200+ lines in a single file
```

## After - Extracted into a Module

Create a module that encapsulates the ALB configuration:

```text
modules/
  alb/
    main.tf        # ALB, listeners, target groups
    variables.tf   # Input variables
    outputs.tf     # Output values
    versions.tf    # Provider requirements
```

The module's `variables.tf`:

```hcl
# modules/alb/variables.tf

variable "name" {
  description = "Name of the ALB"
  type        = string
}

variable "internal" {
  description = "Whether the ALB is internal"
  type        = bool
  default     = false
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "access_logs" {
  description = "Access log configuration"
  type = object({
    bucket = string
    prefix = string
  })
  default = null
}

variable "listeners" {
  description = "Listener configurations"
  type = map(object({
    port            = number
    protocol        = string
    ssl_policy      = optional(string)
    certificate_arn = optional(string)
    action_type     = string
    target_group_key = optional(string)
    redirect = optional(object({
      port        = string
      protocol    = string
      status_code = string
    }))
  }))
}

variable "target_groups" {
  description = "Target group configurations"
  type = map(object({
    port         = number
    protocol     = string
    target_type  = string
    health_check = object({
      path     = string
      port     = string
      protocol = string
      matcher  = string
    })
  }))
}
```

The module's `main.tf` contains the same resources with dynamic blocks, but they are isolated and self-contained:

```hcl
# modules/alb/main.tf

resource "aws_lb" "this" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  dynamic "access_logs" {
    for_each = var.access_logs != null ? [var.access_logs] : []
    content {
      bucket  = access_logs.value.bucket
      prefix  = access_logs.value.prefix
      enabled = true
    }
  }
}

resource "aws_lb_target_group" "this" {
  for_each = var.target_groups

  name        = "${var.name}-${each.key}"
  port        = each.value.port
  protocol    = each.value.protocol
  vpc_id      = var.vpc_id
  target_type = each.value.target_type

  health_check {
    path     = each.value.health_check.path
    port     = each.value.health_check.port
    protocol = each.value.health_check.protocol
    matcher  = each.value.health_check.matcher
  }
}

resource "aws_lb_listener" "this" {
  for_each = var.listeners

  load_balancer_arn = aws_lb.this.arn
  port              = each.value.port
  protocol          = each.value.protocol
  ssl_policy        = each.value.ssl_policy
  certificate_arn   = each.value.certificate_arn

  default_action {
    type             = each.value.action_type
    target_group_arn = each.value.action_type == "forward" ? aws_lb_target_group.this[each.value.target_group_key].arn : null

    dynamic "redirect" {
      for_each = each.value.redirect != null ? [each.value.redirect] : []
      content {
        port        = redirect.value.port
        protocol    = redirect.value.protocol
        status_code = redirect.value.status_code
      }
    }
  }
}
```

The module's outputs:

```hcl
# modules/alb/outputs.tf

output "alb_arn" {
  value = aws_lb.this.arn
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "target_group_arns" {
  value = { for k, v in aws_lb_target_group.this : k => v.arn }
}

output "listener_arns" {
  value = { for k, v in aws_lb_listener.this : k => v.arn }
}
```

## Using the Module

Now the calling code is clean and focused on what matters - the configuration data:

```hcl
module "api_alb" {
  source = "./modules/alb"

  name               = "api-alb"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  security_group_ids = [aws_security_group.alb.id]

  access_logs = {
    bucket = aws_s3_bucket.logs.id
    prefix = "api-alb"
  }

  listeners = {
    http = {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    https = {
      port             = 443
      protocol         = "HTTPS"
      ssl_policy       = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      certificate_arn  = aws_acm_certificate.api.arn
      action_type      = "forward"
      target_group_key = "api"
    }
  }

  target_groups = {
    api = {
      port        = 8080
      protocol    = "HTTP"
      target_type = "ip"
      health_check = {
        path     = "/health"
        port     = "8080"
        protocol = "HTTP"
        matcher  = "200"
      }
    }
  }
}
```

## When to Keep Dynamic Blocks Instead

Modules are not always the answer. Keep dynamic blocks inline when:

- The dynamic block is simple (one level, few attributes)
- The pattern is only used once
- The resource has tight dependencies on other resources in the same configuration
- Extracting to a module would require passing too many outputs back

## Module Design Patterns for Complex Resources

When designing modules that replace complex dynamic blocks, follow these patterns:

### Pattern 1 - One Module per Logical Group

Group related resources that are always created together:

```hcl
# Good: ALB + listeners + target groups in one module
module "alb" { ... }

# Good: VPC + subnets + route tables in one module
module "vpc" { ... }

# Bad: Everything in one giant module
module "infrastructure" { ... }
```

### Pattern 2 - Sensible Defaults

Reduce the variable surface area by providing defaults:

```hcl
variable "health_check" {
  type = object({
    path     = optional(string, "/health")
    port     = optional(string, "traffic-port")
    protocol = optional(string, "HTTP")
    matcher  = optional(string, "200")
    interval = optional(number, 30)
    timeout  = optional(number, 5)
  })
  default = {}  # All defaults kick in
}
```

### Pattern 3 - Output Everything Useful

Modules should expose enough outputs that calling code does not need to reach into module internals:

```hcl
output "alb_arn" { value = aws_lb.this.arn }
output "alb_dns_name" { value = aws_lb.this.dns_name }
output "alb_zone_id" { value = aws_lb.this.zone_id }
output "target_group_arns" { ... }
output "listener_arns" { ... }
output "security_group_id" { ... }
```

## Testing Modules

One advantage of modules over inline dynamic blocks is that modules can be tested independently:

```hcl
# test/alb_test.tf
module "test_alb" {
  source = "../modules/alb"

  name               = "test-alb"
  vpc_id             = "vpc-test"
  subnet_ids         = ["subnet-1", "subnet-2"]
  security_group_ids = ["sg-test"]

  listeners = {
    http = {
      port        = 80
      protocol    = "HTTP"
      action_type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  target_groups = {}
}
```

Run `terraform validate` on the test directory to check for structural errors.

## Summary

Replacing complex dynamic blocks with modules is a refactoring technique that improves maintainability. The dynamic blocks still exist inside the module, but they are isolated, tested, and reused cleanly. The calling code becomes a data-driven configuration that is easy to read and modify. The rule of thumb: if a dynamic block grows beyond what fits comfortably on one screen, consider extracting it into a module. For more on the building blocks that go into modules, see our guide on [the content block inside dynamic blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-content-block-inside-dynamic-blocks/view).
