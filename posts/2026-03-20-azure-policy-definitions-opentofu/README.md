# How to Create Azure Policy Definitions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Policy, OpenTofu, Governance, Compliance, Infrastructure

Description: Learn how to create custom Azure Policy definitions with OpenTofu to enforce resource configurations and compliance requirements across your Azure environment.

## Overview

Azure Policy lets you enforce organizational standards and assess compliance across your Azure resources. Custom policy definitions define what rules to apply, and OpenTofu manages these definitions as version-controlled code.

## Step 1: Create a Custom Policy Definition

```hcl
# main.tf - Policy to require tags on resources that support tags

resource "azurerm_policy_definition" "require_tags" {
  name         = "require-required-tags"
  policy_type  = "Custom"
  mode         = "Indexed"  # Evaluate resources that support tags and location
  display_name = "Require mandatory resource tags"
  description  = "Enforces that resources have required tags: Environment and CostCenter"

  # Policy metadata
  metadata = jsonencode({
    category = "Tags"
    version  = "1.0.0"
  })

  # Policy parameters allow the rule to be configurable
  parameters = jsonencode({
    requiredTags = {
      type = "Array"
      defaultValue = ["Environment", "CostCenter"]
      metadata = {
        displayName = "Required Tags"
        description = "List of required tag names"
      }
    }
  })

  # Policy rule - deny resources missing any required tag
  policy_rule = jsonencode({
    if = {
      count = {
        value = "[parameters('requiredTags')]"
        name  = "requiredTag"
        where = {
          field  = "[concat('tags[', current('requiredTag'), ']')]"
          exists = "false"
        }
      }
      greater = 0
    }
    then = {
      effect = "deny"
    }
  })
}
```

## Step 2: Audit Policy (Non-Enforcing)

```hcl
# Policy that audits but doesn't block non-compliant resources
resource "azurerm_policy_definition" "audit_storage_https" {
  name         = "audit-storage-https-only"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Audit Storage Accounts without HTTPS-only"
  description  = "Audits storage accounts that don't enforce HTTPS-only traffic"

  metadata = jsonencode({
    category = "Storage"
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Storage/storageAccounts"
        },
        {
          field  = "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly"
          notEquals = "true"
        }
      ]
    }
    then = {
      effect = "audit"  # Only audit, not deny
    }
  })
}
```

## Step 3: Modify Effect Policy

```hcl
# Policy that adds a tag if missing during create or update
resource "azurerm_policy_definition" "auto_tag_environment" {
  name         = "add-default-environment-tag"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "Add default Environment tag"

  policy_rule = jsonencode({
    if = {
      field  = "tags['Environment']"
      exists = "false"
    }
    then = {
      effect = "modify"
      details = {
        roleDefinitionIds = [
          "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
        ]
        operations = [
          {
            operation = "add"
            field     = "tags['Environment']"
            value     = "untagged"
          }
        ]
      }
    }
  })
}
```

## Step 4: Assign Policy to a Scope

```hcl
# Assign the tag policy at resource group scope
resource "azurerm_resource_group_policy_assignment" "require_tags_assignment" {
  name                 = "enforce-required-tags"
  resource_group_id    = azurerm_resource_group.rg.id
  policy_definition_id = azurerm_policy_definition.require_tags.id
  display_name         = "Enforce Required Tags on Resource Group"

  parameters = jsonencode({
    requiredTags = {
      value = ["Environment", "CostCenter"]
    }
  })
}
```

## Summary

Azure Policy definitions managed with OpenTofu provide governance-as-code for your Azure environment. Custom policies let you enforce organizational standards beyond the built-in policies, with effects ranging from `deny` (blocking) to `audit` (reporting) to `modify` (updating matching resources during create or update, with remediation tasks available for existing resources).
