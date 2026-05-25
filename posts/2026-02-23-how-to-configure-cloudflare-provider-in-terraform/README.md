# How to Configure Cloudflare Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare, DNS, CDN, Provider, Infrastructure as Code

Description: Learn how to configure the Terraform Cloudflare provider to manage DNS records, firewall rules, page rules, and other Cloudflare resources as infrastructure code.

---

Cloudflare manages DNS, CDN, DDoS protection, and a growing list of edge services for millions of domains. Managing all of that through the web dashboard works for a few domains, but it does not scale. The Terraform Cloudflare provider lets you define your Cloudflare configuration as code, bringing version control, peer review, and automation to your DNS records, firewall rules, page rules, and more.

## Prerequisites

You need a Cloudflare account and an API token. The old API key method still works but tokens are the recommended approach because they support fine-grained permissions.

### Creating an API Token

1. Go to the Cloudflare dashboard
2. Navigate to My Profile > API Tokens
3. Click "Create Token"
4. Choose a template or create a custom token

For Terraform, create a custom token with the permissions required for the resources you manage. For the examples in this guide, that can include:

- **Zone - DNS - Edit** (to manage DNS records)
- **Zone - Zone Settings - Edit** (to manage zone settings)
- **Zone - Zone - Read** (to look up zone IDs)
- **Zone - WAF - Edit** (to manage WAF custom rules)
- **Zone - Page Rules - Edit** (to manage page rules)
- **Account - Workers Scripts - Edit** (to manage Worker scripts)
- **Zone - Workers Routes - Edit** (to manage Worker routes)
- **Account - Account Settings - Read** (if managing account-level resources)

Or for broader zone access during initial setup:

- **Zone - Zone - Edit** and **Zone - DNS - Edit** for all zones

```bash
# Store the token securely

export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# provider.tf
provider "cloudflare" {
  # Reads from CLOUDFLARE_API_TOKEN environment variable
}
```

If you prefer to pass the token explicitly:

```hcl
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}
```

### Using API Key (Legacy Method)

```hcl
provider "cloudflare" {
  api_email = var.cloudflare_email
  api_key   = var.cloudflare_api_key
}
```

API keys have full account access, so tokens are preferred for production use.

## Looking Up Zone Information

Most Cloudflare resources need a zone ID. Look it up with a data source:

```hcl
# Look up the zone by domain name
data "cloudflare_zones" "example" {
  name = "example.com"
}

# Use the zone ID in resources
output "zone_id" {
  value = data.cloudflare_zones.example.result[0].id
}
```

Or use a variable if you already know the zone ID:

```hcl
variable "zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}
```

## Managing DNS Records

DNS records are probably the most common Cloudflare resource managed through Terraform:

```hcl
# A record pointing to a server
resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "www.example.com"
  content = "203.0.113.50"
  type    = "A"
  ttl     = 1
  proxied = true  # Route through Cloudflare's CDN/proxy
}

# AAAA record for IPv6
resource "cloudflare_dns_record" "www_ipv6" {
  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "www.example.com"
  content = "2001:db8::1"
  type    = "AAAA"
  ttl     = 1
  proxied = true
}

# CNAME for a subdomain
resource "cloudflare_dns_record" "blog" {
  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "blog.example.com"
  content = "blog-platform.example.net"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# MX records for email
resource "cloudflare_dns_record" "mx_primary" {
  zone_id  = data.cloudflare_zones.example.result[0].id
  name     = "example.com"
  content  = "mx1.mailprovider.com"
  type     = "MX"
  priority = 10
  ttl      = 300
}

resource "cloudflare_dns_record" "mx_secondary" {
  zone_id  = data.cloudflare_zones.example.result[0].id
  name     = "example.com"
  content  = "mx2.mailprovider.com"
  type     = "MX"
  priority = 20
  ttl      = 300
}

# TXT record for SPF
resource "cloudflare_dns_record" "spf" {
  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "example.com"
  content = "v=spf1 include:_spf.mailprovider.com ~all"
  type    = "TXT"
  ttl     = 300
}

# TXT record for domain verification
resource "cloudflare_dns_record" "verification" {
  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "example.com"
  content = "google-site-verification=abc123..."
  type    = "TXT"
  ttl     = 300
}
```

## Managing Multiple DNS Records with for_each

For managing many records, use `for_each`:

```hcl
locals {
  dns_records = {
    # A records
    "api" = {
      type    = "A"
      content = "203.0.113.10"
      proxied = true
    }
    "admin" = {
      type    = "A"
      content = "203.0.113.11"
      proxied = true
    }
    # CNAME records
    "docs" = {
      type    = "CNAME"
      content = "docs-host.example.net"
      proxied = true
    }
    "status" = {
      type    = "CNAME"
      content = "status.example.net"
      proxied = false
    }
  }
}

resource "cloudflare_dns_record" "records" {
  for_each = local.dns_records

  zone_id = data.cloudflare_zones.example.result[0].id
  name    = "${each.key}.example.com"
  type    = each.value.type
  content = each.value.content
  proxied = each.value.proxied
  ttl     = each.value.proxied ? 1 : 300  # Auto TTL when proxied
}
```

## Configuring Zone Settings

Manage zone-level settings:

```hcl
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "http2" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "http2"
  value      = "on"
}

resource "cloudflare_zone_setting" "http3" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "http3"
  value      = "on"
}

resource "cloudflare_zone_setting" "security_level" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "security_level"
  value      = "medium"
}

resource "cloudflare_zone_setting" "browser_cache_ttl" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "browser_cache_ttl"
  value      = 14400
}

resource "cloudflare_zone_setting" "minify" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "minify"
  value = {
    css  = "on"
    js   = "on"
    html = "on"
  }
}

resource "cloudflare_zone_setting" "brotli" {
  zone_id    = data.cloudflare_zones.example.result[0].id
  setting_id = "brotli"
  value      = "on"
}
```

## Firewall Rules and WAF

Protect your site with firewall rules:

```hcl
# Create a firewall rule to block known bad bots
resource "cloudflare_ruleset" "waf_custom" {
  zone_id     = data.cloudflare_zones.example.result[0].id
  name        = "Custom WAF Rules"
  description = "Custom firewall rules"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [{
    action      = "block"
    expression  = "(http.user_agent contains \"BadBot\") or (http.user_agent contains \"ScrapeBot\")"
    description = "Block known bad bots"
    enabled     = true
  },

  {
    action      = "challenge"
    expression  = "(ip.geoip.country eq \"XX\")"
    description = "Challenge traffic from specific countries"
    enabled     = true
  },

  {
    action      = "block"
    expression  = "(http.request.uri.path contains \"/wp-admin\" and not ip.src in {10.0.0.0/8})"
    description = "Block wp-admin access from outside"
    enabled     = true
  }]
}
```

## Page Rules

Configure page-specific behavior:

```hcl
# Redirect www to naked domain
resource "cloudflare_page_rule" "www_redirect" {
  zone_id  = data.cloudflare_zones.example.result[0].id
  target   = "www.example.com/*"
  priority = 1

  actions = {
    forwarding_url = {
      url         = "https://example.com/$1"
      status_code = 301
    }
  }
}

# Cache everything for static assets
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = data.cloudflare_zones.example.result[0].id
  target   = "example.com/static/*"
  priority = 2

  actions = {
    cache_level       = "cache_everything"
    edge_cache_ttl    = 86400
    browser_cache_ttl = 14400
  }
}
```

## Workers

Deploy Cloudflare Workers:

```hcl
# Worker script
resource "cloudflare_workers_script" "api_gateway" {
  account_id         = var.cloudflare_account_id
  script_name        = "api-gateway"
  body_part          = "api-gateway.js"
  compatibility_date = "2026-05-25"
  files              = [file("${path.module}/workers/api-gateway.js")]

  # Environment variables for the worker
  bindings = [{
    name = "API_ENDPOINT"
    text = "https://api.internal.example.com"
    type = "plain_text"
  },

  {
    name = "API_KEY"
    text = var.api_key
    type = "secret_text"
  }]
}

# Route the worker to specific URLs
resource "cloudflare_workers_route" "api" {
  zone_id = data.cloudflare_zones.example.result[0].id
  pattern = "example.com/api/*"
  script  = cloudflare_workers_script.api_gateway.script_name
}
```

## Managing Multiple Zones

Use provider aliases or iterate over zones:

```hcl
locals {
  zones = {
    "example.com"    = { plan = "pro" }
    "example.org"    = { plan = "free" }
    "mycompany.com"  = { plan = "business" }
  }
}

data "cloudflare_zones" "zones" {
  for_each = local.zones
  name     = each.key
}

# Apply the same DNS record to all zones
resource "cloudflare_dns_record" "txt_verification" {
  for_each = data.cloudflare_zones.zones

  zone_id = each.value.result[0].id
  name    = each.key
  content = "v=spf1 include:_spf.mailprovider.com ~all"
  type    = "TXT"
  ttl     = 300
}
```

## Importing Existing Resources

If you already have Cloudflare resources configured in the dashboard, import them:

```bash
# Import a DNS record
terraform import cloudflare_dns_record.www ZONE_ID/RECORD_ID

# Find record IDs with the API
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" | jq '.result[] | {id, name, type, content}'
```

Or use the `cf-terraforming` tool to generate Terraform configuration from existing resources:

```bash
# Install cf-terraforming
go install github.com/cloudflare/cf-terraforming/cmd/cf-terraforming@latest

# Generate Terraform config for all DNS records
cf-terraforming generate --resource-type cloudflare_dns_record --zone ZONE_ID

# Generate import commands
cf-terraforming import --resource-type cloudflare_dns_record --zone ZONE_ID
```

## Summary

The Cloudflare provider brings DNS records, firewall rules, page rules, Workers, and zone settings under version control. Start with an API token scoped to the permissions you need, look up zone IDs with data sources, and build up from DNS records to more advanced features like WAF rules and Workers. For teams managing multiple domains, the ability to apply consistent policies across all zones through Terraform is a significant operational improvement over clicking through the dashboard.
