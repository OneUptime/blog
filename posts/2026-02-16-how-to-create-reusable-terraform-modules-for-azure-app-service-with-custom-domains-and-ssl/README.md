# How to Create Reusable Terraform Modules for Azure App Service with Custom Domains and SSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, App Service, Custom Domains, SSL, Modules, Infrastructure as Code

Description: Build reusable Terraform modules for Azure App Service that handle custom domain binding, SSL certificate management, and production-ready configurations.

---

Deploying a single Azure App Service with Terraform is simple. Deploying twenty of them, each with custom domains and SSL certificates, with consistent security settings and monitoring - that is where modules pay for themselves. A well-designed module encapsulates the complexity of App Service deployment into a clean interface that your team can use without understanding every detail.

In this post, I will build a production-quality Terraform module for Azure App Service that handles custom domains, SSL certificates (both managed and imported), diagnostic settings, and security baselines.

## Module Design Principles

Before writing code, a few design principles I follow for Terraform modules:

1. The module should work with minimal inputs but allow deep customization
2. Secure defaults - HTTPS only, minimum TLS version, FTPS disabled
3. Custom domains and SSL should be optional but easy to add
4. Outputs should expose everything downstream modules might need

## Module Structure

```
modules/
  app-service/
    main.tf           # Core resources
    domains.tf        # Custom domain and SSL handling
    monitoring.tf     # Diagnostic settings
    variables.tf      # Input variables
    outputs.tf        # Output values
    versions.tf       # Provider requirements
```

## Provider Requirements

```hcl
# modules/app-service/versions.tf

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.70.0"
    }
  }
}
```

## Input Variables

The variables file defines the module's interface. I organize them from required to optional:

```hcl
# modules/app-service/variables.tf

# Required variables
variable "name" {
  description = "Name of the web app (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{2,60}$", var.name))
    error_message = "App name must be 2-60 characters, lowercase alphanumeric and hyphens only."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

# App Service Plan configuration
variable "plan_sku_name" {
  description = "SKU for the App Service Plan (B1, S1, P1v3, etc.)"
  type        = string
  default     = "B1"
}

variable "plan_os_type" {
  description = "OS type for the plan"
  type        = string
  default     = "Linux"

  validation {
    condition     = contains(["Linux", "Windows"], var.plan_os_type)
    error_message = "OS type must be Linux or Windows."
  }
}

# Runtime configuration
variable "runtime_stack" {
  description = "Runtime stack (e.g., NODE|20-lts, DOTNET|8.0, PYTHON|3.12)"
  type        = string
  default     = "NODE|20-lts"
}

# Application settings
variable "app_settings" {
  description = "Application settings (environment variables)"
  type        = map(string)
  default     = {}
}

variable "connection_strings" {
  description = "Connection strings for the app"
  type = list(object({
    name  = string
    type  = string
    value = string
  }))
  default   = []
  sensitive = true
}

# Custom domains and SSL
variable "custom_domains" {
  description = "Custom domains to bind to the app with optional SSL"
  type = list(object({
    hostname        = string
    ssl_certificate = optional(object({
      # Use managed certificate (free, auto-renewed)
      managed = optional(bool, false)
      # Or provide a certificate from Key Vault
      key_vault_certificate_id = optional(string)
    }))
  }))
  default = []
}

# Scaling
variable "autoscale_settings" {
  description = "Autoscale configuration"
  type = object({
    enabled     = bool
    min_count   = number
    max_count   = number
    default_count = number
  })
  default = {
    enabled       = false
    min_count     = 1
    max_count     = 1
    default_count = 1
  }
}

# Monitoring
variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostic settings"
  type        = string
  default     = null
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

## Core Resources

```hcl
# modules/app-service/main.tf

# App Service Plan
resource "azurerm_service_plan" "this" {
  name                = "asp-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = var.plan_os_type
  sku_name            = var.plan_sku_name
  tags                = var.tags
}

# Parse runtime stack into components for Linux vs Windows configuration
locals {
  is_linux         = var.plan_os_type == "Linux"
  runtime_parts    = split("|", var.runtime_stack)
  runtime_name     = local.runtime_parts[0]
  runtime_version  = length(local.runtime_parts) > 1 ? local.runtime_parts[1] : ""

  # Merge user settings with required settings
  base_app_settings = {
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
  }
  all_app_settings = merge(local.base_app_settings, var.app_settings)
}

# Linux Web App
resource "azurerm_linux_web_app" "this" {
  count               = local.is_linux ? 1 : 0
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.this.id
  https_only          = true  # Force HTTPS

  tags = var.tags

  identity {
    type = "SystemAssigned"  # Enable managed identity
  }

  site_config {
    # Security baseline
    minimum_tls_version = "1.2"
    ftps_state          = "Disabled"
    http2_enabled       = true

    # Runtime configuration
    application_stack {
      node_version    = local.runtime_name == "NODE" ? local.runtime_version : null
      dotnet_version  = local.runtime_name == "DOTNET" ? local.runtime_version : null
      python_version  = local.runtime_name == "PYTHON" ? local.runtime_version : null
      java_version    = local.runtime_name == "JAVA" ? local.runtime_version : null
    }

    # Enable always-on for Standard and Premium tiers
    always_on = can(regex("^[SP]", var.plan_sku_name))
  }

  app_settings = local.all_app_settings

  dynamic "connection_string" {
    for_each = var.connection_strings
    content {
      name  = connection_string.value.name
      type  = connection_string.value.type
      value = connection_string.value.value
    }
  }

  # Prevent Terraform from reverting app settings changed by deployment scripts
  lifecycle {
    ignore_changes = [
      site_config[0].application_stack, # Deployment may update this
    ]
  }
}

# Windows Web App (similar structure, different resource type)
resource "azurerm_windows_web_app" "this" {
  count               = local.is_linux ? 0 : 1
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.this.id
  https_only          = true

  tags = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    minimum_tls_version = "1.2"
    ftps_state          = "Disabled"
    http2_enabled       = true
    always_on           = can(regex("^[SP]", var.plan_sku_name))
  }

  app_settings = local.all_app_settings
}

# Local to simplify references to the web app regardless of OS type
locals {
  web_app_id       = local.is_linux ? azurerm_linux_web_app.this[0].id : azurerm_windows_web_app.this[0].id
  web_app_name     = local.is_linux ? azurerm_linux_web_app.this[0].name : azurerm_windows_web_app.this[0].name
  default_hostname = local.is_linux ? azurerm_linux_web_app.this[0].default_hostname : azurerm_windows_web_app.this[0].default_hostname
  principal_id     = local.is_linux ? azurerm_linux_web_app.this[0].identity[0].principal_id : azurerm_windows_web_app.this[0].identity[0].principal_id
}
```

## Custom Domain and SSL Handling

This is the most complex part of the module. Custom domains require DNS verification and SSL certificates need to be managed carefully:

```hcl
# modules/app-service/domains.tf

# Managed certificates (free, auto-renewed by Azure)
resource "azurerm_app_service_managed_certificate" "this" {
  for_each = {
    for domain in var.custom_domains :
    domain.hostname => domain
    if domain.ssl_certificate != null && domain.ssl_certificate.managed == true
  }

  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.this[each.key].id
}

# Custom hostname bindings
resource "azurerm_app_service_custom_hostname_binding" "this" {
  for_each = { for domain in var.custom_domains : domain.hostname => domain }

  hostname            = each.value.hostname
  app_service_name    = local.web_app_name
  resource_group_name = var.resource_group_name

  # SSL binding depends on certificate type
  ssl_state = each.value.ssl_certificate != null ? "SniEnabled" : null
  thumbprint = (
    each.value.ssl_certificate != null ?
    (
      each.value.ssl_certificate.managed == true ?
      null :  # Managed cert thumbprint set via certificate binding below
      null    # Key Vault cert thumbprint resolved after creation
    ) :
    null
  )

  # Important: do not manage SSL state here when using managed certificates
  # The certificate binding handles that
  lifecycle {
    ignore_changes = [ssl_state, thumbprint]
  }
}

# Bind managed certificates to the hostname
resource "azurerm_app_service_certificate_binding" "managed" {
  for_each = {
    for domain in var.custom_domains :
    domain.hostname => domain
    if domain.ssl_certificate != null && domain.ssl_certificate.managed == true
  }

  hostname_binding_id = azurerm_app_service_custom_hostname_binding.this[each.key].id
  certificate_id      = azurerm_app_service_managed_certificate.this[each.key].id
  ssl_state           = "SniEnabled"
}

# Bind Key Vault certificates to the hostname
resource "azurerm_app_service_certificate_binding" "keyvault" {
  for_each = {
    for domain in var.custom_domains :
    domain.hostname => domain
    if domain.ssl_certificate != null && domain.ssl_certificate.key_vault_certificate_id != null
  }

  hostname_binding_id = azurerm_app_service_custom_hostname_binding.this[each.key].id
  certificate_id      = each.value.ssl_certificate.key_vault_certificate_id
  ssl_state           = "SniEnabled"
}
```

## Monitoring Configuration

```hcl
# modules/app-service/monitoring.tf

# Diagnostic settings to send logs and metrics to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "this" {
  count = var.log_analytics_workspace_id != null ? 1 : 0

  name                       = "diag-${var.name}"
  target_resource_id         = local.web_app_id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_log {
    category = "AppServiceAppLogs"
  }

  enabled_log {
    category = "AppServicePlatformLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Autoscale settings
resource "azurerm_monitor_autoscale_setting" "this" {
  count               = var.autoscale_settings.enabled ? 1 : 0
  name                = "autoscale-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = azurerm_service_plan.this.id

  profile {
    name = "default"

    capacity {
      default = var.autoscale_settings.default_count
      minimum = var.autoscale_settings.min_count
      maximum = var.autoscale_settings.max_count
    }

    # Scale out when CPU exceeds 70%
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.this.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    # Scale in when CPU drops below 30%
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.this.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }
  }
}
```

## Outputs

```hcl
# modules/app-service/outputs.tf

output "web_app_id" {
  description = "Resource ID of the web app"
  value       = local.web_app_id
}

output "web_app_name" {
  description = "Name of the web app"
  value       = local.web_app_name
}

output "default_hostname" {
  description = "Default hostname (azurewebsites.net)"
  value       = local.default_hostname
}

output "principal_id" {
  description = "Managed identity principal ID for RBAC assignments"
  value       = local.principal_id
}

output "service_plan_id" {
  description = "Resource ID of the App Service Plan"
  value       = azurerm_service_plan.this.id
}

output "outbound_ip_addresses" {
  description = "Outbound IP addresses of the app"
  value       = local.is_linux ? azurerm_linux_web_app.this[0].outbound_ip_addresses : azurerm_windows_web_app.this[0].outbound_ip_addresses
}
```

## Using the Module

Here is how consumers call the module:

```hcl
# Simple deployment - no custom domain
module "api" {
  source              = "./modules/app-service"
  name                = "app-api-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  plan_sku_name       = "P1v3"
  runtime_stack       = "NODE|20-lts"

  app_settings = {
    "NODE_ENV" = "production"
    "API_URL"  = "https://api.company.com"
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags = { Environment = "production" }
}

# Full deployment with custom domains and SSL
module "website" {
  source              = "./modules/app-service"
  name                = "app-web-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  plan_sku_name       = "S1"
  runtime_stack       = "NODE|20-lts"

  custom_domains = [
    {
      hostname = "www.company.com"
      ssl_certificate = {
        managed = true  # Free Azure-managed certificate
      }
    },
    {
      hostname = "app.company.com"
      ssl_certificate = {
        key_vault_certificate_id = azurerm_key_vault_certificate.wildcard.id
      }
    }
  ]

  autoscale_settings = {
    enabled       = true
    min_count     = 2
    max_count     = 10
    default_count = 2
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags = { Environment = "production" }
}
```

## Wrapping Up

A well-designed Terraform module for Azure App Service saves time on every deployment and ensures consistency across your organization. The module handles the tedious details - SSL certificate binding, security baselines, diagnostic settings, autoscaling - while presenting a clean interface to consumers. Build the module once, test it thoroughly, and every App Service deployment becomes a simple module call with the right parameters.
