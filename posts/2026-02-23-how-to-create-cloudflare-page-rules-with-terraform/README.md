# How to Create Cloudflare Page Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare, Page Rules, CDN, Caching, Infrastructure as Code

Description: Learn how to create Cloudflare page rules with Terraform for URL-based caching, redirects, security settings, and performance optimization on a per-path basis.

---

Cloudflare page rules let you customize Cloudflare behavior for specific URL patterns. You can set caching rules, create redirects, enforce HTTPS, disable security features for specific paths, and much more. Managing page rules with Terraform ensures they are documented, version-controlled, and consistently applied across your domains.

In this guide, we will create various Cloudflare page rules with Terraform covering caching strategies, redirect rules, security overrides, and performance optimization.

## Provider Setup

```hcl
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
  type = string
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Caching Static Assets

```hcl
# cache-static.tf - Aggressive caching for static files
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = var.zone_id
  target   = "${var.domain}/static/*"
  priority = 1

  actions {
    cache_level       = "cache_everything"
    browser_cache_ttl = 86400    # 1 day browser cache
    edge_cache_ttl    = 2592000  # 30 days edge cache
  }
}

resource "cloudflare_page_rule" "cache_images" {
  zone_id  = var.zone_id
  target   = "${var.domain}/images/*"
  priority = 2

  actions {
    cache_level       = "cache_everything"
    browser_cache_ttl = 604800   # 7 days
    edge_cache_ttl    = 2592000  # 30 days
  }
}
```

## Bypassing Cache for API Routes

```hcl
# bypass-api.tf - No caching for API endpoints
resource "cloudflare_page_rule" "bypass_api" {
  zone_id  = var.zone_id
  target   = "${var.domain}/api/*"
  priority = 3

  actions {
    cache_level          = "bypass"
    disable_performance  = true
  }
}

resource "cloudflare_page_rule" "bypass_admin" {
  zone_id  = var.zone_id
  target   = "${var.domain}/admin/*"
  priority = 4

  actions {
    cache_level = "bypass"
    security_level = "high"
  }
}
```

## URL Forwarding and Redirects

```hcl
# redirects.tf - URL forwarding rules
resource "cloudflare_page_rule" "www_redirect" {
  zone_id  = var.zone_id
  target   = "www.${var.domain}/*"
  priority = 5

  actions {
    forwarding_url {
      url         = "https://${var.domain}/$1"
      status_code = 301
    }
  }
}

resource "cloudflare_page_rule" "old_blog_redirect" {
  zone_id  = var.zone_id
  target   = "${var.domain}/blog/old/*"
  priority = 6

  actions {
    forwarding_url {
      url         = "https://${var.domain}/blog/$1"
      status_code = 301
    }
  }
}
```

## Forcing HTTPS

```hcl
# force-https.tf - Always use HTTPS
resource "cloudflare_page_rule" "force_https" {
  zone_id  = var.zone_id
  target   = "http://${var.domain}/*"
  priority = 7

  actions {
    always_use_https = true
  }
}
```

## Security Overrides for Specific Paths

```hcl
# security.tf - Path-specific security settings
resource "cloudflare_page_rule" "webhook_security" {
  zone_id  = var.zone_id
  target   = "${var.domain}/webhooks/*"
  priority = 8

  actions {
    # Relax security for webhook endpoints
    security_level   = "essentially_off"
    browser_check    = "off"
    cache_level      = "bypass"
  }
}

resource "cloudflare_page_rule" "login_security" {
  zone_id  = var.zone_id
  target   = "${var.domain}/login*"
  priority = 9

  actions {
    security_level = "high"
    cache_level    = "bypass"
    browser_check  = "on"
  }
}
```

## Dynamic Page Rules for Multiple Paths

```hcl
# dynamic-rules.tf - Generate rules from a variable
variable "cache_rules" {
  type = map(object({
    pattern           = string
    cache_level       = string
    browser_cache_ttl = number
    edge_cache_ttl    = number
    priority          = number
  }))
  default = {
    "assets" = {
      pattern           = "*.example.com/assets/*"
      cache_level       = "cache_everything"
      browser_cache_ttl = 86400
      edge_cache_ttl    = 2592000
      priority          = 10
    }
    "fonts" = {
      pattern           = "*.example.com/fonts/*"
      cache_level       = "cache_everything"
      browser_cache_ttl = 2592000
      edge_cache_ttl    = 2592000
      priority          = 11
    }
    "js" = {
      pattern           = "*.example.com/*.js"
      cache_level       = "cache_everything"
      browser_cache_ttl = 86400
      edge_cache_ttl    = 604800
      priority          = 12
    }
  }
}

resource "cloudflare_page_rule" "dynamic" {
  for_each = var.cache_rules

  zone_id  = var.zone_id
  target   = each.value.pattern
  priority = each.value.priority

  actions {
    cache_level       = each.value.cache_level
    browser_cache_ttl = each.value.browser_cache_ttl
    edge_cache_ttl    = each.value.edge_cache_ttl
  }
}
```

## Outputs

```hcl
output "page_rule_ids" {
  value = {
    static  = cloudflare_page_rule.cache_static.id
    api     = cloudflare_page_rule.bypass_api.id
    https   = cloudflare_page_rule.force_https.id
  }
}
```

## Conclusion

Cloudflare page rules give you URL-level control over caching, security, and routing behavior. By managing them with Terraform, you can review changes before they take effect and maintain a clear record of your CDN configuration. Note that Cloudflare limits free plans to 3 page rules, so plan accordingly. For the complete Cloudflare setup, see our guides on [DNS records](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-dns-records-with-terraform/view) and [Cloudflare Workers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-workers-with-terraform/view).
