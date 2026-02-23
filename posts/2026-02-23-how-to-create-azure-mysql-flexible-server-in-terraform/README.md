# How to Create Azure MySQL Flexible Server in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, MySQL, Flexible Server, Infrastructure as Code, Database

Description: Learn how to provision Azure MySQL Flexible Server with Terraform including networking, high availability, backup configuration, and database setup.

---

Azure Database for MySQL Flexible Server is the current-generation managed MySQL service on Azure. It replaced the older Single Server offering and gives you more control over maintenance windows, high availability configuration, and compute scaling. Managing it through Terraform keeps your database infrastructure reproducible and auditable.

This post walks through provisioning a MySQL Flexible Server with Terraform, covering networking, high availability, server parameters, databases, and firewall rules.

## Provider Setup

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group and Networking

For production MySQL, you want the server inside a VNet using a delegated subnet.

```hcl
# main.tf
resource "azurerm_resource_group" "mysql" {
  name     = "rg-mysql-production"
  location = "East US"
}

# VNet for the MySQL server
resource "azurerm_virtual_network" "mysql" {
  name                = "vnet-mysql-production"
  location            = azurerm_resource_group.mysql.location
  resource_group_name = azurerm_resource_group.mysql.name
  address_space       = ["10.0.0.0/16"]
}

# Delegated subnet for MySQL Flexible Server
resource "azurerm_subnet" "mysql" {
  name                 = "snet-mysql"
  resource_group_name  = azurerm_resource_group.mysql.name
  virtual_network_name = azurerm_virtual_network.mysql.name
  address_prefixes     = ["10.0.1.0/24"]

  # Delegation is required for Flexible Server VNet integration
  delegation {
    name = "mysql-delegation"
    service_delegation {
      name = "Microsoft.DBforMySQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# Private DNS zone for MySQL
resource "azurerm_private_dns_zone" "mysql" {
  name                = "privatelink.mysql.database.azure.com"
  resource_group_name = azurerm_resource_group.mysql.name
}

# Link the DNS zone to the VNet
resource "azurerm_private_dns_zone_virtual_network_link" "mysql" {
  name                  = "mysql-dns-link"
  private_dns_zone_name = azurerm_private_dns_zone.mysql.name
  resource_group_name   = azurerm_resource_group.mysql.name
  virtual_network_id    = azurerm_virtual_network.mysql.id
}
```

## Admin Password

```hcl
# secrets.tf
resource "random_password" "mysql_admin" {
  length           = 32
  special          = true
  override_special = "!@#$%"
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
}
```

## MySQL Flexible Server

```hcl
# mysql-server.tf
# Create the MySQL Flexible Server
resource "azurerm_mysql_flexible_server" "main" {
  name                = "mysql-prod-2026"
  resource_group_name = azurerm_resource_group.mysql.name
  location            = azurerm_resource_group.mysql.location

  # Admin credentials
  administrator_login    = "mysqladmin"
  administrator_password = random_password.mysql_admin.result

  # MySQL version
  version = "8.0.21"

  # Compute tier and size
  # Burstable: B_Standard_B1ms, B_Standard_B2s
  # General Purpose: GP_Standard_D2ds_v4, GP_Standard_D4ds_v4
  # Business Critical (Memory Optimized): MO_Standard_E2ds_v4
  sku_name = "GP_Standard_D2ds_v4"

  # VNet integration
  delegated_subnet_id = azurerm_subnet.mysql.id
  private_dns_zone_id = azurerm_private_dns_zone.mysql.id

  # Storage configuration
  storage {
    size_gb           = 128
    iops              = 700    # Scale IOPS based on workload
    auto_grow_enabled = true   # Automatically grow storage when running low
  }

  # Backup configuration
  backup_retention_days        = 7
  geo_redundant_backup_enabled = true

  # High availability with zone redundancy
  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"  # Standby in zone 2
  }

  # Set the primary availability zone
  zone = "1"

  # Maintenance window - Sunday at 2 AM
  maintenance_window {
    day_of_week  = 0  # Sunday
    start_hour   = 2
    start_minute = 0
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }

  # DNS zone link must be established before the server
  depends_on = [azurerm_private_dns_zone_virtual_network_link.mysql]
}
```

## Server Parameters

Tune MySQL configuration through server parameters.

```hcl
# parameters.tf
# Adjust innodb_buffer_pool_size for better query performance
resource "azurerm_mysql_flexible_server_configuration" "buffer_pool" {
  name                = "innodb_buffer_pool_size"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  value               = "2147483648"  # 2 GB in bytes
}

# Set the character set to utf8mb4 for full Unicode support
resource "azurerm_mysql_flexible_server_configuration" "charset" {
  name                = "character_set_server"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  value               = "utf8mb4"
}

# Enable slow query logging
resource "azurerm_mysql_flexible_server_configuration" "slow_query" {
  name                = "slow_query_log"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  value               = "ON"
}

# Log queries taking more than 2 seconds
resource "azurerm_mysql_flexible_server_configuration" "long_query_time" {
  name                = "long_query_time"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  value               = "2"
}

# Set the time zone
resource "azurerm_mysql_flexible_server_configuration" "timezone" {
  name                = "time_zone"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  value               = "+00:00"
}
```

## Databases

Create one or more databases on the server.

```hcl
# databases.tf
# Application database
resource "azurerm_mysql_flexible_database" "app" {
  name                = "application"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}

# Analytics database
resource "azurerm_mysql_flexible_database" "analytics" {
  name                = "analytics"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}
```

## Firewall Rules (For Public Access Mode)

If you are using public access instead of VNet integration, configure firewall rules.

```hcl
# firewall.tf
# Only needed when NOT using VNet integration
# Allow a specific IP
resource "azurerm_mysql_flexible_server_firewall_rule" "office" {
  name                = "office-network"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  start_ip_address    = "203.0.113.10"
  end_ip_address      = "203.0.113.10"
}

# Allow Azure services
resource "azurerm_mysql_flexible_server_firewall_rule" "azure" {
  name                = "allow-azure-services"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.main.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}
```

## Outputs

```hcl
# outputs.tf
output "server_fqdn" {
  value       = azurerm_mysql_flexible_server.main.fqdn
  description = "The FQDN of the MySQL Flexible Server"
}

output "server_id" {
  value       = azurerm_mysql_flexible_server.main.id
  description = "Resource ID of the MySQL server"
}

output "admin_username" {
  value       = azurerm_mysql_flexible_server.main.administrator_login
  description = "Admin login username"
}

output "database_names" {
  value = {
    app       = azurerm_mysql_flexible_database.app.name
    analytics = azurerm_mysql_flexible_database.analytics.name
  }
  description = "Names of the databases created"
}
```

## Choosing the Right SKU

Flexible Server offers three compute tiers:

- **Burstable (B-series)**: Good for development and light workloads. Cheapest option. CPU credits accumulate when idle and get consumed during bursts.
- **General Purpose (D-series)**: Balanced compute and memory for most production workloads. Predictable performance.
- **Business Critical (E-series)**: High memory-to-CPU ratio with local SSD storage. Best for memory-intensive workloads needing low storage latency.

For production, start with GP_Standard_D2ds_v4 (2 vCores, 8 GB RAM) and scale up based on actual usage metrics.

## Deployment

```bash
# Initialize and deploy
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Connect to the server after deployment:

```bash
mysql -h mysql-prod-2026.mysql.database.azure.com -u mysqladmin -p --ssl-mode=REQUIRED
```

The combination of VNet integration, zone-redundant high availability, and proper parameter tuning gives you a solid MySQL setup. Terraform captures all of these settings in code, making it easy to replicate across staging and production environments or recover from infrastructure changes.
