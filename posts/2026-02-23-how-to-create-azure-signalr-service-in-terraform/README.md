# How to Create Azure SignalR Service in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, SignalR, Real-Time, WebSockets, Infrastructure as Code

Description: Learn how to provision Azure SignalR Service with Terraform for building real-time web applications with WebSocket support, scaling, and managed connections.

---

Azure SignalR Service is a fully managed service that adds real-time web functionality to your applications. Instead of managing your own WebSocket infrastructure - dealing with connection limits, sticky sessions, and horizontal scaling - you offload all of that to Azure. Your application server talks to SignalR Service, and SignalR Service handles the fan-out to potentially millions of connected clients.

If you are building dashboards that update in real-time, chat applications, live notifications, collaborative editing tools, or IoT telemetry displays, SignalR Service is worth considering. And provisioning it through Terraform ensures your real-time infrastructure is consistent, reproducible, and version-controlled.

## How Azure SignalR Service Works

In a traditional setup, your application server maintains WebSocket connections directly with clients. This creates scaling challenges because each server can only handle a limited number of concurrent connections, and you need sticky sessions to route clients back to the right server.

Azure SignalR Service acts as a proxy between your app server and the clients. Your server sends messages to the SignalR Service, which then distributes them to all connected clients. This means your app servers stay stateless and can scale horizontally without worrying about connection management.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

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

## Creating a Basic SignalR Service

```hcl
resource "azurerm_resource_group" "realtime" {
  name     = "rg-realtime-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
  }
}

# Create the SignalR Service instance
resource "azurerm_signalr_service" "main" {
  name                = "sigr-prod-eastus-001"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name

  # SKU options: Free_F1, Standard_S1, Premium_P1
  sku {
    name     = "Standard_S1"
    capacity = 1 # Number of units (1, 2, 5, 10, 20, 50, 100)
  }

  # Service mode determines how the service operates
  # Default - standard SignalR with app server
  # Serverless - Azure Functions integration, no persistent app server needed
  # Classic - automatic detection (legacy, avoid for new deployments)
  service_mode = "Default"

  # Connectivity settings
  connectivity_logs_enabled = true
  messaging_logs_enabled    = true
  live_trace_enabled        = false

  # Public network access
  public_network_access_enabled = true

  # CORS configuration for web clients
  cors {
    allowed_origins = [
      "https://myapp.example.com",
      "https://admin.example.com"
    ]
  }

  # Managed identity
  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
```

## Serverless Mode for Azure Functions

If you are using Azure Functions as your backend, Serverless mode eliminates the need for a persistent app server:

```hcl
# SignalR in Serverless mode for use with Azure Functions
resource "azurerm_signalr_service" "serverless" {
  name                = "sigr-serverless-prod-001"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name

  sku {
    name     = "Standard_S1"
    capacity = 1
  }

  # Serverless mode - clients connect directly to SignalR Service
  # Azure Functions handle the business logic
  service_mode = "Serverless"

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true

  cors {
    allowed_origins = ["*"] # Adjust for production
  }

  # Upstream URL settings for serverless mode
  upstream_endpoint {
    category_pattern = ["*"]
    event_pattern    = ["*"]
    hub_pattern      = ["*"]

    url_template = "https://my-functions.azurewebsites.net/runtime/webhooks/signalr?code={function-key}"
  }

  tags = {
    Environment = "Production"
    Mode        = "Serverless"
  }
}
```

## Network Isolation with Private Endpoints

For production workloads that need network isolation:

```hcl
# Virtual network setup
resource "azurerm_virtual_network" "main" {
  name                = "vnet-realtime-prod"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-private-endpoints"
  resource_group_name  = azurerm_resource_group.realtime.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  private_endpoint_network_policies_enabled = true
}

# Private DNS zone for SignalR
resource "azurerm_private_dns_zone" "signalr" {
  name                = "privatelink.service.signalr.net"
  resource_group_name = azurerm_resource_group.realtime.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "signalr" {
  name                  = "signalr-dns-link"
  resource_group_name   = azurerm_resource_group.realtime.name
  private_dns_zone_name = azurerm_private_dns_zone.signalr.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# SignalR with private endpoint
resource "azurerm_signalr_service" "private" {
  name                = "sigr-private-prod-001"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name

  sku {
    name     = "Premium_P1"
    capacity = 1
  }

  service_mode = "Default"

  # Disable public access when using private endpoints
  public_network_access_enabled = false

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}

# Private endpoint for SignalR
resource "azurerm_private_endpoint" "signalr" {
  name                = "pe-signalr-prod"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-signalr"
    private_connection_resource_id = azurerm_signalr_service.private.id
    subresource_names              = ["signalr"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "signalr-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.signalr.id]
  }
}
```

## Custom Domains

You can configure custom domains for your SignalR Service:

```hcl
# Custom domain requires a certificate in Key Vault
resource "azurerm_signalr_service_custom_domain" "main" {
  name                  = "custom-domain"
  signalr_service_id    = azurerm_signalr_service.main.id
  domain_name           = "realtime.example.com"
  signalr_custom_certificate_id = azurerm_signalr_service_custom_certificate.main.id
}

resource "azurerm_signalr_service_custom_certificate" "main" {
  name                  = "custom-cert"
  signalr_service_id    = azurerm_signalr_service.main.id
  custom_certificate_id = "https://my-keyvault.vault.azure.net/certificates/realtime-cert/latest"
}
```

## Monitoring and Diagnostics

```hcl
# Log Analytics workspace
resource "azurerm_log_analytics_workspace" "monitoring" {
  name                = "law-realtime-prod"
  location            = azurerm_resource_group.realtime.location
  resource_group_name = azurerm_resource_group.realtime.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Diagnostic settings for SignalR
resource "azurerm_monitor_diagnostic_setting" "signalr" {
  name                       = "diag-signalr-to-law"
  target_resource_id         = azurerm_signalr_service.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.monitoring.id

  enabled_log {
    category = "AllLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Alert when connection count is high
resource "azurerm_monitor_metric_alert" "signalr_connections" {
  name                = "alert-signalr-high-connections"
  resource_group_name = azurerm_resource_group.realtime.name
  scopes              = [azurerm_signalr_service.main.id]
  description         = "Alert when SignalR connection count exceeds 80% of capacity"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.SignalRService/SignalR"
    metric_name      = "ConnectionCount"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 800 # Standard_S1 unit supports 1000 connections
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}

resource "azurerm_monitor_action_group" "ops" {
  name                = "ag-ops-team"
  resource_group_name = azurerm_resource_group.realtime.name
  short_name          = "OpsTeam"

  email_receiver {
    name          = "ops-email"
    email_address = "ops@example.com"
  }
}
```

## Outputs

```hcl
output "signalr_hostname" {
  description = "SignalR Service hostname"
  value       = azurerm_signalr_service.main.hostname
}

output "signalr_primary_connection_string" {
  description = "Primary connection string for the SignalR Service"
  value       = azurerm_signalr_service.main.primary_connection_string
  sensitive   = true
}

output "signalr_id" {
  description = "SignalR Service resource ID"
  value       = azurerm_signalr_service.main.id
}
```

## Best Practices

**Choose the right service mode.** Use Default mode when you have a persistent app server (ASP.NET Core, etc.). Use Serverless mode when you want Azure Functions to handle the logic. Do not use Classic mode for new deployments.

**Size your units based on connection count.** Each Standard S1 unit supports about 1,000 concurrent connections and 1 million messages per day. Monitor your actual usage and scale accordingly.

**Use private endpoints in production.** Public SignalR endpoints work fine for development, but production workloads should use private endpoints to keep traffic on the Azure backbone.

**Enable connectivity and messaging logs.** These logs are invaluable for debugging connection issues. The cost is minimal compared to the troubleshooting time they save.

**Configure CORS properly.** Do not use wildcard origins in production. Restrict allowed origins to the exact domains your web clients use.

## Conclusion

Azure SignalR Service takes the operational complexity out of real-time web applications. With Terraform, you can provision and configure the service consistently across environments, set up network isolation, configure monitoring, and manage scaling - all through code. Whether you are building a simple notification system or a complex real-time collaboration platform, the combination of SignalR Service and Terraform gives you a solid foundation.
