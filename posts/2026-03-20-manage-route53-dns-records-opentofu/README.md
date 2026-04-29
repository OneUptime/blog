# How to Manage Route53 DNS Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route53, DNS, Infrastructure as Code

Description: Learn how to manage AWS Route53 hosted zones and DNS records with OpenTofu, including A, CNAME, alias records, and health-check-based failover.

## Introduction

Amazon Route53 is AWS's DNS service. OpenTofu manages hosted zones, DNS record sets, health checks, and traffic policies as code-ensuring your DNS configuration is reproducible and version-controlled.

## Creating a Hosted Zone

```hcl
# Public hosted zone for external DNS

resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed by OpenTofu"

  tags = {
    Name        = var.domain_name
    Environment = var.environment
  }
}

# Private hosted zone for internal DNS resolution
resource "aws_route53_zone" "internal" {
  name    = "internal.${var.domain_name}"
  comment = "Internal DNS - managed by OpenTofu"

  vpc {
    vpc_id = aws_vpc.main.id
  }
}
```

## Common Record Types

```hcl
# A record: point domain to an IP address
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}

# CNAME record: point a subdomain to another domain name
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

# TXT record: domain verification
resource "aws_route53_record" "txt_verification" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:amazonses.com ~all",
    "google-site-verification=abc123",
  ]
}

# MX record: email routing
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = [
    "10 inbound-smtp.us-east-1.amazonaws.com",
  ]
}
```

## Alias Record for AWS Resources

Use alias records for AWS resources like ALBs, CloudFront, and S3 websites. They're especially useful at the zone apex, where CNAME records aren't allowed:

```hcl
resource "aws_route53_record" "alb" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "cloudfront" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Health Check with Failover Routing

```hcl
resource "aws_route53_health_check" "primary" {
  fqdn              = aws_lb.primary.dns_name
  port              = 443
  type              = "TCP"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "primary-health-check" }
}

# Primary record with health check
resource "aws_route53_record" "primary" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "api.${var.domain_name}"
  type            = "A"
  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id

  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

# Secondary failover record
resource "aws_route53_record" "secondary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.${var.domain_name}"
  type           = "A"
  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}
```

## Conclusion

Route53 managed with OpenTofu gives you DNS as code with full audit history. Use alias records for AWS resources to avoid CNAME limitations, add health checks for automatic failover, and manage both public and private hosted zones from the same configuration.
