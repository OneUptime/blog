# How to Handle Azure Subscription Management in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Subscription Management, Infrastructure as Code, Multi-Subscription, Landing Zone

Description: Learn how to manage Azure subscriptions in Terraform, including multi-subscription deployments, subscription vending, and organizing resources across subscriptions.

---

Most teams start with a single Azure subscription and things work fine until they do not. As your organization grows, you end up with development, staging, and production workloads all in one subscription, competing for quota and sharing a flat permissions model. The solution is multiple subscriptions, and Terraform is the right tool to manage deployments across all of them.

This guide covers how to work with multiple Azure subscriptions in Terraform, from basic multi-subscription provider configuration to subscription vending automation.

## Why Multiple Subscriptions

Before getting into the code, here is why organizations use multiple subscriptions:

- **Blast radius isolation**: A misconfiguration in the dev subscription does not affect production
- **Cost tracking**: Each subscription gets its own billing, making cost allocation straightforward
- **Quota management**: Subscriptions have independent resource quotas
- **Compliance boundaries**: Some regulations require workload isolation at the subscription level
- **RBAC simplification**: Subscription-level roles are easier to manage than resource-group-level roles across hundreds of groups

A typical enterprise pattern uses separate subscriptions for identity, connectivity (hub networking), management (monitoring and logging), and workloads (one per application or team).

## Configuring Multiple Providers

Terraform uses provider aliases to work with multiple subscriptions simultaneously:

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

# Default provider - management subscription
provider "azurerm" {
  features {}
  subscription_id = var.management_subscription_id
}

# Provider alias for the connectivity (hub) subscription
provider "azurerm" {
  alias           = "connectivity"
  features {}
  subscription_id = var.connectivity_subscription_id
}

# Provider alias for the production workload subscription
provider "azurerm" {
  alias           = "production"
  features {}
  subscription_id = var.production_subscription_id
}

# Provider alias for the development subscription
provider "azurerm" {
  alias           = "development"
  features {}
  subscription_id = var.development_subscription_id
}
```

```hcl
# variables.tf
variable "management_subscription_id" {
  description = "Subscription ID for management resources"
  type        = string
}

variable "connectivity_subscription_id" {
  description = "Subscription ID for hub networking"
  type        = string
}

variable "production_subscription_id" {
  description = "Subscription ID for production workloads"
  type        = string
}

variable "development_subscription_id" {
  description = "Subscription ID for development workloads"
  type        = string
}
```

## Using Provider Aliases in Resources

Specify the provider alias on each resource to control which subscription it deploys to:

```hcl
# Hub virtual network in the connectivity subscription
resource "azurerm_resource_group" "hub" {
  provider = azurerm.connectivity
  name     = "rg-hub-networking"
  location = "East US"
}

resource "azurerm_virtual_network" "hub" {
  provider            = azurerm.connectivity
  name                = "vnet-hub-eastus"
  location            = azurerm_resource_group.hub.location
  resource_group_name = azurerm_resource_group.hub.name
  address_space       = ["10.0.0.0/16"]
}

# Production spoke virtual network in the production subscription
resource "azurerm_resource_group" "prod_networking" {
  provider = azurerm.production
  name     = "rg-networking-prod"
  location = "East US"
}

resource "azurerm_virtual_network" "prod_spoke" {
  provider            = azurerm.production
  name                = "vnet-spoke-prod-eastus"
  location            = azurerm_resource_group.prod_networking.location
  resource_group_name = azurerm_resource_group.prod_networking.name
  address_space       = ["10.1.0.0/16"]
}
```

## Cross-Subscription VNet Peering

A common scenario is peering a spoke VNet in a workload subscription with a hub VNet in the connectivity subscription:

```hcl
# Peering from hub to prod spoke (in the connectivity subscription)
resource "azurerm_virtual_network_peering" "hub_to_prod" {
  provider                  = azurerm.connectivity
  name                      = "peer-hub-to-prod"
  resource_group_name       = azurerm_resource_group.hub.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.prod_spoke.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = true
}

# Peering from prod spoke to hub (in the production subscription)
resource "azurerm_virtual_network_peering" "prod_to_hub" {
  provider                  = azurerm.production
  name                      = "peer-prod-to-hub"
  resource_group_name       = azurerm_resource_group.prod_networking.name
  virtual_network_name      = azurerm_virtual_network.prod_spoke.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  use_remote_gateways          = true
}
```

Both sides of the peering need to be configured, and each side uses the provider alias for its respective subscription.

## Using Data Sources Across Subscriptions

You can read resources from one subscription and reference them in another:

```hcl
# Read the Log Analytics workspace from the management subscription
data "azurerm_log_analytics_workspace" "central" {
  provider            = azurerm
  name                = "law-central-prod"
  resource_group_name = "rg-monitoring"
}

# Send diagnostic logs from the production subscription to the central workspace
resource "azurerm_monitor_diagnostic_setting" "prod_vnet" {
  provider                   = azurerm.production
  name                       = "diag-vnet-prod"
  target_resource_id         = azurerm_virtual_network.prod_spoke.id
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.central.id

  enabled_log {
    category = "VMProtectionAlerts"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Subscription Vending with Terraform

For organizations that create subscriptions frequently, you can automate subscription creation using the Azure subscription resource:

```hcl
# Create a new subscription under an enrollment account
resource "azurerm_subscription" "workload" {
  subscription_name = "sub-app-team-alpha-prod"
  billing_scope_id  = "/providers/Microsoft.Billing/billingAccounts/${var.billing_account}/enrollmentAccounts/${var.enrollment_account}"

  tags = {
    team        = "alpha"
    environment = "production"
    cost_center = "CC-1234"
  }
}

# Use the new subscription ID with a provider alias
provider "azurerm" {
  alias           = "new_workload"
  features {}
  subscription_id = azurerm_subscription.workload.subscription_id
}

# Deploy baseline resources to the new subscription
resource "azurerm_resource_group" "baseline" {
  provider = azurerm.new_workload
  name     = "rg-baseline"
  location = "East US"
}
```

## Organizing State Across Subscriptions

For large deployments, split your Terraform state by subscription or layer:

```hcl
# Backend configuration for the connectivity layer
# connectivity/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "connectivity.tfstate"
  }
}
```

```hcl
# Backend configuration for the production workload
# production/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

Use `terraform_remote_state` data sources to read outputs from other state files when you need cross-layer references:

```hcl
# In the production configuration, read outputs from connectivity
data "terraform_remote_state" "connectivity" {
  backend = "azurerm"

  config = {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "connectivity.tfstate"
  }
}

# Use the hub VNet ID from the connectivity state
resource "azurerm_virtual_network_peering" "prod_to_hub" {
  provider                  = azurerm.production
  name                      = "peer-prod-to-hub"
  resource_group_name       = azurerm_resource_group.prod_networking.name
  virtual_network_name      = azurerm_virtual_network.prod_spoke.name
  remote_virtual_network_id = data.terraform_remote_state.connectivity.outputs.hub_vnet_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}
```

## Managing Subscription-Level Policies

Apply Azure Policy at the subscription level to enforce governance:

```hcl
# Require tags on all resource groups in the production subscription
resource "azurerm_subscription_policy_assignment" "require_tags" {
  provider             = azurerm.production
  name                 = "require-rg-tags"
  subscription_id      = data.azurerm_subscription.production.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025"

  parameters = jsonencode({
    tagName = {
      value = "environment"
    }
  })
}
```

## Best Practices

**Use separate state files per subscription.** Putting everything in one state file creates a bottleneck and increases the blast radius of a bad apply.

**Authenticate with a service principal that has access to all subscriptions.** Your CI/CD pipeline needs a single identity that can deploy across subscriptions. Use management group-level role assignments for this.

**Use consistent naming across subscriptions.** Prefix subscription names with their purpose: `sub-connectivity-prod`, `sub-workload-app1-prod`, `sub-management-prod`.

**Limit who can create subscriptions.** Subscription vending should go through Terraform, not manual portal clicks. Control access to the enrollment account.

## Wrapping Up

Managing multiple Azure subscriptions with Terraform is about provider aliases, state separation, and cross-subscription references. Start with a clear subscription topology, configure provider aliases for each subscription, and split your state files by layer. The initial setup takes more effort than a single-subscription deployment, but the isolation, security, and cost management benefits are worth it as your infrastructure grows.

For more on organizational hierarchy, see [How to Create Azure Management Groups in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-management-groups-in-terraform/view).
