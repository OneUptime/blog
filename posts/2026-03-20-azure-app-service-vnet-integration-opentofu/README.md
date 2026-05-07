# How to Configure Azure App Service VNet Integration with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, VNet Integration, OpenTofu, Networking, Security

Description: Learn how to configure Azure App Service VNet Integration with OpenTofu to enable web apps to securely communicate with resources in an Azure virtual network.

## Overview

Azure App Service VNet Integration enables outbound connectivity from your web app to resources inside a virtual network. It applies to outbound traffic only; private inbound access to the app itself requires a separate private endpoint. This is essential for accessing databases, storage, or other services on private networks without exposing them to the internet.

## Step 1: Create VNet and Subnets for Integration

```hcl
# main.tf - VNet and subnets for App Service VNet integration, PostgreSQL, and private endpoints

resource "azurerm_virtual_network" "vnet" {
  name                = "app-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# Dedicated subnet for App Service VNet integration. /28 works, but /26 is recommended for scale.
resource "azurerm_subnet" "app_service_subnet" {
  name                 = "app-service-integration-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.5.0/28"]

  # Required delegation for App Service VNet integration
  delegation {
    name = "app-service-delegation"
    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

# Dedicated delegated subnet for PostgreSQL Flexible Server
resource "azurerm_subnet" "postgres_subnet" {
  name                 = "postgres-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "postgres-flex-delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Separate subnet for private endpoints. App Service VNet integration can't use this subnet.
resource "azurerm_subnet" "private_endpoint_subnet" {
  name                 = "private-endpoint-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
}
```

## Step 2: Create App Service Plan and Web App

```hcl
# Basic or higher dedicated plan is required for VNet integration
resource "azurerm_service_plan" "plan" {
  name                = "vnet-integrated-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "P1v3"  # Premium V3 supports VNet integration
}

resource "azurerm_linux_web_app" "app" {
  name                = "my-vnet-integrated-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  site_config {
    application_stack {
      node_version = "20-lts"
    }

    # Send all outbound traffic into the VNet so NSGs, UDRs, and NAT can apply
    vnet_route_all_enabled = true
  }

  # Attach to VNet integration subnet
  virtual_network_subnet_id = azurerm_subnet.app_service_subnet.id
}
```

## Step 3: Enable Access to Private Resources

```hcl
# Private DNS zone required for PostgreSQL Flexible Server private access
resource "azurerm_private_dns_zone" "postgres_dns" {
  name                = "myapp.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres_dns_link" {
  name                  = "postgres-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres_dns.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
  resource_group_name   = azurerm_resource_group.rg.name
}

# PostgreSQL Flexible Server on a dedicated delegated subnet
resource "azurerm_postgresql_flexible_server" "db" {
  name                          = "my-private-postgres"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  administrator_login           = "pgadmin"
  administrator_password        = var.db_password
  version                       = "15"
  sku_name                      = "B_Standard_B1ms"
  delegated_subnet_id           = azurerm_subnet.postgres_subnet.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres_dns.id
  public_network_access_enabled = false

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres_dns_link]
}
```

## Step 4: Private Endpoint for Inbound Access

```hcl
# Private DNS zone required so the default App Service hostname resolves privately
resource "azurerm_private_dns_zone" "app_service_dns" {
  name                = "privatelink.azurewebsites.net"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "app_service_dns_link" {
  name                  = "app-service-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.app_service_dns.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
  resource_group_name   = azurerm_resource_group.rg.name
}

# Private endpoint for inbound traffic to the App Service
resource "azurerm_private_endpoint" "app_pe" {
  name                = "app-private-endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoint_subnet.id

  private_service_connection {
    name                           = "app-private-connection"
    private_connection_resource_id = azurerm_linux_web_app.app.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "app-service-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.app_service_dns.id]
  }
}
```

## Step 5: Outputs

```hcl
output "app_vnet_integration_subnet" {
  value       = azurerm_subnet.app_service_subnet.id
  description = "Subnet used for App Service VNet integration"
}

output "app_url" {
  value = "https://${azurerm_linux_web_app.app.default_hostname}"
}
```

## Summary

Azure App Service VNet Integration with OpenTofu enables secure private connectivity between your web app and backend resources like databases and storage. With `vnet_route_all_enabled`, all outbound traffic from the app is sent into the VNet so your routing, NSGs, and NAT configuration apply. When your backend resources use private networking, app-to-backend traffic stays on private network paths.
