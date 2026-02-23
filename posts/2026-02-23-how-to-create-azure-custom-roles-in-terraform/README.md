# How to Create Azure Custom Roles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, RBAC, Custom Roles, Security, Infrastructure as Code, Access Control

Description: Learn how to create Azure custom RBAC roles in Terraform when built-in roles do not match your access requirements, with practical examples and best practices.

---

Azure provides over 300 built-in RBAC roles, but sometimes none of them match exactly what you need. Maybe you want to give a team permission to restart VMs but not delete them, or allow developers to read Key Vault secrets without managing the vault itself. Custom roles let you define precisely the permissions you need - nothing more, nothing less.

This guide walks through creating custom Azure RBAC roles in Terraform with real-world examples, covering the permission model, assignable scopes, and how to structure roles for practical use.

## Provider Configuration

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
```

## Data Sources

```hcl
# data.tf
data "azurerm_subscription" "current" {}
```

## Understanding the Permission Model

Azure RBAC permissions follow a pattern: `{Company}.{ProviderName}/{resourceType}/{action}`.

Actions fall into four categories:
- `read` - GET operations
- `write` - PUT and PATCH operations
- `delete` - DELETE operations
- `action` - Custom operations (like restarting a VM)

You can use wildcards: `Microsoft.Compute/virtualMachines/*` grants all actions on VMs.

## VM Operator Role

A common need: let operations staff restart and stop VMs without being able to create or delete them.

```hcl
# vm-operator.tf
resource "azurerm_role_definition" "vm_operator" {
  name        = "Virtual Machine Operator"
  scope       = data.azurerm_subscription.current.id
  description = "Can start, stop, restart, and monitor virtual machines but cannot create, delete, or resize them"

  permissions {
    actions = [
      # Read VM details
      "Microsoft.Compute/virtualMachines/read",

      # Power management
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",

      # View VM status and metrics
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Insights/metrics/read",
      "Microsoft.Insights/metricDefinitions/read",

      # Read resource group info (needed to see VMs in the portal)
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    not_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## Storage Reader with Delete

The built-in Storage Blob Data Reader cannot delete blobs. This custom role adds that capability.

```hcl
# storage-reader-delete.tf
resource "azurerm_role_definition" "storage_reader_delete" {
  name        = "Storage Blob Reader with Delete"
  scope       = data.azurerm_subscription.current.id
  description = "Can read and delete blobs but cannot create or modify them"

  permissions {
    actions = [
      "Microsoft.Storage/storageAccounts/blobServices/containers/read",
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    data_actions = [
      # Read blob data
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
      # Delete blobs
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ]
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## AKS Developer Role

Give developers enough access to deploy to Kubernetes without managing the cluster infrastructure.

```hcl
# aks-developer.tf
resource "azurerm_role_definition" "aks_developer" {
  name        = "AKS Developer"
  scope       = data.azurerm_subscription.current.id
  description = "Can view AKS cluster details and get credentials but cannot modify cluster configuration"

  permissions {
    actions = [
      # Read cluster information
      "Microsoft.ContainerService/managedClusters/read",

      # Get cluster credentials for kubectl
      "Microsoft.ContainerService/managedClusters/listClusterUserCredential/action",

      # View cluster diagnostics
      "Microsoft.ContainerService/managedClusters/diagnosticsState/read",

      # Read ACR for image references
      "Microsoft.ContainerRegistry/registries/read",
      "Microsoft.ContainerRegistry/registries/pull/read",

      # Read resource groups
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    not_actions = [
      # Explicitly deny admin credentials
      "Microsoft.ContainerService/managedClusters/listClusterAdminCredential/action",
    ]
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## Key Vault Secret Reader

A narrow role that only allows reading secrets - no keys, no certificates, no management.

```hcl
# kv-secret-reader.tf
resource "azurerm_role_definition" "kv_secret_reader" {
  name        = "Key Vault Secret Reader Only"
  scope       = data.azurerm_subscription.current.id
  description = "Can read Key Vault secrets but nothing else - no keys, certificates, or vault management"

  permissions {
    actions = [
      # Need to read the vault itself to find it
      "Microsoft.KeyVault/vaults/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    data_actions = [
      # Read secret values
      "Microsoft.KeyVault/vaults/secrets/getSecret/action",
      # List secrets
      "Microsoft.KeyVault/vaults/secrets/readMetadata/action",
    ]

    not_data_actions = [
      # Explicitly deny key operations
      "Microsoft.KeyVault/vaults/keys/*",
      # Deny certificate operations
      "Microsoft.KeyVault/vaults/certificates/*",
    ]
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## Network Troubleshooter Role

Let the networking team diagnose issues without making changes.

```hcl
# network-troubleshooter.tf
resource "azurerm_role_definition" "network_troubleshooter" {
  name        = "Network Troubleshooter"
  scope       = data.azurerm_subscription.current.id
  description = "Can view network configuration, run diagnostics, and check NSG flow logs but cannot make changes"

  permissions {
    actions = [
      # Read all networking resources
      "Microsoft.Network/*/read",

      # Network Watcher diagnostics
      "Microsoft.Network/networkWatchers/queryFlowLogStatus/action",
      "Microsoft.Network/networkWatchers/ipFlowVerify/action",
      "Microsoft.Network/networkWatchers/nextHop/action",
      "Microsoft.Network/networkWatchers/connectivityCheck/action",
      "Microsoft.Network/networkWatchers/topology/action",

      # View NSG flow logs
      "Microsoft.Network/networkWatchers/queryConnectionMonitors/action",

      # Read metrics
      "Microsoft.Insights/metrics/read",
      "Microsoft.Insights/metricDefinitions/read",

      # Resource group context
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    not_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## Cost Management Reader Role

Allow finance teams to view costs without seeing resource details.

```hcl
# cost-reader.tf
resource "azurerm_role_definition" "cost_reader" {
  name        = "Cost Management Reader"
  scope       = data.azurerm_subscription.current.id
  description = "Can view costs, budgets, and billing information without access to resource configurations"

  permissions {
    actions = [
      # Cost management
      "Microsoft.CostManagement/*/read",
      "Microsoft.Consumption/*/read",

      # Billing
      "Microsoft.Billing/billingAccounts/read",
      "Microsoft.Billing/billingPeriods/read",

      # Advisors for cost recommendations
      "Microsoft.Advisor/recommendations/read",
      "Microsoft.Advisor/configurations/read",

      # Subscriptions
      "Microsoft.Resources/subscriptions/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]

    not_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

## Scoping Roles to Resource Groups

You can limit where a custom role can be assigned.

```hcl
# scoped-role.tf
# Role that can only be assigned within specific resource groups
resource "azurerm_role_definition" "dev_deployer" {
  name        = "Development Deployer"
  scope       = data.azurerm_subscription.current.id
  description = "Can deploy resources in development resource groups only"

  permissions {
    actions = [
      "Microsoft.Web/sites/*",
      "Microsoft.Sql/servers/databases/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Resources/deployments/*",
    ]
  }

  # Can only be assigned to these specific resource groups
  assignable_scopes = [
    "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/rg-dev-web",
    "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/rg-dev-api",
  ]
}
```

## Assigning Custom Roles

Once defined, assign the custom role to users or groups.

```hcl
# assignments.tf
resource "azurerm_role_assignment" "vm_ops" {
  scope              = data.azurerm_subscription.current.id
  role_definition_id = azurerm_role_definition.vm_operator.role_definition_resource_id
  principal_id       = var.ops_group_object_id
}

resource "azurerm_role_assignment" "aks_devs" {
  scope              = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/rg-aks"
  role_definition_id = azurerm_role_definition.aks_developer.role_definition_resource_id
  principal_id       = var.dev_group_object_id
}
```

## Outputs

```hcl
# outputs.tf
output "role_definitions" {
  value = {
    vm_operator           = azurerm_role_definition.vm_operator.role_definition_id
    storage_reader_delete = azurerm_role_definition.storage_reader_delete.role_definition_id
    aks_developer         = azurerm_role_definition.aks_developer.role_definition_id
    kv_secret_reader      = azurerm_role_definition.kv_secret_reader.role_definition_id
  }
  description = "Role definition IDs for the custom roles"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Best Practices

**Start with built-in roles.** Only create custom roles when no built-in role fits your needs. Custom roles add maintenance overhead.

**Use `not_actions` sparingly.** It is clearer to list exactly what you want to allow rather than starting broad and carving out exceptions.

**Include `data_actions` when needed.** Data plane operations (like reading blob contents or Key Vault secrets) are separate from management plane operations. Many people forget this distinction.

**Limit assignable scopes.** Narrower scopes reduce the blast radius if the role is assigned incorrectly.

**Document the purpose.** Use the description field to explain why this role exists and what use case it serves. Future you will appreciate it.

Custom roles in Terraform give you precise, auditable access control. Every permission is visible in code, every change goes through review, and the principle of least privilege is easy to enforce when you can see exactly what each role allows.
