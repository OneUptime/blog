# How to Configure Multi-Region Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Load Balancer, Multi-Region, Route53, AWS, Infrastructure as Code

Description: Learn how to configure multi-region load balancing with OpenTofu - deploying ALBs in multiple regions with Route53 latency-based routing and health checks for global traffic distribution.

## Introduction

Multi-region load balancing distributes traffic to the nearest healthy region. OpenTofu manages the full stack: regional ALBs, Route53 latency routing policies, health checks, and failover records - all as code.

## Regional Application Load Balancers

```hcl
# Deploy ALB in each region using provider aliases

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}

# US East 1 ALB
resource "aws_lb" "us_east" {
  provider           = aws.us_east_1
  name               = "${var.environment}-alb-us-east-1"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.us_east_public_subnet_ids
  security_groups    = [aws_security_group.alb_us_east.id]

  tags = { Region = "us-east-1", Environment = var.environment }
}

# EU West 1 ALB
resource "aws_lb" "eu_west" {
  provider           = aws.eu_west_1
  name               = "${var.environment}-alb-eu-west-1"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.eu_west_public_subnet_ids
  security_groups    = [aws_security_group.alb_eu_west.id]

  tags = { Region = "eu-west-1", Environment = var.environment }
}
```

## Route53 Health Checks

```hcl
resource "aws_route53_health_check" "us_east" {
  fqdn              = aws_lb.us_east.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  regions           = ["us-east-1", "eu-west-1", "ap-southeast-1"]  # Check from multiple regions

  tags = { Name = "us-east-health-check" }
}

resource "aws_route53_health_check" "eu_west" {
  fqdn              = aws_lb.eu_west.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  regions           = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = { Name = "eu-west-health-check" }
}
```

## Route53 Latency Routing Records

```hcl
# Primary region records with latency routing
resource "aws_route53_record" "app_us_east" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "app.${var.domain_name}"
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  health_check_id = aws_route53_health_check.us_east.id

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_eu_west" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "app.${var.domain_name}"
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  health_check_id = aws_route53_health_check.eu_west.id

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Route53 Failover (Active-Passive)

```hcl
# Primary record - normally receives all traffic
resource "aws_route53_record" "primary" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.us_east.id

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

# Secondary record - receives traffic only if primary is unhealthy
resource "aws_route53_record" "secondary" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  # No health check on secondary - always available as failover

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## GCP: Global HTTP(S) Load Balancer

```hcl
# GCP's global load balancer provides anycast routing
resource "google_compute_global_forwarding_rule" "https" {
  name        = "${var.environment}-https-forwarding-rule"
  target      = google_compute_target_https_proxy.main.id
  port_range  = "443"
  ip_address  = google_compute_global_address.app.id
  ip_protocol = "TCP"
}

resource "google_compute_backend_service" "main" {
  name          = "${var.environment}-backend-service"
  protocol      = "HTTPS"
  timeout_sec   = 30

  health_checks = [google_compute_health_check.https.id]

  # NEG backends in multiple regions
  dynamic "backend" {
    for_each = var.regional_negs
    content {
      group           = backend.value
      balancing_mode  = "UTILIZATION"
      capacity_scaler = 1.0
    }
  }

  enable_cdn = true
  cdn_policy {
    cache_mode = "CACHE_ALL_STATIC"
  }
}
```

## Conclusion

Multi-region load balancing with OpenTofu on AWS uses Route53 latency routing with health checks to direct users to the nearest healthy region. Use latency routing for active-active (traffic to nearest healthy region) and failover routing for active-passive (primary + backup). GCP's global HTTP(S) load balancer provides built-in anycast routing - a single IP routes to the nearest available backend globally. Always configure health checks so Route53 can automatically route around unhealthy regions.
