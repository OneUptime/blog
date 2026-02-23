# How to Create Azure Purview Accounts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Microsoft Purview, Data Governance, Infrastructure as Code, Data Catalog

Description: Learn how to create and configure Microsoft Purview (formerly Azure Purview) accounts using Terraform for data governance, cataloging, and compliance.

---

Data governance is not glamorous work, but it is necessary. As organizations accumulate data across storage accounts, databases, data lakes, and SaaS applications, knowing what data you have, where it lives, and who has access becomes a real challenge. Microsoft Purview (formerly Azure Purview) provides a unified data governance platform that helps you discover, classify, and manage your data estate.

This guide shows you how to set up Microsoft Purview accounts with Terraform, configure managed identities, set up private endpoints, and integrate with your data sources.

## What Microsoft Purview Does

Purview offers several capabilities:

- **Data Catalog**: Automatically scans and catalogs data across Azure, on-premises, and multi-cloud sources
- **Data Map**: Creates a visual map of your data estate showing lineage and relationships
- **Data Classification**: Identifies sensitive data like social security numbers, credit card numbers, and personal information
- **Access Policies**: Controls who can access what data
- **Data Sharing**: Enables secure data sharing between organizations

In Terraform, the primary resource is `azurerm_purview_account`, which creates the Purview account itself. Scanning, classification rules, and catalog configuration are typically done through the Purview portal or APIs after the account is provisioned.

## Creating a Purview Account

Let's start with the basic account setup:

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

# Resource group for data governance resources
resource "azurerm_resource_group" "governance" {
  name     = "rg-governance-prod-eastus"
  location = "East US"

  tags = {
    environment = "production"
    purpose     = "data-governance"
  }
}

# Microsoft Purview account
resource "azurerm_purview_account" "main" {
  name                = "purview-prod-eastus"
  resource_group_name = azurerm_resource_group.governance.name
  location            = azurerm_resource_group.governance.location

  # System-assigned managed identity is required
  identity {
    type = "SystemAssigned"
  }

  # Whether the account is publicly accessible
  public_network_enabled = false

  # Managed resource group - Purview creates resources here automatically
  managed_resource_group_name = "rg-purview-managed-prod"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

The `managed_resource_group_name` is important. Purview automatically creates a storage account and Event Hub namespace in this resource group. If you do not specify a name, Azure generates one for you.

## Granting Purview Access to Data Sources

For Purview to scan your data sources, its managed identity needs read access:

```hcl
# Grant Purview read access to a storage account for scanning
resource "azurerm_role_assignment" "purview_storage_reader" {
  scope                = azurerm_storage_account.data_lake.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_purview_account.main.identity[0].principal_id
}

# Grant Purview read access to an Azure SQL database
resource "azurerm_role_assignment" "purview_sql_reader" {
  scope                = azurerm_mssql_server.main.id
  role_definition_name = "Reader"
  principal_id         = azurerm_purview_account.main.identity[0].principal_id
}

# Grant Purview access to Key Vault for credential-based scanning
resource "azurerm_key_vault_access_policy" "purview" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_purview_account.main.identity[0].tenant_id
  object_id    = azurerm_purview_account.main.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}
```

## Setting Up Private Endpoints

For production deployments, disable public access and use private endpoints:

```hcl
# Private DNS zone for Purview account endpoint
resource "azurerm_private_dns_zone" "purview_account" {
  name                = "privatelink.purview.azure.com"
  resource_group_name = azurerm_resource_group.governance.name
}

# Private DNS zone for Purview portal endpoint
resource "azurerm_private_dns_zone" "purview_studio" {
  name                = "privatelink.purviewstudio.azure.com"
  resource_group_name = azurerm_resource_group.governance.name
}

# Link the DNS zones to the VNet
resource "azurerm_private_dns_zone_virtual_network_link" "purview_account" {
  name                  = "link-purview-account"
  resource_group_name   = azurerm_resource_group.governance.name
  private_dns_zone_name = azurerm_private_dns_zone.purview_account.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "purview_studio" {
  name                  = "link-purview-studio"
  resource_group_name   = azurerm_resource_group.governance.name
  private_dns_zone_name = azurerm_private_dns_zone.purview_studio.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# Private endpoint for the Purview account
resource "azurerm_private_endpoint" "purview_account" {
  name                = "pe-purview-account"
  location            = azurerm_resource_group.governance.location
  resource_group_name = azurerm_resource_group.governance.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-purview-account"
    private_connection_resource_id = azurerm_purview_account.main.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "dns-purview-account"
    private_dns_zone_ids = [azurerm_private_dns_zone.purview_account.id]
  }
}

# Private endpoint for the Purview portal
resource "azurerm_private_endpoint" "purview_portal" {
  name                = "pe-purview-portal"
  location            = azurerm_resource_group.governance.location
  resource_group_name = azurerm_resource_group.governance.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-purview-portal"
    private_connection_resource_id = azurerm_purview_account.main.id
    is_manual_connection           = false
    subresource_names              = ["portal"]
  }

  private_dns_zone_group {
    name                 = "dns-purview-portal"
    private_dns_zone_ids = [azurerm_private_dns_zone.purview_studio.id]
  }
}
```

Purview has two private endpoint sub-resources: `account` for the Purview API and `portal` for the Purview Studio web interface. You need both for a fully private deployment.

## Diagnostic Settings

Send Purview operational logs to Log Analytics:

```hcl
# Send Purview logs to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "purview" {
  name                       = "diag-purview"
  target_resource_id         = azurerm_purview_account.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  enabled_log {
    category = "ScanStatusLogEvent"
  }

  enabled_log {
    category = "DataSensitivityLogEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Variables for Flexibility

```hcl
# variables.tf
variable "purview_name" {
  description = "Name of the Purview account"
  type        = string
}

variable "location" {
  description = "Azure region for the Purview account"
  type        = string
  default     = "East US"

  validation {
    # Purview is not available in all regions
    condition     = contains(["eastus", "westus2", "westeurope", "northeurope", "uksouth", "southeastasia"], lower(replace(var.location, " ", "")))
    error_message = "Purview is not available in all regions. Check Azure documentation for supported regions."
  }
}

variable "public_network_enabled" {
  description = "Whether the Purview account is publicly accessible"
  type        = bool
  default     = false
}

variable "data_source_storage_accounts" {
  description = "List of storage account IDs that Purview should be able to scan"
  type        = list(string)
  default     = []
}
```

## Granting Access to Multiple Data Sources

When you have many data sources to scan:

```hcl
# Grant Purview read access to all specified storage accounts
resource "azurerm_role_assignment" "purview_storage" {
  for_each = toset(var.data_source_storage_accounts)

  scope                = each.value
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_purview_account.main.identity[0].principal_id
}
```

## Outputs

```hcl
# outputs.tf
output "purview_account_id" {
  description = "ID of the Purview account"
  value       = azurerm_purview_account.main.id
}

output "purview_identity_principal_id" {
  description = "Principal ID of the Purview managed identity"
  value       = azurerm_purview_account.main.identity[0].principal_id
}

output "purview_catalog_endpoint" {
  description = "Catalog endpoint URL"
  value       = "https://${azurerm_purview_account.main.name}.purview.azure.com"
}

output "purview_managed_resource_group" {
  description = "Name of the managed resource group created by Purview"
  value       = azurerm_purview_account.main.managed_resource_group_name
}
```

## Best Practices

**Start with a single Purview account.** Most organizations only need one Purview account per tenant. Data sources from any subscription can be registered in a single account.

**Use private endpoints in production.** Purview handles sensitive metadata about your data estate. Keep it on private networks.

**Grant minimum necessary access.** Purview only needs read access to scan data sources. Do not give it Contributor or Owner roles.

**Plan your collection hierarchy.** Purview uses collections to organize data sources. Plan the collection structure before registering sources so you do not have to reorganize later.

**Monitor scan status.** Set up alerts on scan failures so you know when data classification is not running.

## Wrapping Up

Microsoft Purview gives you visibility into your data estate - what data you have, where it is, how sensitive it is, and who can access it. Terraform handles the infrastructure side: creating the account, setting up network connectivity, and granting the managed identity access to data sources. The actual scanning configuration and classification rules are best managed through the Purview Studio UI or APIs, but the foundation belongs in Terraform alongside the rest of your infrastructure.
