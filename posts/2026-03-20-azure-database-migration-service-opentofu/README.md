# How to Set Up Azure Database Migration Service with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Database Migration, DMS, PostgreSQL, Infrastructure as Code

Description: Learn how to provision Azure Database Migration Service and configure online migration projects using OpenTofu.

## Introduction

Azure Database Migration Service (classic DMS) enables online and offline migrations to Azure managed databases. OpenTofu manages DMS instances, migration projects, and the supporting networking infrastructure as code.

## Enabling Required APIs

```hcl
resource "azurerm_resource_group" "migration" {
  name     = "rg-dms-${var.environment}"
  location = var.location
}

# Register the DMS resource provider

resource "azurerm_resource_provider_registration" "dms" {
  name = "Microsoft.DataMigration"
}
```

## Virtual Network for DMS

```hcl
resource "azurerm_virtual_network" "dms" {
  name                = "vnet-dms-${var.environment}"
  resource_group_name = azurerm_resource_group.migration.name
  location            = azurerm_resource_group.migration.location
  address_space       = ["10.50.0.0/16"]
}

resource "azurerm_subnet" "dms" {
  name                 = "snet-dms"
  resource_group_name  = azurerm_resource_group.migration.name
  virtual_network_name = azurerm_virtual_network.dms.name
  address_prefixes     = ["10.50.0.0/24"]
}
```

## Creating a DMS Instance

```hcl
resource "azurerm_database_migration_service" "main" {
  name                = "dms-${var.app_name}-${var.environment}"
  location            = azurerm_resource_group.migration.location
  resource_group_name = azurerm_resource_group.migration.name
  subnet_id           = azurerm_subnet.dms.id

  # Premium tier is required for PostgreSQL online migrations in DMS classic
  sku_name = "Premium_4vCores"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating a Migration Project

```hcl
resource "azurerm_database_migration_project" "postgres_migration" {
  name                = "pg-migration-${var.environment}"
  service_name        = azurerm_database_migration_service.main.name
  resource_group_name = azurerm_resource_group.migration.name
  location            = azurerm_resource_group.migration.location

  source_platform = "PostgreSql"
  target_platform = "AzureDbForPostgreSql"
}
```

## Target Database (Azure Database for PostgreSQL)

```hcl
resource "azurerm_postgresql_flexible_server" "target" {
  name                   = "psql-${var.app_name}-${var.environment}"
  resource_group_name    = azurerm_resource_group.migration.name
  location               = azurerm_resource_group.migration.location
  version                = "16"
  administrator_login    = var.db_admin_user
  administrator_password = var.db_admin_password

  sku_name   = "GP_Standard_D4s_v3"
  storage_mb = 32768

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

resource "azurerm_postgresql_flexible_server_database" "app_db" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.target.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}
```

## Firewall Rule for DMS Access

```hcl
resource "azurerm_postgresql_flexible_server_firewall_rule" "dms" {
  name             = "allow-dms"
  server_id        = azurerm_postgresql_flexible_server.target.id

  # 0.0.0.0 allows Azure-internal services such as DMS to reach the public endpoint.
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
```

## Outputs

```hcl
output "target_db_hostname" {
  value = azurerm_postgresql_flexible_server.target.fqdn
}

output "dms_service_id" {
  value = azurerm_database_migration_service.main.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Database Migration Service (classic) orchestrates data movement to Azure managed databases. OpenTofu provisions the DMS instance, migration project, virtual network, target database, and firewall rule - creating a repeatable migration infrastructure that can be used across environments.
