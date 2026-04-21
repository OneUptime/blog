# How to Build a Three-Tier Web Application Architecture with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Architecture, Three-Tier, OpenTofu, App Service, Azure SQL, Application Gateway

Description: Learn how to build a production-ready three-tier web application on Azure using OpenTofu with Application Gateway, App Service, and Azure SQL Database.

## Overview

The Azure three-tier architecture uses Application Gateway for presentation (with WAF), App Service for application logic, and Azure SQL for the data tier. OpenTofu provisions the complete stack with VNet integration and private endpoints for database access.

## Step 1: VNet with Subnets

```hcl
# main.tf - Three-tier VNet

resource "azurerm_virtual_network" "vnet" {
  name                = "three-tier-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "gateway" {
  name                 = "gateway-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]  # Presentation tier
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]  # Application tier

  delegation {
    name = "app-service-delegation"
    service_delegation {
      name = "Microsoft.Web/serverFarms"
    }
  }
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.3.0/24"]  # Data tier
}
```

## Step 2: Application Gateway with WAF

```hcl
# Application Gateway (Presentation Tier)
resource "azurerm_application_gateway" "app_gw" {
  name                = "three-tier-appgw"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  sku {
    name = "WAF_v2"
    tier = "WAF_v2"
  }

  autoscale_configuration {
    min_capacity = 2
    max_capacity = 10
  }

  gateway_ip_configuration {
    name      = "gateway-ip"
    subnet_id = azurerm_subnet.gateway.id
  }

  frontend_ip_configuration {
    name                 = "public-ip"
    public_ip_address_id = azurerm_public_ip.app_gw.id
  }

  frontend_port {
    name = "https"
    port = 443
  }

  ssl_certificate {
    name     = "app-cert"
    data     = filebase64(var.app_gateway_certificate_path)
    password = var.app_gateway_certificate_password
  }

  backend_address_pool {
    name  = "app-service-pool"
    fqdns = [azurerm_linux_web_app.app.default_hostname]
  }

  backend_http_settings {
    name                  = "app-settings"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    probe_name            = "app-probe"
    pick_host_name_from_backend_address = true
  }

  probe {
    name                                      = "app-probe"
    protocol                                  = "Https"
    path                                      = "/"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200-399"]
    }
  }

  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "public-ip"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "app-cert"
  }

  request_routing_rule {
    name                       = "app-rule"
    rule_type                  = "Basic"
    http_listener_name         = "https-listener"
    backend_address_pool_name  = "app-service-pool"
    backend_http_settings_name = "app-settings"
    priority                   = 100
  }

  # WAF configuration
  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }
}
```

## Step 3: App Service (Application Tier)

```hcl
# App Service Plan
resource "azurerm_service_plan" "plan" {
  name                = "three-tier-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "P2v3"
}

# Web App with VNet integration
resource "azurerm_linux_web_app" "app" {
  name                = "three-tier-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  # VNet integration for private database access
  virtual_network_subnet_id = azurerm_subnet.app.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    vnet_route_all_enabled = true
    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    DB_CONNECTION_STRING = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_conn.versionless_id})"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.insights.connection_string
  }
}
```

## Step 4: Azure SQL with Private Endpoint (Data Tier)

```hcl
# Azure SQL Server with private endpoint
resource "azurerm_mssql_server" "sql" {
  name                         = "three-tier-sqlserver"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  public_network_access_enabled = false  # Private endpoint only

  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = data.azuread_client_config.current.object_id
  }
}

# Azure SQL Database
resource "azurerm_mssql_database" "db" {
  name      = "three-tier-db"
  server_id = azurerm_mssql_server.sql.id
  sku_name  = "S0"
}

# Private DNS zone for Azure SQL private endpoint resolution
resource "azurerm_private_dns_zone" "sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "sql" {
  name                  = "sql-private-dns-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.sql.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}

# Private endpoint for SQL Server
resource "azurerm_private_endpoint" "sql" {
  name                = "sql-private-endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.database.id

  private_service_connection {
    name                           = "sql-connection"
    private_connection_resource_id = azurerm_mssql_server.sql.id
    is_manual_connection           = false
    subresource_names              = ["sqlServer"]
  }

  private_dns_zone_group {
    name                 = "sql-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.sql.id]
  }
}
```

## Summary

The Azure three-tier architecture built with OpenTofu uses Application Gateway v2 with WAF for Layer 7 web attack protection and OWASP rule enforcement at the presentation tier. App Service VNet integration enables private communication to Azure SQL, which is accessible only through a private endpoint, never the public internet. Azure Application Insights provides end-to-end observability across all three tiers.
