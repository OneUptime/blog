# How to Use Dynamic Blocks for Load Balancer Listeners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, Load Balancer, ALB, Infrastructure as Code

Description: Learn how to configure AWS load balancer listeners and rules dynamically using Terraform dynamic blocks for flexible and reusable infrastructure.

---

When managing AWS Application Load Balancers (ALBs) or Network Load Balancers (NLBs) with Terraform, you often need multiple listeners, each with different configurations. Dynamic blocks let you define these listeners and their rules from variable data instead of hardcoding every block. This post shows you how.

## The Static Approach and Its Limitations

Without dynamic blocks, you might write something like this:

```hcl
# Listener for HTTP
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener for HTTPS
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

This works for two listeners, but if you need to manage many listeners across different environments with varying configurations, you end up with a lot of duplicated code.

## Defining Listeners with Dynamic Blocks

Let us restructure this using variables and dynamic blocks. First, we need a flexible variable structure:

```hcl
variable "listeners" {
  description = "Map of listener configurations"
  type = map(object({
    port            = number
    protocol        = string
    ssl_policy      = optional(string)
    certificate_arn = optional(string)
    default_action = object({
      type             = string
      target_group_key = optional(string)
      redirect = optional(object({
        port        = string
        protocol    = string
        status_code = string
      }))
      fixed_response = optional(object({
        content_type = string
        message_body = string
        status_code  = string
      }))
    })
  }))
}
```

Now create listeners using `for_each`:

```hcl
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

    # Conditional redirect block
    dynamic "redirect" {
      for_each = each.value.default_action.redirect != null ? [each.value.default_action.redirect] : []
      content {
        port        = redirect.value.port
        protocol    = redirect.value.protocol
        status_code = redirect.value.status_code
      }
    }

    # Conditional fixed response block
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
```

## The Variable Values

Here is what the variable looks like when populated:

```hcl
listeners = {
  http = {
    port     = 80
    protocol = "HTTP"
    default_action = {
      type = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
  https = {
    port            = 443
    protocol        = "HTTPS"
    ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
    certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
    default_action = {
      type             = "forward"
      target_group_key = "main"
    }
  }
}
```

## Dynamic Listener Rules

Listeners often have rules that route traffic based on conditions. These rules are a great fit for dynamic blocks:

```hcl
variable "listener_rules" {
  description = "Rules for the HTTPS listener"
  type = list(object({
    priority         = number
    target_group_key = string
    host_patterns    = optional(list(string))
    path_patterns    = optional(list(string))
    http_headers = optional(list(object({
      name   = string
      values = list(string)
    })))
  }))
  default = []
}

resource "aws_lb_listener_rule" "main" {
  for_each = { for idx, rule in var.listener_rules : idx => rule }

  listener_arn = aws_lb_listener.main["https"].arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main[each.value.target_group_key].arn
  }

  # Host-based routing condition
  dynamic "condition" {
    for_each = each.value.host_patterns != null ? [each.value.host_patterns] : []
    content {
      host_header {
        values = condition.value
      }
    }
  }

  # Path-based routing condition
  dynamic "condition" {
    for_each = each.value.path_patterns != null ? [each.value.path_patterns] : []
    content {
      path_pattern {
        values = condition.value
      }
    }
  }

  # Header-based routing conditions
  dynamic "condition" {
    for_each = each.value.http_headers != null ? each.value.http_headers : []
    content {
      http_header {
        http_header_name = condition.value.name
        values           = condition.value.values
      }
    }
  }
}
```

## Dynamic Blocks for Weighted Target Groups

When you need to split traffic across multiple target groups (for blue-green deployments or canary releases), dynamic blocks handle the forward action's target group stickiness and weights:

```hcl
variable "weighted_targets" {
  description = "Target groups with weights for traffic splitting"
  type = list(object({
    target_group_key = string
    weight           = number
  }))
  default = [
    { target_group_key = "blue", weight = 90 },
    { target_group_key = "green", weight = 10 }
  ]
}

resource "aws_lb_listener" "weighted" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "forward"

    forward {
      # Dynamic target groups with weights
      dynamic "target_group" {
        for_each = var.weighted_targets
        content {
          arn    = aws_lb_target_group.main[target_group.value.target_group_key].arn
          weight = target_group.value.weight
        }
      }

      stickiness {
        enabled  = true
        duration = 3600
      }
    }
  }
}
```

You can adjust the weights in your variables to gradually shift traffic from one target group to another.

## Dynamic Additional Certificates

HTTPS listeners can have multiple certificates for different domains. Use a dynamic block for the additional certificates:

```hcl
variable "additional_certificates" {
  description = "Additional SSL certificates for the HTTPS listener"
  type = list(object({
    certificate_arn = string
  }))
  default = []
}

resource "aws_lb_listener_certificate" "additional" {
  for_each = { for idx, cert in var.additional_certificates : idx => cert }

  listener_arn    = aws_lb_listener.main["https"].arn
  certificate_arn = each.value.certificate_arn
}
```

## Putting It All Together

Here is a complete module that uses dynamic blocks for a fully configurable ALB:

```hcl
# main.tf
resource "aws_lb" "main" {
  name               = var.name
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  # Dynamic access logs block
  dynamic "access_logs" {
    for_each = var.access_logs_bucket != null ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }

  tags = var.tags
}

# Target groups created from a map
resource "aws_lb_target_group" "main" {
  for_each = var.target_groups

  name        = each.value.name
  port        = each.value.port
  protocol    = each.value.protocol
  vpc_id      = var.vpc_id
  target_type = each.value.target_type

  # Dynamic health check configuration
  dynamic "health_check" {
    for_each = each.value.health_check != null ? [each.value.health_check] : []
    content {
      enabled             = true
      healthy_threshold   = health_check.value.healthy_threshold
      interval            = health_check.value.interval
      matcher             = health_check.value.matcher
      path                = health_check.value.path
      port                = health_check.value.port
      protocol            = health_check.value.protocol
      timeout             = health_check.value.timeout
      unhealthy_threshold = health_check.value.unhealthy_threshold
    }
  }
}
```

## Summary

Dynamic blocks make ALB configuration data-driven. Instead of writing separate listener, rule, and target group resources for every combination, you define the structure once and feed it different data per environment. The key patterns are: conditional nested blocks for action types (redirect vs forward vs fixed-response), dynamic condition blocks for listener rules, and weighted target group blocks for traffic splitting. For more on SSL configuration with dynamic blocks, see [how to use dynamic blocks for SSL certificate configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-ssl-certificate-configuration/view).
