# How to Configure Route 53 Geolocation Routing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, Geolocation Routing, DNS, Compliance, Infrastructure as Code

Description: Learn how to configure Route 53 geolocation routing with OpenTofu to route DNS queries based on the geographic location of users for compliance, data residency, and localized content delivery.

## Introduction

Route 53 geolocation routing routes traffic based on the geographic location that DNS queries originate from: continent, country, or US state. Unlike latency routing (which optimizes for speed), geolocation routing selects the DNS answer by location rather than performance. This is useful for supporting data residency controls, serving localized content, and restricting access to specific regions.

## Prerequisites

- OpenTofu v1.6+
- A hosted zone in Route 53
- Regional infrastructure (ALBs, endpoints) in appropriate AWS regions
- AWS credentials with Route 53 permissions

## Step 1: Country and Continent-Based Routing

```hcl
# Route German users to EU infrastructure (GDPR compliance)

resource "aws_route53_record" "germany" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "germany"

  geolocation_routing_policy {
    country = "DE"
  }

  alias {
    name                   = var.eu_alb_dns_name
    zone_id                = var.eu_alb_zone_id
    evaluate_target_health = true
  }
}

# Route all European users to EU infrastructure
resource "aws_route53_record" "europe" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "europe"

  geolocation_routing_policy {
    continent = "EU"
  }

  alias {
    name                   = var.eu_alb_dns_name
    zone_id                = var.eu_alb_zone_id
    evaluate_target_health = true
  }
}

# Default record - catches all other locations (recommended for unmatched locations)
resource "aws_route53_record" "default" {
  zone_id        = var.hosted_zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "default"

  geolocation_routing_policy {
    country = "*"  # Wildcard catches all locations not matched by other records
  }

  alias {
    name                   = var.us_alb_dns_name
    zone_id                = var.us_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 2: US State-Level Routing

```hcl
# Route California users to West Coast infrastructure
resource "aws_route53_record" "california" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "california"

  geolocation_routing_policy {
    country     = "US"
    subdivision = "CA"  # US state code
  }

  alias {
    name                   = var.us_west_2_alb_dns
    zone_id                = var.us_west_2_alb_zone_id
    evaluate_target_health = true
  }
}

# Route all other US users to East Coast
resource "aws_route53_record" "us_default" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "us-default"

  geolocation_routing_policy {
    country = "US"
  }

  alias {
    name                   = var.us_east_1_alb_dns
    zone_id                = var.us_east_1_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 3: Multi-Continent Configuration

```hcl
locals {
  continent_routing = {
    "NA" = { alb_dns = var.us_east_1_alb_dns, alb_zone = var.us_east_1_alb_zone_id }
    "EU" = { alb_dns = var.eu_west_1_alb_dns, alb_zone = var.eu_west_1_alb_zone_id }
    "AS" = { alb_dns = var.ap_southeast_1_alb_dns, alb_zone = var.ap_southeast_1_alb_zone_id }
    "OC" = { alb_dns = var.ap_southeast_2_alb_dns, alb_zone = var.ap_southeast_2_alb_zone_id }
    "SA" = { alb_dns = var.sa_east_1_alb_dns, alb_zone = var.sa_east_1_alb_zone_id }
  }
}

resource "aws_route53_record" "continental" {
  for_each = local.continent_routing

  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "continent-${each.key}"

  geolocation_routing_policy {
    continent = each.key
  }

  alias {
    name                   = each.value.alb_dns
    zone_id                = each.value.alb_zone
    evaluate_target_health = true
  }
}

# Always include a default record
resource "aws_route53_record" "geolocation_default" {
  zone_id        = var.hosted_zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "default"

  geolocation_routing_policy {
    country = "*"
  }

  alias {
    name                   = var.us_east_1_alb_dns
    zone_id                = var.us_east_1_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test geolocation routing for specific client IPs
HOSTED_ZONE_ID=Z1234567890ABC

aws route53 test-dns-answer \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --record-name api.example.com \
  --record-type A \
  --edns0-client-subnet-ip 18.192.0.1  # Frankfurt-region IP

aws route53 test-dns-answer \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --record-name api.example.com \
  --record-type A \
  --edns0-client-subnet-ip 13.236.0.1  # Sydney-region IP
```

## Conclusion

Always create a default geolocation record (`country = "*"`) to handle locations that don't match any other record-without it, Route 53 returns no answer for unmatched locations, causing DNS failures. Country records take precedence over continent records, and continent records take precedence over the default. Use geolocation routing to support data residency and compliance designs, but combine it with latency routing by using Traffic Flow or an alias-record hierarchy when you also want performance optimization within each geographic constraint.
