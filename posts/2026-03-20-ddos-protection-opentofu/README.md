# How to Set Up DDoS Protection with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DDoS, Security, OpenTofu, AWS Shield, Azure DDoS, Cloud Armor

Description: Learn how to configure DDoS protection across AWS, Azure, and GCP using OpenTofu with AWS Shield Advanced, Azure DDoS Protection Standard, and GCP Cloud Armor.

## Overview

DDoS protection requires multiple layers: volumetric attack absorption at the network edge, rate limiting at the application layer, and automatic mitigation. OpenTofu configures DDoS protection services across cloud providers.

## Step 1: AWS Shield Advanced

```hcl
# main.tf - AWS Shield Advanced subscription

resource "aws_shield_subscription" "main" {
  auto_renew = "ENABLED"
}

# Associate Shield with protected resources
resource "aws_shield_protection" "alb" {
  name         = "alb-protection"
  resource_arn = aws_lb.app.arn

  depends_on = [aws_shield_subscription.main]
}

resource "aws_shield_protection" "cloudfront" {
  name         = "cloudfront-protection"
  resource_arn = aws_cloudfront_distribution.app.arn

  depends_on = [aws_shield_subscription.main]
}

# Shield Advanced protection group
resource "aws_shield_protection_group" "all_albs" {
  protection_group_id = "all-albs"
  aggregation         = "MAX"  # Report highest metric in group
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "APPLICATION_LOAD_BALANCER"

  depends_on = [aws_shield_subscription.main]
}

# WAFv2 rate-based rule for DDoS mitigation
resource "aws_wafv2_web_acl" "ddos" {
  name  = "ddos-protection"
  scope = "REGIONAL"

  default_action { allow {} }

  rule {
    name     = "DDoSRateLimit"
    priority = 1

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 500   # Requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "DDoSRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "DDoSWAF"
    sampled_requests_enabled   = true
  }
}
```

## Step 2: Azure DDoS Protection Standard

```hcl
# Azure DDoS Protection Plan
resource "azurerm_network_ddos_protection_plan" "app" {
  name                = "app-ddos-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Enable DDoS protection on VNet
resource "azurerm_virtual_network" "protected" {
  name                = "protected-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.app.id
    enable = true
  }
}

# DDoS protection metric alerts
resource "azurerm_monitor_metric_alert" "ddos_attack" {
  name                = "ddos-attack-detected"
  resource_group_name = azurerm_resource_group.rg.name

  scopes     = [azurerm_public_ip.app.id]
  severity   = 1
  frequency  = "PT1M"
  window_size = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "IfUnderDDoSAttack"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
```

## Step 3: GCP Cloud Armor DDoS Adaptive Protection

```hcl
# GCP Cloud Armor with Adaptive Protection (ML-based DDoS)
resource "google_compute_security_policy" "ddos" {
  name = "ddos-protection"

  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable          = true
      rule_visibility = "STANDARD"
    }
  }

  # Throttle at edge before reaching backends
  rule {
    action   = "rate_based_ban"
    priority = 1000

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"

      rate_limit_threshold {
        count        = 500
        interval_sec = 60
      }

      ban_duration_sec = 600  # Ban offending IPs for 10 minutes
      ban_threshold {
        count        = 1000
        interval_sec = 300
      }
    }
  }

  # Default allow with logging
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }

    preview = false
  }
}
```

## Summary

DDoS protection configured with OpenTofu provides layered defense: volumetric DDoS is absorbed at the cloud provider's edge (Shield Advanced, Azure DDoS Standard, Cloud Armor Adaptive Protection), while application-layer rate limiting blocks HTTP floods at the WAF layer. Setting ban thresholds that automatically block repeat offenders for a cooldown period reduces the burden of sustained attacks. Metric alerts notify operations teams when attacks are detected so response procedures can be initiated.
