# How to Set Up Azure Storage Static Website Hosting with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, Static Website, OpenTofu, CDN, Frontend

Description: Learn how to configure Azure Storage static website hosting with OpenTofu, including custom domain setup and Azure CDN integration for fast global delivery.

## Overview

Azure Storage supports hosting static websites (HTML, CSS, JavaScript) directly from a storage account. When combined with Azure Front Door Standard/Premium, you get a scalable, low-cost hosting solution for SPAs and static sites.

## Step 1: Create Storage Account with Static Website

```hcl
# main.tf - Storage account with static website hosting enabled

resource "azurerm_storage_account" "static_site" {
  name                     = "mystaticsitehosting"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Enable static website hosting
  static_website {
    index_document     = "index.html"
    error_404_document = "404.html"
  }
}
```

## Step 2: Upload Static Files

```hcl
# Upload the index.html file to the $web container
resource "azurerm_storage_blob" "index" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.static_site.name
  storage_container_name = "$web"  # Special container for static websites
  type                   = "Block"
  source                 = "${path.module}/dist/index.html"
  content_md5            = filemd5("${path.module}/dist/index.html")
  content_type           = "text/html"
}

resource "azurerm_storage_blob" "not_found" {
  name                   = "404.html"
  storage_account_name   = azurerm_storage_account.static_site.name
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${path.module}/dist/404.html"
  content_md5            = filemd5("${path.module}/dist/404.html")
  content_type           = "text/html"
}
```

## Step 3: Set Up Azure Front Door in Front of Storage

```hcl
# Create an Azure Front Door profile for global content delivery
resource "azurerm_cdn_frontdoor_profile" "front_door" {
  name                = "my-static-site-fd"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_endpoint" "static_site_endpoint" {
  name                     = "my-static-site-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.front_door.id
}

resource "azurerm_cdn_frontdoor_origin_group" "static_site" {
  name                     = "static-site-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.front_door.id

  load_balancing {}
}

resource "azurerm_cdn_frontdoor_origin" "storage" {
  name                          = "storage-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static_site.id

  host_name                      = azurerm_storage_account.static_site.primary_web_host
  origin_host_header             = azurerm_storage_account.static_site.primary_web_host
  certificate_name_check_enabled = true
  priority                       = 1
  weight                         = 1000
}

resource "azurerm_cdn_frontdoor_rule_set" "static_assets" {
  name                     = "StaticAssets"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.front_door.id
}

resource "azurerm_cdn_frontdoor_rule" "cache_assets" {
  depends_on = [
    azurerm_cdn_frontdoor_origin_group.static_site,
    azurerm_cdn_frontdoor_origin.storage,
  ]

  name                      = "cacheassets"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.static_assets.id
  order                     = 1

  # Cache static assets aggressively
  actions {
    route_configuration_override_action {
      cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static_site.id
      forwarding_protocol           = "HttpsOnly"
      compression_enabled           = true
      cache_behavior                = "OverrideAlways"
      cache_duration                = "7.00:00:00"  # Cache for 7 days
    }
  }

  conditions {
    url_path_condition {
      operator     = "BeginsWith"
      match_values = ["assets/"]
      transforms   = ["Lowercase"]
    }
  }
}

resource "azurerm_cdn_frontdoor_route" "static_site_route" {
  name                          = "static-site-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.static_site_endpoint.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static_site.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.storage.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.static_assets.id]

  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
}
```

## Step 4: Custom Domain with HTTPS

```hcl
# If your DNS is hosted outside Azure DNS, create equivalent TXT and CNAME
# records with your DNS provider instead of azurerm_dns_* resources.
resource "azurerm_dns_zone" "site" {
  name                = "example.com"
  resource_group_name = azurerm_resource_group.rg.name
}

# Add a custom domain to the Front Door profile
resource "azurerm_cdn_frontdoor_custom_domain" "custom_domain" {
  name                     = "www-example-com"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.front_door.id
  dns_zone_id              = azurerm_dns_zone.site.id
  host_name                = "www.example.com"

  # Enable a Front Door-managed certificate
  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "custom_domain" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.custom_domain.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.static_site_route.id]
}

resource "azurerm_dns_txt_record" "front_door_validation" {
  name                = "_dnsauth.www"
  zone_name           = azurerm_dns_zone.site.name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 3600

  record {
    value = azurerm_cdn_frontdoor_custom_domain.custom_domain.validation_token
  }
}

resource "azurerm_dns_cname_record" "www" {
  depends_on = [
    azurerm_cdn_frontdoor_route.static_site_route,
    azurerm_cdn_frontdoor_custom_domain_association.custom_domain,
  ]

  name                = "www"
  zone_name           = azurerm_dns_zone.site.name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 3600
  record              = azurerm_cdn_frontdoor_endpoint.static_site_endpoint.host_name
}
```

## Step 5: Outputs

```hcl
output "static_website_url" {
  value       = azurerm_storage_account.static_site.primary_web_endpoint
  description = "Direct storage static website URL"
}

output "front_door_url" {
  value       = "https://${azurerm_cdn_frontdoor_endpoint.static_site_endpoint.host_name}"
  description = "Front Door endpoint URL for the static website"
}
```

## Summary

Azure Storage static website hosting with Azure Front Door, managed through OpenTofu, provides a cost-effective and scalable solution for serving static web applications. The Front Door layer adds global performance, custom domain support, and HTTPS without needing a web server.
