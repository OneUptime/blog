# How to Create ALB Listener Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ALB, Listener Rules, Load Balancing

Description: Learn how to create advanced ALB listener rules in Terraform for path-based routing, host-based routing, header matching, redirects, and fixed responses.

---

ALB listener rules are what make Application Load Balancers powerful. They let you route traffic to different target groups based on the request path, hostname, HTTP headers, query strings, or source IP. Instead of running separate load balancers for each microservice, you configure routing rules on a single ALB.

This guide covers all the rule types and conditions you can configure in Terraform.

## Understanding Listener Rules

Every ALB listener has a default action (usually forwarding to a target group). Listener rules add additional conditions that are evaluated in priority order. When a request matches a rule's conditions, that rule's action is taken. If no rule matches, the default action handles it.

Rules are evaluated by priority number, lowest first.

## Path-Based Routing

Route requests to different backends based on the URL path. This is the most common use case for microservice architectures.

```hcl
# HTTPS listener with a default action
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Route /api/* to the API backend
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/api"]
    }
  }
}

# Route /admin/* to the admin backend
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    path_pattern {
      values = ["/admin/*", "/admin"]
    }
  }
}

# Route /ws/* to WebSocket backend
resource "aws_lb_listener_rule" "websocket" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.websocket.arn
  }

  condition {
    path_pattern {
      values = ["/ws/*"]
    }
  }
}

# Route /static/* to a lightweight static file server
resource "aws_lb_listener_rule" "static" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.static.arn
  }

  condition {
    path_pattern {
      values = ["/static/*", "/assets/*", "/images/*"]
    }
  }
}
```

## Host-Based Routing

Route based on the `Host` header - useful when multiple domains or subdomains point to the same ALB.

```hcl
# Route api.example.com to the API target group
resource "aws_lb_listener_rule" "api_domain" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = ["api.example.com", "api.staging.example.com"]
    }
  }
}

# Route admin.example.com to the admin target group
resource "aws_lb_listener_rule" "admin_domain" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 60

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    host_header {
      values = ["admin.example.com"]
    }
  }
}

# Wildcard matching for tenant subdomains
resource "aws_lb_listener_rule" "tenants" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 70

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tenant_app.arn
  }

  condition {
    host_header {
      values = ["*.app.example.com"]
    }
  }
}
```

## Combined Conditions

Rules can have multiple conditions, and all must match (AND logic).

```hcl
# Route API v2 traffic on a specific domain
resource "aws_lb_listener_rule" "api_v2" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_v2.arn
  }

  # Both conditions must match (AND)
  condition {
    host_header {
      values = ["api.example.com"]
    }
  }

  condition {
    path_pattern {
      values = ["/v2/*"]
    }
  }
}
```

## HTTP Header-Based Routing

Route based on custom HTTP headers. This is useful for A/B testing, canary deployments, or routing internal traffic differently.

```hcl
# Route canary traffic based on a custom header
resource "aws_lb_listener_rule" "canary" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.canary.arn
  }

  condition {
    http_header {
      http_header_name = "X-Canary"
      values           = ["true", "enabled"]
    }
  }
}

# Route internal traffic based on a header set by the API gateway
resource "aws_lb_listener_rule" "internal" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.internal.arn
  }

  condition {
    http_header {
      http_header_name = "X-Internal-Request"
      values           = ["true"]
    }
  }

  condition {
    path_pattern {
      values = ["/internal/*"]
    }
  }
}
```

## Query String Routing

Route based on query parameters.

```hcl
# Route to a specific version based on query parameter
resource "aws_lb_listener_rule" "version_beta" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 15

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.beta.arn
  }

  condition {
    query_string {
      key   = "version"
      value = "beta"
    }
  }
}
```

## Source IP Routing

Route based on the client's IP address.

```hcl
# Route internal office traffic to a debug-enabled backend
resource "aws_lb_listener_rule" "office_debug" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 5

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.debug.arn
  }

  condition {
    source_ip {
      values = ["203.0.113.0/24", "198.51.100.0/24"]
    }
  }
}
```

## Redirect Actions

Redirect requests instead of forwarding them.

```hcl
# Redirect HTTP to HTTPS
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

# Redirect old API paths to new ones
resource "aws_lb_listener_rule" "api_redirect" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 500

  action {
    type = "redirect"

    redirect {
      path        = "/api/v2/#{path}"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }

  condition {
    path_pattern {
      values = ["/api/v1/*"]
    }
  }
}

# Redirect to a different domain
resource "aws_lb_listener_rule" "domain_redirect" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 600

  action {
    type = "redirect"

    redirect {
      host        = "new.example.com"
      path        = "/#{path}"
      query       = "#{query}"
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = ["old.example.com"]
    }
  }
}
```

## Fixed Response Actions

Return a static response directly from the ALB without forwarding to any backend.

```hcl
# Health check endpoint handled by the ALB itself
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "application/json"
      message_body = "{\"status\": \"healthy\"}"
      status_code  = "200"
    }
  }

  condition {
    path_pattern {
      values = ["/lb-health"]
    }
  }
}

# Block specific paths with a 403
resource "aws_lb_listener_rule" "block_paths" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 2

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }

  condition {
    path_pattern {
      values = ["/.env", "/wp-admin/*", "/phpmyadmin/*"]
    }
  }
}

# Maintenance page
resource "aws_lb_listener_rule" "maintenance" {
  count = var.maintenance_mode ? 1 : 0

  listener_arn = aws_lb_listener.https.arn
  priority     = 3

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/html"
      message_body = "<html><body><h1>Maintenance in Progress</h1><p>We'll be back shortly.</p></body></html>"
      status_code  = "503"
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Weighted Target Groups

Distribute traffic across multiple target groups with different weights. Useful for blue/green or canary deployments.

```hcl
# Weighted forwarding for canary deployment
resource "aws_lb_listener_rule" "canary_weighted" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.stable.arn
        weight = 90  # 90% to stable
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = 10  # 10% to canary
      }

      stickiness {
        enabled  = true
        duration = 3600  # Keep users on the same version for 1 hour
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Dynamic Rules with for_each

When you have many services, generate rules from a map.

```hcl
locals {
  service_routes = {
    api      = { path = "/api/*", priority = 100, tg_arn = aws_lb_target_group.api.arn }
    auth     = { path = "/auth/*", priority = 110, tg_arn = aws_lb_target_group.auth.arn }
    payments = { path = "/payments/*", priority = 120, tg_arn = aws_lb_target_group.payments.arn }
    search   = { path = "/search/*", priority = 130, tg_arn = aws_lb_target_group.search.arn }
    webhooks = { path = "/webhooks/*", priority = 140, tg_arn = aws_lb_target_group.webhooks.arn }
  }
}

resource "aws_lb_listener_rule" "services" {
  for_each = local.service_routes

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = each.value.tg_arn
  }

  condition {
    path_pattern {
      values = [each.value.path]
    }
  }
}
```

## Summary

Listener rules are what make ALBs versatile. Path-based and host-based routing handle the majority of microservice architectures. Header and query string conditions enable advanced patterns like canary deployments and A/B testing. Fixed responses let you handle health checks and blocking without touching your backends. And weighted forwarding gives you fine-grained traffic splitting for safe deployments.

For related ALB configuration, see our guides on [configuring ALB health checks](https://oneuptime.com/blog/post/2026-02-23-configure-alb-health-checks-in-terraform/view) and [configuring ALB access logging](https://oneuptime.com/blog/post/2026-02-23-configure-alb-access-logging-in-terraform/view).
