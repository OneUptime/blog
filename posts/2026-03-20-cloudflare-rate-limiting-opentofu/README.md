# How to Configure Cloudflare Rate Limiting with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloudflare, Rate Limiting, Security, Infrastructure as Code, DDoS Protection, WAF

Description: Learn how to configure Cloudflare rate limiting rules using OpenTofu to protect your APIs and web applications from abuse, credential stuffing, and DDoS attacks.

---

Cloudflare rate limiting sits at the edge, blocking abusive traffic before it reaches your origin servers. With the Cloudflare provider in OpenTofu, rate limiting rules are defined as code, reviewed in pull requests, and applied consistently across zones.

## Provider Configuration

```hcl
# main.tf

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.43"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

## Creating Rate Limiting Rules

Cloudflare uses rulesets in the `http_ratelimit` phase for modern rate limiting.

```hcl
# rate_limiting.tf
# Rate limit the login endpoint to prevent credential stuffing
resource "cloudflare_ruleset" "rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "Rate Limiting Rules"
  description = "Rate limiting rules to prevent abuse"
  kind        = "zone"
  phase       = "http_ratelimit"

  # Rule 1: Limit login attempts - 5 per minute per IP
  rules {
    action      = "block"
    description = "Block excessive login attempts"
    enabled     = true

    expression = "(http.request.uri.path eq \"/api/auth/login\" and http.request.method eq \"POST\")"

    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 60          # 1-minute window
      requests_per_period = 5           # Max 5 requests per minute
      mitigation_timeout  = 300         # Block for 5 minutes after threshold

      # Count only failed login attempts
      counting_expression = "(http.request.uri.path eq \"/api/auth/login\" and http.request.method eq \"POST\" and http.response.code in {401 403})"
    }
  }

  # Rule 2: Global API rate limit - 100 requests per minute per IP
  rules {
    action      = "block"
    description = "Global API rate limit"
    enabled     = true

    expression = "starts_with(http.request.uri.path, \"/api/\")"

    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 60
      requests_per_period = 100
      mitigation_timeout  = 60
    }
  }

  # Rule 3: Registration rate limit - prevent account creation spam
  rules {
    action      = "block"
    description = "Limit new account registrations"
    enabled     = true

    expression = "(http.request.uri.path eq \"/api/auth/register\" and http.request.method eq \"POST\")"

    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 3600    # 1 hour window
      requests_per_period = 3       # Max 3 registrations per hour per IP
      mitigation_timeout  = 3600
    }
  }
}
```

## Custom Error Response for Rate-Limited Requests

```hcl
# Add this block to a rate limiting rule to return JSON instead of Cloudflare's default HTML page
action_parameters {
  response {
    status_code  = 429
    content_type = "application/json"
    content      = "{\"error\": \"rate_limit_exceeded\", \"message\": \"Too many requests. Please try again later.\"}"
  }
}
```

## Custom Rules for IP Allowlisting

```hcl
# custom_rules.tf
# Allow monitoring and health check IPs to bypass rate limiting
resource "cloudflare_ruleset" "bypass_rules" {
  zone_id     = var.cloudflare_zone_id
  name        = "Bypass Rules"
  description = "Bypass rate limiting for trusted sources"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "skip"
    description = "Skip rate limiting for monitoring IPs"
    enabled     = true

    expression = "ip.src in {${join(" ", var.trusted_ips)}}"

    action_parameters {
      phases = ["http_ratelimit"]
    }
  }
}
```

## Best Practices

- Tune rate limits using Cloudflare Analytics before enabling block mode - observe actual traffic patterns first.
- Include `cf.colo.id` in Terraform/API rate limiting characteristics, and use `cf.unique_visitor_id` instead of `ip.src` when you need NAT-aware visitor tracking.
- Set `mitigation_timeout` based on the behavior you want: `0` throttles only over-limit requests, while values greater than `0` apply the action for the full timeout.
- Return JSON error responses (not HTML) for API endpoints - clients need machine-readable errors.
- Exempt health check endpoints from rate limiting to prevent false monitoring alerts.
