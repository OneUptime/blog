# How to Create Azure Web Apps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Web Apps, App Service, PaaS, Infrastructure as Code

Description: A comprehensive guide to deploying Azure Web Apps with Terraform, including application settings, deployment slots, custom domains, and continuous deployment configuration.

---

Azure Web Apps, part of Azure App Service, provide a fully managed platform for hosting web applications. You bring your code in practically any language - Node.js, Python, .NET, Java, PHP, Ruby - and Azure handles the rest: OS patching, auto-scaling, load balancing, and SSL termination.

Terraform lets you define the entire web app stack as code - from the App Service Plan to deployment slots to custom domain bindings. This means you can replicate your production setup in staging with a single command. This guide covers creating web apps for different platforms, configuring application settings, setting up deployment slots, and binding custom domains.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- An App Service Plan (or create one alongside the web app)

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Foundation Resources

```hcl
resource "azurerm_resource_group" "web" {
  name     = "rg-webapp-prod-eus"
  location = "East US"

  tags = {
    Environment = "production"
  }
}

resource "azurerm_service_plan" "web" {
  name                = "asp-webapp-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  os_type             = "Linux"
  sku_name            = "P1v3"

  tags = {
    Environment = "production"
  }
}
```

## Creating a Linux Web App

```hcl
# Linux web app running Node.js
resource "azurerm_linux_web_app" "main" {
  name                = "webapp-myapp-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  service_plan_id     = azurerm_service_plan.web.id

  # HTTPS only
  https_only = true

  site_config {
    # Always on keeps the app loaded in memory
    always_on = true

    # Set the runtime stack
    application_stack {
      node_version = "20-lts"
    }

    # Minimum TLS version
    minimum_tls_version = "1.2"

    # Health check path for load balancer
    health_check_path = "/health"

    # Enable HTTP/2
    http2_enabled = true

    # FTPS state
    ftps_state = "Disabled"
  }

  # Application settings (environment variables)
  app_settings = {
    "NODE_ENV"                      = "production"
    "WEBSITE_NODE_DEFAULT_VERSION"  = "~20"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.web.instrumentation_key
    "DATABASE_URL"                  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_url.id})"
  }

  # Connection strings
  connection_string {
    name  = "DefaultConnection"
    type  = "SQLAzure"
    value = "Server=tcp:myserver.database.windows.net;Database=mydb;"
  }

  # Logging configuration
  logs {
    application_logs {
      file_system_level = "Warning"
    }

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }

    detailed_error_messages = true
    failed_request_tracing  = true
  }

  # Identity for Key Vault access
  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "production"
    Application = "myapp"
  }
}
```

## Application Insights

```hcl
# Application Insights for monitoring
resource "azurerm_application_insights" "web" {
  name                = "ai-webapp-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  application_type    = "web"

  tags = {
    Environment = "production"
  }
}
```

## Deployment Slots

Deployment slots let you stage new versions and swap them into production with zero downtime:

```hcl
# Staging deployment slot
resource "azurerm_linux_web_app_slot" "staging" {
  name           = "staging"
  app_service_id = azurerm_linux_web_app.main.id

  site_config {
    always_on = true

    application_stack {
      node_version = "20-lts"
    }

    health_check_path = "/health"
  }

  # Staging-specific settings
  app_settings = {
    "NODE_ENV"                      = "staging"
    "WEBSITE_NODE_DEFAULT_VERSION"  = "~20"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.web.instrumentation_key
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "staging"
    Slot        = "staging"
  }
}

# Pre-production slot for final testing
resource "azurerm_linux_web_app_slot" "preprod" {
  name           = "preprod"
  app_service_id = azurerm_linux_web_app.main.id

  site_config {
    always_on = true

    application_stack {
      node_version = "20-lts"
    }

    health_check_path = "/health"
  }

  app_settings = {
    "NODE_ENV"                      = "preprod"
    "WEBSITE_NODE_DEFAULT_VERSION"  = "~20"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.web.instrumentation_key
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "preprod"
  }
}
```

## Custom Domain and SSL

Bind a custom domain and configure SSL:

```hcl
# Custom domain binding
resource "azurerm_app_service_custom_hostname_binding" "main" {
  hostname            = "www.example.com"
  app_service_name    = azurerm_linux_web_app.main.name
  resource_group_name = azurerm_resource_group.web.name
}

# Managed SSL certificate (free with App Service)
resource "azurerm_app_service_managed_certificate" "main" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id

  tags = {
    Environment = "production"
  }
}

# Bind the certificate to the custom domain
resource "azurerm_app_service_certificate_binding" "main" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.main.id
  certificate_id      = azurerm_app_service_managed_certificate.main.id
  ssl_state           = "SniEnabled"
}
```

## Windows Web App for .NET

```hcl
# Windows App Service Plan
resource "azurerm_service_plan" "windows" {
  name                = "asp-dotnet-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  os_type             = "Windows"
  sku_name            = "S1"
}

# Windows web app running .NET
resource "azurerm_windows_web_app" "dotnet_app" {
  name                = "webapp-dotnet-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  service_plan_id     = azurerm_service_plan.windows.id

  https_only = true

  site_config {
    always_on = true

    application_stack {
      dotnet_version = "v8.0"
    }

    minimum_tls_version = "1.2"
  }

  app_settings = {
    "ASPNETCORE_ENVIRONMENT" = "Production"
  }

  tags = {
    Environment = "production"
    Framework   = "dotnet"
  }
}
```

## Python Web App

```hcl
# Python web app (Django or Flask)
resource "azurerm_linux_web_app" "python_app" {
  name                = "webapp-python-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  service_plan_id     = azurerm_service_plan.web.id

  https_only = true

  site_config {
    always_on = true

    application_stack {
      python_version = "3.11"
    }

    # Startup command for the application
    app_command_line = "gunicorn --bind=0.0.0.0 --timeout 600 app:app"
  }

  app_settings = {
    "FLASK_ENV"     = "production"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
  }

  tags = {
    Environment = "production"
    Framework   = "python"
  }
}
```

## VNet Integration

Connect your web app to a VNet for accessing private resources:

```hcl
# VNet integration for the web app
resource "azurerm_app_service_virtual_network_swift_connection" "main" {
  app_service_id = azurerm_linux_web_app.main.id
  subnet_id      = var.integration_subnet_id
}

variable "integration_subnet_id" {
  description = "Subnet ID for VNet integration"
  type        = string
}
```

## Key Vault Integration

Store secrets in Key Vault and reference them from app settings:

```hcl
# Key Vault for application secrets
resource "azurerm_key_vault" "app" {
  name                = "kv-webapp-prod"
  location            = azurerm_resource_group.web.location
  resource_group_name = azurerm_resource_group.web.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  tags = {
    Environment = "production"
  }
}

data "azurerm_client_config" "current" {}

# Access policy for the web app's managed identity
resource "azurerm_key_vault_access_policy" "webapp" {
  key_vault_id = azurerm_key_vault.app.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.main.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

# Store a secret
resource "azurerm_key_vault_secret" "db_url" {
  name         = "database-url"
  value        = "postgresql://user:pass@host:5432/db"
  key_vault_id = azurerm_key_vault.app.id
}
```

## Outputs

```hcl
output "web_app_url" {
  description = "URL of the web app"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "staging_url" {
  description = "URL of the staging slot"
  value       = "https://${azurerm_linux_web_app_slot.staging.default_hostname}"
}

output "web_app_identity" {
  description = "Managed identity principal ID"
  value       = azurerm_linux_web_app.main.identity[0].principal_id
}
```

## Monitoring Web Apps

Application Insights provides basic telemetry, but for comprehensive monitoring including uptime checks, alerting, and incident management, add OneUptime to your monitoring stack. This gives you external perspective on your app's availability and response times from multiple locations worldwide.

## Summary

Azure Web Apps provide a PaaS experience that removes most infrastructure management overhead. Terraform lets you define the complete setup - from plans and apps to deployment slots and custom domains - in version-controlled code. Use deployment slots for zero-downtime releases, managed identities for secure secret access, and VNet integration when you need to reach private resources. The investment in setting this up properly through Terraform pays off every time you create a new environment or onboard a new application.
