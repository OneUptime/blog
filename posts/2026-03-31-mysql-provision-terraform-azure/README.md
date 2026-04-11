# How to Provision MySQL with Terraform on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Terraform, Azure, Flexible Server, Infrastructure as Code

Description: Provision Azure Database for MySQL Flexible Server using Terraform, including VNet integration, firewall rules, and server configuration.

---

## Azure Database for MySQL Flexible Server

Azure Database for MySQL Flexible Server is the recommended deployment option on Azure, offering zone-redundant high availability, flexible maintenance windows, and cost optimization features. Terraform's `azurerm` provider provides full support for provisioning and managing Flexible Server instances as code.

## Provider Setup

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatemysql"
    container_name       = "tfstate"
    key                  = "mysql/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group and Networking

```hcl
# network.tf
resource "azurerm_resource_group" "mysql" {
  name     = "${var.environment}-mysql-rg"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "mysql" {
  name                = "${var.environment}-mysql-vnet"
  location            = azurerm_resource_group.mysql.location
  resource_group_name = azurerm_resource_group.mysql.name
  address_space       = ["10.0.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "mysql" {
  name                 = "mysql-subnet"
  resource_group_name  = azurerm_resource_group.mysql.name
  virtual_network_name = azurerm_virtual_network.mysql.name
  address_prefixes     = ["10.0.1.0/24"]

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

resource "azurerm_private_dns_zone" "mysql" {
  name                = "${var.environment}.mysql.database.azure.com"
  resource_group_name = azurerm_resource_group.mysql.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "mysql" {
  name                  = "mysql-dns-link"
  resource_group_name   = azurerm_resource_group.mysql.name
  private_dns_zone_name = azurerm_private_dns_zone.mysql.name
  virtual_network_id    = azurerm_virtual_network.mysql.id
}
```

## Flexible Server Instance

```hcl
# main.tf
resource "azurerm_mysql_flexible_server" "mysql" {
  name                   = "${var.environment}-mysql-server"
  resource_group_name    = azurerm_resource_group.mysql.name
  location               = azurerm_resource_group.mysql.location
  administrator_login    = var.admin_username
  administrator_password = var.admin_password
  backup_retention_days  = 7
  delegated_subnet_id    = azurerm_subnet.mysql.id
  private_dns_zone_id    = azurerm_private_dns_zone.mysql.id
  sku_name               = var.sku_name
  version                = "8.0.21"
  zone                   = "1"

  dynamic "high_availability" {
    for_each = var.environment == "production" ? [1] : []
    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
  }

  storage {
    auto_grow_enabled  = true
    iops               = 684
    size_gb            = 100
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 4
    start_minute = 0
  }

  tags       = local.common_tags
  depends_on = [azurerm_private_dns_zone_virtual_network_link.mysql]
}
```

## Server Configuration

```hcl
# configuration.tf
resource "azurerm_mysql_flexible_server_configuration" "slow_query_log" {
  name                = "slow_query_log"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  value               = "ON"
}

resource "azurerm_mysql_flexible_server_configuration" "long_query_time" {
  name                = "long_query_time"
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  value               = "1"
}

resource "azurerm_mysql_flexible_database" "app" {
  name                = var.database_name
  resource_group_name = azurerm_resource_group.mysql.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}
```

## Deploying

```bash
terraform init
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

## Summary

Provisioning Azure Database for MySQL Flexible Server with Terraform involves configuring VNet delegation for private networking, private DNS zones for name resolution, and the Flexible Server instance with high availability and backup settings. Server configuration parameters are managed as separate Terraform resources, enabling tuning to be version-controlled alongside infrastructure changes.
