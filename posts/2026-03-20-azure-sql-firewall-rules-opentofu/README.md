# How to Configure Azure SQL Firewall Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, Firewall, OpenTofu, Security, Networking

Description: Learn how to configure Azure SQL Database firewall rules with OpenTofu to control network access from specific IP ranges, VNets, and Azure services.

## Overview

Azure SQL Database is protected by a firewall that blocks all connections by default. You can create rules to allow specific IP addresses, IP ranges, and virtual network subnets. Managing these rules with OpenTofu ensures they're consistent across environments.

## Step 1: Create SQL Server

```hcl
# main.tf - SQL Server with firewall management

resource "azurerm_mssql_server" "server" {
  name                         = "my-firewall-sql-server"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  # Keep the public endpoint enabled when using firewall or virtual network rules
  public_network_access_enabled = true  # Use private endpoints instead for private-only access
}
```

## Step 2: Add IP-Based Firewall Rules

```hcl
# Allow access from specific IP addresses
resource "azurerm_mssql_firewall_rule" "office_ip" {
  name             = "AllowOfficeIP"
  server_id        = azurerm_mssql_server.server.id
  start_ip_address = "203.0.113.10"
  end_ip_address   = "203.0.113.10"
}

# Allow access from an IP range
resource "azurerm_mssql_firewall_rule" "vpn_range" {
  name             = "AllowVPNRange"
  server_id        = azurerm_mssql_server.server.id
  start_ip_address = "198.51.100.0"
  end_ip_address   = "198.51.100.255"
}

# Special rule: 0.0.0.0 to 0.0.0.0 enables "Allow Azure services and resources to access this server"
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.server.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
```

## Step 3: Manage Multiple Rules Dynamically

```hcl
# Define allowed IP ranges in variables for easy management
variable "allowed_ip_ranges" {
  description = "Map of firewall rule names to IP range objects"
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default = {
    "developer-1" = { start_ip = "198.51.100.1", end_ip = "198.51.100.1" }
    "developer-2" = { start_ip = "198.51.100.2", end_ip = "198.51.100.2" }
    "ci-cd-runner" = { start_ip = "203.0.113.50", end_ip = "203.0.113.50" }
  }
}

# Create all rules dynamically from the variable
resource "azurerm_mssql_firewall_rule" "dynamic_rules" {
  for_each = var.allowed_ip_ranges

  name             = each.key
  server_id        = azurerm_mssql_server.server.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}
```

## Step 4: VNet Service Endpoint Rules

```hcl
# The subnet must have the Microsoft.Sql service endpoint enabled
resource "azurerm_virtual_network" "vnet" {
  name                = "app-vnet"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "app_subnet" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
  service_endpoints    = ["Microsoft.Sql"]
}

# Allow access from a specific VNet subnet via service endpoint
resource "azurerm_mssql_virtual_network_rule" "app_subnet_rule" {
  name      = "allow-app-subnet"
  server_id = azurerm_mssql_server.server.id
  subnet_id = azurerm_subnet.app_subnet.id
}
```

## Step 5: Outputs

```hcl
output "sql_server_fqdn" {
  value = azurerm_mssql_server.server.fully_qualified_domain_name
}

output "firewall_rule_names" {
  value = [for rule in azurerm_mssql_firewall_rule.dynamic_rules : rule.name]
}
```

## Summary

Managing Azure SQL firewall rules with OpenTofu ensures all allowed IP ranges and VNet rules are version-controlled and consistently applied. Using a variable-driven `for_each` pattern makes it easy to add or remove allowed addresses through configuration changes rather than manual portal updates.
