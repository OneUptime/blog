# How to Implement Zero Trust Network with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Zero Trust, Security, OpenTofu, Conditional Access, Private Link

Description: Learn how to implement Zero Trust Network Architecture on Azure using OpenTofu with Conditional Access policies, Private Link, and Azure AD authentication.

## Overview

Zero Trust on Azure enforces "never trust, always verify" through Azure AD Conditional Access, Private Link for all service connections, and just-in-time access policies. OpenTofu configures the complete zero trust framework.

## Step 1: Conditional Access Policies

```hcl
# main.tf - Azure AD Conditional Access for Zero Trust

resource "azuread_conditional_access_policy" "require_mfa" {
  display_name = "Require MFA for All Users"
  state        = "enabled"

  conditions {
    client_app_types    = ["all"]
    sign_in_risk_levels = ["high", "medium"]

    users {
      included_users = ["All"]
      excluded_users = [azuread_group.break_glass.object_id]
    }

    applications {
      included_applications = ["All"]
    }

    locations {
      included_locations = ["All"]
      excluded_locations = ["AllTrusted"]
    }
  }

  grant_controls {
    operator         = "AND"
    built_in_controls = ["mfa", "compliantDevice"]
  }
}

# Block legacy authentication protocols
resource "azuread_conditional_access_policy" "block_legacy_auth" {
  display_name = "Block Legacy Authentication"
  state        = "enabled"

  conditions {
    client_app_types = ["exchangeActiveSync", "other"]

    users {
      included_users = ["All"]
    }

    applications {
      included_applications = ["All"]
    }
  }

  grant_controls {
    operator         = "OR"
    built_in_controls = ["block"]
  }
}
```

## Step 2: Private Endpoints for All Services

```hcl
# Private endpoints eliminate public internet exposure
resource "azurerm_private_endpoint" "key_vault" {
  name                = "kv-private-endpoint"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "kv-connection"
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name = "kv-dns"
    private_dns_zone_ids = [azurerm_private_dns_zone.key_vault.id]
  }
}

# Disable public network access on Key Vault
resource "azurerm_key_vault" "kv" {
  name                          = "zero-trust-kv"
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "premium"
  public_network_access_enabled = false  # Private endpoint only
  rbac_authorization_enabled    = true   # RBAC over access policies
}
```

## Step 3: Just-In-Time VM Access via PIM

```hcl
# Azure AD PIM for just-in-time privileged access
resource "azurerm_role_definition" "limited_vm_access" {
  name  = "Limited VM Operator"
  scope = azurerm_resource_group.rg.id

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/read"
    ]
  }
}

# NSG with Just-In-Time ports blocked by default
resource "azurerm_network_security_rule" "block_ssh" {
  name                        = "block-ssh"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.vm.name
}
```

## Step 4: Microsoft Defender for Cloud

```hcl
# Enable all Defender plans for comprehensive coverage
locals {
  defender_plans = [
    "VirtualMachines", "SqlServers", "AppServices",
    "StorageAccounts", "Containers", "KeyVaults",
    "Arm", "Dns", "OpenSourceRelationalDatabases"
  ]
}

resource "azurerm_security_center_subscription_pricing" "defender" {
  for_each      = toset(local.defender_plans)
  tier          = "Standard"
  resource_type = each.value
}
```

## Summary

Zero Trust on Azure built with OpenTofu uses Azure AD Conditional Access to verify user identity, device compliance, and risk level before granting application access. Private Endpoints ensure service traffic never leaves the Azure backbone network. Disabling public network access on all services (Key Vault, Storage, SQL) forces all access through private endpoints, eliminating the attack surface from the public internet.
