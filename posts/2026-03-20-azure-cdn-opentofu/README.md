# How to Set Up Azure CDN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, CDN, Content Delivery, Infrastructure as Code, Azure Front Door, Performance

Description: Learn how to configure Azure CDN profiles and endpoints using OpenTofu for global content acceleration with custom domains, caching rules, and HTTPS enforcement.

---

For new Azure CDN deployments, Azure Front Door Standard/Premium is the supported service for global content acceleration. With OpenTofu, you define your Front Door profile, endpoint, routes, and custom domains as code, making edge delivery configuration as manageable as your application infrastructure.

## Creating an Azure Front Door Profile and Endpoint

```hcl
# main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "cdn" {
  name     = "cdn-${var.environment}-rg"
  location = var.location
}

# Front Door Standard/Premium is the current Azure CDN platform for new deployments
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "${var.project_name}-afd"
  resource_group_name = azurerm_resource_group.cdn.name
  sku_name            = "Standard_AzureFrontDoor"

  tags = var.common_tags
}

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = "${var.project_name}-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_origin_group" "main" {
  name                     = "origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  health_probe {
    interval_in_seconds = 120
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                        = 16
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "static_site" {
  name                           = "storage-origin"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.main.id
  enabled                        = true
  certificate_name_check_enabled = true
  host_name                      = azurerm_storage_account.static_site.primary_web_host
  origin_host_header             = azurerm_storage_account.static_site.primary_web_host
  http_port                      = 80
  https_port                     = 443
  priority                       = 1
  weight                         = 1000
}

resource "azurerm_cdn_frontdoor_rule_set" "main" {
  name                     = "StaticContentRules"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

resource "azurerm_cdn_frontdoor_rule" "cache_static_files" {
  depends_on = [
    azurerm_cdn_frontdoor_origin_group.main,
    azurerm_cdn_frontdoor_origin.static_site,
  ]

  name                      = "CacheStaticFiles"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.main.id
  order                     = 1

  actions {
    route_configuration_override_action {
      cache_behavior = "OverrideIfOriginMissing"
      cache_duration = "7.00:00:00"
    }
  }

  conditions {
    url_file_extension_condition {
      operator     = "Equal"
      match_values = ["js", "css", "png", "jpg", "gif", "ico", "woff2"]
    }
  }
}

resource "azurerm_cdn_frontdoor_route" "static_site" {
  name                          = "static-site-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.main.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.static_site.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.main.id]
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]
  link_to_default_domain = true

  # Compression for text content
  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/json",
      "text/css",
      "text/html",
      "text/plain",
    ]
  }
}
```

## Adding a Custom Domain

If your DNS zone is hosted in Azure DNS, you can manage validation and the CNAME record in OpenTofu.

```hcl
# custom_domain.tf
data "azurerm_dns_zone" "main" {
  name                = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
}

resource "azurerm_cdn_frontdoor_custom_domain" "main" {
  name                     = "custom-domain"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  dns_zone_id              = data.azurerm_dns_zone.main.id
  host_name                = "${var.custom_subdomain}.${data.azurerm_dns_zone.main.name}"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_dns_txt_record" "frontdoor_validation" {
  name                = "_dnsauth.${var.custom_subdomain}"
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = data.azurerm_dns_zone.main.resource_group_name
  ttl                 = 3600

  record {
    value = azurerm_cdn_frontdoor_custom_domain.main.validation_token
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "main" {
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.main.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.static_site.id]
}

resource "azurerm_dns_cname_record" "frontdoor" {
  depends_on = [
    azurerm_cdn_frontdoor_custom_domain_association.main,
    azurerm_dns_txt_record.frontdoor_validation,
  ]

  name                = var.custom_subdomain
  zone_name           = data.azurerm_dns_zone.main.name
  resource_group_name = data.azurerm_dns_zone.main.resource_group_name
  ttl                 = 3600
  record              = azurerm_cdn_frontdoor_endpoint.main.host_name
}
```

## Azure CDN (Classic) Retirement

Azure CDN (classic) resources such as `azurerm_cdn_profile`, `azurerm_cdn_endpoint`, and `azurerm_cdn_endpoint_custom_domain` are now legacy. Managed certificates for classic Azure CDN custom domains stopped being supported on August 15, 2025, and Azure CDN Standard from Microsoft (classic) is retired on September 30, 2027. For new deployments, use Azure Front Door Standard/Premium instead.

## Best Practices

- Use Azure Front Door Standard/Premium for new projects - it is the current Azure CDN platform and works with Azure Front Door WAF.
- Enable compression for text-based content types to reduce bandwidth and improve load times.
- Set long cache durations for immutable static assets with content-hashed filenames by using Front Door rule sets.
- Use HTTP-to-HTTPS redirects at the edge and forward traffic to origins over HTTPS.
- Monitor cache hit ratio and origin latency, then adjust caching rules or origin headers when hit rates are lower than expected.
