# How to Create Azure RBAC with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, RBAC, Security, Infrastructure as Code

Description: Learn how to implement Azure Role-Based Access Control using Terraform to manage permissions for users, groups, and service principals.

---

Azure Role-Based Access Control (RBAC) provides fine-grained access management for Azure resources. Using Terraform to manage RBAC assignments ensures that your access control is consistent, auditable, and version-controlled. This guide covers everything from basic role assignments to custom role definitions and advanced RBAC patterns.

## Understanding Azure RBAC

Azure RBAC is built on three core concepts: security principals (who), role definitions (what they can do), and scopes (where they can do it). A role assignment ties these together by granting a security principal a specific role at a particular scope.

## Setting Up the Provider

```hcl
# Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azuread" {}
```

## Basic Role Assignments

The simplest RBAC pattern assigns built-in roles to users or groups:

```hcl
# Get the current subscription data
data "azurerm_subscription" "current" {}

# Get an existing Azure AD group
data "azuread_group" "developers" {
  display_name     = "Developers"
  security_enabled = true
}

# Assign the Reader role to the developers group at subscription level
resource "azurerm_role_assignment" "developers_reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Reader"
  principal_id         = data.azuread_group.developers.object_id
}

# Assign Contributor role at a resource group level
resource "azurerm_resource_group" "dev" {
  name     = "rg-development"
  location = "eastus"
}

resource "azurerm_role_assignment" "developers_contributor" {
  scope                = azurerm_resource_group.dev.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.developers.object_id
}
```

## Creating Custom Role Definitions

When built-in roles do not match your requirements, create custom roles:

```hcl
# Create a custom role for application operators
resource "azurerm_role_definition" "app_operator" {
  name        = "Application Operator"
  scope       = data.azurerm_subscription.current.id
  description = "Can manage application resources but not networking or security"

  permissions {
    actions = [
      # App Service permissions
      "Microsoft.Web/sites/*",
      "Microsoft.Web/serverFarms/*",

      # Storage read permissions
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Storage/storageAccounts/listKeys/action",

      # Key Vault secret read permissions
      "Microsoft.KeyVault/vaults/secrets/read",

      # Monitor permissions
      "Microsoft.Insights/metrics/read",
      "Microsoft.Insights/alertRules/*",

      # Resource group read
      "Microsoft.Resources/subscriptions/resourceGroups/read"
    ]

    not_actions = [
      # Prevent network modifications
      "Microsoft.Network/*",
      # Prevent security changes
      "Microsoft.Security/*"
    ]

    data_actions = [
      # Allow blob data access
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write"
    ]

    not_data_actions = []
  }

  # Define where this role can be assigned
  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}

# Assign the custom role
resource "azurerm_role_assignment" "app_operators" {
  scope              = azurerm_resource_group.dev.id
  role_definition_id = azurerm_role_definition.app_operator.role_definition_resource_id
  principal_id       = data.azuread_group.developers.object_id
}
```

## Managing Service Principal Permissions

Service principals are commonly used for automated deployments and applications:

```hcl
# Create an Azure AD application
resource "azuread_application" "deployment" {
  display_name = "deployment-automation"
}

# Create a service principal for the application
resource "azuread_service_principal" "deployment" {
  client_id = azuread_application.deployment.client_id
}

# Assign Contributor role to the service principal
resource "azurerm_role_assignment" "deployment_contributor" {
  scope                = azurerm_resource_group.dev.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.deployment.object_id
}

# Also grant Key Vault access for secret management
resource "azurerm_role_assignment" "deployment_keyvault" {
  scope                = azurerm_resource_group.dev.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azuread_service_principal.deployment.object_id
}
```

## Implementing Scope-Based Access Patterns

Azure RBAC supports assignments at multiple scopes. Here is a pattern that demonstrates layered access:

```hcl
# Management group level - broad read access
resource "azurerm_role_assignment" "security_team_mg" {
  scope                = "/providers/Microsoft.Management/managementGroups/production"
  role_definition_name = "Security Reader"
  principal_id         = data.azuread_group.security_team.object_id
}

# Subscription level - monitoring access
resource "azurerm_role_assignment" "security_team_sub" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Monitoring Reader"
  principal_id         = data.azuread_group.security_team.object_id
}

# Resource group level - specific resource management
resource "azurerm_role_assignment" "security_team_rg" {
  scope                = azurerm_resource_group.security.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.security_team.object_id
}

# Resource level - specific resource access
resource "azurerm_role_assignment" "security_team_keyvault" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azuread_group.security_team.object_id
}

# Supporting resources
data "azuread_group" "security_team" {
  display_name     = "Security Team"
  security_enabled = true
}

resource "azurerm_resource_group" "security" {
  name     = "rg-security"
  location = "eastus"
}

resource "azurerm_key_vault" "main" {
  name                = "kv-main-security"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  tenant_id           = data.azurerm_subscription.current.tenant_id
  sku_name            = "standard"

  enable_rbac_authorization = true
}
```

## Dynamic Role Assignments with for_each

Manage multiple role assignments efficiently using loops:

```hcl
# Define role assignments as a map
variable "role_assignments" {
  type = map(object({
    principal_name = string
    role_name      = string
    scope_type     = string
  }))
  default = {
    "dev-contributor" = {
      principal_name = "Developers"
      role_name      = "Contributor"
      scope_type     = "dev"
    }
    "dev-reader" = {
      principal_name = "QA Team"
      role_name      = "Reader"
      scope_type     = "dev"
    }
    "ops-contributor" = {
      principal_name = "Operations"
      role_name      = "Contributor"
      scope_type     = "ops"
    }
  }
}

# Look up all referenced groups
data "azuread_group" "principals" {
  for_each         = var.role_assignments
  display_name     = each.value.principal_name
  security_enabled = true
}

# Map scope types to actual resource group IDs
locals {
  scope_map = {
    "dev" = azurerm_resource_group.dev.id
    "ops" = azurerm_resource_group.ops.id
  }
}

resource "azurerm_resource_group" "ops" {
  name     = "rg-operations"
  location = "eastus"
}

# Create all role assignments dynamically
resource "azurerm_role_assignment" "dynamic" {
  for_each = var.role_assignments

  scope                = local.scope_map[each.value.scope_type]
  role_definition_name = each.value.role_name
  principal_id         = data.azuread_group.principals[each.key].object_id
}
```

## Deny Assignments

Azure also supports deny assignments that block specific actions even if a role assignment grants access:

```hcl
# Note: Deny assignments are typically managed through Azure Blueprints
# or Azure Policy, but you can reference them in Terraform

# Use Azure Policy to create deny effects
resource "azurerm_policy_assignment" "deny_public_storage" {
  name                 = "deny-public-storage"
  scope                = data.azurerm_subscription.current.id
  policy_definition_id = azurerm_policy_definition.deny_public_storage.id
  description          = "Deny creation of publicly accessible storage accounts"
}

resource "azurerm_policy_definition" "deny_public_storage" {
  name         = "deny-public-storage"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Deny Public Storage Accounts"

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Storage/storageAccounts"
        },
        {
          field    = "Microsoft.Storage/storageAccounts/allowBlobPublicAccess"
          equals   = "true"
        }
      ]
    }
    then = {
      effect = "Deny"
    }
  })
}
```

## Best Practices

Follow the principle of least privilege by assigning the most restrictive role that still allows users to perform their tasks. Prefer group-based assignments over individual user assignments for easier management. Use custom roles only when built-in roles do not meet your needs. Apply roles at the narrowest scope possible. Use Terraform variables and loops to manage role assignments at scale, and always track changes through version control.

For extending your Azure security posture, check out our guide on [Azure AD Conditional Access in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-ad-conditional-access-in-terraform/view).

## Conclusion

Managing Azure RBAC with Terraform provides a consistent, auditable, and repeatable way to control access to your cloud resources. From basic built-in role assignments to custom role definitions and dynamic assignment patterns, Terraform gives you the tools to implement sophisticated access control strategies. By combining RBAC with Azure Policy and Conditional Access, you can build a comprehensive security framework for your Azure environment.
