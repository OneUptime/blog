# How to Configure Route 53 Weighted Routing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, Weighted Routing, DNS, Load Balancing, Infrastructure as Code

Description: Learn how to configure Route 53 weighted routing policies with OpenTofu to distribute traffic across multiple endpoints in specified proportions for blue/green deployments and gradual traffic...

## Introduction

Route 53 weighted routing lets you associate multiple resources with a single domain name and specify the proportion of traffic that each resource receives. Weights range from 0 to 255, and Route 53 routes traffic in proportion to each record's weight relative to the total weight of all records with the same name and type. This is ideal for A/B testing, blue/green deployments, and gradually shifting traffic during migrations.

## Prerequisites

- OpenTofu v1.6+
- A hosted zone in Route 53
- Multiple endpoints (ALBs, EC2 instances, or other resources)
- AWS credentials with Route 53 permissions

## Step 1: Basic Weighted Records

```hcl
# Blue environment: receives 80% of traffic (weight 80 out of 100 total)

resource "aws_route53_record" "blue" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "blue"

  weighted_routing_policy {
    weight = 80
  }

  alias {
    name                   = var.blue_alb_dns_name
    zone_id                = var.blue_alb_zone_id
    evaluate_target_health = true
  }
}

# Green environment: receives 20% of traffic (weight 20 out of 100 total)
resource "aws_route53_record" "green" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "green"

  weighted_routing_policy {
    weight = 20
  }

  alias {
    name                   = var.green_alb_dns_name
    zone_id                = var.green_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 2: Weighted Routing with Health Checks

```hcl
resource "aws_route53_health_check" "blue" {
  fqdn              = var.blue_endpoint_fqdn
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "${var.project_name}-blue-health-check"
  }
}

resource "aws_route53_health_check" "green" {
  fqdn              = var.green_endpoint_fqdn
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "${var.project_name}-green-health-check"
  }
}

resource "aws_route53_record" "blue_with_health" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "blue"

  weighted_routing_policy {
    weight = 80
  }

  health_check_id = aws_route53_health_check.blue.id

  alias {
    name                   = var.blue_alb_dns_name
    zone_id                = var.blue_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "green_with_health" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "green"

  weighted_routing_policy {
    weight = 20
  }

  health_check_id = aws_route53_health_check.green.id

  alias {
    name                   = var.green_alb_dns_name
    zone_id                = var.green_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 3: Multi-Region Weighted Distribution

```hcl
locals {
  regions = {
    us_east_1    = { weight = 50, alb_dns = var.us_east_1_alb_dns, alb_zone = var.us_east_1_alb_zone_id }
    eu_west_1    = { weight = 30, alb_dns = var.eu_west_1_alb_dns, alb_zone = var.eu_west_1_alb_zone_id }
    ap_southeast_1 = { weight = 20, alb_dns = var.ap_southeast_1_alb_dns, alb_zone = var.ap_southeast_1_alb_zone_id }
  }
}

resource "aws_route53_record" "regional" {
  for_each = local.regions

  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = each.key

  weighted_routing_policy {
    weight = each.value.weight
  }

  alias {
    name                   = each.value.alb_dns
    zone_id                = each.value.alb_zone
    evaluate_target_health = true
  }
}
```

## Step 4: Gradual Traffic Shift (Canary Pattern)

```hcl
variable "canary_weight" {
  description = "Percentage of traffic to send to new version (0-100)"
  type        = number
  default     = 5
}

resource "aws_route53_record" "stable" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "stable"

  weighted_routing_policy {
    weight = 100 - var.canary_weight
  }

  alias {
    name                   = var.stable_alb_dns_name
    zone_id                = var.stable_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "canary" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "canary"

  weighted_routing_policy {
    weight = var.canary_weight
  }

  alias {
    name                   = var.canary_alb_dns_name
    zone_id                = var.canary_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Shift more traffic to green by updating weights
tofu apply -var="canary_weight=50"

# Complete cutover: set canary_weight=100 or remove stable record
tofu apply -var="canary_weight=100"

# Verify DNS resolution and weights
dig api.example.com
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --query "ResourceRecordSets[?Name=='api.example.com.']"
```

## Conclusion

Weighted routing is a common approach for gradual traffic shifts in Route 53. Start canary traffic at 5-10% to validate the new version before increasing. Setting a record's weight to 0 stops Route 53 from routing to it while at least one record with the same name and type has a non-zero weight; if every record in the group has weight 0, Route 53 routes to all of them with equal probability. For production, combine weighted routing with health checks or alias `evaluate_target_health` so unhealthy endpoints are excluded when other healthy records are available.
