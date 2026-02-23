# How to Use the Cloudflare Provider for DNS and CDN in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare, DNS, CDN, Infrastructure as Code, Security

Description: Learn how to use the Terraform Cloudflare provider to manage DNS records, CDN settings, page rules, workers, and access policies for comprehensive web infrastructure.

---

Cloudflare provides DNS, CDN, DDoS protection, and edge computing services. The Terraform Cloudflare provider lets you manage all of these services as code, ensuring your web infrastructure configuration is version-controlled, reviewable, and reproducible. From DNS records to page rules to Workers scripts, everything can be defined in Terraform.

In this guide, we will explore the Cloudflare provider for managing DNS records, CDN configuration, SSL settings, and zone-level security. This serves as a comprehensive overview with links to more specific guides for each feature.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Managing DNS Records

```hcl
# dns.tf - Create DNS records
resource "cloudflare_record" "root" {
  zone_id = var.zone_id
  name    = "@"
  content = var.origin_ip
  type    = "A"
  proxied = true  # Enable Cloudflare proxy (CDN + DDoS protection)
  ttl     = 1     # Auto TTL when proxied
}

variable "origin_ip" {
  type    = string
  default = "203.0.113.10"
}

resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  content = var.api_origin
  type    = "CNAME"
  proxied = true
}

variable "api_origin" {
  type    = string
  default = "api-origin.example.com"
}

# Mail records (not proxied)
resource "cloudflare_record" "mx_primary" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "mail1.example.com"
  type     = "MX"
  priority = 10
}

resource "cloudflare_record" "mx_secondary" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "mail2.example.com"
  type     = "MX"
  priority = 20
}

# SPF record
resource "cloudflare_record" "spf" {
  zone_id = var.zone_id
  name    = "@"
  content = "v=spf1 include:_spf.google.com ~all"
  type    = "TXT"
}
```

## Zone Settings

```hcl
# zone-settings.tf - Configure zone-wide settings
resource "cloudflare_zone_settings_override" "settings" {
  zone_id = var.zone_id

  settings {
    # SSL/TLS settings
    ssl                      = "strict"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"

    # Performance settings
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }
    brotli = "on"

    # Security settings
    security_level    = "medium"
    browser_check     = "on"
    challenge_ttl     = 1800
    waf               = "on"

    # Caching settings
    browser_cache_ttl = 14400
    cache_level       = "aggressive"
  }
}
```

## SSL/TLS Configuration

```hcl
# ssl.tf - SSL certificate management
# Full (strict) SSL ensures end-to-end encryption
resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = var.zone_id

  settings {
    ssl              = "strict"
    min_tls_version  = "1.2"
    tls_1_3          = "zrt"  # Zero Round Trip Time
  }
}
```

## Firewall Rules

```hcl
# firewall.tf - Cloudflare firewall rules
resource "cloudflare_filter" "block_bad_bots" {
  zone_id     = var.zone_id
  description = "Block known bad bots"
  expression  = "(cf.client.bot) or (cf.threat_score gt 50)"
}

resource "cloudflare_firewall_rule" "block_bad_bots" {
  zone_id     = var.zone_id
  description = "Block bad bots and high threat scores"
  filter_id   = cloudflare_filter.block_bad_bots.id
  action      = "block"
  priority    = 1
}

resource "cloudflare_filter" "rate_limit_api" {
  zone_id     = var.zone_id
  description = "Rate limit API requests"
  expression  = "(http.request.uri.path contains \"/api/\")"
}
```

## Page Rules

```hcl
# page-rules.tf - URL-based behavior rules
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = var.zone_id
  target   = "${var.domain}/static/*"
  priority = 1

  actions {
    cache_level       = "cache_everything"
    browser_cache_ttl = 86400
    edge_cache_ttl    = 604800
  }
}

resource "cloudflare_page_rule" "no_cache_api" {
  zone_id  = var.zone_id
  target   = "${var.domain}/api/*"
  priority = 2

  actions {
    cache_level = "bypass"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "nameservers" {
  description = "Cloudflare nameservers for the zone"
  value       = "Check Cloudflare dashboard for nameserver values"
}

output "dns_records" {
  value = {
    root = cloudflare_record.root.hostname
    www  = cloudflare_record.www.hostname
    api  = cloudflare_record.api.hostname
  }
}
```

## Conclusion

The Cloudflare provider gives you comprehensive control over your web infrastructure. By managing DNS, CDN, SSL, and security settings as code, you ensure consistency and can replicate configurations across zones. For more specific topics, see our guides on [Cloudflare DNS records](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-dns-records-with-terraform/view), [page rules](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-page-rules-with-terraform/view), [Workers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-workers-with-terraform/view), and [access policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-access-policies-with-terraform/view).
