# How to Configure GCP Armor Threat Intelligence with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, Threat Intelligence, OpenTofu, WAF, Security

Description: Learn how to configure GCP Cloud Armor Threat Intelligence with OpenTofu to leverage Google's threat intelligence feeds for blocking known malicious IPs, Tor exit nodes, and anonymizing proxies.

## Overview

Google Threat Intelligence in Cloud Armor is available to Cloud Armor Enterprise subscribers and lets you allow or block traffic to external Application Load Balancers based on Google's threat intelligence feeds, including Tor exit nodes, anonymous proxies, and known malicious IP addresses.

## Step 1: Create a Security Policy with Threat Intelligence

```hcl
# main.tf - Cloud Armor security policy with Threat Intelligence

resource "google_compute_security_policy" "threat_intel_policy" {
  name        = "threat-intelligence-policy"
  description = "Security policy with Threat Intelligence feeds enabled"
  type        = "CLOUD_ARMOR"

  # Adaptive Protection for DDoS and application attacks
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable          = true
      rule_visibility = "STANDARD"
    }
  }

  # Rule 1: Block known malicious IP addresses
  rule {
    action   = "deny(403)"
    priority = 1000
    description = "Block traffic from known malicious IP addresses"

    match {
      expr {
        # Threat intelligence expression for known malicious IP addresses
        expression = "evaluateThreatIntelligence('iplist-known-malicious-ips')"
      }
    }
  }

  # Rule 2: Block anonymous proxies
  rule {
    action   = "deny(403)"
    priority = 1100
    description = "Block traffic from anonymous proxies"

    match {
      expr {
        expression = "evaluateThreatIntelligence('iplist-anon-proxies')"
      }
    }
  }

  # Rule 3: Block Tor exit nodes
  rule {
    action   = "deny(403)"
    priority = 1200
    description = "Block Tor exit nodes"

    match {
      expr {
        expression = "evaluateThreatIntelligence('iplist-tor-exit-nodes')"
      }
    }
  }

  # Default allow rule
  rule {
    action   = "allow"
    priority = 2147483647
    description = "Default allow rule"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
```

## Step 2: Create a Combined Policy with WAF Rules

```hcl
# Combine OWASP Top 10 protection with Threat Intelligence
resource "google_compute_security_policy" "combined_policy" {
  name = "combined-security-policy"

  # OWASP SQL Injection protection
  rule {
    action   = "deny(403)"
    priority = 500

    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v422-stable')"
      }
    }
  }

  # OWASP XSS protection
  rule {
    action   = "deny(403)"
    priority = 510

    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v422-stable')"
      }
    }
  }

  # Threat Intelligence: known malicious IP addresses
  rule {
    action   = "deny(403)"
    priority = 1000

    match {
      expr {
        expression = "evaluateThreatIntelligence('iplist-known-malicious-ips')"
      }
    }
  }

  # Threat Intelligence: anonymous proxies
  rule {
    action   = "deny(403)"
    priority = 1100

    match {
      expr {
        expression = "evaluateThreatIntelligence('iplist-anon-proxies')"
      }
    }
  }

  # Threat Intelligence: Tor exit nodes
  rule {
    action   = "deny(403)"
    priority = 1200

    match {
      expr {
        expression = "evaluateThreatIntelligence('iplist-tor-exit-nodes')"
      }
    }
  }

  rule {
    action      = "allow"
    priority    = 2147483647
    description = "Default allow"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
```

## Step 3: Attach to Load Balancer Backend

```hcl
# Attach the security policy to a backend service
resource "google_compute_backend_service" "protected_backend" {
  name                  = "threat-intel-protected-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_instance_group_manager.web_mig.instance_group
  }

  health_checks = [google_compute_health_check.http_hc.self_link]

  # Apply the Cloud Armor security policy
  security_policy = google_compute_security_policy.combined_policy.self_link
}
```

## Summary

Cloud Armor Threat Intelligence with OpenTofu lets Cloud Armor Enterprise subscribers enforce Google's threat intelligence feeds directly in a backend security policy. By blocking Tor exit nodes, anonymous proxies, and known malicious IPs alongside OWASP protections, you create a comprehensive defense-in-depth approach that reduces attack surface without manually maintaining IP blocklists.
