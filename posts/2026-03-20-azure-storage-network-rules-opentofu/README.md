# How to Configure Azure Storage Network Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, OpenTofu, Networking, Security, Firewall

Description: Learn how to configure Azure Storage network rules and firewall settings with OpenTofu to restrict access to specific VNets, subnets, and IP ranges.

## Overview

Azure Storage network rules let you restrict access to a storage account's public endpoint from specific virtual networks, subnets, and IP addresses. This is a critical security control for production environments to prevent unauthorized access.

## Step 1: Create VNet and Subnet

```hcl
# main.tf - Virtual network setup for service endpoint

resource "azurerm_virtual_network" "vnet" {
  name                = "my-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "app_subnet" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]

  # Enable the Microsoft.Storage service endpoint on this subnet
  service_endpoints = ["Microsoft.Storage"]
}
```

## Step 2: Configure Storage with Network Rules

```hcl
# Storage account with network restriction rules
resource "azurerm_storage_account" "secure_storage" {
  name                     = "mysecurestorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Default action DENY blocks public traffic unless explicitly allowed
  network_rules {
    default_action = "Deny"

    # Allow access from the app subnet via service endpoint
    virtual_network_subnet_ids = [
      azurerm_subnet.app_subnet.id
    ]

    # Allow access from specific IP ranges (e.g., office IP, CI/CD runner)
    ip_rules = [
      "203.0.113.0/24",  # Office CIDR
      "198.51.100.5"     # Specific CI/CD runner IP
    ]

    # Allow trusted Azure services plus logging/metrics exceptions
    bypass = ["AzureServices", "Logging", "Metrics"]
  }
}
```

## Step 3: Private Endpoint for Complete VNet Integration

For the most secure option, use a private endpoint for VNet access. If you want to remove the public endpoint entirely, also set `public_network_access_enabled = false` on the storage account:

```hcl
# Private endpoint gives the storage account a private IP in your VNet
resource "azurerm_private_endpoint" "storage_pe" {
  name                = "storage-private-endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.app_subnet.id

  private_service_connection {
    name                           = "storage-pe-connection"
    private_connection_resource_id = azurerm_storage_account.secure_storage.id
    is_manual_connection           = false
    # "blob" connects to the Blob service; choose the subresource your clients need.
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "blob-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob_dns.id]
  }
}

# Private DNS zone for blob storage private endpoints
resource "azurerm_private_dns_zone" "blob_dns" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_link" {
  name                  = "blob-dns-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.blob_dns.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}
```

## Step 4: Update Network Rules After Initial Creation

If you need to add rules to an existing storage account that is not already using the inline `network_rules` block:

```hcl
# Do not use this resource together with the inline network_rules block
# on azurerm_storage_account for the same storage account.
data "azurerm_storage_account" "existing_storage" {
  name                = "myexistingstorage"
  resource_group_name = azurerm_resource_group.rg.name
}

# Use azurerm_storage_account_network_rules for post-creation updates
resource "azurerm_storage_account_network_rules" "rules" {
  storage_account_id = data.azurerm_storage_account.existing_storage.id

  default_action             = "Deny"
  ip_rules                   = ["203.0.113.100"]
  virtual_network_subnet_ids = [azurerm_subnet.app_subnet.id]
  bypass                     = ["AzureServices"]
}
```

## Summary

Restricting Azure Storage network access through OpenTofu-managed firewall rules and private endpoints is a security best practice. Start with service endpoints for a simple approach, and use private endpoints for VNet-only access. If you want no public internet exposure, disable public network access on the storage account as well.
