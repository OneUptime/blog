# How to Configure Route 53 Private Hosted Zones with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, Private Hosted Zones, DNS, VPC, Infrastructure as Code

Description: Learn how to configure Route 53 private hosted zones with OpenTofu to provide internal DNS resolution within VPCs for service discovery, split-horizon DNS, and private service endpoints.

## Introduction

Route 53 private hosted zones provide DNS resolution that is only visible within associated VPCs. They enable internal service discovery (services resolving each other by name), split-horizon DNS (different answers for internal vs. external queries), and custom DNS names for VPC endpoints. Unlike public hosted zones, private zones are invisible to the public internet and can use internal DNS namespaces like `.internal`; avoid `.local`, which is reserved for multicast DNS.

## Prerequisites

- OpenTofu v1.6+
- One or more VPCs to associate with the private zone
- AWS credentials with Route 53 and VPC permissions

## Step 1: Create Private Hosted Zone

```hcl
resource "aws_route53_zone" "internal" {
  name    = "${var.project_name}.internal"
  comment = "Private DNS zone for ${var.project_name} internal services"

  # Associate with primary VPC at creation time
  vpc {
    vpc_id     = var.primary_vpc_id
    vpc_region = var.primary_region
  }

  # Associate with secondary VPC (cross-region)
  vpc {
    vpc_id     = var.secondary_vpc_id
    vpc_region = var.secondary_region
  }

  tags = {
    Name        = "${var.project_name}-internal-dns"
    Environment = var.environment
  }

  # Allow additional aws_route53_zone_association resources without VPC association diffs
  # and prevent accidental destruction of the private zone
  lifecycle {
    prevent_destroy = true
    ignore_changes   = [vpc]
  }
}
```

## Step 2: Add Private DNS Records

```hcl
# Internal API endpoint

resource "aws_route53_record" "api_internal" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "api.${var.project_name}.internal"
  type    = "A"

  alias {
    name                   = var.internal_alb_dns_name
    zone_id                = var.internal_alb_zone_id
    evaluate_target_health = true
  }
}

# Database cluster endpoint
resource "aws_route53_record" "db_primary" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "db.${var.project_name}.internal"
  type    = "CNAME"
  ttl     = 60

  records = [var.rds_cluster_endpoint]
}

# Database reader endpoint
resource "aws_route53_record" "db_reader" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "db-ro.${var.project_name}.internal"
  type    = "CNAME"
  ttl     = 60

  records = [var.rds_cluster_reader_endpoint]
}

# Service discovery records for microservices
resource "aws_route53_record" "services" {
  for_each = var.internal_services  # map of service_name => ip_address

  zone_id = aws_route53_zone.internal.zone_id
  name    = "${each.key}.${var.project_name}.internal"
  type    = "A"
  ttl     = 30

  records = [each.value]
}
```

## Step 3: Associate Additional VPCs

```hcl
# Associate VPCs created separately from the zone
resource "aws_route53_zone_association" "staging" {
  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = var.staging_vpc_id
  vpc_region = var.staging_region
}

# Cross-account VPC association requires authorization
resource "aws_route53_vpc_association_authorization" "cross_account" {
  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = var.cross_account_vpc_id
  vpc_region = var.cross_account_region
}

# In the other account, accept the authorization
# resource "aws_route53_zone_association" "cross_account_accept" {
#   provider = aws.cross_account
#   zone_id    = var.internal_zone_id
#   vpc_id     = var.cross_account_vpc_id
#   vpc_region = var.cross_account_region
# }
```

## Step 4: Split-Horizon DNS

```hcl
# Public hosted zone - external resolution
resource "aws_route53_zone" "public" {
  name = var.domain_name
}

resource "aws_route53_record" "api_public" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.public_alb_dns_name
    zone_id                = var.public_alb_zone_id
    evaluate_target_health = true
  }
}

# Private hosted zone with same name - internal resolution (different target)
resource "aws_route53_zone" "private" {
  name = var.domain_name  # Same domain as public zone

  vpc {
    vpc_id = var.vpc_id
  }
}

resource "aws_route53_record" "api_private" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  # Points to internal ALB - no internet exposure
  alias {
    name                   = var.internal_alb_dns_name
    zone_id                = var.internal_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify private DNS resolution from within the VPC (requires EC2 instance in the VPC)
dig api.myproject.internal
nslookup db.myproject.internal

# Check zone associations
aws route53 get-hosted-zone \
  --id <zone-id>
```

## Conclusion

Private hosted zones use the VPC's DNS resolver (at the VPC CIDR + 2 address, e.g., `10.0.0.2`), so `enableDnsHostnames` and `enableDnsSupport` must be enabled on associated VPCs. For split-horizon DNS, the private zone takes precedence for queries from associated VPCs. When associating VPCs across accounts, the authorization process requires coordination between both accounts-use OpenTofu provider aliases to manage this cleanly. Keep TTLs low (30-60 seconds) on service discovery records to enable rapid updates during deployments.
