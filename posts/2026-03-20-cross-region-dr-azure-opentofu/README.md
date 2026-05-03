# How to Set Up Cross-Region Disaster Recovery with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Disaster Recovery, Cross-Region, OpenTofu, Azure Site Recovery, Traffic Manager

Description: Learn how to implement cross-region disaster recovery on Azure using OpenTofu with Azure Site Recovery, geo-redundant storage, and Traffic Manager failover.

## Overview

Azure cross-region DR uses Azure Site Recovery for VM/workload replication, geo-redundant storage for data durability, and Traffic Manager for DNS failover. OpenTofu provisions the DR infrastructure and replication policies.

## Step 1: Geo-Redundant Storage

```hcl
# main.tf - GRS Storage Account for DR

resource "azurerm_storage_account" "grs" {
  name                     = "appgrstorage"
  resource_group_name      = azurerm_resource_group.primary.name
  location                 = "East US"
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-Redundant Storage

  # RA-GRS allows read from secondary region
  # account_replication_type = "RAGRS"

  blob_properties {
    versioning_enabled = true
    change_feed_enabled = true
  }
}
```

## Step 2: Azure SQL Active Geo-Replication

```hcl
# SQL Server in primary region
resource "azurerm_mssql_server" "primary" {
  name                = "app-sql-primary"
  resource_group_name = azurerm_resource_group.primary.name
  location            = "East US"
  version             = "12.0"
  administrator_login = "sqladmin"
  administrator_login_password = var.sql_password
}

# SQL Server in DR region
resource "azurerm_mssql_server" "dr" {
  name                = "app-sql-dr"
  resource_group_name = azurerm_resource_group.dr.name
  location            = "West Europe"
  version             = "12.0"
  administrator_login = "sqladmin"
  administrator_login_password = var.sql_password
}

# Failover group for automatic failover
resource "azurerm_mssql_failover_group" "app" {
  name                = "app-failover-group"
  server_id           = azurerm_mssql_server.primary.id
  databases           = [azurerm_mssql_database.app.id]

  partner_server {
    id = azurerm_mssql_server.dr.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60  # Automatic failover after 60 minutes
  }

  readonly_endpoint_failover_policy_enabled = true
}
```

## Step 3: Azure Site Recovery for VMs

```hcl
# Recovery Services Vault in DR region
resource "azurerm_recovery_services_vault" "dr" {
  name                = "dr-recovery-vault"
  resource_group_name = azurerm_resource_group.dr.name
  location            = "West Europe"
  sku                 = "Standard"
  soft_delete_enabled = true
}

# Site Recovery fabric for primary region
resource "azurerm_site_recovery_fabric" "primary" {
  name                = "primary-fabric"
  resource_group_name = azurerm_resource_group.dr.name
  recovery_vault_name = azurerm_recovery_services_vault.dr.name
  location            = "East US"
}

resource "azurerm_site_recovery_fabric" "dr_target" {
  name                = "dr-fabric"
  resource_group_name = azurerm_resource_group.dr.name
  recovery_vault_name = azurerm_recovery_services_vault.dr.name
  location            = "West Europe"
}

# Replication policy
resource "azurerm_site_recovery_replication_policy" "app" {
  name                                                 = "app-replication-policy"
  resource_group_name                                  = azurerm_resource_group.dr.name
  recovery_vault_name                                  = azurerm_recovery_services_vault.dr.name
  recovery_point_retention_in_minutes                  = 1440  # 24 hours
  application_consistent_snapshot_frequency_in_minutes = 60    # App-consistent every hour
}
```

## Step 4: Traffic Manager for Failover

```hcl
resource "azurerm_traffic_manager_profile" "app_dr" {
  name                = "app-dr-traffic-manager"
  resource_group_name = azurerm_resource_group.primary.name

  traffic_routing_method = "Priority"

  dns_config {
    relative_name = "app"
    ttl           = 30  # Low TTL for fast failover
  }

  monitor_config {
    protocol = "HTTPS"
    port     = 443
    path     = "/health"
    interval_in_seconds = 10
    timeout_in_seconds  = 5
    tolerated_number_of_failures = 3
  }
}

resource "azurerm_traffic_manager_azure_endpoint" "primary" {
  name               = "primary"
  profile_id         = azurerm_traffic_manager_profile.app_dr.id
  target_resource_id = azurerm_linux_web_app.primary.id
  priority           = 1  # Primary endpoint
}

resource "azurerm_traffic_manager_azure_endpoint" "dr" {
  name               = "dr-endpoint"
  profile_id         = azurerm_traffic_manager_profile.app_dr.id
  target_resource_id = azurerm_linux_web_app.dr.id
  priority           = 2  # Failover endpoint
}
```

## Summary

Azure cross-region DR configured with OpenTofu uses Azure Site Recovery for VM-level replication with configurable RPO, SQL Failover Groups for automatic database failover, and GRS storage for data durability across Azure paired regions. Traffic Manager with Priority routing and 10-second health check intervals provides DNS failover within minutes of a primary region failure.
