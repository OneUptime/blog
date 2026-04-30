# How to Manage IPv6 DNS Records with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, IPv6, DNS, AAAA Records, Infrastructure as Code, Multi-Cloud

Description: A guide to managing IPv6 AAAA DNS records across multiple DNS providers using Terraform, with examples for Route 53, Cloudflare, and Google Cloud DNS.

Managing IPv6 DNS records with Terraform ensures your AAAA records stay in sync with your infrastructure and are version-controlled. This guide covers AAAA record management across AWS Route 53, Cloudflare, and Google Cloud DNS.

## AWS Route 53 AAAA Records

```hcl
# route53-aaaa.tf - AAAA record in AWS Route 53

data "aws_route53_zone" "main" {
  name = "example.com."
}

resource "aws_route53_record" "web_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "AAAA"
  ttl     = 300

  # Single IPv6 address
  records = ["2001:db8::1"]
}

# AAAA alias record pointing to an AWS ALB (dualstack)
resource "aws_route53_record" "app_aaaa_alias" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "AAAA"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Cloudflare AAAA Records

```hcl
# cloudflare-aaaa.tf - AAAA records in Cloudflare DNS
data "cloudflare_zone" "main" {
  filter = {
    name = "example.com"
  }
}

resource "cloudflare_dns_record" "api_aaaa" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  content = "2001:db8::2"
  ttl     = 1       # Auto-TTL when proxied
  proxied = true    # Route through Cloudflare's proxy
}
```

## Google Cloud DNS AAAA Records

```hcl
# gcloud-dns-aaaa.tf - AAAA record in Google Cloud DNS
resource "google_dns_managed_zone" "main" {
  name     = "example-com-zone"
  dns_name = "example.com."
}

resource "google_dns_record_set" "web_aaaa" {
  name         = "www.example.com."
  type         = "AAAA"
  ttl          = 300
  managed_zone = google_dns_managed_zone.main.name
  rrdatas      = ["2001:db8::1"]
}
```

## Managing AAAA Records Across Multiple Providers

Use a Terraform module to standardize AAAA record creation across providers:

```hcl
# modules/aaaa-record/main.tf - Reusable AAAA record module
variable "providers_to_use" {
  type    = list(string)
  default = ["route53", "cloudflare"]
}

variable "hostname" {
  type = string
}

variable "ipv6_address" {
  type = string
}

variable "ttl" {
  type    = number
  default = 300
}

variable "route53_zone_id" {
  type    = string
  default = null
}

variable "cloudflare_zone_id" {
  type    = string
  default = null
}

# Create in Route 53
resource "aws_route53_record" "aaaa" {
  count   = contains(var.providers_to_use, "route53") ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.hostname
  type    = "AAAA"
  ttl     = var.ttl
  records = [var.ipv6_address]
}

# Create in Cloudflare
resource "cloudflare_dns_record" "aaaa" {
  count   = contains(var.providers_to_use, "cloudflare") ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = var.hostname
  type    = "AAAA"
  content = var.ipv6_address
  ttl     = var.ttl
  proxied = false
}
```

## Automatic AAAA Record Updates

Link AAAA records directly to infrastructure outputs to keep DNS in sync:

```hcl
# auto-aaaa.tf - AAAA record that always reflects the current LB IPv6 address
resource "cloudflare_dns_record" "lb_aaaa" {
  zone_id = data.cloudflare_zone.main.id
  name    = "app.example.com"
  type    = "AAAA"

  # Automatically use the IPv6 from GCP forwarding rule
  content = google_compute_global_forwarding_rule.ipv6.ip_address

  proxied = false
  ttl     = 60     # Short TTL for fast failover
}
```

## Apply and Validate

```bash
terraform apply

# Verify AAAA resolution
dig AAAA www.example.com +short
dig AAAA api.example.com @8.8.8.8

# Test connectivity
curl -6 https://www.example.com/
```

Linking AAAA DNS records directly to infrastructure outputs in Terraform eliminates the manual step of updating DNS when IPv6 addresses change, preventing outages caused by stale records.
