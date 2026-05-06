# How to Create Conditional Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Conditional Resources, Count, for_each, Infrastructure as Code, HCL

Description: Learn how to create optional resources in OpenTofu using count and for_each - conditionally provisioning infrastructure based on variables, environment, or feature flags.

## Introduction

Conditional resources allow you to optionally create infrastructure based on input variables. OpenTofu doesn't have an `if` statement for resources. For single resources or modules in OpenTofu v1.11+, `lifecycle { enabled = ... }` is the cleanest option, while `count = 0` or `count = 1` and `for_each` with empty sets remain common patterns.

## Pattern 1: count = condition ? 1 : 0

A common pattern:

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

# Only created when enable_monitoring = true

resource "aws_cloudwatch_log_group" "app" {
  count             = var.enable_monitoring ? 1 : 0
  name              = "/app/${var.environment}/logs"
  retention_in_days = 30
}

# Reference with index [0]
output "log_group_name" {
  value = var.enable_monitoring ? aws_cloudwatch_log_group.app[0].name : null
}
```

## Pattern 2: count Based on Environment

```hcl
variable "environment" {
  type = string
}

# Only create WAF in production (cost savings in dev/staging)
resource "aws_wafv2_web_acl" "main" {
  count = var.environment == "prod" ? 1 : 0

  name  = "prod-web-acl"
  scope = "REGIONAL"

  default_action { allow {} }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WebACL"
    sampled_requests_enabled   = true
  }
}

# Conditionally attach WAF to ALB
resource "aws_wafv2_web_acl_association" "alb" {
  count = var.environment == "prod" ? 1 : 0

  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}
```

## Pattern 3: Optional Module Call

```hcl
variable "enable_bastion" {
  type    = bool
  default = false
}

module "bastion" {
  count  = var.enable_bastion ? 1 : 0
  source = "./modules/bastion"

  vpc_id    = aws_vpc.main.id
  subnet_id = aws_subnet.public.id
}

# Reference module outputs conditionally
output "bastion_ip" {
  value = var.enable_bastion ? module.bastion[0].public_ip : "N/A"
}
```

## Pattern 4: for_each with Optional Set

Use `toset()` with an empty or populated set:

```hcl
variable "extra_log_groups" {
  type    = list(string)
  default = []
  # Set to ["api", "worker"] to enable
}

# Creates one log group per name, or none if list is empty
resource "aws_cloudwatch_log_group" "extra" {
  for_each = toset(var.extra_log_groups)

  name              = "/app/${each.value}/logs"
  retention_in_days = 30
}
```

## Pattern 5: Conditional with Optional Object Variable

```hcl
variable "custom_domain" {
  type = object({
    domain_name = string
  })
  default = null   # null = no custom domain rule
}

resource "aws_lb_listener_rule" "custom_domain" {
  count        = var.custom_domain != null ? 1 : 0
  listener_arn = aws_lb_listener.https.arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    host_header {
      values = [var.custom_domain.domain_name]
    }
  }
}
```

## Referencing Conditional Resources Safely

```hcl
# Safe reference: use one() for count-based resources
output "log_group_arn" {
  # one() returns null if list is empty, the value if it has one element
  value = one(aws_cloudwatch_log_group.app[*].arn)
}

# Safe reference in locals
locals {
  # Use try() to safely access optional attributes
  waf_arn = try(aws_wafv2_web_acl.main[0].arn, null)
}

# In another resource's argument
resource "aws_lb" "main" {
  name = "app-lb"
  # ...
}

# Skip the association entirely when there is no WAF ARN
resource "aws_wafv2_web_acl_association" "alb" {
  count        = local.waf_arn != null ? 1 : 0
  resource_arn = aws_lb.main.arn
  web_acl_arn  = local.waf_arn
}
```

## Common Mistakes to Avoid

```hcl
# WRONG: Cannot use count and for_each on the same resource
resource "aws_instance" "bad" {
  count    = 2
  for_each = var.instances   # Error: cannot use both count and for_each
}

# WRONG: Cannot reference count resource without index
resource "aws_instance" "web" {
  count = 2
  ami   = data.aws_ami.latest.id
}
# This fails:
output "ip" { value = aws_instance.web.public_ip }
# This works:
output "ips" { value = aws_instance.web[*].public_ip }
```

## Conclusion

Conditional resources in OpenTofu use `lifecycle { enabled = ... }` for single-resource toggles on OpenTofu v1.11+, `count = condition ? 1 : 0` for simple indexed enable/disable patterns, `for_each = toset(list)` for variable-count resources, and `variable = null` with null checks for optional configuration. Use `one()` to safely reference optional resources in outputs, and `try()` to handle the case where a conditional resource doesn't exist. Avoid mixing `count` and `for_each` on the same resource.
