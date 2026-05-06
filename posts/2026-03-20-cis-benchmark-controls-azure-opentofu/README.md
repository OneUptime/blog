# How to Implement CIS Benchmark Controls with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIS Benchmark, Azure Security, Compliance, Infrastructure as Code

Description: Learn how to implement CIS Microsoft Azure Foundations Benchmark controls with OpenTofu to establish a security baseline for Azure subscriptions.

The CIS Microsoft Azure Foundations Benchmark provides security guidance for Azure subscriptions. OpenTofu lets you codify many of these controls as Azure Policy assignments, Defender for Cloud settings, resource configurations, and Microsoft Entra ID policies.

## Section 1: Identity and Access Management

```hcl
# CIS 1.1 - Enable Security Defaults, or use Conditional Access if you have Entra ID P1/P2.
# Security Defaults do not require Entra ID P1/P2.

# CIS 1.22 - User consent to apps is a Microsoft Entra authorization policy setting.
# Configure it through Microsoft Graph / Entra ID tooling rather than
# azurerm_resource_group_policy_assignment.
```

## Section 2: Microsoft Defender for Cloud

```hcl
# CIS 2.1 - Enable Defender for Servers
resource "azurerm_security_center_subscription_pricing" "servers" {
  tier          = "Standard"
  resource_type = "VirtualMachines"
}

# CIS 2.2 - Enable Defender for App Services
resource "azurerm_security_center_subscription_pricing" "app_services" {
  tier          = "Standard"
  resource_type = "AppServices"
}

# CIS 2.3 - Enable Defender for SQL Servers
resource "azurerm_security_center_subscription_pricing" "sql" {
  tier          = "Standard"
  resource_type = "SqlServers"
}

# CIS 2.4 - Enable Defender for Storage
resource "azurerm_security_center_subscription_pricing" "storage" {
  tier          = "Standard"
  resource_type = "StorageAccounts"
}

# CIS 2.5 - Enable Defender for Kubernetes
resource "azurerm_security_center_subscription_pricing" "kubernetes" {
  tier          = "Standard"
  resource_type = "KubernetesService"
}
```

## Section 3: Storage Accounts

```hcl
# CIS 3.1 - Ensure that 'Secure transfer required' is set to 'Enabled'
resource "azurerm_storage_account" "cis_compliant" {
  name                     = "mycompliantstorage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "GRS"

  https_traffic_only_enabled      = true   # CIS 3.1
  min_tls_version                 = "TLS1_2" # CIS 3.2
  allow_nested_items_to_be_public = false  # CIS 3.5
  public_network_access_enabled   = false  # CIS 3.7
}

# CIS 3.7 - Ensure storage account uses private endpoints
resource "azurerm_private_endpoint" "storage" {
  name                = "storage-private-endpoint"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "storage-connection"
    private_connection_resource_id = azurerm_storage_account.cis_compliant.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "storage-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }
}
```

## Section 4: Database Services

```hcl
# CIS 4.1.1 - Ensure SQL Server audit is enabled
resource "azurerm_mssql_server_extended_auditing_policy" "main" {
  server_id                               = azurerm_mssql_server.main.id
  storage_endpoint                        = azurerm_storage_account.audit.primary_blob_endpoint
  storage_account_access_key              = azurerm_storage_account.audit.primary_access_key
  storage_account_access_key_is_secondary = false
  retention_in_days                       = 90
}
```

## Section 5: Logging and Monitoring

```hcl
# CIS 5.1.1 - Ensure Diagnostic Setting captures all activities
resource "azurerm_monitor_diagnostic_setting" "subscription" {
  name               = "subscription-diag"
  target_resource_id = "/subscriptions/${var.subscription_id}"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.security.id

  enabled_log { category = "Administrative" }
  enabled_log { category = "Security" }
  enabled_log { category = "ServiceHealth" }
  enabled_log { category = "Alert" }
  enabled_log { category = "Recommendation" }
  enabled_log { category = "Policy" }
  enabled_log { category = "Autoscale" }
  enabled_log { category = "ResourceHealth" }
}
```

## Section 6: Networking

```hcl
# CIS 6.3 - Ensure SSH access is restricted to known IPs
resource "azurerm_network_security_rule" "allow_ssh_known_ips" {
  name                        = "allow-ssh-known-ips"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefixes     = var.admin_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.main.name
}

resource "azurerm_network_security_rule" "deny_ssh_all" {
  name                        = "deny-ssh-internet"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.main.name
}
```

## Conclusion

CIS Azure Benchmark controls span IAM, Defender for Cloud, storage, databases, logging, and networking. Use `azurerm_security_center_subscription_pricing` to enable Defender plans, enforce storage security settings at resource creation, and use Azure Policy assignments for organization-wide enforcement where the control applies to Azure resources. Tenant-level Microsoft Entra controls, such as app consent, need to be managed through Entra ID / Microsoft Graph tooling. Enable diagnostic settings to feed activity logs to Log Analytics for SIEM integration.
