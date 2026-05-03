# How to Deploy Azure SQL Database with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure SQL, Azure, Database, Infrastructure as Code, DevOps

Description: Learn how to deploy Azure SQL Database using OpenTofu - including logical server, database, firewall rules, private endpoints, and Elastic Pool configuration.

## Introduction

Azure SQL Database on OpenTofu requires an `azurerm_mssql_server` (the logical server), an `azurerm_mssql_database` (the actual database), firewall rules or private endpoints for access control, and an Azure AD administrator for modern authentication.

## SQL Logical Server

```hcl
resource "azurerm_mssql_server" "main" {
  name                = "${var.environment}-sqlserver-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "12.0"

  administrator_login          = var.sql_admin_login
  administrator_login_password = var.sql_admin_password

  # Enable Azure AD authentication
  azuread_administrator {
    login_username = var.azure_ad_admin_login
    object_id      = var.azure_ad_admin_object_id
    tenant_id      = var.azure_tenant_id
  }

  # Security settings
  minimum_tls_version                  = "1.2"
  public_network_access_enabled        = false  # Use private endpoint
  outbound_network_restriction_enabled = true

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
```

## SQL Database

```hcl
resource "azurerm_mssql_database" "main" {
  name      = "${var.environment}-app-db"
  server_id = azurerm_mssql_server.main.id

  # Service tier
  sku_name = var.environment == "prod" ? "GP_Gen5_4" : "S2"

  # Storage settings
  max_size_gb = var.environment == "prod" ? 500 : 32

  # Backup settings
  geo_backup_enabled = var.environment == "prod"
  zone_redundant     = var.environment == "prod"

  short_term_retention_policy {
    retention_days = 7
  }

  # Maintenance
  maintenance_configuration_name = "SQL_Default"

  # Auditing (see audit policy below)
  ledger_enabled = false

  tags = { Environment = var.environment }
}
```

## Private Endpoint

```hcl
resource "azurerm_private_endpoint" "sql" {
  name                = "${var.environment}-sql-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.environment}-sql-psc"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "sql-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.sql.id]
  }
}

resource "azurerm_private_dns_zone" "sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "sql" {
  name                  = "sql-dns-vnet-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.sql.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
```

## Firewall Rules (Allow Azure Services)

```hcl
# Allow Azure services (for ADF, Functions, etc.)

resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow specific IPs (for migration or admin tools)
resource "azurerm_mssql_firewall_rule" "admin" {
  count            = length(var.admin_ip_addresses)
  name             = "admin-${count.index}"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = var.admin_ip_addresses[count.index]
  end_ip_address   = var.admin_ip_addresses[count.index]
}
```

## Elastic Pool (Multiple Databases)

```hcl
resource "azurerm_mssql_elasticpool" "main" {
  name                = "${var.environment}-elastic-pool"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = azurerm_mssql_server.main.name

  license_type = "LicenseIncluded"
  max_size_gb  = 100

  sku {
    name     = "GP_Gen5"
    tier     = "GeneralPurpose"
    family   = "Gen5"
    capacity = 4  # 4 vCores
  }

  per_database_settings {
    min_capacity = 0.25
    max_capacity = 4
  }
}

# Add a database to the elastic pool
resource "azurerm_mssql_database" "pooled" {
  name            = "tenant-db-1"
  server_id       = azurerm_mssql_server.main.id
  elastic_pool_id = azurerm_mssql_elasticpool.main.id
  sku_name        = "ElasticPool"
}
```

## Outputs

```hcl
output "sql_server_fqdn" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "database_name" {
  value = azurerm_mssql_database.main.name
}

output "connection_string" {
  sensitive = true
  value = "Server=${azurerm_mssql_server.main.fully_qualified_domain_name};Database=${azurerm_mssql_database.main.name};Authentication=Active Directory Default;"
}
```

## Conclusion

Azure SQL Database deployment with OpenTofu requires the logical server (`azurerm_mssql_server`), the database (`azurerm_mssql_database`), and access control via either firewall rules or private endpoints. Use private endpoints for production deployments - disable public network access and route connections through the VNet. Enable Azure AD administrator for modern authentication. Use Elastic Pools for multi-tenant SaaS applications where multiple databases share a pool of compute resources.
