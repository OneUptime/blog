# How to Build a Multi-Subscription Azure Environment with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Azure, Multi-Subscription, Cloud Governance, Management Groups

Description: Learn how to build a multi-subscription Azure environment with Terraform using management groups, Azure Policy, centralized networking, and subscription vending.

---

If you have been running everything in a single Azure subscription, you have probably already hit some of the pain points. Resource limits, tangled RBAC assignments, billing confusion, and the constant worry that a developer might accidentally delete something in production. Azure management groups and multiple subscriptions solve these problems, and Terraform makes the setup repeatable and auditable.

## Why Multiple Subscriptions?

Azure subscriptions are the primary boundary for billing, access control, and resource limits. Separating workloads into different subscriptions gives you cleaner billing, stronger security isolation, and independent resource quotas. It also aligns with Azure's Cloud Adoption Framework, which recommends this pattern for any organization beyond a small team.

## Architecture Overview

Our multi-subscription environment includes:

- Management group hierarchy
- Azure Policy for governance
- Centralized networking with hub-spoke topology
- Shared services subscription
- Subscription vending module
- Centralized logging with Azure Monitor

## Management Group Hierarchy

Management groups let you organize subscriptions and apply policies at scale.

```hcl
# Root management group (tenant root group)
# Azure creates this automatically, we reference it
data "azurerm_management_group" "tenant_root" {
  display_name = "Tenant Root Group"
}

# Top-level management groups
resource "azurerm_management_group" "platform" {
  display_name               = "Platform"
  parent_management_group_id = data.azurerm_management_group.tenant_root.id
}

resource "azurerm_management_group" "workloads" {
  display_name               = "Workloads"
  parent_management_group_id = data.azurerm_management_group.tenant_root.id
}

resource "azurerm_management_group" "sandbox" {
  display_name               = "Sandbox"
  parent_management_group_id = data.azurerm_management_group.tenant_root.id
}

# Platform sub-groups
resource "azurerm_management_group" "connectivity" {
  display_name               = "Connectivity"
  parent_management_group_id = azurerm_management_group.platform.id
}

resource "azurerm_management_group" "identity" {
  display_name               = "Identity"
  parent_management_group_id = azurerm_management_group.platform.id
}

resource "azurerm_management_group" "management" {
  display_name               = "Management"
  parent_management_group_id = azurerm_management_group.platform.id
}

# Workload sub-groups by environment
resource "azurerm_management_group" "workloads_prod" {
  display_name               = "Production"
  parent_management_group_id = azurerm_management_group.workloads.id
}

resource "azurerm_management_group" "workloads_nonprod" {
  display_name               = "Non-Production"
  parent_management_group_id = azurerm_management_group.workloads.id
}
```

## Azure Policy Assignments

Policies enforce governance across all subscriptions in a management group.

```hcl
# Require resource tags
resource "azurerm_management_group_policy_assignment" "require_tags" {
  name                 = "require-cost-tags"
  management_group_id  = azurerm_management_group.workloads.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b466-ef6698e0a6a0"
  display_name         = "Require CostCenter tag on resources"
  enforce              = true

  parameters = jsonencode({
    tagName = { value = "CostCenter" }
  })
}

# Restrict allowed regions
resource "azurerm_management_group_policy_assignment" "allowed_regions" {
  name                 = "allowed-regions"
  management_group_id  = data.azurerm_management_group.tenant_root.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"
  display_name         = "Restrict to approved regions"
  enforce              = true

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastus", "westus2", "westeurope", "northeurope"]
    }
  })
}

# Deny public IP addresses in production
resource "azurerm_management_group_policy_assignment" "deny_public_ip" {
  name                 = "deny-public-ip-prod"
  management_group_id  = azurerm_management_group.workloads_prod.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/6c112d4e-5bc7-47ae-a041-ea2d9dccd749"
  display_name         = "Deny public IP addresses in production"
  enforce              = true
}

# Require encryption on storage accounts
resource "azurerm_management_group_policy_assignment" "storage_encryption" {
  name                 = "require-storage-https"
  management_group_id  = data.azurerm_management_group.tenant_root.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9"
  display_name         = "Require secure transfer for storage accounts"
  enforce              = true
}

# Custom policy initiative for security baseline
resource "azurerm_policy_set_definition" "security_baseline" {
  name                = "security-baseline"
  policy_type         = "Custom"
  display_name        = "Security Baseline"
  management_group_id = data.azurerm_management_group.tenant_root.id

  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/0015ea4d-51ff-4ce3-8d8c-f3f8f0179a56"
    reference_id         = "require-sql-encryption"
  }

  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/a6fb4358-5bf4-4ad7-ba82-2cd2f41ce5e9"
    reference_id         = "audit-sql-auditing"
  }

  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/22bee202-a82f-4305-9a2a-6d7f44d4dedb"
    reference_id         = "require-nsg-on-subnets"
  }
}
```

## Hub-Spoke Networking

Centralize networking in the connectivity subscription with a hub-spoke topology.

```hcl
# Hub virtual network in the connectivity subscription
resource "azurerm_virtual_network" "hub" {
  provider            = azurerm.connectivity
  name                = "hub-vnet"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.hub_network.name
  address_space       = ["10.0.0.0/16"]
}

# Azure Firewall in the hub
resource "azurerm_firewall" "hub" {
  provider            = azurerm.connectivity
  name                = "hub-firewall"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.hub_network.name
  sku_name            = "AZFW_VNet"
  sku_tier            = "Standard"

  ip_configuration {
    name                 = "firewall-config"
    subnet_id            = azurerm_subnet.firewall.id
    public_ip_address_id = azurerm_public_ip.firewall.id
  }
}

# VPN Gateway for on-premises connectivity
resource "azurerm_virtual_network_gateway" "hub" {
  provider            = azurerm.connectivity
  name                = "hub-vpn-gateway"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.hub_network.name
  type                = "Vpn"
  vpn_type            = "RouteBased"
  sku                 = "VpnGw2"

  ip_configuration {
    name                 = "vpn-config"
    subnet_id            = azurerm_subnet.gateway.id
    public_ip_address_id = azurerm_public_ip.vpn.id
  }
}

# Spoke virtual network for a workload subscription
resource "azurerm_virtual_network" "spoke_prod" {
  provider            = azurerm.workload_prod
  name                = "prod-spoke-vnet"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.prod_network.name
  address_space       = ["10.1.0.0/16"]
}

# Peering from hub to spoke
resource "azurerm_virtual_network_peering" "hub_to_prod" {
  provider                     = azurerm.connectivity
  name                         = "hub-to-prod"
  resource_group_name          = azurerm_resource_group.hub_network.name
  virtual_network_name         = azurerm_virtual_network.hub.name
  remote_virtual_network_id    = azurerm_virtual_network.spoke_prod.id
  allow_forwarded_traffic      = true
  allow_gateway_transit        = true
  allow_virtual_network_access = true
}

# Peering from spoke to hub
resource "azurerm_virtual_network_peering" "prod_to_hub" {
  provider                     = azurerm.workload_prod
  name                         = "prod-to-hub"
  resource_group_name          = azurerm_resource_group.prod_network.name
  virtual_network_name         = azurerm_virtual_network.spoke_prod.name
  remote_virtual_network_id    = azurerm_virtual_network.hub.id
  allow_forwarded_traffic      = true
  use_remote_gateways          = true
  allow_virtual_network_access = true
}
```

## Centralized Logging

Send diagnostics from all subscriptions to a central Log Analytics workspace.

```hcl
# Central Log Analytics workspace in the management subscription
resource "azurerm_log_analytics_workspace" "central" {
  provider            = azurerm.management
  name                = "central-log-analytics"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.management.name
  sku                 = "PerGB2018"
  retention_in_days   = 365

  tags = {
    Purpose = "centralized-logging"
  }
}

# Azure Monitor diagnostic setting policy
# This policy deploys diagnostic settings to send Activity Logs to the central workspace
resource "azurerm_management_group_policy_assignment" "activity_log_diagnostics" {
  name                 = "deploy-activity-diag"
  management_group_id  = data.azurerm_management_group.tenant_root.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/2465583e-4e78-4c15-b6be-a36cbc7c8b0f"
  display_name         = "Deploy diagnostic settings for Activity Log"
  enforce              = true
  location             = "eastus"

  identity {
    type = "SystemAssigned"
  }

  parameters = jsonencode({
    logAnalytics = {
      value = azurerm_log_analytics_workspace.central.id
    }
  })
}

# Azure Security Center (Defender for Cloud)
resource "azurerm_security_center_workspace" "central" {
  scope        = "/subscriptions/${var.management_subscription_id}"
  workspace_id = azurerm_log_analytics_workspace.central.id
}
```

## Subscription Vending Module

Create a reusable module that provisions new subscriptions with all baseline configurations.

```hcl
# modules/subscription-vending/main.tf
variable "subscription_name" {}
variable "management_group_id" {}
variable "address_space" {}
variable "hub_vnet_id" {}
variable "log_analytics_workspace_id" {}

# Create spoke networking
resource "azurerm_virtual_network" "spoke" {
  name                = "${var.subscription_name}-vnet"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.network.name
  address_space       = [var.address_space]
}

# Set up peering to hub
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                         = "spoke-to-hub"
  resource_group_name          = azurerm_resource_group.network.name
  virtual_network_name         = azurerm_virtual_network.spoke.name
  remote_virtual_network_id    = var.hub_vnet_id
  allow_forwarded_traffic      = true
  use_remote_gateways          = true
  allow_virtual_network_access = true
}

# Deploy diagnostic settings
resource "azurerm_monitor_diagnostic_setting" "subscription" {
  name                       = "send-to-central-logs"
  target_resource_id         = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }

  enabled_log {
    category = "Alert"
  }
}
```

## Wrapping Up

A well-designed multi-subscription Azure environment gives you the isolation, governance, and scalability you need as your organization grows. Management groups let you apply policies at scale. Hub-spoke networking keeps traffic flowing securely. Centralized logging gives you visibility across everything.

The subscription vending approach is particularly powerful because every new team or project gets a properly configured subscription without manual setup. The baseline is baked into the Terraform module.

For monitoring your Azure resources across all subscriptions and getting unified alerting, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-multi-subscription-azure-environment-with-terraform/view) for cross-subscription observability.
