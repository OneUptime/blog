# How to Manage DNS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DNS, Route53, Azure DNS, Cloud DNS, Infrastructure as Code

Description: Learn how to manage DNS zones and records with OpenTofu across AWS Route53, Azure DNS, and GCP Cloud DNS - automating record creation, weighted routing, and health checks.

## Introduction

DNS management with OpenTofu covers hosted zones, record sets, and routing policies. Route53, Azure DNS, and GCP Cloud DNS all have OpenTofu providers. Managing DNS as code ensures records are versioned, reviewable, and reproducible across environments.

## AWS Route53

### Hosted Zone

```hcl
# Public hosted zone

resource "aws_route53_zone" "public" {
  name = var.domain_name  # "example.com"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# Private hosted zone (for internal service discovery)
resource "aws_route53_zone" "private" {
  name = "internal.${var.domain_name}"

  vpc {
    vpc_id = aws_vpc.main.id
  }

  tags = { Environment = var.environment }
}
```

### Record Sets

```hcl
# A record
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# CNAME record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["app.${var.domain_name}"]
}

# Multiple A records (simple routing with multiple values)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  records = aws_instance.api[*].public_ip
}
```

### Weighted Routing (Blue/Green)

These weighted records are an alternative to the simple `app` record above - Route53 does not allow weighted and non-weighted records with the same name and type in the same hosted zone.

```hcl
resource "aws_route53_record" "blue" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "app.${var.domain_name}"
  type           = "A"
  set_identifier = "blue"

  weighted_routing_policy {
    weight = var.blue_weight  # Relative weight: 90 out of a total of 100
  }

  alias {
    name                   = aws_lb.blue.dns_name
    zone_id                = aws_lb.blue.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "green" {
  zone_id        = aws_route53_zone.public.zone_id
  name           = "app.${var.domain_name}"
  type           = "A"
  set_identifier = "green"

  weighted_routing_policy {
    weight = var.green_weight  # Relative weight: 10 out of a total of 100
  }

  alias {
    name                   = aws_lb.green.dns_name
    zone_id                = aws_lb.green.zone_id
    evaluate_target_health = true
  }
}
```

### Health Checks

```hcl
resource "aws_route53_health_check" "app" {
  fqdn              = "app.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "app-health-check" }
}
```

## Azure DNS

```hcl
resource "azurerm_dns_zone" "main" {
  name                = var.domain_name
  resource_group_name = azurerm_resource_group.main.name
  tags                = { Environment = var.environment }
}

resource "azurerm_dns_a_record" "app" {
  name                = "app"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  records             = [azurerm_public_ip.app.ip_address]
}

resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  record              = "app.${var.domain_name}"
}
```

## GCP Cloud DNS

```hcl
resource "google_dns_managed_zone" "main" {
  name        = replace(var.domain_name, ".", "-")
  dns_name    = "${var.domain_name}."  # Note: trailing dot required
  description = "Public DNS zone for ${var.domain_name}"

  dnssec_config {
    state = "on"  # Enable DNSSEC
  }

  labels = { environment = var.environment }
}

resource "google_dns_record_set" "app" {
  managed_zone = google_dns_managed_zone.main.name
  name         = "app.${var.domain_name}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.app.address]
}
```

## Outputs: Nameservers for Delegation

```hcl
output "route53_nameservers" {
  value       = aws_route53_zone.public.name_servers
  description = "Configure these at your domain registrar"
}

output "azure_dns_nameservers" {
  value = azurerm_dns_zone.main.name_servers
}

output "gcp_dns_nameservers" {
  value = google_dns_managed_zone.main.name_servers
}
```

## Conclusion

DNS management with OpenTofu enables version-controlled, peer-reviewed DNS changes. AWS Route53 supports advanced routing policies (weighted, latency, failover) with health checks. Azure DNS and GCP Cloud DNS provide simpler record management with high availability. Always output nameservers after creating public zones - if the domain is registered elsewhere, these must be configured at your domain registrar or parent DNS zone to delegate the domain or subdomain. Use private hosted zones for internal service discovery within VPCs.
