# How to Create Azure Management Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Management Groups, Governance, Infrastructure as Code, Azure Policy, Landing Zone

Description: Learn how to create and organize Azure Management Groups with Terraform to build a hierarchical governance structure for your subscriptions and policies.

---

As your Azure footprint grows past a handful of subscriptions, you need a way to organize them and apply policies consistently. Azure Management Groups create a hierarchy above subscriptions where you can assign policies, access controls, and budgets that cascade down to every subscription beneath them. Think of them as folders for your subscriptions.

This guide walks through building a management group hierarchy with Terraform, applying policies at the right levels, and following the Azure Landing Zone patterns.

## The Management Group Hierarchy

Every Azure tenant has a root management group at the top. Below that, you create a tree structure that reflects your organizational needs. Here is a common pattern based on the Azure Cloud Adoption Framework:

```
Root Management Group (Tenant)
  -> Platform
    -> Identity
    -> Connectivity
    -> Management
  -> Workloads
    -> Production
    -> Non-Production
  -> Sandbox
  -> Decommissioned
```

Policies assigned to a parent group apply to all children. If you assign a "require tags" policy to the Workloads group, both Production and Non-Production subscriptions inherit it.

## Creating the Top-Level Structure

Let's build this hierarchy in Terraform:

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

# Get the root management group (your tenant root)
data "azurerm_management_group" "root" {
  display_name = "Tenant Root Group"
}

# Top-level management groups
resource "azurerm_management_group" "platform" {
  display_name               = "Platform"
  parent_management_group_id = data.azurerm_management_group.root.id

  # Optional: explicit name (otherwise Azure generates a GUID)
  name = "mg-platform"
}

resource "azurerm_management_group" "workloads" {
  display_name               = "Workloads"
  parent_management_group_id = data.azurerm_management_group.root.id
  name                       = "mg-workloads"
}

resource "azurerm_management_group" "sandbox" {
  display_name               = "Sandbox"
  parent_management_group_id = data.azurerm_management_group.root.id
  name                       = "mg-sandbox"
}

resource "azurerm_management_group" "decommissioned" {
  display_name               = "Decommissioned"
  parent_management_group_id = data.azurerm_management_group.root.id
  name                       = "mg-decommissioned"
}
```

## Creating Child Management Groups

Now add the child groups under Platform and Workloads:

```hcl
# Platform child groups
resource "azurerm_management_group" "identity" {
  display_name               = "Identity"
  parent_management_group_id = azurerm_management_group.platform.id
  name                       = "mg-platform-identity"
}

resource "azurerm_management_group" "connectivity" {
  display_name               = "Connectivity"
  parent_management_group_id = azurerm_management_group.platform.id
  name                       = "mg-platform-connectivity"
}

resource "azurerm_management_group" "management" {
  display_name               = "Management"
  parent_management_group_id = azurerm_management_group.platform.id
  name                       = "mg-platform-management"
}

# Workload child groups
resource "azurerm_management_group" "production" {
  display_name               = "Production"
  parent_management_group_id = azurerm_management_group.workloads.id
  name                       = "mg-workloads-production"
}

resource "azurerm_management_group" "non_production" {
  display_name               = "Non-Production"
  parent_management_group_id = azurerm_management_group.workloads.id
  name                       = "mg-workloads-non-production"
}
```

## Assigning Subscriptions to Management Groups

Place subscriptions into the appropriate management groups:

```hcl
# Move the connectivity subscription into the Connectivity management group
resource "azurerm_management_group_subscription_association" "connectivity" {
  management_group_id = azurerm_management_group.connectivity.id
  subscription_id     = "/subscriptions/${var.connectivity_subscription_id}"
}

# Move the identity subscription into the Identity management group
resource "azurerm_management_group_subscription_association" "identity" {
  management_group_id = azurerm_management_group.identity.id
  subscription_id     = "/subscriptions/${var.identity_subscription_id}"
}

# Move production workload subscriptions into the Production management group
resource "azurerm_management_group_subscription_association" "prod_workloads" {
  for_each = toset(var.production_subscription_ids)

  management_group_id = azurerm_management_group.production.id
  subscription_id     = "/subscriptions/${each.value}"
}
```

## Applying Policies at Management Group Level

The real power of management groups is policy inheritance. Assign policies at the appropriate level:

```hcl
# Deny creation of resources in unapproved regions - apply to all workloads
resource "azurerm_management_group_policy_assignment" "allowed_locations" {
  name                 = "allowed-locations"
  management_group_id  = azurerm_management_group.workloads.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c"

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastus", "westus2", "centralus"]
    }
  })
}

# Require tags on resource groups - apply to production only
resource "azurerm_management_group_policy_assignment" "require_env_tag" {
  name                 = "require-env-tag"
  management_group_id  = azurerm_management_group.production.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025"

  parameters = jsonencode({
    tagName = {
      value = "environment"
    }
  })
}

# Disable public IP creation in connectivity subscription
resource "azurerm_management_group_policy_assignment" "no_public_ip" {
  name                 = "deny-public-ip"
  management_group_id  = azurerm_management_group.production.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/83a86a26-fd1f-447c-b59d-e51f44264114"
}
```

## RBAC at Management Group Level

Assign roles at the management group level for broad access control:

```hcl
# Platform team gets Contributor on the Platform management group
resource "azurerm_role_assignment" "platform_team" {
  scope                = azurerm_management_group.platform.id
  role_definition_name = "Contributor"
  principal_id         = var.platform_team_group_id
}

# Security team gets Reader on everything
resource "azurerm_role_assignment" "security_reader" {
  scope                = data.azurerm_management_group.root.id
  role_definition_name = "Reader"
  principal_id         = var.security_team_group_id
}

# Development team gets Contributor on non-production only
resource "azurerm_role_assignment" "dev_team" {
  scope                = azurerm_management_group.non_production.id
  role_definition_name = "Contributor"
  principal_id         = var.dev_team_group_id
}
```

## Dynamic Hierarchy with for_each

For organizations with many teams, you can build parts of the hierarchy dynamically:

```hcl
# Define workload teams and their subscriptions
variable "workload_teams" {
  description = "Map of team names to their subscription IDs"
  type = map(object({
    production_sub_id     = string
    non_production_sub_id = string
  }))
  default = {
    "team-alpha" = {
      production_sub_id     = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      non_production_sub_id = "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
    }
    "team-beta" = {
      production_sub_id     = "kkkkkkkk-llll-mmmm-nnnn-oooooooooooo"
      non_production_sub_id = "pppppppp-qqqq-rrrr-ssss-tttttttttttt"
    }
  }
}

# Create team-specific management groups under Production
resource "azurerm_management_group" "team_prod" {
  for_each = var.workload_teams

  display_name               = "${each.key}-prod"
  parent_management_group_id = azurerm_management_group.production.id
  name                       = "mg-prod-${each.key}"
}

# Associate team subscriptions
resource "azurerm_management_group_subscription_association" "team_prod_subs" {
  for_each = var.workload_teams

  management_group_id = azurerm_management_group.team_prod[each.key].id
  subscription_id     = "/subscriptions/${each.value.production_sub_id}"
}
```

## Outputs

Export the management group IDs for use in other configurations:

```hcl
# outputs.tf
output "management_group_ids" {
  description = "Map of management group names to IDs"
  value = {
    platform       = azurerm_management_group.platform.id
    connectivity   = azurerm_management_group.connectivity.id
    identity       = azurerm_management_group.identity.id
    management     = azurerm_management_group.management.id
    workloads      = azurerm_management_group.workloads.id
    production     = azurerm_management_group.production.id
    non_production = azurerm_management_group.non_production.id
    sandbox        = azurerm_management_group.sandbox.id
  }
}
```

## Best Practices

**Keep the hierarchy shallow.** Azure supports up to 6 levels of management groups. In practice, 3-4 levels is plenty. Deeper hierarchies are harder to understand and debug.

**Do not assign policies at the root.** Policies at the root affect everything, including platform subscriptions. Start at the appropriate level - usually one level below root.

**Use display names that match your organization.** Management group names are internal identifiers (often GUIDs), but display names show up in the portal. Make them descriptive.

**Plan before you build.** Restructuring a management group hierarchy after subscriptions and policies are in place is painful. Sketch out your hierarchy, get stakeholder buy-in, then implement.

**Protect the hierarchy with locks.** Consider using `lifecycle { prevent_destroy = true }` on your management groups to prevent accidental deletion.

## Wrapping Up

Azure Management Groups provide the organizational backbone for multi-subscription environments. Build a clear hierarchy that reflects your organizational structure, assign policies at the right level, and use RBAC inheritance to simplify access management. With Terraform managing the whole structure, your governance configuration becomes version-controlled and auditable, which is exactly what you need as your Azure environment scales.

For related reading, see [How to Handle Azure Subscription Management in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-azure-subscription-management-in-terraform/view).
