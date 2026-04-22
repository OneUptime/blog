# How to Configure Session Persistence with Load Balancers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancer, Session Persistence, Sticky Sessions, OpenTofu, AWS, Azure, GCP

Description: Learn how to configure session persistence (sticky sessions) with load balancers using OpenTofu to ensure client requests are consistently routed to the same backend instance.

## Overview

Session persistence ensures that a client's requests are consistently routed to the same backend instance for the duration of a session. OpenTofu configures sticky sessions across AWS ALB, Azure Application Gateway, and GCP Load Balancer with appropriate cookie handling.

## Step 1: AWS ALB Sticky Sessions

```hcl
# main.tf - ALB with sticky sessions

resource "aws_lb_target_group" "sticky" {
  name     = "app-tg-sticky"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  # Application-based stickiness (uses your app cookie name)
  stickiness {
    enabled         = true
    type            = "app_cookie"
    cookie_name     = "SESSIONID"  # Your application's session cookie
    cookie_duration = 86400        # 24 hours
  }

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200"
  }
}

# ALB-generated cookie stickiness (simpler - no app changes needed)
resource "aws_lb_target_group" "lb_cookie_sticky" {
  name     = "app-tg-lb-sticky"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  stickiness {
    enabled  = true
    type     = "lb_cookie"   # ALB generates AWSALB cookie
    cookie_duration = 3600   # 1 hour
  }
}
```

## Step 2: Azure Application Gateway Sticky Sessions

```hcl
# Azure Application Gateway with cookie-based affinity
resource "azurerm_application_gateway" "sticky" {
  name                = "sticky-app-gateway"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  backend_http_settings {
    name                  = "sticky-settings"
    port                  = 8080
    protocol              = "Http"
    cookie_based_affinity = "Enabled"   # Enable sticky sessions
    affinity_cookie_name  = "ApplicationGatewayAffinity"
    request_timeout       = 30

    probe_name = "app-probe"
  }

  # Custom affinity cookie name
  backend_http_settings {
    name                  = "custom-cookie-settings"
    port                  = 8080
    protocol              = "Http"
    cookie_based_affinity = "Enabled"
    affinity_cookie_name  = "AppSession"  # Custom cookie name
    request_timeout       = 60
  }
}
```

## Step 3: GCP Backend Service Session Affinity

```hcl
# GCP Load Balancer with stateful cookie-based session affinity
resource "google_compute_backend_service" "sticky" {
  name                  = "sticky-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_name             = "http"
  timeout_sec           = 30

  # Stateful cookie-based affinity
  session_affinity   = "STRONG_COOKIE_AFFINITY"
  locality_lb_policy = "RING_HASH"

  strong_session_affinity_cookie {
    name = "GCLB_SESSION"
    ttl {
      seconds = 3600
    }
  }

  backend {
    group                 = google_compute_instance_group_manager.app.instance_group
    balancing_mode        = "RATE"
    max_rate_per_instance = 100
  }

  health_checks = [google_compute_health_check.app.id]
}

# Header-based affinity (for Cloud Service Mesh or API services)
resource "google_compute_backend_service" "header_affinity" {
  name                  = "header-affinity-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "INTERNAL_SELF_MANAGED"
  port_name             = "http"

  session_affinity   = "HEADER_FIELD"
  locality_lb_policy = "RING_HASH"

  consistent_hash {
    http_header_name = "X-Session-Token"  # Route based on header
  }

  backend {
    group                 = google_compute_instance_group_manager.app.instance_group
    balancing_mode        = "RATE"
    max_rate_per_instance = 100
  }

  health_checks = [google_compute_health_check.app.id]
}
```

## Step 4: ECS Service with Sticky Sessions

```hcl
# ECS service with ALB sticky sessions
resource "aws_ecs_service" "sticky_app" {
  name            = "sticky-app"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 6
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.sticky_fargate.arn
    container_name   = "app"
    container_port   = 8080
  }

  # Allow Application Auto Scaling to manage the running task count
  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Set deregistration delay for in-flight requests during deployments
resource "aws_lb_target_group" "sticky_fargate" {
  name                 = "sticky-fargate-tg"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = module.vpc.vpc_id
  target_type          = "ip"  # Required for Fargate

  deregistration_delay = 120  # Give in-flight requests time to complete

  stickiness {
    enabled         = true
    type            = "lb_cookie"
    cookie_duration = 3600
  }
}
```

## Summary

Session persistence configured with OpenTofu routes clients to consistent backends using cookie-based affinity. Application-based stickiness (`app_cookie`) uses your application's cookie name together with an ALB-generated application cookie for seamless integration, while load balancer-generated cookies (`lb_cookie`) require no application changes. The deregistration delay should cover expected in-flight requests and keep-alive connections during deployments; it does not need to exceed the sticky session cookie duration. For stateless applications, prefer distributed session storage (Redis, DynamoDB) over sticky sessions to avoid uneven load distribution when instances fail.
