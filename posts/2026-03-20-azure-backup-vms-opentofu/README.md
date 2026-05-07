# How to Back Up Azure VMs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Backup, Virtual Machine, Infrastructure as Code

Description: Learn how to configure Azure Backup for virtual machines with OpenTofu, including recovery services vaults, backup policies, and VM protection.

Azure Backup for VMs provides application-consistent or file-system-consistent snapshots with long-term retention. Managing backup configuration in OpenTofu ensures every VM is protected with the correct policy and retention settings from day one.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id

  features {
    recovery_services_vault {
      recover_soft_deleted_backup_protected_vm = true
    }
  }
}
```

## Recovery Services Vault

```hcl
resource "azurerm_resource_group" "backup" {
  name     = "backup-rg"
  location = "eastus"
}

resource "azurerm_recovery_services_vault" "main" {
  name                = "production-backup-vault"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name

  sku                         = "Standard"
  storage_mode_type           = "GeoRedundant"  # GeoRedundant, LocallyRedundant, ZoneRedundant

  immutability = "Locked"  # Lock immutability to help prevent destructive changes

  cross_region_restore_enabled = true

  tags = {
    Environment = "production"
  }
}
```

## VM Backup Policy

```hcl
resource "azurerm_backup_policy_vm" "daily" {
  name                = "daily-backup-policy"
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name

  timezone = "UTC"

  # Daily backup at 3 AM UTC
  backup {
    frequency = "Daily"
    time      = "03:00"
  }

  # Retention settings
  retention_daily {
    count = 30  # Keep daily backups for 30 days
  }

  retention_weekly {
    count    = 12   # Keep weekly backups for 12 weeks
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 12  # Keep monthly backups for 12 months
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }

  retention_yearly {
    count    = 3   # Keep annual backups for 3 years
    weekdays = ["Sunday"]
    weeks    = ["First"]
    months   = ["January"]
  }
}
```

## Protect VM with Backup

```hcl
data "azurerm_virtual_machine" "app" {
  name                = "app-vm"
  resource_group_name = var.app_resource_group
}

data "azurerm_virtual_machine" "db" {
  name                = "db-vm"
  resource_group_name = var.app_resource_group
}

resource "azurerm_backup_protected_vm" "app_vm" {
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  source_vm_id        = data.azurerm_virtual_machine.app.id
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}

resource "azurerm_backup_protected_vm" "db_vm" {
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  source_vm_id        = data.azurerm_virtual_machine.db.id
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}
```

## Protect All VMs in Resource Group

```hcl
# Get all VMs and protect them

data "azurerm_resources" "vms" {
  resource_group_name = var.app_resource_group
  type                = "Microsoft.Compute/virtualMachines"
}

resource "azurerm_backup_protected_vm" "all" {
  for_each = { for vm in data.azurerm_resources.vms.resources : vm.name => vm.id }

  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  source_vm_id        = each.value
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}
```

## Backup Alert

```hcl
resource "azurerm_recovery_services_vault" "main" {
  name                = "production-backup-vault"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name

  sku               = "Standard"
  storage_mode_type = "GeoRedundant"

  monitoring {
    alerts_for_all_job_failures_enabled = true
  }
}
```

## Conclusion

Azure Backup for VMs in OpenTofu ensures every virtual machine is protected from day one. Create a recovery services vault with geo-redundant storage, define tiered backup policies with daily/weekly/monthly/yearly retention, and associate VMs with the policy using azurerm_backup_protected_vm. Use immutable vaults and geo-redundant storage to meet compliance and DR requirements.
