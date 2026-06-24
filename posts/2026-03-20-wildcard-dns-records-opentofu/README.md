# How to Create Wildcard DNS Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DNS, Wildcard, Route53, Infrastructure as Code

Description: Learn how to create wildcard DNS records with OpenTofu to route all subdomains to a single endpoint for multi-tenant applications and catch-all routing.

Wildcard DNS records match any subdomain that doesn't have a more specific record. They're used for multi-tenant SaaS applications, staging environments, and development setups where each developer gets their own subdomain.

## Route53 Wildcard Record

```hcl
data "aws_route53_zone" "main" {
  name         = "example.com."
  private_zone = false
}

# Wildcard A record - matches *.example.com

resource "aws_route53_record" "wildcard" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.example.com"
  type    = "A"
  ttl     = 300
  records = [var.ingress_ip]
}
```

## Wildcard Alias Record (ALB)

```hcl
resource "aws_route53_record" "wildcard_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Wildcard SSL Certificate

```hcl
# ACM certificate for wildcard
resource "aws_acm_certificate" "wildcard" {
  domain_name               = "*.example.com"
  subject_alternative_names = ["example.com"]  # Also cover root
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "wildcard_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}
```

## Wildcard with Specific Override

```hcl
# Wildcard catches all subdomains
resource "aws_route53_record" "wildcard_catch_all" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.example.com"
  type    = "A"
  ttl     = 300
  records = [var.default_ip]
}

# Specific records override the wildcard
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"  # Takes precedence over wildcard
  type    = "A"
  ttl     = 60
  records = [var.api_ip]
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"  # Takes precedence over wildcard
  type    = "A"
  ttl     = 60
  records = [var.www_ip]
}
```

## Multi-Level Wildcard for Environments

```hcl
# *.staging.example.com - all staging subdomains
resource "aws_route53_record" "staging_wildcard" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.staging.example.com"
  type    = "A"
  ttl     = 60
  records = [var.staging_ip]
}

# *.dev.example.com - per-developer environments
resource "aws_route53_record" "dev_wildcard" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.dev.example.com"
  type    = "A"
  ttl     = 60
  records = [var.dev_cluster_ip]
}
```

## Cloudflare Wildcard Record

```hcl
resource "cloudflare_dns_record" "wildcard" {
  zone_id = data.cloudflare_zone.main.id
  name    = "*"       # Cloudflare uses * without the domain
  content = var.origin_ip
  type    = "A"
  proxied = true      # Wildcard records can be proxied
  ttl     = 1         # 1 means "automatic" (required when proxied)
}
```

## Azure DNS Wildcard

```hcl
resource "azurerm_dns_a_record" "wildcard" {
  name                = "*"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  records             = [var.ingress_ip]
}
```

## Conclusion

Wildcard DNS records in OpenTofu enable flexible routing for multi-tenant and multi-environment setups. Create a wildcard to catch all subdomains, then define specific records to override the wildcard for special subdomains. Pair wildcard DNS with wildcard TLS certificates to fully automate subdomain handling without per-subdomain configuration.
