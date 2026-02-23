# How to Create Azure Front Door in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Front Door, CDN, WAF, Networking, Infrastructure as Code

Description: Learn how to create Azure Front Door in Terraform with routing rules, backend pools, WAF policies, and custom domains for global load balancing.

---

Azure Front Door is a global, scalable entry point for web applications. It combines Layer 7 load balancing, CDN caching, SSL offloading, and Web Application Firewall capabilities into a single service. If your application serves users across multiple regions, Front Door routes each request to the closest healthy backend with the lowest latency.

This guide covers setting up Azure Front Door using Terraform, including the newer Front Door Standard/Premium tier, routing configuration, WAF policies, and custom domain setup.

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

## Resource Group

```hcl
# main.tf
resource "azurerm_resource_group" "frontdoor" {
  name     = "rg-frontdoor-production"
  location = "East US"
}
```

## Front Door Profile (Standard/Premium)

The newer Front Door Standard and Premium tiers use a profile-based configuration model.

```hcl
# frontdoor.tf
# Create a Front Door profile
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "fd-production"
  resource_group_name = azurerm_resource_group.frontdoor.name
  sku_name            = "Premium_AzureFrontDoor"  # Premium includes WAF

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Origin Groups and Origins

Origin groups define your backend pools and health checking.

```hcl
# origins.tf
# Origin group for the primary web application
resource "azurerm_cdn_frontdoor_origin_group" "web_app" {
  name                     = "og-web-app"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  # Session affinity keeps a user on the same backend
  session_affinity_enabled = false

  # How often to health check backends
  health_probe {
    protocol            = "Https"
    interval_in_seconds = 30
    request_type        = "HEAD"
    path                = "/health"
  }

  # Load balancing settings
  load_balancing {
    sample_size                        = 4
    successful_samples_required        = 3
    additional_latency_in_milliseconds = 50  # Latency tolerance before failover
  }
}

# Primary region origin
resource "azurerm_cdn_frontdoor_origin" "web_app_east" {
  name                          = "origin-east-us"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web_app.id

  enabled                        = true
  host_name                      = "app-east.azurewebsites.net"
  origin_host_header             = "app-east.azurewebsites.net"
  http_port                      = 80
  https_port                     = 443
  certificate_name_check_enabled = true
  priority                       = 1  # Primary
  weight                         = 1000
}

# Secondary region origin for failover
resource "azurerm_cdn_frontdoor_origin" "web_app_west" {
  name                          = "origin-west-us"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web_app.id

  enabled                        = true
  host_name                      = "app-west.azurewebsites.net"
  origin_host_header             = "app-west.azurewebsites.net"
  http_port                      = 80
  https_port                     = 443
  certificate_name_check_enabled = true
  priority                       = 2  # Failover
  weight                         = 1000
}

# Origin group for static assets (blob storage)
resource "azurerm_cdn_frontdoor_origin_group" "static" {
  name                     = "og-static-assets"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  health_probe {
    protocol            = "Https"
    interval_in_seconds = 60
    request_type        = "HEAD"
    path                = "/"
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "blob_storage" {
  name                          = "origin-blob"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static.id

  enabled                        = true
  host_name                      = "ststaticprod.blob.core.windows.net"
  origin_host_header             = "ststaticprod.blob.core.windows.net"
  http_port                      = 80
  https_port                     = 443
  certificate_name_check_enabled = true
}
```

## Endpoints and Routes

```hcl
# endpoints.tf
# Front Door endpoint (the public-facing URL)
resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "ep-production"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  tags = {
    environment = "production"
  }
}

# Route for the main application
resource "azurerm_cdn_frontdoor_route" "web_app" {
  name                          = "route-web-app"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web_app.id
  cdn_frontdoor_origin_ids      = [
    azurerm_cdn_frontdoor_origin.web_app_east.id,
    azurerm_cdn_frontdoor_origin.web_app_west.id,
  ]

  enabled                = true
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  # Link to custom domains and WAF
  cdn_frontdoor_custom_domain_ids = [azurerm_cdn_frontdoor_custom_domain.app.id]

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress     = [
      "text/html",
      "text/css",
      "application/javascript",
      "application/json",
      "image/svg+xml",
    ]
  }
}

# Route for static assets with aggressive caching
resource "azurerm_cdn_frontdoor_route" "static" {
  name                          = "route-static"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.static.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.blob_storage.id]

  enabled                = true
  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/static/*", "/assets/*"]
  supported_protocols    = ["Http", "Https"]

  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = true
    content_types_to_compress     = [
      "text/css",
      "application/javascript",
      "image/svg+xml",
      "application/font-woff2",
    ]
  }
}
```

## Custom Domains

```hcl
# custom-domain.tf
# Custom domain for the application
resource "azurerm_cdn_frontdoor_custom_domain" "app" {
  name                     = "custom-domain-app"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = "app.example.com"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# Associate the custom domain with the route
resource "azurerm_cdn_frontdoor_custom_domain_association" "app" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.app.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.web_app.id]
}
```

You will also need a CNAME record pointing your domain to the Front Door endpoint. Check out our guide on [creating Azure DNS zones and records in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-dns-zones-and-records-in-terraform/view).

## WAF Policy

The Web Application Firewall protects your application from common attacks.

```hcl
# waf.tf
# WAF policy for Front Door
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "wafpolicy"
  resource_group_name               = azurerm_resource_group.frontdoor.name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = "Prevention"  # Block attacks (vs Detection which only logs)

  # Rate limiting rule
  custom_rule {
    name     = "RateLimitRule"
    enabled  = true
    priority = 100
    type     = "RateLimitRule"
    action   = "Block"

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100  # Max 100 requests per minute

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = true
      match_values       = ["10.0.0.0/8"]  # Exclude internal IPs
    }
  }

  # Block requests from specific countries
  custom_rule {
    name     = "GeoBlock"
    enabled  = true
    priority = 200
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable = "SocketAddr"
      operator       = "GeoMatch"
      match_values   = ["CN", "RU"]  # Block China and Russia
    }
  }

  # Microsoft managed rule set - OWASP top 10
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  # Bot protection
  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }
}

# Associate WAF policy with the Front Door security policy
resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
        }
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.app.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}
```

## Outputs

```hcl
# outputs.tf
output "frontdoor_endpoint" {
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
  description = "The hostname of the Front Door endpoint"
}

output "frontdoor_profile_id" {
  value       = azurerm_cdn_frontdoor_profile.main.id
  description = "The resource ID of the Front Door profile"
}
```

## Standard vs Premium

- **Standard**: Includes CDN caching, SSL offloading, and basic routing. No WAF support.
- **Premium**: Everything in Standard plus WAF, Private Link origins, and enhanced analytics.

If you need WAF protection (and you usually do for production), go with Premium.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Front Door provides a powerful combination of global routing, caching, and security. Defining it in Terraform lets you version control your routing rules, WAF policies, and origin configuration together, keeping your entire delivery pipeline auditable and reproducible.
