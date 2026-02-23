# How to Create Azure Site Recovery in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Site Recovery, Disaster Recovery, Infrastructure as Code, Business Continuity

Description: Learn how to set up Azure Site Recovery using Terraform to replicate virtual machines between regions and ensure business continuity during outages.

---

When a region goes down, you need your workloads running somewhere else. Azure Site Recovery (ASR) replicates your virtual machines from a primary region to a secondary region, so you can fail over quickly when disaster strikes. Setting this up manually through the portal is tedious and error-prone. Terraform lets you define the entire disaster recovery configuration as code, making it repeatable, testable, and version-controlled.

This guide walks through configuring Azure Site Recovery with Terraform, from creating the vault to enabling replication for your VMs.

## How Azure Site Recovery Works

Before jumping into code, let's understand the moving parts. Azure Site Recovery replicates your VMs continuously from a source region to a target region. When you trigger a failover, ASR creates new VMs in the target region using the replicated data. Here is what you need:

1. **Recovery Services Vault** in the target region
2. **Fabric** objects representing the source and target regions
3. **Protection containers** within each fabric
4. **Replication policies** defining RPO and recovery point retention
5. **Container mappings** linking source and target containers with a policy
6. **Protected items** - the actual VMs being replicated

It sounds like a lot of resources, and it is. But Terraform handles the complexity well.

## Setting Up the Provider and Resource Groups

You need resource groups in both the source and target regions:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Source region resource group (where your VMs currently run)
resource "azurerm_resource_group" "primary" {
  name     = "rg-workload-prod-eastus"
  location = "East US"

  tags = {
    environment = "production"
    role        = "primary"
  }
}

# Target region resource group (where VMs will fail over to)
resource "azurerm_resource_group" "secondary" {
  name     = "rg-workload-prod-westus"
  location = "West US"

  tags = {
    environment = "production"
    role        = "disaster-recovery"
  }
}
```

## Creating the Recovery Services Vault

The vault goes in the target region. It manages the replication and orchestrates failover:

```hcl
# Recovery Services Vault in the DR region
resource "azurerm_recovery_services_vault" "dr" {
  name                = "rsv-dr-prod-westus"
  location            = azurerm_resource_group.secondary.location
  resource_group_name = azurerm_resource_group.secondary.name
  sku                 = "Standard"

  # Soft delete protects against accidental vault deletion
  soft_delete_enabled = true

  tags = {
    environment = "production"
    purpose     = "disaster-recovery"
    managed_by  = "terraform"
  }
}
```

## Defining the Site Recovery Fabric

Fabrics represent the source and target regions in ASR:

```hcl
# Fabric for the primary (source) region
resource "azurerm_site_recovery_fabric" "primary" {
  name                = "fabric-primary-eastus"
  resource_group_name = azurerm_resource_group.secondary.name
  recovery_vault_name = azurerm_recovery_services_vault.dr.name
  location            = azurerm_resource_group.primary.location
}

# Fabric for the secondary (target) region
resource "azurerm_site_recovery_fabric" "secondary" {
  name                = "fabric-secondary-westus"
  resource_group_name = azurerm_resource_group.secondary.name
  recovery_vault_name = azurerm_recovery_services_vault.dr.name
  location            = azurerm_resource_group.secondary.location

  # The secondary fabric depends on the primary being created first
  depends_on = [azurerm_site_recovery_fabric.primary]
}
```

## Creating Protection Containers

Protection containers are logical groupings within each fabric:

```hcl
# Protection container in the primary region
resource "azurerm_site_recovery_protection_container" "primary" {
  name                 = "container-primary"
  resource_group_name  = azurerm_resource_group.secondary.name
  recovery_vault_name  = azurerm_recovery_services_vault.dr.name
  recovery_fabric_name = azurerm_site_recovery_fabric.primary.name
}

# Protection container in the secondary region
resource "azurerm_site_recovery_protection_container" "secondary" {
  name                 = "container-secondary"
  resource_group_name  = azurerm_resource_group.secondary.name
  recovery_vault_name  = azurerm_recovery_services_vault.dr.name
  recovery_fabric_name = azurerm_site_recovery_fabric.secondary.name
}
```

## Setting Up the Replication Policy

The replication policy defines your RPO (Recovery Point Objective) and how long recovery points are kept:

```hcl
# Replication policy - defines RPO and retention
resource "azurerm_site_recovery_replication_policy" "main" {
  name                                                 = "policy-replication-24h"
  resource_group_name                                  = azurerm_resource_group.secondary.name
  recovery_vault_name                                  = azurerm_recovery_services_vault.dr.name

  # Recovery point retention in minutes (24 hours)
  recovery_point_retention_in_minutes                  = 1440

  # Application-consistent snapshot frequency in minutes (every 4 hours)
  application_consistent_snapshot_frequency_in_minutes = 240
}
```

The `recovery_point_retention_in_minutes` setting determines how far back in time you can recover. A 24-hour retention means you can pick any recovery point from the last 24 hours during failover.

The `application_consistent_snapshot_frequency_in_minutes` controls how often ASR takes application-consistent snapshots using VSS. These snapshots guarantee that applications are in a consistent state, which is critical for databases.

## Mapping Containers

Container mapping links the source container to the target container using the replication policy:

```hcl
# Map the primary container to the secondary container
resource "azurerm_site_recovery_protection_container_mapping" "main" {
  name                                      = "mapping-primary-to-secondary"
  resource_group_name                       = azurerm_resource_group.secondary.name
  recovery_vault_name                       = azurerm_recovery_services_vault.dr.name
  recovery_fabric_name                      = azurerm_site_recovery_fabric.primary.name
  recovery_source_protection_container_name = azurerm_site_recovery_protection_container.primary.name
  recovery_target_protection_container_id   = azurerm_site_recovery_protection_container.secondary.id
  recovery_replication_policy_id            = azurerm_site_recovery_replication_policy.main.id
}
```

## Setting Up Networking in the Target Region

The target region needs a virtual network and subnet for the failed-over VMs:

```hcl
# Virtual network in the DR region
resource "azurerm_virtual_network" "secondary" {
  name                = "vnet-dr-prod-westus"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = azurerm_resource_group.secondary.location
  address_space       = ["10.1.0.0/16"]
}

# Subnet for failed-over VMs
resource "azurerm_subnet" "secondary" {
  name                 = "snet-workload-dr"
  resource_group_name  = azurerm_resource_group.secondary.name
  virtual_network_name = azurerm_virtual_network.secondary.name
  address_prefixes     = ["10.1.1.0/24"]
}

# Network mapping tells ASR which target network to use
resource "azurerm_site_recovery_network_mapping" "main" {
  name                        = "mapping-network"
  resource_group_name         = azurerm_resource_group.secondary.name
  recovery_vault_name         = azurerm_recovery_services_vault.dr.name
  source_recovery_fabric_name = azurerm_site_recovery_fabric.primary.name
  target_recovery_fabric_name = azurerm_site_recovery_fabric.secondary.name
  source_network_id           = azurerm_virtual_network.primary.id
  target_network_id           = azurerm_virtual_network.secondary.id
}
```

## Enabling Replication for a VM

Now you can enable replication for a specific virtual machine:

```hcl
# Cache storage account for replication data in the source region
resource "azurerm_storage_account" "cache" {
  name                     = "stcachedreastus"
  resource_group_name      = azurerm_resource_group.primary.name
  location                 = azurerm_resource_group.primary.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Enable replication for the VM
resource "azurerm_site_recovery_replicated_vm" "web_server" {
  name                                      = "replicated-vm-web-01"
  resource_group_name                       = azurerm_resource_group.secondary.name
  recovery_vault_name                       = azurerm_recovery_services_vault.dr.name
  source_recovery_fabric_name               = azurerm_site_recovery_fabric.primary.name
  source_vm_id                              = azurerm_linux_virtual_machine.web.id
  recovery_replication_policy_id            = azurerm_site_recovery_replication_policy.main.id
  source_recovery_protection_container_name = azurerm_site_recovery_protection_container.primary.name
  target_resource_group_id                  = azurerm_resource_group.secondary.id
  target_recovery_fabric_id                 = azurerm_site_recovery_fabric.secondary.id
  target_recovery_protection_container_id   = azurerm_site_recovery_protection_container.secondary.id

  # Map each managed disk for replication
  managed_disk {
    disk_id                    = azurerm_linux_virtual_machine.web.os_disk[0].managed_disk_id
    staging_storage_account_id = azurerm_storage_account.cache.id
    target_resource_group_id   = azurerm_resource_group.secondary.id
    target_disk_type           = "Premium_LRS"
    target_replica_disk_type   = "Premium_LRS"
  }

  # Network interface configuration for the failed-over VM
  network_interface {
    source_network_interface_id   = azurerm_network_interface.web.id
    target_subnet_name            = azurerm_subnet.secondary.name
  }

  depends_on = [
    azurerm_site_recovery_protection_container_mapping.main,
    azurerm_site_recovery_network_mapping.main,
  ]
}
```

## Replicating Multiple VMs with for_each

If you have multiple VMs to replicate, use `for_each` to avoid code duplication:

```hcl
# Define VMs to replicate
variable "vms_to_replicate" {
  description = "Map of VMs to replicate with their properties"
  type = map(object({
    vm_id              = string
    network_interface_id = string
    os_disk_id         = string
  }))
}

# Replicate each VM
resource "azurerm_site_recovery_replicated_vm" "all" {
  for_each = var.vms_to_replicate

  name                                      = "replicated-${each.key}"
  resource_group_name                       = azurerm_resource_group.secondary.name
  recovery_vault_name                       = azurerm_recovery_services_vault.dr.name
  source_recovery_fabric_name               = azurerm_site_recovery_fabric.primary.name
  source_vm_id                              = each.value.vm_id
  recovery_replication_policy_id            = azurerm_site_recovery_replication_policy.main.id
  source_recovery_protection_container_name = azurerm_site_recovery_protection_container.primary.name
  target_resource_group_id                  = azurerm_resource_group.secondary.id
  target_recovery_fabric_id                 = azurerm_site_recovery_fabric.secondary.id
  target_recovery_protection_container_id   = azurerm_site_recovery_protection_container.secondary.id

  managed_disk {
    disk_id                    = each.value.os_disk_id
    staging_storage_account_id = azurerm_storage_account.cache.id
    target_resource_group_id   = azurerm_resource_group.secondary.id
    target_disk_type           = "Premium_LRS"
    target_replica_disk_type   = "Premium_LRS"
  }

  network_interface {
    source_network_interface_id = each.value.network_interface_id
    target_subnet_name          = azurerm_subnet.secondary.name
  }
}
```

## Best Practices

**Run test failovers regularly.** ASR supports test failovers that do not affect your production environment. Schedule them monthly and validate that your applications work correctly after failover.

**Monitor replication health.** Set up alerts for replication lag. If your RPO is breached, you need to know immediately.

**Keep the target region infrastructure updated.** If you add new subnets or change network security groups in the primary region, make sure the target region matches.

**Use recovery plans.** Recovery plans let you define the order in which VMs are brought up during failover and add custom scripts between groups.

## Wrapping Up

Azure Site Recovery with Terraform gives you a codified disaster recovery setup. Yes, the number of resources involved is significant - fabrics, containers, mappings, and policies all need to be defined. But once it is in Terraform, you can replicate the same DR pattern across all your environments. The alternative is clicking through the portal and hoping you remember every step, which is not a strategy you want to bet your business on.

For related reading, check out [How to Create Azure Backup Vault in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-backup-vault-in-terraform/view) for data protection beyond disaster recovery.
