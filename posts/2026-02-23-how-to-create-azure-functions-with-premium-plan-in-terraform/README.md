# How to Create Azure Functions with Premium Plan in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Functions, Serverless, Premium Plan, VNet

Description: Learn how to deploy Azure Functions with Premium Plan using Terraform for enhanced performance, VNet integration, and pre-warmed instances to eliminate cold starts.

---

Azure Functions Premium Plan offers the best of both worlds: the serverless event-driven programming model of Azure Functions combined with enterprise features like VNet integration, unlimited execution duration, pre-warmed instances, and premium hardware. Unlike the Consumption plan, Premium Plan eliminates cold starts by keeping instances warm and ready. Terraform makes it easy to provision and manage Azure Functions with Premium Plan configurations.

This guide covers setting up Azure Functions with Premium Plan in Terraform, including VNet integration, scaling configuration, and deployment slots.

## Understanding Premium Plan Benefits

The Azure Functions Premium Plan provides several advantages over the Consumption plan:

- **Pre-warmed instances**: Always-ready instances eliminate cold starts
- **VNet integration**: Connect to resources in your virtual network
- **Unlimited execution duration**: No 5 or 10 minute timeout limits
- **Premium hardware**: More powerful compute instances with faster CPUs
- **More memory**: Up to 14 GB per instance

## Setting Up the Foundation

Create the resource group and networking infrastructure:

```hcl
# Configure Terraform
terraform {
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

# Resource group
resource "azurerm_resource_group" "main" {
  name     = "rg-functions-premium"
  location = "East US"
}

# Virtual network for VNet integration
resource "azurerm_virtual_network" "main" {
  name                = "vnet-functions"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

# Subnet for Azure Functions VNet integration
resource "azurerm_subnet" "functions" {
  name                 = "subnet-functions"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  # Delegate to Azure Functions
  delegation {
    name = "functions-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Subnet for private endpoints (databases, storage, etc.)
resource "azurerm_subnet" "private_endpoints" {
  name                 = "subnet-private-endpoints"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}
```

## Creating the Premium Plan

Define the App Service Plan with Premium tier:

```hcl
# Azure Functions Premium Plan
resource "azurerm_service_plan" "premium" {
  name                = "asp-functions-premium"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"

  # Premium plan SKU options:
  # EP1 - 1 core, 3.5 GB RAM
  # EP2 - 2 cores, 7 GB RAM
  # EP3 - 4 cores, 14 GB RAM
  sku_name = "EP1"

  # Maximum elastic worker count
  maximum_elastic_worker_count = 20

  tags = {
    Environment = "production"
  }
}
```

## Creating the Storage Account

Azure Functions requires a storage account:

```hcl
# Storage account for Azure Functions
resource "azurerm_storage_account" "functions" {
  name                     = "stfuncpremium${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Secure defaults
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  tags = {
    Environment = "production"
  }
}

# Random suffix for globally unique storage name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

## Creating the Function App

Deploy the Azure Function App with Premium Plan:

```hcl
# Application Insights for monitoring
resource "azurerm_application_insights" "functions" {
  name                = "ai-functions-premium"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main.id

  retention_in_days = 90
}

# Log Analytics workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-functions-premium"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Azure Function App with Premium Plan
resource "azurerm_linux_function_app" "main" {
  name                = "func-premium-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.premium.id

  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  # VNet integration
  virtual_network_subnet_id = azurerm_subnet.functions.id

  # Site configuration
  site_config {
    # Pre-warmed instances (minimum always-ready instances)
    elastic_instance_minimum = 2

    # Runtime configuration
    application_stack {
      node_version = "18"
    }

    # Always On is automatically enabled for Premium Plan
    always_on = true

    # Health check for load balancing
    health_check_path                 = "/api/health"
    health_check_eviction_time_in_min = 5

    # CORS configuration
    cors {
      allowed_origins = [
        "https://myapp.example.com",
        "https://admin.example.com"
      ]
      support_credentials = true
    }

    # IP restrictions
    ip_restriction {
      name       = "allow-frontend"
      ip_address = "203.0.113.0/24"
      action     = "Allow"
      priority   = 100
    }

    # Application Insights integration
    application_insights_connection_string = azurerm_application_insights.functions.connection_string
    application_insights_key               = azurerm_application_insights.functions.instrumentation_key
  }

  # Application settings
  app_settings = {
    # Runtime settings
    FUNCTIONS_WORKER_RUNTIME       = "node"
    WEBSITE_NODE_DEFAULT_VERSION   = "~18"

    # VNet routing
    WEBSITE_VNET_ROUTE_ALL = "1"

    # DNS settings for VNet
    WEBSITE_DNS_SERVER = "168.63.129.16"

    # Custom application settings
    API_BASE_URL     = "https://api.example.com"
    CACHE_TTL        = "3600"
  }

  # Identity for accessing Azure resources
  identity {
    type = "SystemAssigned"
  }

  # Sticky settings that do not swap with deployment slots
  sticky_settings {
    app_setting_names = [
      "APPINSIGHTS_INSTRUMENTATIONKEY",
      "APPLICATIONINSIGHTS_CONNECTION_STRING"
    ]
  }

  tags = {
    Environment = "production"
  }
}
```

## Adding Deployment Slots

Premium Plan supports deployment slots for zero-downtime deployments:

```hcl
# Staging deployment slot
resource "azurerm_linux_function_app_slot" "staging" {
  name                 = "staging"
  function_app_id      = azurerm_linux_function_app.main.id
  storage_account_name = azurerm_storage_account.functions.name

  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  virtual_network_subnet_id = azurerm_subnet.functions.id

  site_config {
    elastic_instance_minimum = 1

    application_stack {
      node_version = "18"
    }

    always_on             = true
    health_check_path     = "/api/health"

    application_insights_connection_string = azurerm_application_insights.functions.connection_string
    application_insights_key               = azurerm_application_insights.functions.instrumentation_key
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME     = "node"
    WEBSITE_NODE_DEFAULT_VERSION = "~18"
    WEBSITE_VNET_ROUTE_ALL       = "1"
    WEBSITE_DNS_SERVER           = "168.63.129.16"

    # Staging-specific settings
    API_BASE_URL = "https://api-staging.example.com"
    ENVIRONMENT  = "staging"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Configuring Private Endpoints

For maximum security, add private endpoints to the storage account:

```hcl
# Private endpoint for storage account
resource "azurerm_private_endpoint" "storage" {
  name                = "pe-storage-functions"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-storage"
    private_connection_resource_id = azurerm_storage_account.functions.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "storage-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.storage.id]
  }
}

# Private DNS zone for storage
resource "azurerm_private_dns_zone" "storage" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

# Link DNS zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "storage" {
  name                  = "storage-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
```

## Setting Up Auto-Scaling Rules

Configure custom auto-scaling rules:

```hcl
# Auto-scale settings for the Premium Plan
resource "azurerm_monitor_autoscale_setting" "functions" {
  name                = "autoscale-functions-premium"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_service_plan.premium.id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 2
      maximum = 20
    }

    # Scale out on high CPU
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.premium.id
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
        value     = "2"
        cooldown  = "PT5M"
      }
    }

    # Scale in when CPU drops
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.premium.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
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
output "function_app_url" {
  description = "URL of the Function App"
  value       = "https://${azurerm_linux_function_app.main.default_hostname}"
}

output "function_app_identity" {
  description = "System-assigned identity principal ID"
  value       = azurerm_linux_function_app.main.identity[0].principal_id
}

output "staging_slot_url" {
  description = "URL of the staging slot"
  value       = "https://${azurerm_linux_function_app_slot.staging.default_hostname}"
}
```

## Monitoring with OneUptime

Premium Plan functions are often used for business-critical workloads. OneUptime provides deep monitoring for Azure Functions, tracking invocation counts, execution duration, failure rates, and cold start metrics. Set up alerts for when function health checks fail or error rates exceed thresholds. Visit [OneUptime](https://oneuptime.com) for comprehensive serverless monitoring.

## Conclusion

Azure Functions with Premium Plan in Terraform gives you enterprise-grade serverless capabilities with full infrastructure-as-code management. Pre-warmed instances eliminate cold starts, VNet integration provides secure access to private resources, and deployment slots enable zero-downtime releases. By defining your Premium Plan configuration in Terraform, you ensure consistent deployments across environments and maintain a clear record of your infrastructure decisions. The combination of auto-scaling, health checks, and private networking makes Premium Plan ideal for production workloads that demand both performance and security.

For more serverless options, see [How to Create Azure Container Apps Environment in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-container-apps-environment-in-terraform/view) and [How to Handle Serverless Cold Start Issues with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-serverless-cold-start-issues-with-terraform/view).
