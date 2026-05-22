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
      version = "~> 5.0"
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
resource "cloudflare_dns_record" "root" {
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

resource "cloudflare_dns_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_dns_record" "api" {
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
resource "cloudflare_dns_record" "mx_primary" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "mail1.example.com"
  type     = "MX"
  priority = 10
}

resource "cloudflare_dns_record" "mx_secondary" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "mail2.example.com"
  type     = "MX"
  priority = 20
}

# SPF record
resource "cloudflare_dns_record" "spf" {
  zone_id = var.zone_id
  name    = "@"
  content = "v=spf1 include:_spf.google.com ~all"
  type    = "TXT"
}
```

## Zone Settings

```hcl
# zone-settings.tf - Configure zone-wide settings
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = var.zone_id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = var.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = var.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "automatic_https_rewrites" {
  zone_id    = var.zone_id
  setting_id = "automatic_https_rewrites"
  value      = "on"
}

resource "cloudflare_zone_setting" "brotli" {
  zone_id    = var.zone_id
  setting_id = "brotli"
  value      = "on"
}

resource "cloudflare_zone_setting" "minify" {
  zone_id    = var.zone_id
  setting_id = "minify"
  value = {
    css  = "on"
    js   = "on"
    html = "on"
  }
}

resource "cloudflare_zone_setting" "security_level" {
  zone_id    = var.zone_id
  setting_id = "security_level"
  value      = "medium"
}

resource "cloudflare_zone_setting" "browser_check" {
  zone_id    = var.zone_id
  setting_id = "browser_check"
  value      = "on"
}

resource "cloudflare_zone_setting" "challenge_ttl" {
  zone_id    = var.zone_id
  setting_id = "challenge_ttl"
  value      = 1800
}

resource "cloudflare_zone_setting" "waf" {
  zone_id    = var.zone_id
  setting_id = "waf"
  value      = "on"
}

resource "cloudflare_zone_setting" "browser_cache_ttl" {
  zone_id    = var.zone_id
  setting_id = "browser_cache_ttl"
  value      = 14400
}

resource "cloudflare_zone_setting" "cache_level" {
  zone_id    = var.zone_id
  setting_id = "cache_level"
  value      = "aggressive"
}
```

## SSL/TLS Configuration

```hcl
# ssl.tf - SSL certificate management
# Full (strict) SSL ensures end-to-end encryption
resource "cloudflare_zone_setting" "strict_ssl" {
  zone_id    = var.zone_id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "strict_min_tls_version" {
  zone_id    = var.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "tls_1_3" {
  zone_id    = var.zone_id
  setting_id = "tls_1_3"
  value      = "on"
}

resource "cloudflare_zone_setting" "zero_rtt" {
  zone_id    = var.zone_id
  setting_id = "0rtt"
  value      = "on"
}
```

## Firewall Rules

```hcl
# firewall.tf - Cloudflare WAF custom rules
resource "cloudflare_ruleset" "zone_custom_firewall" {
  zone_id = var.zone_id
  name    = "Zone custom firewall rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules = [{
    ref         = "block_high_threat_score"
    description = "Block high threat score requests except verified bots"
    expression  = "(cf.threat_score gt 50 and not cf.client.bot)"
    action      = "block"
  }]
}
```

## Page Rules

```hcl
# page-rules.tf - URL-based behavior rules
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = var.zone_id
  target   = "${var.domain}/static/*"
  priority = 1

  actions = {
    cache_level       = "cache_everything"
    browser_cache_ttl = 86400
    edge_cache_ttl    = 604800
  }
}

resource "cloudflare_page_rule" "no_cache_api" {
  zone_id  = var.zone_id
  target   = "${var.domain}/api/*"
  priority = 2

  actions = {
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
    root = cloudflare_dns_record.root.name
    www  = cloudflare_dns_record.www.name
    api  = cloudflare_dns_record.api.name
  }
}
```

## Conclusion

The Cloudflare provider gives you comprehensive control over your web infrastructure. By managing DNS, CDN, SSL, and security settings as code, you ensure consistency and can replicate configurations across zones. For more specific topics, see our guides on [Cloudflare DNS records](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-dns-records-with-terraform/view), [page rules](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-page-rules-with-terraform/view), [Workers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-workers-with-terraform/view), and [access policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-access-policies-with-terraform/view).
