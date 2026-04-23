# How to Configure Route 53 Latency Routing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, Latency Routing, DNS, Multi-Region, Infrastructure as Code

Description: Learn how to configure Route 53 latency-based routing with OpenTofu to automatically direct users to the AWS region that provides the lowest network latency for their location.

## Introduction

Route 53 latency routing routes each DNS query to the AWS region that provides the lowest latency for the end user based on measured latencies between AWS regions and the user's network. Unlike geolocation routing (which uses geographic location), latency routing uses actual measured network performance. This is the recommended routing policy for multi-region active-active architectures where you want users to always reach the fastest available region.

## Prerequisites

- OpenTofu v1.6+
- Resources deployed in multiple AWS regions
- A hosted zone in Route 53
- AWS credentials with Route 53 permissions

## Step 1: Create Latency-Based Records

```hcl
# US East 1 - serves users with lowest latency to us-east-1

resource "aws_route53_record" "us_east_1" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = var.us_east_1_alb_dns
    zone_id                = var.us_east_1_alb_zone_id
    evaluate_target_health = true
  }
}

# EU West 1 - serves users with lowest latency to eu-west-1
resource "aws_route53_record" "eu_west_1" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = var.eu_west_1_alb_dns
    zone_id                = var.eu_west_1_alb_zone_id
    evaluate_target_health = true
  }
}

# AP Southeast 1 - serves users with lowest latency to ap-southeast-1
resource "aws_route53_record" "ap_southeast_1" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "ap-southeast-1"

  latency_routing_policy {
    region = "ap-southeast-1"
  }

  alias {
    name                   = var.ap_southeast_1_alb_dns
    zone_id                = var.ap_southeast_1_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 2: Dynamic Multi-Region Configuration

```hcl
variable "regional_endpoints" {
  description = "Map of region to ALB and health check configuration"
  type = map(object({
    alb_dns           = string
    alb_zone_id       = string
    health_check_fqdn = string
  }))
  default = {
    "us-east-1" = {
      alb_dns           = "..."
      alb_zone_id       = "..."
      health_check_fqdn = "us-east-1.api.example.com"
    }
    "eu-west-1" = {
      alb_dns           = "..."
      alb_zone_id       = "..."
      health_check_fqdn = "eu-west-1.api.example.com"
    }
    "ap-southeast-1" = {
      alb_dns           = "..."
      alb_zone_id       = "..."
      health_check_fqdn = "ap-southeast-1.api.example.com"
    }
    "sa-east-1" = {
      alb_dns           = "..."
      alb_zone_id       = "..."
      health_check_fqdn = "sa-east-1.api.example.com"
    }
  }
}

resource "aws_route53_record" "api" {
  for_each = var.regional_endpoints

  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = each.key

  latency_routing_policy {
    region = each.key
  }

  alias {
    name                   = each.value.alb_dns
    zone_id                = each.value.alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 3: Latency Routing with Health Checks

```hcl
resource "aws_route53_health_check" "regional" {
  for_each = var.regional_endpoints

  # Check a stable, region-specific endpoint, not the latency-routed record name.
  fqdn              = each.value.health_check_fqdn
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  # Monitor from multiple Route 53 health check locations
  regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = {
    Name   = "${var.project_name}-${each.key}-health-check"
    Region = each.key
  }
}

resource "aws_route53_record" "api_with_health" {
  for_each = var.regional_endpoints

  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = each.key

  latency_routing_policy {
    region = each.key
  }

  health_check_id = aws_route53_health_check.regional[each.key].id

  alias {
    name                   = each.value.alb_dns
    zone_id                = each.value.alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test latency routing - run from different locations or use DNS proxies
dig api.example.com
nslookup api.example.com 8.8.8.8

# Check the answer for a client subnet when the resolver supports EDNS0 client subnet
aws route53 test-dns-answer \
  --hosted-zone-id <zone-id> \
  --record-name api.example.com \
  --record-type A \
  --edns0-client-subnet-ip <client-ip>
```

## Conclusion

Latency routing requires resources in at least two AWS regions to be useful. Route 53 bases latency data on traffic between users (or their DNS resolver/client subnet) and AWS data centers, not between your users and your specific resources, so the region selection is based on AWS network latency data rather than real-time measurements to your application. Combine latency routing with health checks to automatically remove unhealthy regions from rotation. If all regions become unhealthy, Route 53 behaves as if all health checks are passing and responds according to the routing policy to avoid a complete DNS blackout.
