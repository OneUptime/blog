# How to Use Terragrunt with Azure Multi-Subscription

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Azure, Infrastructure as Code, DevOps, Multi-Subscription, Cloud Infrastructure

Description: Learn how to structure Terragrunt for Azure multi-subscription deployments with separate configurations per subscription, resource group management, and shared state.

---

Managing Azure infrastructure across multiple subscriptions is a common pattern for organizations that want to isolate environments, teams, or workloads. Terragrunt makes this manageable by letting you define the subscription-specific configuration once and inherit it across all modules in that subscription.

This post walks through setting up a Terragrunt project that deploys to multiple Azure subscriptions.

## The Azure Multi-Subscription Model

In Azure, the equivalent of AWS accounts is subscriptions. A typical setup looks like:

- **Dev subscription**: Development and testing
- **Staging subscription**: Pre-production validation
- **Prod subscription**: Production workloads
- **Shared subscription**: Shared services (DNS, monitoring, hub networking)

Each subscription has its own subscription ID, and resources in different subscriptions are isolated by default.

## Directory Structure

Here is a directory structure designed for multi-subscription Azure deployments:

```text
infrastructure/
  modules/                            # Reusable Terraform modules
    vnet/
    aks/
    sql-database/
    app-service/
  live/
    root.hcl                          # Root Terragrunt config
    shared/
      subscription.hcl               # Shared subscription settings
      eastus/
        region.hcl
        dns-zones/
          terragrunt.hcl
        log-analytics/
          terragrunt.hcl
    dev/
      subscription.hcl               # Dev subscription settings
      eastus/
        region.hcl
        vnet/
          terragrunt.hcl
        aks/
          terragrunt.hcl
        sql-database/
          terragrunt.hcl
    staging/
      subscription.hcl
      eastus/
        region.hcl
        vnet/
          terragrunt.hcl
        aks/
          terragrunt.hcl
    prod/
      subscription.hcl
      eastus/
        region.hcl
        vnet/
          terragrunt.hcl
        aks/
          terragrunt.hcl
        sql-database/
          terragrunt.hcl
      westeurope/
        region.hcl
        vnet/
          terragrunt.hcl
        aks/
          terragrunt.hcl
```

## Subscription Configuration Files

Each subscription directory has a `subscription.hcl` file:

```hcl
# live/dev/subscription.hcl
locals {
  subscription_id   = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
  subscription_name = "dev"
  environment       = "dev"
  tenant_id         = "12345678-abcd-efgh-ijkl-123456789012"
}
```

```hcl
# live/prod/subscription.hcl
locals {
  subscription_id   = "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
  subscription_name = "prod"
  environment       = "prod"
  tenant_id         = "12345678-abcd-efgh-ijkl-123456789012"
}
```

Region files define the Azure region:

```hcl
# live/dev/eastus/region.hcl
locals {
  azure_region     = "eastus"
  azure_region_display = "East US"
}
```

## Root Configuration

The root `root.hcl` reads subscription and region configs to set up the provider and state backend:

```hcl
# live/root.hcl

locals {
  # Read subscription and region from the hierarchy
  sub_config    = read_terragrunt_config(find_in_parent_folders("subscription.hcl"))
  region_config = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  subscription_id = local.sub_config.locals.subscription_id
  environment     = local.sub_config.locals.environment
  tenant_id       = local.sub_config.locals.tenant_id
  azure_region    = local.region_config.locals.azure_region

  # State storage account naming (must be globally unique, max 24 chars)
  state_storage_account = "tfstate${substr(local.subscription_id, 0, 8)}"
  state_resource_group  = "rg-terraform-state"
  state_container       = "tfstate"
}

# Remote state in Azure Blob Storage
remote_state {
  backend = "azurerm"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    resource_group_name  = local.state_resource_group
    storage_account_name = local.state_storage_account
    container_name       = local.state_container
    key                  = "${path_relative_to_include()}/terraform.tfstate"
    subscription_id      = local.subscription_id
    tenant_id            = local.tenant_id
  }
}

# Generate the Azure provider
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "azurerm" {
  features {}

  subscription_id = "${local.subscription_id}"
  tenant_id       = "${local.tenant_id}"
}
EOF
}

# Common inputs for all modules
inputs = {
  environment     = local.environment
  azure_region    = local.azure_region
  subscription_id = local.subscription_id
}
```

## Module Configurations

Each module's `terragrunt.hcl` is minimal:

```hcl
# live/dev/eastus/vnet/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/vnet"
}

inputs = {
  vnet_name     = "vnet-dev-eastus"
  address_space = ["10.0.0.0/16"]

  subnets = {
    aks = {
      address_prefix = "10.0.0.0/20"
    }
    data = {
      address_prefix = "10.0.16.0/24"
    }
    appservice = {
      address_prefix = "10.0.17.0/24"
    }
  }

  resource_group_name = "rg-networking-dev-eastus"
}
```

For AKS with a VNet dependency:

```hcl
# live/dev/eastus/aks/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
}

dependency "vnet" {
  config_path = "../vnet"

  mock_outputs = {
    vnet_id    = "/subscriptions/mock/resourceGroups/mock/providers/Microsoft.Network/virtualNetworks/mock"
    subnet_ids = {
      aks = "/subscriptions/mock/resourceGroups/mock/providers/Microsoft.Network/virtualNetworks/mock/subnets/aks"
    }
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}

terraform {
  source = "../../../../modules/aks"
}

inputs = {
  cluster_name        = "aks-dev-eastus"
  resource_group_name = "rg-aks-dev-eastus"
  kubernetes_version  = "1.28"
  vnet_subnet_id      = dependency.vnet.outputs.subnet_ids["aks"]

  default_node_pool = {
    name       = "system"
    node_count = 2
    vm_size    = "Standard_D2s_v3"
  }
}
```

## Resource Group Management

In Azure, everything lives in a resource group. You can manage resource groups through Terragrunt in two ways.

### Option 1: Resource Group as Its Own Module

```hcl
# live/dev/eastus/resource-groups/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../../modules/resource-groups"
}

inputs = {
  resource_groups = {
    "rg-networking-dev-eastus" = { location = "eastus" }
    "rg-aks-dev-eastus"       = { location = "eastus" }
    "rg-data-dev-eastus"      = { location = "eastus" }
  }
}
```

### Option 2: Resource Group Created by Each Module

```hcl
# modules/vnet/main.tf

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.azure_region

  tags = var.tags
}

resource "azurerm_virtual_network" "this" {
  name                = var.vnet_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  address_space       = var.address_space
}
```

Option 1 gives you centralized control. Option 2 keeps modules self-contained. Most teams start with Option 2 for simplicity and move to Option 1 as the project grows.

## Cross-Subscription Dependencies

Sometimes resources in one subscription need to reference resources in another. For example, a hub-spoke networking model where the hub VNet is in the shared subscription:

```hcl
# live/dev/eastus/vnet-peering/terragrunt.hcl

include "root" {
  path = find_in_parent_folders("root.hcl")
}

# Reference the hub VNet in the shared subscription
dependency "hub_vnet" {
  config_path = "../../../shared/eastus/hub-vnet"

  mock_outputs = {
    vnet_id   = "/subscriptions/mock/resourceGroups/mock/providers/Microsoft.Network/virtualNetworks/hub"
    vnet_name = "vnet-hub-eastus"
  }
}

# Reference the spoke VNet in this subscription
dependency "spoke_vnet" {
  config_path = "../vnet"

  mock_outputs = {
    vnet_id   = "/subscriptions/mock/resourceGroups/mock/providers/Microsoft.Network/virtualNetworks/spoke"
    vnet_name = "vnet-dev-eastus"
  }
}

terraform {
  source = "../../../../modules/vnet-peering"
}

inputs = {
  hub_vnet_id    = dependency.hub_vnet.outputs.vnet_id
  hub_vnet_name  = dependency.hub_vnet.outputs.vnet_name
  spoke_vnet_id  = dependency.spoke_vnet.outputs.vnet_id
  spoke_vnet_name = dependency.spoke_vnet.outputs.vnet_name
}
```

The Terraform module for VNet peering needs a provider for each subscription:

```hcl
# modules/vnet-peering/main.tf

# This requires two provider instances - one for each subscription
# The providers are generated by Terragrunt based on the subscription context
```

For cross-subscription resources, you may need to generate multiple providers. Handle this in the module's `terragrunt.hcl`:

```hcl
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "azurerm" {
  features {}
  subscription_id = "${local.dev_subscription_id}"
  alias           = "spoke"
}

provider "azurerm" {
  features {}
  subscription_id = "${local.shared_subscription_id}"
  alias           = "hub"
}
EOF
}
```

## Service Principal per Subscription

In CI/CD pipelines, you typically use a service principal per subscription. Set this up with environment variables:

```hcl
# live/root.hcl

locals {
  sub_config = read_terragrunt_config(find_in_parent_folders("subscription.hcl"))
  environment = local.sub_config.locals.environment
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "azurerm" {
  features {}

  subscription_id = "${local.sub_config.locals.subscription_id}"
  tenant_id       = "${local.sub_config.locals.tenant_id}"

  # In CI, these come from environment variables:
  # ARM_CLIENT_ID, ARM_CLIENT_SECRET
}
EOF
}
```

In your CI/CD pipeline:

```yaml
# Azure DevOps pipeline example
variables:
  - group: terraform-dev-credentials  # contains ARM_CLIENT_ID, ARM_CLIENT_SECRET

steps:
  - script: |
      export ARM_CLIENT_ID=$(ARM_CLIENT_ID)
      export ARM_CLIENT_SECRET=$(ARM_CLIENT_SECRET)
      cd live/dev/eastus/aks
      terragrunt apply -auto-approve
```

## Conclusion

Azure multi-subscription Terragrunt follows the same fundamental pattern as multi-account AWS: directory hierarchy maps to organizational boundaries, config files at each level define context-specific values, and the root configuration wires everything together.

The key Azure-specific considerations are resource group management, the azurerm backend for state, and handling cross-subscription resources with multiple provider instances. Once those are in place, the rest of the Terragrunt patterns apply unchanged.

For the general approach to multi-environment organization, see [How to Organize Terragrunt for Multi-Environment Projects](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-terragrunt-for-multi-environment-projects/view).
