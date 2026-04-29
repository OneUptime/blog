# How to Manage Route 53 DNS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, DNS, Infrastructure as Code

Description: Learn how to manage AWS Route 53 hosted zones, DNS records, health checks, and routing policies using OpenTofu for consistent, version-controlled DNS management.

## Introduction

AWS Route 53 is a scalable DNS web service. Managing Route 53 resources with OpenTofu ensures DNS configurations are reproducible, auditable, and consistent across environments. From simple A records to complex weighted routing policies, OpenTofu handles it all.

## Prerequisites

- OpenTofu installed (v1.6+)
- AWS CLI configured with appropriate permissions
- A domain name

## Creating a Hosted Zone

```hcl
resource "aws_route53_zone" "primary" {
  name    = "example.com"
  comment = "Primary zone managed by OpenTofu"

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "nameservers" {
  value = aws_route53_zone.primary.name_servers
}
```

## Common DNS Record Types

### A Record

```hcl
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "A"
  ttl     = 300
  records = ["203.0.113.10"]
}
```

### CNAME Record

```hcl
resource "aws_route53_record" "blog" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "blog.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["myblog.ghost.io"]
}
```

### Alias Record (for supported AWS resources)

```hcl
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

### MX Records

```hcl
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 3600

  records = [
    "10 mail1.example.com.",
    "20 mail2.example.com."
  ]
}
```

## Routing Policies

### Weighted Routing (Canary Deployments)

```hcl
resource "aws_route53_record" "app_primary" {
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "primary"

  weighted_routing_policy {
    weight = 90
  }

  alias {
    name                   = aws_lb.app_primary.dns_name
    zone_id                = aws_lb.app_primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_canary" {
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "canary"

  weighted_routing_policy {
    weight = 10
  }

  alias {
    name                   = aws_lb.app_canary.dns_name
    zone_id                = aws_lb.app_canary.zone_id
    evaluate_target_health = true
  }
}
```

### Failover Routing

```hcl
resource "aws_route53_health_check" "primary" {
  fqdn              = aws_lb.primary.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}

resource "aws_route53_record" "failover_primary" {
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "failover_secondary" {
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "app.example.com"
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

## Private Hosted Zones

```hcl
resource "aws_route53_zone" "private" {
  name = "internal.example.com"

  vpc {
    vpc_id = aws_vpc.main.id
  }

  tags = {
    Environment = "production"
  }
}
```

## Best Practices

- Use alias records instead of CNAME for supported AWS resources when possible - they can be used at the zone apex, and Route 53 does not charge for alias queries to AWS resources.
- Set appropriate TTLs: low TTLs for records that change frequently, high TTLs for stable records.
- Use health checks with failover routing for non-alias targets. For alias records that point to supported AWS resources, use `evaluate_target_health`, and add Route 53 health checks only when you need extra endpoint-level checks.
- Import existing Route 53 resources before managing them with OpenTofu.
- Use `for_each` to manage large sets of DNS records from a map variable.

## Conclusion

OpenTofu makes Route 53 DNS management reliable and reproducible. Whether managing simple records or complex multi-region routing policies, infrastructure-as-code ensures your DNS changes are reviewed, versioned, and consistently applied across all environments.
