# How to Use Azure CAF Module for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Cloud Adoption Framework, CAF, Landing Zone, Infrastructure as Code, Governance

Description: Learn how to use the Azure Cloud Adoption Framework (CAF) Terraform module to deploy enterprise-scale landing zones with built-in governance and best practices.

---

Building an enterprise Azure environment from scratch is a massive undertaking. You need management groups, subscriptions, networking, identity, policies, monitoring, and security controls - all wired together correctly. The Azure Cloud Adoption Framework (CAF) for Terraform provides pre-built modules that implement Microsoft's recommended architecture patterns, saving you months of design and implementation work.

This guide covers how to use the Azure CAF Terraform modules, starting with the landing zone concept and working through practical deployment steps.

## What is the Cloud Adoption Framework

The CAF is Microsoft's framework for cloud adoption that covers strategy, planning, migration, governance, and management. For infrastructure, the key piece is the Enterprise-Scale Landing Zone architecture, which defines:

- A management group hierarchy for organizing subscriptions
- Hub-and-spoke or Virtual WAN networking
- Centralized logging and monitoring
- Azure Policy for governance
- Identity and access management patterns
- Security baselines

The CAF Terraform modules translate this architecture into reusable Terraform code.

## The CAF Module Ecosystem

There are several CAF-related Terraform modules:

1. **azurerm-caf-enterprise-scale**: The main module for deploying the Enterprise-Scale architecture. Manages management groups, policies, and role assignments.
2. **aztfmod/azurecaf**: A naming provider that generates Azure resource names following CAF conventions.
3. **Azure/caf-enterprise-scale**: Community modules for specific landing zone components.

This guide focuses primarily on the enterprise-scale module and the CAF naming provider.

## Getting Started with the Enterprise-Scale Module

The enterprise-scale module creates the foundation of your Azure environment:

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

# Get the current client configuration for the tenant ID
data "azurerm_client_config" "current" {}

# Deploy the Enterprise-Scale Landing Zone
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  # Default location for resources
  default_location = "eastus"

  # Use your Azure AD tenant root group
  root_parent_id = data.azurerm_client_config.current.tenant_id

  # Custom name for the top-level management group
  root_id   = "contoso"
  root_name = "Contoso"

  # Enable the core landing zone management groups
  deploy_core_landing_zones = true
}
```

This single module call creates the entire management group hierarchy:

```text
Contoso (root)
  -> Platform
    -> Identity
    -> Connectivity
    -> Management
  -> Landing Zones
    -> Corp (for corporate connected workloads)
    -> Online (for internet-facing workloads)
  -> Sandboxes
  -> Decommissioned
```

## Customizing the Management Group Hierarchy

Override the default structure to match your organization:

```hcl
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location = "eastus"
  root_parent_id   = data.azurerm_client_config.current.tenant_id
  root_id          = "contoso"
  root_name        = "Contoso"

  deploy_core_landing_zones = true

  # Add custom landing zones
  custom_landing_zones = {
    # Team-specific landing zones under Corp
    "${var.root_id}-team-alpha" = {
      display_name               = "Team Alpha"
      parent_management_group_id = "${var.root_id}-landing-zones-corp"
      subscription_ids           = [var.team_alpha_sub_id]
      archetype_config = {
        archetype_id = "default_empty"
        parameters   = {}
        access_control = {}
      }
    }

    # A regulated workload landing zone
    "${var.root_id}-regulated" = {
      display_name               = "Regulated Workloads"
      parent_management_group_id = "${var.root_id}-landing-zones"
      subscription_ids           = []
      archetype_config = {
        archetype_id = "default_empty"
        parameters   = {}
        access_control = {}
      }
    }
  }
}
```

## Deploying Connectivity (Hub Networking)

Enable the connectivity resources for hub-and-spoke networking:

```hcl
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location = "eastus"
  root_parent_id   = data.azurerm_client_config.current.tenant_id
  root_id          = "contoso"
  root_name        = "Contoso"

  deploy_core_landing_zones   = true
  deploy_connectivity_resources = true

  # Subscription ID for the connectivity subscription
  subscription_id_connectivity = var.connectivity_subscription_id

  # Hub networking configuration
  configure_connectivity_resources = {
    settings = {
      hub_networks = [
        {
          enabled = true
          config = {
            location                  = "eastus"
            address_space             = ["10.0.0.0/16"]
            link_to_ddos_protection_plan = false

            # Azure Firewall configuration
            azure_firewall = {
              enabled = true
              config = {
                address_prefix                = "10.0.1.0/24"
                enable_dns_proxy              = true
                sku_tier                      = "Standard"
                threat_intel_mode             = "Deny"
              }
            }

            # VPN Gateway
            spoke_virtual_network_resource_ids = []
            virtual_network_gateway = {
              enabled = false
            }
          }
        }
      ]

      # DNS configuration
      dns = {
        enabled = true
        config = {
          location = "eastus"
          enable_private_link_by_service = {
            azure_sql_database = true
            azure_storage_blob = true
            azure_key_vault    = true
          }
        }
      }
    }
  }
}
```

## Deploying Management Resources

Enable centralized management resources like Log Analytics and Automation:

```hcl
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location = "eastus"
  root_parent_id   = data.azurerm_client_config.current.tenant_id
  root_id          = "contoso"
  root_name        = "Contoso"

  deploy_core_landing_zones     = true
  deploy_management_resources   = true

  # Subscription ID for the management subscription
  subscription_id_management = var.management_subscription_id

  configure_management_resources = {
    settings = {
      log_analytics = {
        enabled = true
        config = {
          retention_in_days                                 = 30
          enable_monitoring_for_arc                         = true
          enable_monitoring_for_vm                          = true
          enable_monitoring_for_vmss                        = true
          enable_sentinel                                   = true
        }
      }
      security_center = {
        enabled = true
        config = {
          email_security_contact = "security@contoso.com"
        }
      }
    }
  }
}
```

## Using the CAF Naming Provider

The `azurecaf` naming provider generates resource names that follow CAF conventions:

```hcl
terraform {
  required_providers {
    azurecaf = {
      source  = "aztfmod/azurecaf"
      version = "~> 1.2"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Generate names for multiple resource types
resource "azurecaf_name" "rg" {
  name          = "webapi"
  resource_type = "azurerm_resource_group"
  prefixes      = ["contoso"]
  suffixes      = ["prod", "eastus"]
  clean_input   = true
}

resource "azurecaf_name" "storage" {
  name          = "webapi"
  resource_type = "azurerm_storage_account"
  prefixes      = ["contoso"]
  suffixes      = ["prod"]
  clean_input   = true
}

resource "azurecaf_name" "keyvault" {
  name          = "webapi"
  resource_type = "azurerm_key_vault"
  prefixes      = ["contoso"]
  suffixes      = ["prod"]
  clean_input   = true
}

# Use the generated names
resource "azurerm_resource_group" "main" {
  name     = azurecaf_name.rg.result
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = azurecaf_name.storage.result
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Policy Assignments

The enterprise-scale module comes with built-in policy assignments. You can also customize them:

```hcl
module "enterprise_scale" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location = "eastus"
  root_parent_id   = data.azurerm_client_config.current.tenant_id
  root_id          = "contoso"
  root_name        = "Contoso"

  deploy_core_landing_zones = true

  # Customize archetype configuration to adjust policies
  archetype_config_overrides = {
    root = {
      archetype_id = "es_root"
      parameters = {
        # Customize the allowed locations policy
        Deny-Resource-Locations = {
          listOfAllowedLocations = ["eastus", "westus2", "centralus"]
        }
        Deny-RSG-Locations = {
          listOfAllowedLocations = ["eastus", "westus2", "centralus"]
        }
      }
      access_control = {}
    }
  }
}
```

## Phased Deployment Strategy

Do not try to deploy everything at once. Follow this order:

```hcl
# Phase 1: Core management groups and policies
module "enterprise_scale_core" {
  source  = "Azure/caf-enterprise-scale/azurerm"
  version = "~> 5.0"

  default_location              = "eastus"
  root_parent_id                = data.azurerm_client_config.current.tenant_id
  root_id                       = "contoso"
  root_name                     = "Contoso"
  deploy_core_landing_zones     = true
  deploy_connectivity_resources = false
  deploy_management_resources   = false
}

# Phase 2: Add management resources (after core is stable)
# Phase 3: Add connectivity resources
# Phase 4: Deploy workload landing zones
```

## Outputs

The module exposes many useful outputs:

```hcl
output "management_group_ids" {
  description = "Map of management group resource IDs"
  value       = module.enterprise_scale.azurerm_management_group
}

output "policy_assignment_ids" {
  description = "Map of policy assignment resource IDs"
  value       = module.enterprise_scale.azurerm_management_group_policy_assignment
}
```

## Best Practices

**Read the CAF documentation first.** Understand the architecture before deploying the module. The module implements an opinionated design that may not fit every organization.

**Start with deploy_core_landing_zones only.** Get the management group hierarchy and policies right before adding networking and management resources.

**Use the module's built-in policies.** The enterprise-scale module includes a comprehensive set of Azure Policies. Customize parameters rather than replacing policies.

**Version pin the module.** The enterprise-scale module has breaking changes between major versions. Pin to a specific version and upgrade deliberately.

**Test in a non-production tenant.** If possible, test the landing zone deployment in a separate Azure AD tenant before applying it to your production tenant.

**Keep the configuration DRY.** Use variables for subscription IDs, locations, and other values that change between deployments.

## Wrapping Up

The Azure CAF Terraform modules accelerate enterprise Azure deployments by providing pre-built, opinionated implementations of Microsoft's recommended architecture. Instead of building management groups, policies, and networking from scratch, you configure the module's inputs and get a production-ready landing zone. The trade-off is flexibility - you are adopting Microsoft's design patterns, which may need customization for your specific requirements. But for most organizations, starting with the CAF modules and customizing from there is far faster than building from the ground up.

For related reading, see [How to Handle Azure Resource Naming Conventions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-azure-resource-naming-conventions-in-terraform/view).
