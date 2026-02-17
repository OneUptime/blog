# How to Implement Azure Verified Modules for Terraform in Enterprise Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Verified Modules, Enterprise, Infrastructure as Code, Best Practices, Governance

Description: Learn how to adopt Azure Verified Modules for Terraform to standardize enterprise Azure deployments with Microsoft-maintained, tested infrastructure modules.

---

Every organization that uses Terraform at scale eventually faces the same problem: module sprawl. Different teams write their own modules for common resources like virtual networks, storage accounts, and AKS clusters. The implementations diverge over time, security configurations drift, and you end up with fifteen different ways to create a Key Vault across the company.

Azure Verified Modules (AVM) addresses this by providing a library of Terraform modules that Microsoft develops, maintains, and tests. These modules follow consistent patterns, implement security best practices by default, and cover the most common Azure resources. For enterprises looking to standardize their infrastructure code, AVM offers a solid foundation.

## What Are Azure Verified Modules

Azure Verified Modules is an initiative by Microsoft to provide official, high-quality Terraform (and Bicep) modules for Azure resources. Each module:

- Is published to the Terraform Registry under the `Azure` namespace
- Follows a consistent interface pattern across all modules
- Includes comprehensive documentation and examples
- Has automated tests that run against real Azure resources
- Implements Azure security best practices as defaults
- Supports the most common deployment scenarios without customization

The modules are open source and available on GitHub. You can use them as-is, fork them, or use them as reference implementations for your own modules.

## Finding and Using AVM Modules

AVM modules are published to the Terraform Registry with a consistent naming convention: `Azure/avm-res-<provider>-<resource>/azurerm`.

```hcl
# Example: Using the AVM module for a Virtual Network
module "vnet" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "~> 0.4"

  name                = "vnet-prod-eastus2"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"

  address_space = ["10.0.0.0/16"]

  subnets = {
    web = {
      name             = "snet-web"
      address_prefixes = ["10.0.1.0/24"]
    }
    app = {
      name             = "snet-app"
      address_prefixes = ["10.0.2.0/24"]
    }
    data = {
      name             = "snet-data"
      address_prefixes = ["10.0.3.0/24"]
      service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
    }
  }

  tags = {
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}
```

## The AVM Interface Pattern

All AVM modules follow a consistent interface that makes them predictable to use. Understanding this pattern is key to adopting them effectively.

Every AVM resource module accepts these common parameters:

```hcl
# Common AVM interface parameters
module "example_resource" {
  source  = "Azure/avm-res-<type>/azurerm"
  version = "~> x.x"

  # Required: Resource name
  name = "resource-name"

  # Required: Resource group
  resource_group_name = "rg-example"

  # Required: Azure region
  location = "eastus2"

  # Optional: Tags applied to the resource
  tags = {}

  # Optional: Managed identity configuration
  managed_identities = {
    system_assigned = true
    user_assigned_resource_ids = []
  }

  # Optional: Diagnostic settings
  diagnostic_settings = {
    main = {
      workspace_resource_id = "/subscriptions/.../workspaces/log-analytics"
    }
  }

  # Optional: Role assignments
  role_assignments = {
    reader = {
      role_definition_id_or_name = "Reader"
      principal_id               = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }

  # Optional: Resource locks
  lock = {
    kind = "CanNotDelete"
    name = "protect-resource"
  }

  # Optional: Private endpoints
  private_endpoints = {
    pe1 = {
      subnet_resource_id = "/subscriptions/.../subnets/snet-pe"
    }
  }
}
```

This consistency means that once you learn how to configure diagnostic settings, locks, or private endpoints for one AVM module, you know how to do it for all of them.

## Setting Up an Enterprise Module Registry

For enterprises, the recommended approach is to create a curated catalog of approved AVM modules with pinned versions. This gives you control over which versions your teams can use.

```hcl
# modules/approved-modules.tf - Central registry of approved module versions

# Approved AVM module versions for the organization
locals {
  avm_versions = {
    virtual_network  = "0.4.0"
    storage_account  = "0.2.0"
    key_vault        = "0.7.0"
    kubernetes        = "0.3.0"
    postgresql       = "0.1.0"
    app_service      = "0.5.0"
  }
}
```

Create wrapper modules that pin to your approved versions and add organization-specific defaults.

```hcl
# modules/networking/main.tf - Organization wrapper for the VNet AVM module

variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "address_space" {
  type = list(string)
}

variable "subnets" {
  type = map(object({
    name              = string
    address_prefixes  = list(string)
    service_endpoints = optional(list(string), [])
  }))
}

variable "environment" {
  type = string
}

# Use the AVM module with organization defaults
module "vnet" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "0.4.0"   # Pinned to approved version

  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space
  subnets             = var.subnets

  # Organization-wide defaults
  diagnostic_settings = {
    central = {
      workspace_resource_id = data.azurerm_log_analytics_workspace.central.id
    }
  }

  lock = var.environment == "prod" ? {
    kind = "CanNotDelete"
    name = "production-lock"
  } : null

  tags = merge(var.tags, {
    ManagedBy   = "terraform"
    Module      = "avm-network"
    Environment = var.environment
  })
}
```

## Real-World Deployment: AKS with AVM

Here is a practical example deploying an AKS cluster using AVM modules for the cluster itself and its dependencies.

```hcl
# Production AKS deployment using AVM modules

# Virtual Network using AVM
module "aks_vnet" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "~> 0.4"

  name                = "vnet-aks-prod"
  resource_group_name = azurerm_resource_group.aks.name
  location            = "eastus2"
  address_space       = ["10.0.0.0/16"]

  subnets = {
    aks_system = {
      name             = "snet-aks-system"
      address_prefixes = ["10.0.0.0/22"]
    }
    aks_user = {
      name             = "snet-aks-user"
      address_prefixes = ["10.0.4.0/22"]
    }
  }

  tags = local.tags
}

# Log Analytics using AVM
module "log_analytics" {
  source  = "Azure/avm-res-operationalinsights-workspace/azurerm"
  version = "~> 0.3"

  name                = "log-aks-prod"
  resource_group_name = azurerm_resource_group.aks.name
  location            = "eastus2"

  log_analytics_workspace_retention_in_days = 30
  log_analytics_workspace_sku               = "PerGB2018"

  tags = local.tags
}

# Container Registry using AVM
module "acr" {
  source  = "Azure/avm-res-containerregistry-registry/azurerm"
  version = "~> 0.2"

  name                = "craksprod${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.aks.name
  location            = "eastus2"

  sku = "Premium"

  # Enable geo-replication for the registry
  georeplications = {
    westus2 = {
      location                = "westus2"
      zone_redundancy_enabled = true
    }
  }

  # Private endpoint for secure access
  private_endpoints = {
    pe_acr = {
      subnet_resource_id = module.aks_vnet.subnets["aks_system"].resource_id
    }
  }

  tags = local.tags
}

# AKS Cluster using AVM
module "aks" {
  source  = "Azure/avm-res-containerservice-managedcluster/azurerm"
  version = "~> 0.3"

  name                = "aks-prod"
  resource_group_name = azurerm_resource_group.aks.name
  location            = "eastus2"

  # Network configuration
  kubernetes_version = "1.28"
  sku_tier           = "Standard"   # Uptime SLA

  default_node_pool = {
    name                = "system"
    vm_size             = "Standard_D4s_v5"
    node_count          = 3
    vnet_subnet_id      = module.aks_vnet.subnets["aks_system"].resource_id
    zones               = ["1", "2", "3"]
    os_disk_size_gb     = 128
    os_disk_type        = "Ephemeral"
    max_pods            = 50
  }

  # Managed identity
  managed_identities = {
    system_assigned = true
  }

  # Monitoring
  diagnostic_settings = {
    main = {
      workspace_resource_id = module.log_analytics.resource_id
    }
  }

  tags = local.tags
}
```

## Governance with Sentinel Policies

Use HashiCorp Sentinel or Open Policy Agent (OPA) to enforce that teams use AVM modules instead of writing their own.

```python
# sentinel/require-avm-modules.sentinel
# Enforce that all Azure resource modules come from the AVM registry

import "tfplan/v2" as tfplan

# List of approved AVM module prefixes
approved_sources = [
    "Azure/avm-res-",
    "Azure/avm-ptn-",
]

# Check all module calls
module_calls = filter tfplan.module_calls as _, calls {
    # Find modules that provision Azure resources
    any calls as call {
        call.source matches "(.*)azurerm(.*)"
    }
}

# Verify each module comes from an approved AVM source
violations = filter module_calls as address, calls {
    not any approved_sources as prefix {
        calls[0].source starts_with prefix
    }
}

main = rule {
    length(violations) is 0
}
```

## Testing AVM Modules Locally

Before using an AVM module in production, test it in an isolated environment.

```bash
# Clone the AVM module repository for local testing
git clone https://github.com/Azure/terraform-azurerm-avm-res-network-virtualnetwork.git
cd terraform-azurerm-avm-res-network-virtualnetwork

# Run the module's built-in tests
cd tests
go test -v -timeout 60m

# Or deploy an example manually
cd ../examples/basic
terraform init
terraform plan
terraform apply
```

## Migration Strategy

If you have existing Terraform code and want to migrate to AVM modules, follow this approach:

1. **Inventory** - List all the Azure resources your Terraform code manages
2. **Map to AVM** - Check which resources have AVM module equivalents
3. **Start with new projects** - Use AVM modules for all new infrastructure
4. **Migrate incrementally** - Replace existing resource blocks with AVM modules one at a time using `terraform state mv` to avoid recreation
5. **Add wrappers** - Create organization wrapper modules around AVM for consistent defaults

```bash
# Example: Migrate an existing VNet to an AVM module
# Step 1: Import the existing resource into the AVM module state path
terraform state mv \
  azurerm_virtual_network.main \
  module.vnet.azurerm_virtual_network.this

# Step 2: Import subnets
terraform state mv \
  azurerm_subnet.web \
  'module.vnet.azurerm_subnet.this["web"]'

# Step 3: Plan to verify no changes
terraform plan
```

## Wrapping Up

Azure Verified Modules provide enterprise-ready, Microsoft-maintained Terraform modules that enforce security best practices and consistent interfaces. Adopting them reduces module sprawl, improves security posture, and lets your platform team focus on higher-level concerns instead of maintaining basic resource modules. Start by using AVM for new projects, create organization wrappers with your defaults, and migrate existing code incrementally. The consistent interface across all AVM modules means the investment in learning one module pays off across the entire catalog.
