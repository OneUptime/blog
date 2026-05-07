# How to Create Azure Front Door Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Front Door, CDN, Load Balancing, Infrastructure as Code

Description: Learn how to create Azure Front Door Standard/Premium profiles, endpoints, and rule sets for global load balancing and content delivery using OpenTofu.

## Introduction

Azure Front Door is Microsoft's global CDN and load balancer that provides SSL offloading, URL-based routing, WAF integration, and caching. OpenTofu manages profiles, endpoints, origin groups, and rule sets as code.

## Creating a Front Door Profile

```hcl
resource "azurerm_resource_group" "afd" {
  name     = "rg-frontdoor-${var.environment}"
  location = var.location
}

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "afd-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.afd.name

  # Standard_AzureFrontDoor or Premium_AzureFrontDoor (Premium is required for Private Link and managed WAF rule sets)
  sku_name = "Standard_AzureFrontDoor"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Endpoint

```hcl
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "afd-ep-${var.app_name}-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = {
    Environment = var.environment
  }
}
```

## Origin Group and Origins

```hcl
resource "azurerm_cdn_frontdoor_origin_group" "app" {
  name                     = "og-app"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
    additional_latency_in_milliseconds = 50
  }

  health_probe {
    path                = "/health"
    protocol            = "Https"
    request_type        = "HEAD"
    interval_in_seconds = 30
  }
}

resource "azurerm_cdn_frontdoor_origin" "primary" {
  name                          = "origin-primary"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id

  host_name          = var.primary_app_hostname
  http_port          = 80
  https_port         = 443
  origin_host_header = var.primary_app_hostname
  priority           = 1
  weight             = 1000
  enabled            = true

  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_origin" "secondary" {
  name                          = "origin-secondary"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id

  host_name          = var.secondary_app_hostname
  https_port         = 443
  origin_host_header = var.secondary_app_hostname
  priority           = 2   # failover priority
  weight             = 1000
  enabled            = true

  certificate_name_check_enabled = true
}
```

## Route

```hcl
resource "azurerm_cdn_frontdoor_route" "app" {
  name                          = "route-app"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id
  cdn_frontdoor_origin_ids = [
    azurerm_cdn_frontdoor_origin.primary.id,
    azurerm_cdn_frontdoor_origin.secondary.id
  ]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.main.id]

  supported_protocols    = ["Http", "Https"]
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpsOnly"
  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
  }
}
```

## Rule Set and Rules

```hcl
resource "azurerm_cdn_frontdoor_rule_set" "main" {
  name                     = "ruleset-main"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_rule" "add_cache_header" {
  depends_on = [
    azurerm_cdn_frontdoor_origin_group.app,
    azurerm_cdn_frontdoor_origin.primary,
    azurerm_cdn_frontdoor_origin.secondary
  ]

  name                      = "addcacheheader"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.main.id
  order                     = 1

  actions {
    response_header_action {
      header_action = "Append"
      header_name   = "X-Cache-Control"
      value         = "max-age=3600"
    }
  }

  conditions {
    url_path_condition {
      operator         = "BeginsWith"
      match_values     = ["/static/"]
      negate_condition = false
      transforms       = ["Lowercase"]
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Front Door provides global load balancing, CDN, and WAF in a single service. OpenTofu manages profiles, endpoints, origin groups with health probes, routes, and rule sets - creating a complete, reproducible global application delivery configuration.
