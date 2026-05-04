# How to Create GCP Cloud Armor Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud Armor, WAF, Infrastructure as Code

Description: Learn how to create GCP Cloud Armor security policies with OpenTofu to protect Cloud Load Balancing backends from DDoS attacks and web exploits.

GCP Cloud Armor provides DDoS protection and WAF capabilities for services behind Cloud Load Balancing. Managing security policies in OpenTofu ensures consistent protection rules across your globally distributed backends.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}
```

## Basic Security Policy

```hcl
resource "google_compute_security_policy" "main" {
  name        = "myapp-security-policy"
  description = "Security policy for myapp production"

  # Default rule - allow all traffic
  rule {
    action   = "allow"
    priority = "2147483647"  # Maximum value = default rule

    match {
      versioned_expr = "SRC_IPS_V1"

      config {
        src_ip_ranges = ["*"]  # All IPs
      }
    }

    description = "Default allow rule"
  }
}
```

## IP Allowlist and Blocklist

```hcl
resource "google_compute_security_policy" "with_ip_rules" {
  name = "ip-filtered-policy"

  # Block specific malicious IPs (higher priority = evaluated first)
  rule {
    action   = "deny(403)"
    priority = 100

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = var.blocked_ips
      }
    }

    description = "Block known malicious IPs"
  }

  # Allow only office and VPN IPs to access admin paths
  rule {
    action   = "allow"
    priority = 200

    match {
      expr {
        expression = "request.path.startsWith('/admin') && inIpRange(origin.ip, '203.0.113.0/24')"
      }
    }

    description = "Allow admin access from office IPs"
  }

  # Block admin access from all other IPs
  rule {
    action   = "deny(403)"
    priority = 201

    match {
      expr {
        expression = "request.path.startsWith('/admin')"
      }
    }

    description = "Block admin access from non-office IPs"
  }

  # Default allow
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
    description = "Default allow"
  }
}
```

## Pre-Configured WAF Rules (Cloud Armor Managed Protection)

```hcl
resource "google_compute_security_policy" "waf_policy" {
  name = "waf-managed-policy"

  # Enable Cloud Armor Adaptive Protection (Layer 7 DDoS defense)
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable          = true
      rule_visibility = "STANDARD"
    }
  }

  # Pre-configured SQL injection protection
  rule {
    action   = "deny(403)"
    priority = 1000

    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable')"
      }
    }

    description = "SQL injection protection"
  }

  # XSS protection
  rule {
    action   = "deny(403)"
    priority = 1001

    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable')"
      }
    }

    description = "Cross-site scripting protection"
  }

  # Rate limiting (evaluated after WAF rules so malicious requests are blocked first)
  rule {
    action   = "throttle"
    priority = 2000

    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }

      enforce_on_key = "IP"
    }

    description = "Rate limit to 1000 req/min per IP"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
    description = "Default allow"
  }
}
```

## Attach Policy to Backend Service

```hcl
resource "google_compute_backend_service" "app" {
  name          = "myapp-backend"
  protocol      = "HTTP"
  port_name     = "http"
  timeout_sec   = 30

  backend {
    group = google_compute_instance_group_manager.app.instance_group
  }

  security_policy = google_compute_security_policy.waf_policy.self_link

  health_checks = [google_compute_health_check.app.id]
}
```

## Conclusion

GCP Cloud Armor security policies in OpenTofu provide layered DDoS and WAF protection for global load balancers. Use pre-configured WAF rules for OWASP Top 10 coverage, add rate limiting with throttle actions for DDoS mitigation, and define custom CEL expressions for application-specific rules. Attach policies to backend services to activate protection for your GKE, Cloud Run, and Compute Engine workloads.
