# How to Create Azure SQL Managed Instance with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, Managed Instance, OpenTofu, Database, Infrastructure

Description: Learn how to deploy Azure SQL Managed Instance with OpenTofu, including VNet integration, subnet delegation, and high availability configuration.

## Overview

Azure SQL Managed Instance is a fully managed SQL Server instance deployed into your virtual network. It provides near-100% compatibility with on-premises SQL Server while offering the benefits of a managed PaaS service.

## Step 1: Create the VNet and Dedicated Subnet

SQL Managed Instance requires a dedicated subnet, subnet delegation, and associated network resources.

```hcl
# main.tf - VNet and subnet for SQL Managed Instance

resource "azurerm_virtual_network" "vnet" {
  name                = "sql-mi-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# SQL MI requires a /27 or larger subnet dedicated exclusively to it
resource "azurerm_subnet" "sql_mi_subnet" {
  name                 = "sql-mi-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.0.0/27"]

  # Required delegation for SQL Managed Instance
  delegation {
    name = "sql-mi-delegation"
    service_delegation {
      name = "Microsoft.Sql/managedInstances"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
        "Microsoft.Network/virtualNetworks/subnets/prepareNetworkPolicies/action",
        "Microsoft.Network/virtualNetworks/subnets/unprepareNetworkPolicies/action",
      ]
    }
  }
}
```

## Step 2: Create Network Security Group and Route Table

```hcl
# SQL MI requires an associated NSG; Azure manages the required service rules
resource "azurerm_network_security_group" "sql_mi_nsg" {
  name                = "sql-mi-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# SQL MI requires an associated route table; Azure manages the required routes
resource "azurerm_route_table" "sql_mi_rt" {
  name                          = "sql-mi-route-table"
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  bgp_route_propagation_enabled = true
}

resource "azurerm_subnet_network_security_group_association" "sql_mi_nsg_assoc" {
  subnet_id                 = azurerm_subnet.sql_mi_subnet.id
  network_security_group_id = azurerm_network_security_group.sql_mi_nsg.id
}

resource "azurerm_subnet_route_table_association" "sql_mi_rt_assoc" {
  subnet_id      = azurerm_subnet.sql_mi_subnet.id
  route_table_id = azurerm_route_table.sql_mi_rt.id
}
```

## Step 3: Deploy SQL Managed Instance

```hcl
# SQL Managed Instance deployment
resource "azurerm_mssql_managed_instance" "sql_mi" {
  name                = "my-sql-mi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  # Administrator credentials
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  # Network configuration
  subnet_id = azurerm_subnet.sql_mi_subnet.id

  # Compute and storage
  sku_name   = "GP_Gen5"  # General Purpose, Gen5 hardware
  vcores     = 4
  storage_size_in_gb = 32

  # License type: LicenseIncluded or BasePrice (Azure Hybrid Benefit)
  license_type = "BasePrice"

  # Collation for SQL Server compatibility
  collation = "SQL_Latin1_General_CP1_CI_AS"

  # Timezone
  timezone_id = "UTC"

  depends_on = [
    azurerm_subnet_network_security_group_association.sql_mi_nsg_assoc,
    azurerm_subnet_route_table_association.sql_mi_rt_assoc,
  ]
}
```

## Step 4: Configure Managed Instance Database

```hcl
# Create a database on the managed instance
resource "azurerm_mssql_managed_database" "app_db" {
  name                = "appdb"
  managed_instance_id = azurerm_mssql_managed_instance.sql_mi.id

  # Short-term backup retention
  short_term_retention_days = 7
}
```

## Step 5: Outputs

```hcl
output "sql_mi_fqdn" {
  value       = azurerm_mssql_managed_instance.sql_mi.fqdn
  description = "FQDN of the SQL Managed Instance"
}
```

## Summary

Azure SQL Managed Instance with OpenTofu requires careful network configuration including subnet delegation, plus an associated NSG and route table. Once deployed, it provides a fully managed SQL Server environment with VNet isolation, making it ideal for lift-and-shift migrations from on-premises SQL Server.
