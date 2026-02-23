# How to Create Azure CDN Profiles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, CDN, Content Delivery, Infrastructure as Code, Performance

Description: Learn how to create Azure CDN profiles and endpoints in Terraform with caching rules, custom domains, compression settings, and geo-filtering.

---

A Content Delivery Network caches your content at edge locations around the world so users get faster load times regardless of where they are. Azure CDN integrates with Storage Accounts, Web Apps, and any custom origin to serve static assets, media files, and even dynamic content through globally distributed points of presence.

This post covers creating Azure CDN profiles and endpoints in Terraform with proper caching configuration, custom domains, compression, and access rules.

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group and Origin Storage

```hcl
# main.tf
resource "azurerm_resource_group" "cdn" {
  name     = "rg-cdn-production"
  location = "East US"
}

# Storage account as the CDN origin
resource "azurerm_storage_account" "origin" {
  name                          = "stcdnorigin2026"
  resource_group_name           = azurerm_resource_group.cdn.name
  location                      = azurerm_resource_group.cdn.location
  account_tier                  = "Standard"
  account_replication_type      = "LRS"
  allow_nested_items_to_be_public = true  # Required for public CDN access
  min_tls_version               = "TLS1_2"

  # Enable static website hosting
  static_website {
    index_document     = "index.html"
    error_404_document = "404.html"
  }
}

# Container for CDN content
resource "azurerm_storage_container" "cdn_content" {
  name                  = "cdn-content"
  storage_account_name  = azurerm_storage_account.origin.name
  container_access_type = "blob"  # Public read access for blobs
}
```

## CDN Profile

The profile is the top-level resource that defines which CDN provider tier you use.

```hcl
# cdn-profile.tf
# Azure CDN profile using the Microsoft Standard tier
resource "azurerm_cdn_profile" "main" {
  name                = "cdn-profile-production"
  location            = "Global"  # CDN profiles are global resources
  resource_group_name = azurerm_resource_group.cdn.name
  sku                 = "Standard_Microsoft"  # Options: Standard_Microsoft, Standard_Akamai, Standard_Verizon, Premium_Verizon

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## CDN Endpoint with Storage Origin

```hcl
# cdn-endpoint.tf
# CDN endpoint for static content from blob storage
resource "azurerm_cdn_endpoint" "static" {
  name                = "cdn-static-prod"
  profile_name        = azurerm_cdn_profile.main.name
  location            = azurerm_resource_group.cdn.location
  resource_group_name = azurerm_resource_group.cdn.name

  # Origin configuration - where CDN fetches content from
  origin {
    name      = "blob-origin"
    host_name = azurerm_storage_account.origin.primary_blob_host
  }

  # Origin host header tells the origin which hostname was requested
  origin_host_header = azurerm_storage_account.origin.primary_blob_host

  # HTTP and HTTPS settings
  is_http_allowed  = false  # Force HTTPS
  is_https_allowed = true

  # Enable compression for text-based content
  is_compression_enabled = true
  content_types_to_compress = [
    "text/html",
    "text/css",
    "text/plain",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/xml",
    "image/svg+xml",
    "application/font-woff",
    "application/font-woff2",
  ]

  # Caching behavior
  querystring_caching_behaviour = "IgnoreQueryString"

  tags = {
    environment = "production"
  }
}
```

## CDN Endpoint with Web App Origin

```hcl
# cdn-webapp.tf
# CDN endpoint for a web application
resource "azurerm_cdn_endpoint" "webapp" {
  name                = "cdn-webapp-prod"
  profile_name        = azurerm_cdn_profile.main.name
  location            = azurerm_resource_group.cdn.location
  resource_group_name = azurerm_resource_group.cdn.name

  origin {
    name      = "webapp-origin"
    host_name = "app-production.azurewebsites.net"
    https_port = 443
  }

  origin_host_header = "app-production.azurewebsites.net"

  is_http_allowed  = false
  is_https_allowed = true

  # Cache query strings separately
  querystring_caching_behaviour = "UseQueryString"

  # Delivery rules for caching control
  delivery_rule {
    name  = "CacheStaticAssets"
    order = 1

    # Match static file extensions
    url_file_extension_condition {
      operator     = "Equal"
      match_values = ["css", "js", "png", "jpg", "jpeg", "gif", "svg", "woff", "woff2"]
    }

    # Cache for 7 days
    cache_expiration_action {
      behavior = "Override"
      duration = "7.00:00:00"
    }
  }

  delivery_rule {
    name  = "NoCacheAPI"
    order = 2

    # Match API paths
    url_path_condition {
      operator     = "BeginsWith"
      match_values = ["/api/"]
    }

    # Do not cache API responses
    cache_expiration_action {
      behavior = "BypassCache"
    }
  }

  delivery_rule {
    name  = "NoCacheHTML"
    order = 3

    url_file_extension_condition {
      operator     = "Equal"
      match_values = ["html"]
    }

    # Cache HTML for only 1 hour
    cache_expiration_action {
      behavior = "Override"
      duration = "0.01:00:00"
    }
  }
}
```

## Global Delivery Rules

Set default behavior that applies to all requests.

```hcl
# Add to the cdn_endpoint resource
resource "azurerm_cdn_endpoint" "static" {
  # ... previous configuration ...

  # Global delivery rule (applies to all requests)
  global_delivery_rule {
    # Add security headers
    modify_response_header_action {
      action = "Overwrite"
      name   = "X-Content-Type-Options"
      value  = "nosniff"
    }

    modify_response_header_action {
      action = "Overwrite"
      name   = "X-Frame-Options"
      value  = "DENY"
    }

    modify_response_header_action {
      action = "Overwrite"
      name   = "Strict-Transport-Security"
      value  = "max-age=31536000; includeSubDomains"
    }
  }
}
```

## Custom Domain

```hcl
# custom-domain.tf
# Custom domain for the CDN endpoint
resource "azurerm_cdn_endpoint_custom_domain" "static" {
  name            = "static-custom-domain"
  cdn_endpoint_id = azurerm_cdn_endpoint.static.id
  host_name       = "static.example.com"

  # Azure managed HTTPS certificate
  cdn_managed_https {
    certificate_type = "Dedicated"
    protocol_type    = "ServerNameIndication"
    tls_version      = "TLS12"
  }
}
```

Before adding the custom domain, create a CNAME record pointing `static.example.com` to `cdn-static-prod.azureedge.net`.

## Geo-Filtering

Restrict content delivery to specific countries.

```hcl
# geo-filter.tf
resource "azurerm_cdn_endpoint" "restricted" {
  name                = "cdn-restricted-prod"
  profile_name        = azurerm_cdn_profile.main.name
  location            = azurerm_resource_group.cdn.location
  resource_group_name = azurerm_resource_group.cdn.name

  origin {
    name      = "restricted-origin"
    host_name = azurerm_storage_account.origin.primary_blob_host
  }

  # Allow access only from specific countries
  geo_filter {
    relative_path = "/"
    action        = "Allow"
    country_codes = ["US", "CA", "GB", "DE", "FR"]
  }
}
```

## CDN Tier Comparison

Azure CDN offers several tiers with different feature sets:

- **Standard Microsoft**: Good balance of features and cost. Supports delivery rules for caching and headers.
- **Standard Akamai**: Akamai network. Basic caching and compression. No rules engine.
- **Standard Verizon**: Verizon network with a basic rules engine.
- **Premium Verizon**: Full rules engine, real-time analytics, token authentication.

For most new projects, Standard Microsoft is the best starting point. If you need WAF and advanced routing, consider Azure Front Door Standard/Premium instead, which includes CDN capabilities.

## Outputs

```hcl
# outputs.tf
output "cdn_endpoint_hostname" {
  value       = azurerm_cdn_endpoint.static.fqdn
  description = "The CDN endpoint hostname"
}

output "cdn_endpoint_url" {
  value       = "https://${azurerm_cdn_endpoint.static.fqdn}"
  description = "Full HTTPS URL of the CDN endpoint"
}

output "origin_url" {
  value       = azurerm_storage_account.origin.primary_blob_endpoint
  description = "Origin storage account URL"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

After deployment, upload content to the origin storage account and access it through the CDN endpoint URL. The first request to each edge location will be a cache miss that fetches from the origin, but subsequent requests will be served directly from the edge.

Azure CDN in Terraform lets you manage your content delivery infrastructure alongside the rest of your application stack. Changes to caching rules, origins, and delivery policies go through the same review process as your application code, reducing the chance of misconfigurations that could impact performance or availability.
