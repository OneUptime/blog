# How to Build a Landing Zone with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Landing Zone, Architecture, OpenTofu, Management Groups, Policy, Security

Description: Learn how to build an Azure Landing Zone using OpenTofu with Management Groups, Azure Policy, centralized logging, and security baselines for enterprise governance.

## Overview

An Azure Landing Zone provides a governed multi-subscription environment with Management Group hierarchy, Azure Policy enforcement, hub-spoke networking, and centralized security tooling. OpenTofu provisions the complete governance framework.

## Step 1: Management Group Hierarchy

```hcl
# main.tf - Azure Management Group structure

data "azurerm_client_config" "current" {}

data "azurerm_management_group" "root" {
  name = data.azurerm_client_config.current.tenant_id
}

resource "azurerm_management_group" "platform" {
  display_name               = "Platform"
  parent_management_group_id = data.azurerm_management_group.root.id
}

resource "azurerm_management_group" "workloads" {
  display_name               = "Workloads"
  parent_management_group_id = data.azurerm_management_group.root.id
}

resource "azurerm_management_group" "sandbox" {
  display_name               = "Sandbox"
  parent_management_group_id = data.azurerm_management_group.root.id
}

resource "azurerm_management_group" "workloads_prod" {
  display_name               = "Production"
  parent_management_group_id = azurerm_management_group.workloads.id
}

resource "azurerm_management_group" "workloads_nonprod" {
  display_name               = "Non-Production"
  parent_management_group_id = azurerm_management_group.workloads.id
}
```

## Step 2: Azure Policy Assignments

```hcl
# Require specific tags on taggable resources
resource "azurerm_policy_definition" "require_tags" {
  name                = "require-standard-tags"
  policy_type         = "Custom"
  management_group_id = azurerm_management_group.workloads.id
  mode                = "Indexed"
  display_name        = "Require standard tags on resources"

  policy_rule = jsonencode({
    if = {
      allOf = [
        { field = "type", notIn = ["Microsoft.Resources/subscriptions/resourceGroups"] },
        { anyOf = [
          { field = "[concat('tags[', parameters('tagName1'), ']')]", exists = "false" },
          { field = "[concat('tags[', parameters('tagName2'), ']')]", exists = "false" }
        ]}
      ]
    }
    then = { effect = "Deny" }
  })

  parameters = jsonencode({
    tagName1 = { type = "String", metadata = { displayName = "Required tag 1" } }
    tagName2 = { type = "String", metadata = { displayName = "Required tag 2" } }
  })
}

resource "azurerm_management_group_policy_assignment" "require_tags" {
  name                 = "require-standard-tags"
  management_group_id  = azurerm_management_group.workloads.id
  policy_definition_id = azurerm_policy_definition.require_tags.id

  parameters = jsonencode({
    tagName1 = { value = "environment" }
    tagName2 = { value = "owner" }
  })
}

# Assign the Microsoft cloud security benchmark initiative
resource "azurerm_management_group_policy_assignment" "security_benchmark" {
  name                 = "azure-security-benchmark"
  management_group_id  = data.azurerm_management_group.root.id
  policy_definition_id = "/providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8"

  identity {
    type = "SystemAssigned"
  }

  location = "eastus"
}
```

## Step 3: Hub-Spoke Networking

```hcl
# Hub VNet for shared connectivity services
resource "azurerm_virtual_network" "hub" {
  name                = "hub-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.connectivity.location
  resource_group_name = azurerm_resource_group.connectivity.name
}

# Spoke VNet for workloads
resource "azurerm_virtual_network" "spoke_prod" {
  name                = "spoke-prod-vnet"
  address_space       = ["10.10.0.0/16"]
  location            = azurerm_resource_group.workload_prod.location
  resource_group_name = azurerm_resource_group.workload_prod.name
}

# Hub-Spoke peering (bidirectional)
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  name                      = "hub-to-spoke-prod"
  resource_group_name       = azurerm_resource_group.connectivity.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.spoke_prod.id
  allow_forwarded_traffic   = true
}

resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "spoke-prod-to-hub"
  resource_group_name       = azurerm_resource_group.workload_prod.name
  virtual_network_name      = azurerm_virtual_network.spoke_prod.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id
  allow_forwarded_traffic   = true
}
```

## Step 4: Centralized Log Analytics

```hcl
# Central Log Analytics workspace
resource "azurerm_log_analytics_workspace" "central" {
  name                = "central-law"
  location            = azurerm_resource_group.management.location
  resource_group_name = azurerm_resource_group.management.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Enable Microsoft Defender for Cloud plans in the current subscription
resource "azurerm_security_center_subscription_pricing" "defender" {
  for_each = toset([
    "VirtualMachines", "SqlServers", "AppServices",
    "StorageAccounts", "Containers", "KeyVaults"
  ])

  tier          = "Standard"
  resource_type = each.value
}
```

## Summary

An Azure Landing Zone built with OpenTofu establishes Management Group hierarchy for policy inheritance, ensuring governance policies cascade from parent to child management groups. Hub-spoke networking centralizes shared services (firewalls, VPN gateways) in the hub while spoke VNets contain workloads with controlled connectivity. Azure Policy assignments at the management group level enforce compliance across all subscriptions without per-subscription configuration.
