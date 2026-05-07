# How to Create Custom Azure Roles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, RBAC, Custom Roles, IAM, Infrastructure as Code, Least Privilege

Description: Learn how to define and manage custom Azure RBAC roles using OpenTofu to implement fine-grained permissions that built-in roles cannot provide.

---

Azure's built-in roles cover broad scenarios, but production environments often need more granular control. Custom roles let you define exactly which actions are allowed, enabling true least-privilege access. OpenTofu makes custom role definitions reproducible and shareable across your organization.

## When to Use Custom Roles

Use custom roles when:
- Built-in roles grant more permissions than needed.
- You need to combine permissions from multiple built-in roles into a single role.
- You want to start with broad permissions and exclude specific actions from that role definition.

## Creating a Basic Custom Role

```hcl
# main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_subscription" "current" {}

# Custom role that allows viewing VMs and starting/stopping them
# but not creating or deleting
resource "azurerm_role_definition" "vm_operator" {
  name        = "VM Operator"
  scope       = data.azurerm_subscription.current.id
  description = "Can view, start, and stop virtual machines but cannot create or delete them"

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]
  }

  # Scopes where this role can be assigned
  assignable_scopes = [
    data.azurerm_subscription.current.id,
  ]
}
```

## Creating a Custom Role for a CI/CD Pipeline

This example shows one way to scope a deployment pipeline role.

```hcl
# cicd_role.tf
resource "azurerm_role_definition" "cicd_deployer" {
  name        = "CI/CD Deployer"
  scope       = data.azurerm_subscription.current.id
  description = "Permissions required for CI/CD pipeline to deploy containerized applications"

  permissions {
    actions = [
      # App Service and Container deployments
      "Microsoft.Web/sites/read",
      "Microsoft.Web/sites/write",
      "Microsoft.Web/sites/publishxml/action",
      "Microsoft.Web/sites/restart/action",

      # Container Registry access
      "Microsoft.ContainerRegistry/registries/read",
      "Microsoft.ContainerRegistry/registries/pull/read",
      "Microsoft.ContainerRegistry/registries/push/write",

      # Resource group read access
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Resources/deployments/*",

      # Storage for artifacts
      "Microsoft.Storage/storageAccounts/blobServices/containers/read",
      "Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action",
    ]

    data_actions = [
      # Blob storage data plane permissions
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ]

    not_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id,
  ]
}

# Assign the custom role to the CI/CD service principal
resource "azurerm_role_assignment" "cicd_assignment" {
  scope              = data.azurerm_subscription.current.id
  role_definition_id = azurerm_role_definition.cicd_deployer.role_definition_resource_id
  principal_id       = var.cicd_service_principal_object_id
}
```

## Scoping Custom Roles to Resource Groups

If you want a custom role to be assignable only within a specific resource group, define it at that resource group scope instead of the entire subscription.

```hcl
# scoped_role.tf
resource "azurerm_resource_group" "app_rg" {
  name     = "app-production-rg"
  location = "eastus"
}

# This role can only be assigned within the app resource group
resource "azurerm_role_definition" "app_admin" {
  name        = "App Production Admin"
  scope       = azurerm_resource_group.app_rg.id
  description = "Full access within the app production resource group"

  permissions {
    actions     = ["*"]
    not_actions = [
      # Exclude resource group deletion from this role
      "Microsoft.Resources/subscriptions/resourceGroups/delete",
    ]
  }

  assignable_scopes = [
    azurerm_resource_group.app_rg.id,
  ]
}
```

## Best Practices

- Version custom role definitions in git alongside the infrastructure that uses them.
- Use descriptive names and `description` fields - future team members will thank you.
- Verify role assignments with `az role assignment list` and review effective access in the Azure portal's "Check Access" feature before assigning to production principals.
- Custom roles count against Azure's limit of 5,000 custom roles per tenant - consolidate where possible.
- Periodically review and remove unused custom roles to reduce the attack surface.
