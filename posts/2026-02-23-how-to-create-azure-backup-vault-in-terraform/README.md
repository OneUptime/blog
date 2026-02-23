# How to Create Azure Backup Vault in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Backup, Backup Vault, Infrastructure as Code, Disaster Recovery

Description: Learn how to create and configure Azure Backup Vaults using Terraform, including backup policies, protected items, and best practices for data protection.

---

Backing up your cloud resources is not optional. Hardware fails, software has bugs, and people make mistakes. Azure Backup Vault gives you a centralized place to manage backup policies and protect your workloads. Doing it through Terraform means your backup configuration is version-controlled, repeatable, and auditable.

This guide walks through creating an Azure Backup Vault with Terraform, setting up backup policies, and protecting VMs and other resources.

## Understanding Azure Backup Vault vs Recovery Services Vault

Before we start writing code, let's clarify the difference between the two vault types. Azure has two kinds of backup vaults:

- **Recovery Services Vault**: The older, more established option. Supports VMs, SQL databases, Azure Files, and SAP HANA. Uses the `azurerm_recovery_services_vault` resource in Terraform.
- **Backup Vault**: The newer option introduced for workloads like Azure Disks, Azure Blobs, Azure Database for PostgreSQL, and Azure Kubernetes Service. Uses the `azurerm_data_protection_backup_vault` resource.

Both are valid and serve different workloads. This post covers both since you will likely need them for different parts of your infrastructure.

## Setting Up the Provider

Start with the Azure provider configuration:

```hcl
# versions.tf - Pin provider versions for consistency
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Configure the Azure provider
provider "azurerm" {
  features {}
}
```

## Creating a Resource Group

Every Azure resource needs a resource group. Create one specifically for your backup infrastructure:

```hcl
# Resource group dedicated to backup resources
resource "azurerm_resource_group" "backup" {
  name     = "rg-backup-prod-eastus"
  location = "East US"

  tags = {
    environment = "production"
    purpose     = "backup-infrastructure"
    managed_by  = "terraform"
  }
}
```

## Creating a Recovery Services Vault

The Recovery Services Vault is what you need for VM backups, SQL backups, and Azure Files backups:

```hcl
# Recovery Services Vault for VM and SQL backups
resource "azurerm_recovery_services_vault" "main" {
  name                = "rsv-prod-eastus"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name
  sku                 = "Standard"

  # Enable soft delete so accidentally deleted backups can be recovered
  soft_delete_enabled = true

  # Storage replication type - GRS for production, LRS for dev/test
  storage_mode_type = "GeoRedundant"

  # Cross-region restore lets you restore in the paired region
  cross_region_restore_enabled = true

  # Immutability prevents backup data from being deleted before retention expires
  immutability = "Unlocked"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

The `storage_mode_type` setting is important. Geo-redundant storage (GRS) replicates your backup data to a secondary region, which protects against regional outages. For non-production environments, locally redundant storage (LRS) costs less and is usually sufficient.

## Setting Up a VM Backup Policy

A backup policy defines how often backups run and how long they are retained:

```hcl
# Backup policy for production VMs
resource "azurerm_backup_policy_vm" "daily" {
  name                = "policy-vm-daily"
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name

  # Timezone for the backup schedule
  timezone = "UTC"

  # Take a backup every day at 2 AM
  backup {
    frequency = "Daily"
    time      = "02:00"
  }

  # Keep daily backups for 30 days
  retention_daily {
    count = 30
  }

  # Keep weekly backups (taken on Sunday) for 12 weeks
  retention_weekly {
    count    = 12
    weekdays = ["Sunday"]
  }

  # Keep monthly backups (first Sunday of the month) for 12 months
  retention_monthly {
    count    = 12
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }

  # Keep yearly backups for 3 years
  retention_yearly {
    count    = 3
    weekdays = ["Sunday"]
    weeks    = ["First"]
    months   = ["January"]
  }
}
```

## Protecting a Virtual Machine

Once the vault and policy are in place, you can protect VMs:

```hcl
# Reference an existing VM to protect
data "azurerm_virtual_machine" "web_server" {
  name                = "vm-web-prod-01"
  resource_group_name = "rg-compute-prod"
}

# Enable backup protection for the VM
resource "azurerm_backup_protected_vm" "web_server" {
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  source_vm_id        = data.azurerm_virtual_machine.web_server.id
  backup_policy_id    = azurerm_backup_policy_vm.daily.id
}
```

## Creating a Data Protection Backup Vault

For newer workloads like managed disks and blobs, use the Data Protection Backup Vault:

```hcl
# Data Protection Backup Vault for disks and blobs
resource "azurerm_data_protection_backup_vault" "main" {
  name                = "bvault-prod-eastus"
  resource_group_name = azurerm_resource_group.backup.name
  location            = azurerm_resource_group.backup.location
  datastore_type      = "VaultStore"
  redundancy          = "GeoRedundant"

  # Managed identity is required for the vault to access resources
  identity {
    type = "SystemAssigned"
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Disk Backup Policy

Here is a backup policy for managed disks:

```hcl
# Backup policy for managed disks - hourly backups
resource "azurerm_data_protection_backup_policy_disk" "hourly" {
  name     = "policy-disk-hourly"
  vault_id = azurerm_data_protection_backup_vault.main.id

  # Backup every 4 hours
  backup_repeating_time_intervals = ["R/2024-01-01T00:00:00+00:00/PT4H"]

  # Default retention - keep for 7 days
  default_retention_duration = "P7D"

  # Retention rule - keep daily snapshots for 30 days
  retention_rule {
    name     = "Daily"
    duration = "P30D"
    priority = 25

    criteria {
      absolute_criteria = "FirstOfDay"
    }
  }
}
```

## Protecting a Managed Disk

To back up a managed disk, you need to assign the right role to the vault's managed identity first:

```hcl
# The backup vault needs Disk Backup Reader role on the disk
resource "azurerm_role_assignment" "disk_backup_reader" {
  scope                = data.azurerm_managed_disk.os_disk.id
  role_definition_name = "Disk Backup Reader"
  principal_id         = azurerm_data_protection_backup_vault.main.identity[0].principal_id
}

# The backup vault needs Disk Snapshot Contributor on the snapshot resource group
resource "azurerm_role_assignment" "snapshot_contributor" {
  scope                = azurerm_resource_group.backup.id
  role_definition_name = "Disk Snapshot Contributor"
  principal_id         = azurerm_data_protection_backup_vault.main.identity[0].principal_id
}

# Now protect the disk
resource "azurerm_data_protection_backup_instance_disk" "os_disk" {
  name                         = "backup-disk-os"
  location                     = azurerm_resource_group.backup.location
  vault_id                     = azurerm_data_protection_backup_vault.main.id
  disk_id                      = data.azurerm_managed_disk.os_disk.id
  snapshot_resource_group_name = azurerm_resource_group.backup.name
  backup_policy_id             = azurerm_data_protection_backup_policy_disk.hourly.id

  depends_on = [
    azurerm_role_assignment.disk_backup_reader,
    azurerm_role_assignment.snapshot_contributor,
  ]
}
```

## Using Variables for Flexibility

Hardcoding values makes your configuration rigid. Use variables to make it reusable:

```hcl
# variables.tf
variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "location" {
  description = "Azure region for the backup vault"
  type        = string
  default     = "East US"
}

variable "backup_redundancy" {
  description = "Storage redundancy for the vault (GeoRedundant or LocallyRedundant)"
  type        = string
  default     = "GeoRedundant"

  validation {
    condition     = contains(["GeoRedundant", "LocallyRedundant"], var.backup_redundancy)
    error_message = "Redundancy must be GeoRedundant or LocallyRedundant."
  }
}

variable "vm_ids_to_protect" {
  description = "List of VM resource IDs to protect with backup"
  type        = list(string)
  default     = []
}
```

## Outputs

Export useful information from your backup configuration:

```hcl
# outputs.tf
output "recovery_vault_id" {
  description = "ID of the Recovery Services Vault"
  value       = azurerm_recovery_services_vault.main.id
}

output "backup_vault_id" {
  description = "ID of the Data Protection Backup Vault"
  value       = azurerm_data_protection_backup_vault.main.id
}

output "backup_vault_identity" {
  description = "Principal ID of the backup vault managed identity"
  value       = azurerm_data_protection_backup_vault.main.identity[0].principal_id
}
```

## Best Practices

There are several things to keep in mind when setting up Azure Backup with Terraform:

**Test your restores.** Having backups is useless if you cannot restore from them. Schedule regular restore tests and document the procedure.

**Use geo-redundant storage for production.** The extra cost is worth it when you need to recover from a regional outage. Use locally redundant storage for development and test environments to save money.

**Enable soft delete.** Soft delete keeps deleted backup data for 14 additional days, giving you a safety net against accidental or malicious deletion.

**Tag everything.** Tags help you track costs and identify which backup belongs to which workload when you have hundreds of protected items.

**Separate backup resource groups.** Keep your backup infrastructure in dedicated resource groups. This simplifies RBAC management and prevents accidental deletion.

## Wrapping Up

Azure Backup Vaults managed through Terraform give you a solid data protection foundation that is repeatable and auditable. The Recovery Services Vault handles your VM and SQL backups, while the Data Protection Backup Vault covers newer workloads like managed disks and blobs. Pick the right vault type for each workload, define sensible retention policies, and make sure your team tests restores regularly.

For related topics, check out our guide on [How to Create Azure Site Recovery in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-site-recovery-in-terraform/view) which covers disaster recovery replication between regions.
