# How to Create Azure Recovery Services Vaults with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Recovery Services Vault, Backup, Infrastructure as Code

Description: Learn how to create Azure Recovery Services Vaults with OpenTofu for centralized backup and disaster recovery management across VMs, SQL databases, and file shares.

Azure Recovery Services Vaults are the central storage containers for Azure Backup and Azure Site Recovery data. Managing vaults in OpenTofu ensures consistent redundancy, security, and access control settings across your backup infrastructure.

## Creating a Recovery Services Vault

```hcl
resource "azurerm_resource_group" "backup" {
  name     = "backup-rg"
  location = "eastus"
}

resource "azurerm_recovery_services_vault" "main" {
  name                = "production-rsv"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name

  sku = "Standard"

  # GeoRedundant: copies to paired region
  # LocallyRedundant: 3 copies in primary region
  # ZoneRedundant: 3 copies across 3 AZs
  storage_mode_type = "GeoRedundant"

  # Soft delete: 14-day retention after deletion
  soft_delete_enabled = true

  # Immutability: prevent changes to vault settings and policies
  immutability = "Disabled"  # Disabled, Unlocked (can change), or Locked (permanent)

  cross_region_restore_enabled = true  # Requires GeoRedundant storage

  tags = {
    Environment = "production"
    Purpose     = "backup"
  }
}
```

## Managed Identity for Key Vault Integration

```hcl
resource "azurerm_recovery_services_vault" "encrypted" {
  name                = "encrypted-rsv"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name
  sku                 = "Standard"
  storage_mode_type   = "GeoRedundant"

  identity {
    type = "SystemAssigned"
  }
}

# Grant vault managed identity access to Key Vault for customer-managed keys

resource "azurerm_role_assignment" "vault_key_access" {
  scope                = azurerm_key_vault.backup_key.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_recovery_services_vault.encrypted.identity[0].principal_id
}
```

## Backup Policies for Different Services

```hcl
# VM backup policy
resource "azurerm_backup_policy_vm" "standard" {
  name                = "standard-vm-policy"
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  timezone            = "UTC"

  backup {
    frequency = "Daily"
    time      = "03:00"
  }

  retention_daily {
    count = 30
  }

  retention_weekly {
    count    = 12
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 12
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }
}

# Azure Files backup policy
resource "azurerm_backup_policy_file_share" "files" {
  name                = "fileshare-policy"
  resource_group_name = azurerm_resource_group.backup.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  timezone            = "UTC"

  backup {
    frequency = "Daily"
    time      = "04:00"
  }

  retention_daily {
    count = 14
  }

  retention_weekly {
    count    = 4
    weekdays = ["Saturday"]
  }
}
```

## Multiple Vaults for Separation of Concerns

```hcl
locals {
  vaults = {
    production  = { storage = "GeoRedundant", sku = "Standard" }
    staging     = { storage = "LocallyRedundant", sku = "Standard" }
    development = { storage = "LocallyRedundant", sku = "Standard" }
  }
}

resource "azurerm_recovery_services_vault" "envs" {
  for_each = local.vaults

  name                = "${each.key}-rsv"
  location            = azurerm_resource_group.backup.location
  resource_group_name = azurerm_resource_group.backup.name
  sku                 = each.value.sku
  storage_mode_type   = each.value.storage

  tags = {
    Environment = each.key
  }
}
```

## Vault Diagnostics

```hcl
resource "azurerm_monitor_diagnostic_setting" "vault" {
  name               = "vault-diagnostics"
  target_resource_id = azurerm_recovery_services_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AzureBackupReport"
  }

  enabled_log {
    category = "AzureSiteRecoveryEvents"
  }

  enabled_metric {
    category = "Health"
  }
}
```

## Conclusion

Azure Recovery Services Vaults in OpenTofu are the foundation of your Azure backup strategy. Use GeoRedundant storage for production to ensure backups survive regional failures, enable cross-region restore for faster DR recovery, and configure immutability to protect compliance backups from accidental deletion. Set up diagnostic settings to monitor backup job health and receive alerts on failures.
