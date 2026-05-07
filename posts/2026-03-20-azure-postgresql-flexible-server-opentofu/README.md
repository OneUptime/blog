# How to Set Up Azure Database for PostgreSQL Flexible Server with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, OpenTofu, Database, Flexible Server, Infrastructure

Description: Learn how to deploy Azure Database for PostgreSQL Flexible Server with OpenTofu, including VNet integration, high availability, and backup configuration.

## Overview

Azure Database for PostgreSQL Flexible Server provides a fully managed PostgreSQL database with more control over server parameters, cost optimization, and built-in HA. It supports VNet integration for private connectivity and zone-redundant high availability in regions that support availability zones.

## Step 1: Create VNet and Subnet for Private Access

```hcl
# main.tf - Dedicated subnet for PostgreSQL Flexible Server

resource "azurerm_subnet" "postgres_subnet" {
  name                 = "postgres-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  # Delegate the subnet to PostgreSQL flexible server
  delegation {
    name = "postgres-delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Private DNS zone for PostgreSQL flexible server
resource "azurerm_private_dns_zone" "postgres_dns" {
  name                = "my-postgres.private.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres_dns_link" {
  name                  = "postgres-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres_dns.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
  resource_group_name   = azurerm_resource_group.rg.name
}
```

## Step 2: Deploy PostgreSQL Flexible Server

```hcl
# PostgreSQL Flexible Server with Zone-Redundant HA
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                   = "my-postgres-server"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "15"  # PostgreSQL version

  # Administrator credentials
  administrator_login    = "pgadmin"
  administrator_password = var.postgres_admin_password

  # Compute tier and size
  sku_name   = "GP_Standard_D4s_v3"  # General Purpose, 4 vCores
  storage_mb = 32768  # 32 GB storage

  # High availability configuration
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  # Availability zone for primary
  zone = "1"

  # VNet integration via subnet delegation
  delegated_subnet_id    = azurerm_subnet.postgres_subnet.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgres_dns.id
  public_network_access_enabled = false

  # Backup retention
  backup_retention_days        = 7
  geo_redundant_backup_enabled = true

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres_dns_link]
}
```

## Step 3: Configure Server Parameters

```hcl
# Tune PostgreSQL server parameters
resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = "200"
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = "131072" # 1 GiB expressed as 8 KB pages
}

resource "azurerm_postgresql_flexible_server_configuration" "log_checkpoints" {
  name      = "log_checkpoints"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = "on"
}
```

## Step 4: Create Databases

```hcl
# Create application databases
resource "azurerm_postgresql_flexible_server_database" "app_db" {
  name      = "appdb"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}
```

## Step 5: Outputs

```hcl
output "postgres_fqdn" {
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
  description = "PostgreSQL server FQDN for connection strings"
}
```

## Summary

Azure Database for PostgreSQL Flexible Server deployed with OpenTofu provides a fully managed, highly available PostgreSQL instance with VNet integration. Zone-redundant HA in supported regions, geo-redundant backups in paired regions, and configurable server parameters make it suitable for production workloads requiring both performance and resilience.
