# How to Import Existing Azure Resources into Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Import, Infrastructure as Code, Migration

Description: Learn how to import existing Azure resources into Terraform state including resource groups, VMs, storage accounts, databases, and networking for IaC adoption.

---

Organizations often have Azure resources created through the Azure Portal, Azure CLI, or ARM templates that need to be brought under Terraform management. Importing these resources into Terraform state lets you manage them alongside new infrastructure without recreating them. Azure resources are identified by their full Azure resource ID for import operations.

In this guide, we will walk through importing common Azure resources into Terraform including resource groups, virtual machines, storage accounts, SQL databases, and virtual networks.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Importing Resource Groups

```hcl
resource "azurerm_resource_group" "main" {
  name     = "production-rg"
  location = "East US"
}

import {
  to = azurerm_resource_group.main
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg"
}
```

## Importing Virtual Machines

```hcl
resource "azurerm_linux_virtual_machine" "app" {
  name                = "app-server"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_D4s_v3"
  admin_username      = "adminuser"

  network_interface_ids = [azurerm_network_interface.app.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  lifecycle {
    ignore_changes = [admin_password, admin_ssh_key]
  }
}

import {
  to = azurerm_linux_virtual_machine.app
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/app-server"
}
```

## Importing Storage Accounts

```hcl
resource "azurerm_storage_account" "data" {
  name                     = "prodstorageaccount"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}

import {
  to = azurerm_storage_account.data
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Storage/storageAccounts/prodstorageaccount"
}
```

## Importing Virtual Networks

```hcl
resource "azurerm_virtual_network" "main" {
  name                = "main-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

import {
  to = azurerm_virtual_network.main
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/main-vnet"
}

import {
  to = azurerm_subnet.app
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/main-vnet/subnets/app-subnet"
}
```

## Importing SQL Databases

```hcl
resource "azurerm_mssql_server" "main" {
  name                         = "prod-sql-server"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_password

  lifecycle {
    ignore_changes = [administrator_login_password]
  }
}

variable "sql_password" {
  type      = string
  sensitive = true
  default   = "placeholder"
}

resource "azurerm_mssql_database" "app" {
  name      = "appdb"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "S1"
}

import {
  to = azurerm_mssql_server.main
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Sql/servers/prod-sql-server"
}

import {
  to = azurerm_mssql_database.app
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/production-rg/providers/Microsoft.Sql/servers/prod-sql-server/databases/appdb"
}
```

## Finding Azure Resource IDs

You can find Azure resource IDs through the portal or CLI:

```bash
# List all resources in a resource group
az resource list --resource-group production-rg --output table

# Get a specific resource's ID
az vm show --name app-server --resource-group production-rg --query id --output tsv

# List storage accounts
az storage account list --resource-group production-rg --query "[].id" --output tsv

# List VNets
az network vnet list --resource-group production-rg --query "[].id" --output tsv
```

## Import Workflow

```bash
# 1. Initialize Terraform
terraform init

# 2. Plan to see what will be imported
terraform plan

# 3. Apply the import
terraform apply

# 4. Verify no drift
terraform plan
# Should show: No changes. Your infrastructure matches the configuration.
```

## Conclusion

Importing existing Azure resources into Terraform requires knowing the full Azure resource ID path, which follows the pattern `/subscriptions/{sub}/resourceGroups/{rg}/providers/{provider}/{type}/{name}`. The import block in Terraform 1.5+ makes this process declarative and repeatable. For other clouds, see our guides on [AWS imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-aws-resources-into-terraform/view) and [GCP imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-gcp-resources-into-terraform/view). For advanced import features, check out [the import block](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-import-block-in-terraform-1-5-plus/view) and [generating configuration from imports](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-configuration-from-imported-resources/view).
