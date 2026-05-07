# How to Set Up Azure Database for MySQL Flexible Server with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, OpenTofu, Database, Flexible Server, Infrastructure

Description: Learn how to deploy Azure Database for MySQL Flexible Server with OpenTofu, including private networking, high availability zones, and server configuration.

## Overview

Azure Database for MySQL Flexible Server is a fully managed MySQL service offering zone-redundant HA, VNet integration, and cost-optimized compute tiers. OpenTofu makes it straightforward to define and manage these resources as code.

## Step 1: Network Setup for Private Access

```hcl
# main.tf - VNet and subnet for MySQL Flexible Server

resource "azurerm_subnet" "mysql_subnet" {
  name                 = "mysql-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.3.0/24"]

  # MySQL Flexible Server requires subnet delegation
  delegation {
    name = "mysql-delegation"
    service_delegation {
      name = "Microsoft.DBforMySQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_private_dns_zone" "mysql_dns" {
  name                = "my-mysql.mysql.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "mysql_dns_link" {
  name                  = "mysql-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.mysql_dns.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
  resource_group_name   = azurerm_resource_group.rg.name
}
```

## Step 2: Deploy MySQL Flexible Server

```hcl
# MySQL Flexible Server with zone-redundant HA
resource "azurerm_mysql_flexible_server" "mysql" {
  name                   = "my-mysql-server"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  administrator_login    = "mysqladmin"
  administrator_password = var.mysql_admin_password

  # MySQL version
  version = "8.0.21"

  # Compute configuration
  sku_name = "GP_Standard_D4ds_v4"  # General Purpose, 4 vCores

  # Storage configuration
  storage {
    size_gb           = 32
    iops              = 396
    auto_grow_enabled = true
  }

  # Zone redundant HA
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  zone = "1"

  # Private networking
  delegated_subnet_id = azurerm_subnet.mysql_subnet.id
  private_dns_zone_id = azurerm_private_dns_zone.mysql_dns.id

  # Backup settings
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  depends_on = [azurerm_private_dns_zone_virtual_network_link.mysql_dns_link]
}
```

## Step 3: Configure Server Parameters

```hcl
# Tune MySQL server parameters for performance
resource "azurerm_mysql_flexible_server_configuration" "slow_query_log" {
  name                = "slow_query_log"
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  value               = "ON"
}

resource "azurerm_mysql_flexible_server_configuration" "long_query_time" {
  name                = "long_query_time"
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  value               = "2"  # Log queries taking more than 2 seconds
}

resource "azurerm_mysql_flexible_server_configuration" "max_connections" {
  name                = "max_connections"
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  value               = "200"
}
```

## Step 4: Create Database

```hcl
resource "azurerm_mysql_flexible_database" "app_db" {
  name                = "appdb"
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}
```

## Step 5: Outputs

```hcl
output "mysql_fqdn" {
  value       = azurerm_mysql_flexible_server.mysql.fqdn
  description = "MySQL server hostname for connection strings"
}

output "mysql_connection_string" {
  value     = "Server=${azurerm_mysql_flexible_server.mysql.fqdn};Database=appdb;Uid=${azurerm_mysql_flexible_server.mysql.administrator_login};Pwd=<password>"
  sensitive = true
}
```

## Summary

Azure Database for MySQL Flexible Server with OpenTofu delivers a production-ready MySQL deployment with private networking, zone-redundant HA, and configurable server parameters. The flexible compute tiers and burstable SKUs make it cost-effective for various workloads.
