# How to Use Dynamic Blocks for Load Balancer Listeners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, Load Balancer, ALB, Dynamic Blocks, Networking

Description: Learn how to use dynamic blocks in OpenTofu to configure AWS Application Load Balancer listeners and rules from variable-driven definitions.

## Introduction

AWS Application Load Balancers (ALBs) support multiple listeners and complex routing rules. Rather than defining each listener and rule as a separate resource with hard-coded values, dynamic blocks and `for_each` let you manage them as structured data.

## Dynamic Listener Rules

```hcl
variable "listener_rules" {
  description = "Routing rules for the HTTPS listener"
  type = list(object({
    priority    = number
    path_prefix = string
    target_group_arn = string
  }))
  default = [
    { priority = 10, path_prefix = "/api/*",     target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/api/1234567890abcdef" },
    { priority = 20, path_prefix = "/admin/*",   target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/admin/1234567890abcdef" },
    { priority = 30, path_prefix = "/static/*",  target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/static/1234567890abcdef" }
  ]
}

resource "aws_lb_listener_rule" "app_rules" {
  for_each = {
    for rule in var.listener_rules : tostring(rule.priority) => rule
  }

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = each.value.target_group_arn
  }

  condition {
    path_pattern {
      values = [each.value.path_prefix]
    }
  }
}
```

## Multiple Target Groups with Dynamic Weighted Routing

```hcl
variable "weighted_targets" {
  description = "Weighted target groups for A/B deployment"
  type = list(object({
    target_group_arn = string
    weight           = number
  }))
  default = [
    { target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/stable/1234567890abcdef", weight = 90 },  # Stable version
    { target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/canary/1234567890abcdef", weight = 10 }   # Canary version
  ]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "forward"

    forward {
      # Dynamic block generates one target_group block per weighted target
      dynamic "target_group" {
        for_each = var.weighted_targets
        content {
          arn    = target_group.value.target_group_arn
          weight = target_group.value.weight
        }
      }

      stickiness {
        enabled  = true
        duration = 300
      }
    }
  }
}
```

## Managing Multiple Listeners Across Ports

```hcl
locals {
  # Define all listeners for the load balancer
  listener_configs = {
    "http" = {
      port            = 80
      protocol        = "HTTP"
      certificate_arn = null
      default_action = {
        type        = "redirect"
        redirect = {
          port        = "443"
          protocol    = "HTTPS"
          status_code = "HTTP_301"
        }
      }
    }
    "https" = {
      port            = 443
      protocol        = "HTTPS"
      certificate_arn = var.certificate_arn
      default_action = {
        type             = "forward"
        target_group_arn = aws_lb_target_group.app.arn
      }
    }
  }
}

resource "aws_lb_listener" "app" {
  for_each = local.listener_configs

  load_balancer_arn = aws_lb.app.arn
  port              = each.value.port
  protocol          = each.value.protocol
  certificate_arn   = each.value.certificate_arn

  dynamic "default_action" {
    for_each = each.value.default_action.type == "redirect" ? [each.value.default_action] : []
    content {
      type = "redirect"
      redirect {
        port        = default_action.value.redirect.port
        protocol    = default_action.value.redirect.protocol
        status_code = default_action.value.redirect.status_code
      }
    }
  }

  dynamic "default_action" {
    for_each = each.value.default_action.type == "forward" ? [each.value.default_action] : []
    content {
      type             = "forward"
      target_group_arn = default_action.value.target_group_arn
    }
  }
}
```

## Conclusion

Dynamic blocks for ALB listeners and rules enable clean management of complex routing configurations. The weighted routing pattern is especially useful for canary deployments, where you gradually shift traffic from old to new target groups by adjusting weight values in your variable without changing any HCL structure.
