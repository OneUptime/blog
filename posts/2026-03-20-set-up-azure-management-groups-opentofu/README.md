# How to Set Up Azure Management Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Management Groups, Governance, Infrastructure as Code

Description: Learn how to create and configure Azure Management Groups with OpenTofu for hierarchical subscription governance and policy enforcement.

Azure Management Groups provide a governance hierarchy above subscriptions. Policies and Azure RBAC role assignments applied to a management group are inherited by child management groups, subscriptions, and resources below it. OpenTofu lets you define the management group hierarchy as code.

## Creating Management Groups

```hcl
# Root management group (every tenant has one automatically)

data "azurerm_management_group" "root" {
  name = var.tenant_id  # Root MG ID is the tenant ID
}

# Top-level management groups
resource "azurerm_management_group" "workloads" {
  display_name               = "Workloads"
  parent_management_group_id = data.azurerm_management_group.root.id
}

resource "azurerm_management_group" "platform" {
  display_name               = "Platform"
  parent_management_group_id = data.azurerm_management_group.root.id
}

resource "azurerm_management_group" "sandbox" {
  display_name               = "Sandbox"
  parent_management_group_id = data.azurerm_management_group.root.id
}

# Child management groups
resource "azurerm_management_group" "production" {
  display_name               = "Production"
  parent_management_group_id = azurerm_management_group.workloads.id
}

resource "azurerm_management_group" "nonprod" {
  display_name               = "NonProduction"
  parent_management_group_id = azurerm_management_group.workloads.id
}
```

## Assigning Subscriptions to Management Groups

```hcl
resource "azurerm_management_group_subscription_association" "production_sub" {
  management_group_id = azurerm_management_group.production.id
  subscription_id     = "/subscriptions/${var.production_subscription_id}"
}

resource "azurerm_management_group_subscription_association" "staging_sub" {
  management_group_id = azurerm_management_group.nonprod.id
  subscription_id     = "/subscriptions/${var.staging_subscription_id}"
}
```

## Assigning Azure Policies

```hcl
# Deny resource creation outside approved regions
resource "azurerm_management_group_policy_assignment" "allowed_locations" {
  name                 = "allowed-locations"
  management_group_id  = azurerm_management_group.workloads.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"
  display_name         = "Allowed Locations"
  description          = "Restrict resource creation to approved regions"

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastus", "eastus2", "westeurope", "northeurope"]
    }
  })
}
```

## Assigning RBAC at Management Group Level

```hcl
resource "azurerm_role_assignment" "platform_owner" {
  scope                = azurerm_management_group.platform.id
  role_definition_name = "Owner"
  principal_id         = var.platform_team_group_id
}

resource "azurerm_role_assignment" "workloads_reader" {
  scope                = azurerm_management_group.workloads.id
  role_definition_name = "Reader"
  principal_id         = var.all_teams_group_id
}
```

## Listing Subscriptions Under a Management Group

```hcl
data "azurerm_management_group" "workloads" {
  name = azurerm_management_group.workloads.name

  depends_on = [
    azurerm_management_group_subscription_association.production_sub,
    azurerm_management_group_subscription_association.staging_sub,
  ]
}

output "workloads_subscriptions" {
  value = data.azurerm_management_group.workloads.all_subscription_ids
}
```

## Conclusion

Azure Management Groups in OpenTofu create a governance hierarchy using `azurerm_management_group` resources. Assign subscriptions to groups with `azurerm_management_group_subscription_association`, apply policies at scale with `azurerm_management_group_policy_assignment`, and enforce RBAC at the group level to grant access across all subscriptions in the hierarchy simultaneously.
