# How to Set Up Azure Policy Initiatives with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Policy, Initiatives, OpenTofu, Governance, Compliance

Description: Learn how to create Azure Policy Initiatives (policy sets) with OpenTofu to group multiple related policies into a single assignable unit for compliance management.

## Overview

Azure Policy Initiatives (also called Policy Sets) group multiple related policy definitions into a single object that you can assign together. This simplifies compliance management by enabling you to apply dozens of related policies with one assignment.

## Step 1: Create Individual Policy Definitions

```hcl
# main.tf - Define constituent policies for the initiative

resource "azurerm_policy_definition" "require_https" {
  name         = "require-https-storage"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Require HTTPS on Storage Accounts"

  policy_rule = jsonencode({
    if = {
      allOf = [
        { field = "type", equals = "Microsoft.Storage/storageAccounts" },
        { field = "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly", notEquals = "true" }
      ]
    }
    then = { effect = "deny" }
  })
}

resource "azurerm_policy_definition" "require_tls12" {
  name         = "require-tls12-storage"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Require TLS 1.2 minimum on Storage Accounts"

  policy_rule = jsonencode({
    if = {
      allOf = [
        { field = "type", equals = "Microsoft.Storage/storageAccounts" },
        {
          anyOf = [
            {
              field     = "Microsoft.Storage/storageAccounts/minimumTlsVersion"
              notEquals = "TLS1_2"
            },
            {
              field  = "Microsoft.Storage/storageAccounts/minimumTlsVersion"
              exists = "false"
            }
          ]
        }
      ]
    }
    then = { effect = "deny" }
  })
}
```

## Step 2: Create the Policy Initiative

```hcl
# Create an initiative that groups storage security policies
resource "azurerm_policy_set_definition" "storage_security" {
  name         = "storage-security-baseline"
  policy_type  = "Custom"
  display_name = "Storage Account Security Baseline"
  description  = "A set of policies to enforce storage account security best practices"

  metadata = jsonencode({
    category = "Storage"
    version  = "1.0.0"
  })

  # Include custom policies
  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.require_https.id
    reference_id         = "require-https"
  }

  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.require_tls12.id
    reference_id         = "require-tls12"
  }

  # Include built-in policies by their ID
  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/4fa4b6c0-31ca-4c0d-b10d-24b96f62a751"
    reference_id         = "builtin-storage-public-access"
  }
}
```

## Step 3: Create a Compliance Initiative

```hcl
# Create a CIS benchmark-style initiative with parameters
resource "azurerm_policy_set_definition" "cis_baseline" {
  name         = "cis-azure-baseline"
  policy_type  = "Custom"
  display_name = "CIS Azure Foundations Baseline"
  description  = "Policies aligned to CIS Azure Foundations Benchmark"

  # Initiative-level parameters that can be passed to member policies
  parameters = jsonencode({
    allowedLocations = {
      type = "Array"
      defaultValue = ["eastus", "westus2"]
      metadata = {
        displayName = "Allowed Azure Regions"
      }
    }
  })

  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"
    reference_id         = "allowed-locations"
    parameter_values = jsonencode({
      listOfAllowedLocations = {
        value = "[parameters('allowedLocations')]"
      }
    })
  }
}
```

## Step 4: Assign the Initiative

```hcl
# Assign the storage security initiative to a subscription
data "azurerm_subscription" "current" {}

resource "azurerm_subscription_policy_assignment" "storage_security_assignment" {
  name                 = "storage-security-assignment"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = azurerm_policy_set_definition.storage_security.id
  display_name         = "Storage Security Baseline Assignment"
  description          = "Enforces storage security baseline across all storage accounts"

  # Identity required for policies with deployIfNotExists or modify effects
  identity {
    type = "SystemAssigned"
  }

  location = "eastus"
}
```

## Summary

Azure Policy Initiatives with OpenTofu let you bundle related compliance policies into manageable units. By combining custom policies with built-in ones and assigning them at the subscription or management group scope, you can enforce consistent security baselines across your entire Azure environment.
