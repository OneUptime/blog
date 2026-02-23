# How to Build a DNS Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS, Route53, AWS, Networking, Infrastructure Patterns

Description: Build a complete DNS infrastructure with Terraform using Route53 hosted zones, health checks, routing policies, and DNSSEC for reliable and secure name resolution.

---

DNS is one of those things that everybody depends on but nobody thinks about until it breaks. And when it breaks, everything breaks. Your website, your API, your email, your internal services - they all depend on DNS. Getting your DNS infrastructure right and managing it as code with Terraform eliminates an entire class of outages caused by manual misconfiguration.

In this guide, we will build a comprehensive DNS infrastructure on AWS Route53 using Terraform. We will cover hosted zones, record management, health checks, routing policies, and DNSSEC.

## Hosted Zone Management

Start by creating hosted zones for your domains:

```hcl
# Primary public hosted zone
resource "aws_route53_zone" "primary" {
  name    = var.domain_name
  comment = "Primary domain for ${var.project_name}"

  tags = {
    Environment = var.environment
  }
}

# Subdomain zone (delegated from primary)
resource "aws_route53_zone" "api" {
  name    = "api.${var.domain_name}"
  comment = "API subdomain zone"
}

# Delegation records in the parent zone
resource "aws_route53_record" "api_delegation" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "NS"
  ttl     = 172800

  records = aws_route53_zone.api.name_servers
}

# Private hosted zone for internal services
resource "aws_route53_zone" "internal" {
  name    = "internal.${var.domain_name}"
  comment = "Internal service discovery"

  vpc {
    vpc_id = var.vpc_id
  }
}

# Associate private zone with additional VPCs
resource "aws_route53_zone_association" "additional_vpcs" {
  for_each = toset(var.additional_vpc_ids)

  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = each.value
}
```

## Record Management Module

Create a reusable module for managing DNS records consistently:

```hcl
# modules/dns_record/main.tf
resource "aws_route53_record" "this" {
  zone_id = var.zone_id
  name    = var.name
  type    = var.type
  ttl     = var.use_alias ? null : var.ttl
  records = var.use_alias ? null : var.records

  dynamic "alias" {
    for_each = var.use_alias ? [1] : []
    content {
      name                   = var.alias_target
      zone_id                = var.alias_zone_id
      evaluate_target_health = var.evaluate_target_health
    }
  }
}
```

Use the module to manage all your records:

```hcl
# Application records
module "app_record" {
  source    = "./modules/dns_record"
  zone_id   = aws_route53_zone.primary.zone_id
  name      = "app.${var.domain_name}"
  type      = "A"
  use_alias = true
  alias_target          = var.alb_dns_name
  alias_zone_id         = var.alb_zone_id
  evaluate_target_health = true
}

# MX records for email
module "mx_records" {
  source  = "./modules/dns_record"
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mx1.emailprovider.com",
    "20 mx2.emailprovider.com",
  ]
}

# TXT records for SPF and domain verification
module "spf_record" {
  source  = "./modules/dns_record"
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:_spf.google.com include:amazonses.com -all"
  ]
}

# DMARC record
module "dmarc_record" {
  source  = "./modules/dns_record"
  zone_id = aws_route53_zone.primary.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=DMARC1; p=reject; rua=mailto:dmarc@${var.domain_name}; ruf=mailto:dmarc@${var.domain_name}; pct=100"
  ]
}
```

## Health Checks

Route53 health checks monitor your endpoints and can trigger failover:

```hcl
# HTTPS health check for the primary application
resource "aws_route53_health_check" "app_primary" {
  fqdn              = "app.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 10

  regions = [
    "us-east-1",
    "eu-west-1",
    "ap-southeast-1",
  ]

  tags = {
    Name = "${var.project_name}-app-primary-health"
  }
}

# Calculated health check combining multiple checks
resource "aws_route53_health_check" "app_overall" {
  type                   = "CALCULATED"
  child_health_threshold = 2 # At least 2 of 3 must be healthy

  child_healthchecks = [
    aws_route53_health_check.app_primary.id,
    aws_route53_health_check.app_api.id,
    aws_route53_health_check.app_db.id,
  ]

  tags = {
    Name = "${var.project_name}-app-overall-health"
  }
}

# CloudWatch alarm when health check fails
resource "aws_cloudwatch_metric_alarm" "health_check_failed" {
  alarm_name          = "${var.project_name}-dns-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "DNS health check has failed"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.app_primary.id
  }
}
```

## Routing Policies

Route53 supports several routing policies for different use cases:

### Latency-Based Routing

Route users to the nearest region:

```hcl
resource "aws_route53_record" "app_us" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.us_alb_dns_name
    zone_id                = var.us_alb_zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier  = "us-east-1"
  health_check_id = aws_route53_health_check.app_us.id
}

resource "aws_route53_record" "app_eu" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.eu_alb_dns_name
    zone_id                = var.eu_alb_zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier  = "eu-west-1"
  health_check_id = aws_route53_health_check.app_eu.id
}
```

### Weighted Routing

Useful for gradual traffic migration or A/B testing:

```hcl
resource "aws_route53_record" "app_blue" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.blue_alb_dns
    zone_id                = var.blue_alb_zone_id
    evaluate_target_health = true
  }

  weighted_routing_policy {
    weight = 90 # 90% of traffic
  }

  set_identifier = "blue"
}

resource "aws_route53_record" "app_green" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.green_alb_dns
    zone_id                = var.green_alb_zone_id
    evaluate_target_health = true
  }

  weighted_routing_policy {
    weight = 10 # 10% of traffic
  }

  set_identifier = "green"
}
```

## DNSSEC

Enable DNSSEC to protect against DNS spoofing:

```hcl
# KMS key for DNSSEC signing (must be in us-east-1)
resource "aws_kms_key" "dnssec" {
  provider                 = aws.us_east_1
  customer_master_key_spec = "ECC_NIST_P256"
  deletion_window_in_days  = 7
  key_usage                = "SIGN_VERIFY"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowRoute53DNSSEC"
        Effect    = "Allow"
        Principal = { Service = "dnssec-route53.amazonaws.com" }
        Action    = ["kms:DescribeKey", "kms:GetPublicKey", "kms:Sign"]
        Resource  = "*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = var.account_id
          }
        }
      },
      {
        Sid       = "AllowKeyManagement"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })
}

resource "aws_route53_key_signing_key" "main" {
  hosted_zone_id             = aws_route53_zone.primary.id
  key_management_service_arn = aws_kms_key.dnssec.arn
  name                       = "${var.project_name}-ksk"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  hosted_zone_id = aws_route53_zone.primary.id

  depends_on = [aws_route53_key_signing_key.main]
}
```

## Query Logging

Enable DNS query logging for security and troubleshooting:

```hcl
resource "aws_route53_query_log" "primary" {
  cloudwatch_log_group_arn = aws_cloudwatch_log_group.dns_queries.arn
  zone_id                  = aws_route53_zone.primary.zone_id

  depends_on = [aws_cloudwatch_log_resource_policy.dns_logging]
}

resource "aws_cloudwatch_log_group" "dns_queries" {
  provider          = aws.us_east_1 # Must be in us-east-1
  name              = "/aws/route53/${var.domain_name}"
  retention_in_days = 30
}
```

For comprehensive monitoring of your DNS infrastructure, check out [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

DNS infrastructure is too critical to manage manually. A single mistyped record can take down your entire application. With Terraform, every DNS change goes through code review, is version controlled, and can be rolled back. The setup we covered handles public and private zones, health checks with failover, advanced routing policies, DNSSEC, and query logging. Treat your DNS the same way you treat your application code: with rigor, testing, and proper change management.
