# How to Configure Azure App Service Custom Domains with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Custom Domain, OpenTofu, DNS, Web Hosting

Description: Learn how to configure custom domains for Azure App Service with OpenTofu, including domain verification and DNS record management.

## Overview

Azure App Service allows you to bind custom domains to your web apps. OpenTofu manages the domain verification and binding process, which involves creating DNS TXT verification records and configuring the custom hostname on the App Service.

## Step 1: Create the Web App

```hcl
# main.tf - Web App to attach a custom domain to

resource "azurerm_linux_web_app" "app" {
  name                = "my-custom-domain-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  site_config {}
}
```

## Step 2: Get Domain Verification ID

```hcl
# Output the domain verification ID needed for DNS TXT record
output "domain_verification_id" {
  value       = azurerm_linux_web_app.app.custom_domain_verification_id
  description = "Add this as a TXT record at asuid.<subdomain> or asuid for the apex domain"
}
```

## Step 3: Create DNS Records (Using Azure DNS)

```hcl
# Azure DNS zone for your domain
data "azurerm_dns_zone" "zone" {
  name                = "example.com"
  resource_group_name = azurerm_resource_group.dns_rg.name
}

# CNAME record pointing www to the App Service default hostname
resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = data.azurerm_dns_zone.zone.name
  resource_group_name = azurerm_resource_group.dns_rg.name
  ttl                 = 300
  record              = azurerm_linux_web_app.app.default_hostname
}

# TXT verification record required by Azure to prove domain ownership
resource "azurerm_dns_txt_record" "www_verification" {
  name                = "asuid.www"
  zone_name           = data.azurerm_dns_zone.zone.name
  resource_group_name = azurerm_resource_group.dns_rg.name
  ttl                 = 300

  record {
    value = azurerm_linux_web_app.app.custom_domain_verification_id
  }
}
```

## Step 4: Bind the Custom Domain

```hcl
# Bind the custom domain to the App Service
resource "azurerm_app_service_custom_hostname_binding" "www" {
  hostname            = "www.example.com"
  app_service_name    = azurerm_linux_web_app.app.name
  resource_group_name = azurerm_resource_group.rg.name

  # Ensures DNS records are created before domain binding
  depends_on = [
    azurerm_dns_cname_record.www,
    azurerm_dns_txt_record.www_verification,
  ]
}
```

## Step 5: Apex Domain Setup

```hcl
# Requires the Azure/azapi provider to read the App Service inbound IP.
data "azapi_resource" "app" {
  type      = "Microsoft.Web/sites@2023-12-01"
  name      = azurerm_linux_web_app.app.name
  parent_id = azurerm_resource_group.rg.id

  response_export_values = ["properties.inboundIpAddress"]
}

# A record for apex domain (example.com)
resource "azurerm_dns_a_record" "apex" {
  name                = "@"
  zone_name           = data.azurerm_dns_zone.zone.name
  resource_group_name = azurerm_resource_group.dns_rg.name
  ttl                 = 300
  # App Service requires the app's inbound IP for apex domain mapping
  records             = [data.azapi_resource.app.output.properties.inboundIpAddress]
}

resource "azurerm_dns_txt_record" "apex_verification" {
  name                = "asuid"
  zone_name           = data.azurerm_dns_zone.zone.name
  resource_group_name = azurerm_resource_group.dns_rg.name
  ttl                 = 300

  record {
    value = azurerm_linux_web_app.app.custom_domain_verification_id
  }
}

resource "azurerm_app_service_custom_hostname_binding" "apex" {
  hostname            = "example.com"
  app_service_name    = azurerm_linux_web_app.app.name
  resource_group_name = azurerm_resource_group.rg.name

  depends_on = [
    azurerm_dns_a_record.apex,
    azurerm_dns_txt_record.apex_verification,
  ]
}
```

## Summary

Azure App Service custom domain binding with OpenTofu automates the DNS record creation and domain verification process. By managing DNS TXT verification records and CNAME/A records alongside the App Service hostname bindings, you create a fully automated domain configuration pipeline.
