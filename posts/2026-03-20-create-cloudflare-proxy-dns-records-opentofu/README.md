# How to Create Cloudflare Proxy DNS Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloudflare, DNS, Proxy, Infrastructure as Code

Description: Learn how to create Cloudflare DNS records with proxy enabled using OpenTofu to route traffic through Cloudflare's network for DDoS protection and performance.

Cloudflare's orange-cloud proxied records route traffic through Cloudflare before reaching your origin, enabling DDoS protection, WAF, caching, and performance optimization. Managing these records in OpenTofu ensures proxy settings are consistently applied.

## Provider Configuration

```hcl
terraform {
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
```

## Zone Reference

```hcl
data "cloudflare_zone" "main" {
  name = "example.com"
}
```

## Proxied A Record (Orange Cloud)

```hcl
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  content = var.origin_ip
  type    = "A"
  proxied = true   # Route through Cloudflare - enables DDoS protection, WAF, caching
  ttl     = 1      # TTL is managed by Cloudflare when proxied (set to 1 = Auto)
}

# DNS-only (grey cloud) - bypasses Cloudflare

resource "cloudflare_record" "mail" {
  zone_id = data.cloudflare_zone.main.id
  name    = "mail"
  content = var.mail_server_ip
  type    = "A"
  proxied = false  # DNS only - mail servers cannot be proxied
  ttl     = 300
}
```

## Proxied CNAME Record

```hcl
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api"
  content = "api.example-origin.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# Root domain CNAME flatten (Cloudflare supports this, Route53 does not)
resource "cloudflare_record" "apex" {
  zone_id = data.cloudflare_zone.main.id
  name    = "example.com"
  content = "loadbalancer.us-east-1.elb.amazonaws.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
```

## Multiple Subdomains

```hcl
locals {
  proxied_subdomains = {
    "www"    = var.origin_ip
    "app"    = var.origin_ip
    "api"    = var.api_origin_ip
    "admin"  = var.admin_origin_ip
  }

  unproxied_subdomains = {
    "mail"   = var.mail_ip
    "smtp"   = var.smtp_ip
    "ftp"    = var.ftp_ip
  }
}

resource "cloudflare_record" "proxied" {
  for_each = local.proxied_subdomains

  zone_id = data.cloudflare_zone.main.id
  name    = each.key
  content = each.value
  type    = "A"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "unproxied" {
  for_each = local.unproxied_subdomains

  zone_id = data.cloudflare_zone.main.id
  name    = each.key
  content = each.value
  type    = "A"
  proxied = false
  ttl     = 300
}
```

## Page Rules for Proxy Behavior

```hcl
resource "cloudflare_page_rule" "force_https" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "http://*.example.com/*"
  priority = 1

  actions {
    always_use_https = true
  }
}

resource "cloudflare_page_rule" "cache_static" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "example.com/static/*"
  priority = 2

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 86400
  }
}
```

## Cloudflare Tunnel Record

```hcl
resource "cloudflare_tunnel" "main" {
  account_id = var.cloudflare_account_id
  name       = "production-tunnel"
  secret     = var.tunnel_secret
}

resource "cloudflare_record" "tunnel" {
  zone_id = data.cloudflare_zone.main.id
  name    = "internal"
  content = "${cloudflare_tunnel.main.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
```

## Conclusion

Cloudflare proxied DNS records in OpenTofu give you version-controlled control over which subdomains route through Cloudflare's network. Enable proxying for public-facing services to get DDoS protection, WAF, and performance features. Keep mail, FTP, and other non-HTTP services as DNS-only to avoid protocol conflicts with the Cloudflare proxy.
