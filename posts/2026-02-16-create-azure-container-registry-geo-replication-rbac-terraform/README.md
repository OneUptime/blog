# How to Create Azure Container Registry with Geo-Replication and RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Container Registry, Geo-Replication, RBAC, Docker, Infrastructure as Code

Description: Create Azure Container Registry with geo-replication across regions and fine-grained RBAC access controls using Terraform for global container deployments.

---

Azure Container Registry (ACR) is where you store your Docker images, Helm charts, and OCI artifacts on Azure. For organizations running workloads in multiple regions, geo-replication keeps copies of your images close to your compute, reducing pull times and providing redundancy. Combined with proper RBAC, you get a container registry that is both fast and secure.

This post walks through setting up ACR with geo-replication and granular RBAC using Terraform.

## Creating the Registry

ACR geo-replication requires the Premium SKU. Let us set up the registry with security hardening.

```hcl
# main.tf

# Azure Container Registry with Premium features

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.74"
    }
  }
}

provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "acr" {
  name     = "rg-container-registry"
  location = "eastus"
  tags = {
    service = "container-registry"
  }
}

# The Container Registry
resource "azurerm_container_registry" "main" {
  name                = "acrmyorgprod001"
  resource_group_name = azurerm_resource_group.acr.name
  location            = azurerm_resource_group.acr.location
  sku                 = "Premium"  # Required for geo-replication

  # Disable admin account - use Microsoft Entra ID authentication
  admin_enabled = false

  # Docker Content Trust cannot be enabled on new registries after May 31, 2026.
  trust_policy_enabled = false

  # Quarantine policy for validation workflows
  quarantine_policy_enabled = true

  # Retention policy for untagged manifests
  retention_policy_in_days = 30

  # Export policy - controls whether images can be exported
  export_policy_enabled = true

  # Anonymous pull access - disabled for private registries
  anonymous_pull_enabled = false

  # Enable zone redundancy in the primary region
  zone_redundancy_enabled = true

  # Network rules
  network_rule_bypass_option = "AzureServices"
  public_network_access_enabled = true

  # Managed identity for integrations such as customer-managed keys
  identity {
    type = "SystemAssigned"
  }

  tags = {
    service     = "container-registry"
    environment = "production"
  }
}
```

## Configuring Geo-Replication

Add replicas in each region where you run workloads. Images pushed through the registry's global endpoint are routed to an available geo-replica and automatically replicated to all other regions.

```hcl
# geo-replication.tf
# Replicate the registry to multiple Azure regions
# Add these blocks inside azurerm_container_registry.main

# West US 2 replica
georeplications {
  location = "westus2"

  # Enable zone redundancy in the replica region
  zone_redundancy_enabled = true

  tags = {
    region = "westus2"
  }
}

# West Europe replica
georeplications {
  location                = "westeurope"
  zone_redundancy_enabled = true

  tags = {
    region = "westeurope"
  }
}

# Southeast Asia replica
georeplications {
  location                = "southeastasia"
  zone_redundancy_enabled = false  # Use false for regions where you do not enable zone redundancy

  tags = {
    region = "southeastasia"
  }
}
```

When you push an image through the registry endpoint, ACR routes the request to a geo-replica and automatically replicates it to West US 2, West Europe, and Southeast Asia. Container hosts in those regions pull from a nearby replica, reducing latency and cross-region bandwidth costs.

## Using Variables for Dynamic Regions

For organizations that frequently add or remove regions, use a variable to manage replications dynamically.

```hcl
# variables.tf
variable "replication_locations" {
  description = "Map of Azure regions for geo-replication"
  type = map(object({
    zone_redundancy = bool
  }))
  default = {
    "westus2" = {
      zone_redundancy = true
    }
    "westeurope" = {
      zone_redundancy = true
    }
    "southeastasia" = {
      zone_redundancy = false
    }
    "australiaeast" = {
      zone_redundancy = true
    }
  }
}
```

```hcl
# geo-replication-dynamic.tf
# Create replications dynamically from the variable
# Add this dynamic block inside azurerm_container_registry.main

dynamic "georeplications" {
  for_each = var.replication_locations

  content {
    location                = georeplications.key
    zone_redundancy_enabled = georeplications.value.zone_redundancy

    tags = {
      region = georeplications.key
    }
  }
}
```

## RBAC Configuration

ACR supports several built-in roles with different permission levels. Here is how to set up access for different teams and services.

```hcl
# rbac.tf
# Fine-grained access control for the container registry

# AcrPush: Push and pull images (for CI/CD pipelines)
resource "azurerm_role_assignment" "cicd_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = var.cicd_service_principal_id
  description          = "CI/CD pipeline - push and pull images"
}

# AcrPull: Pull images only (for Kubernetes clusters)
resource "azurerm_role_assignment" "aks_pull" {
  for_each = var.aks_cluster_identities

  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = each.value
  description          = "AKS cluster ${each.key} - pull images"
}

# AcrPush: Push image signatures as OCI referrers (for signing workflows)
resource "azurerm_role_assignment" "image_signer_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = var.signing_service_principal_id
  description          = "Image signing service - push signatures as OCI referrers"
}

# AcrDelete: Delete images (for cleanup automation)
resource "azurerm_role_assignment" "cleanup_delete" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrDelete"
  principal_id         = var.cleanup_automation_principal_id
  description          = "Cleanup automation - delete untagged and old images"
}

# Reader: View registry metadata (for developers)
resource "azurerm_role_assignment" "dev_reader" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "Reader"
  principal_id         = var.developers_group_id
  description          = "Developers - view registry info"
}

# AcrPull for developers who need to pull for local development
resource "azurerm_role_assignment" "dev_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = var.developers_group_id
  description          = "Developers - pull images for local development"
}
```

The variables for the principals.

```hcl
# variables.tf
variable "cicd_service_principal_id" {
  description = "Object ID of the CI/CD service principal"
  type        = string
}

variable "aks_cluster_identities" {
  description = "Map of AKS cluster names to their kubelet identity object IDs"
  type        = map(string)
  default = {
    "aks-eastus-prod"       = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    "aks-westeurope-prod"   = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    "aks-southeastasia-prod" = "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"
  }
}

variable "signing_service_principal_id" {
  description = "Object ID of the image signing service principal"
  type        = string
}

variable "cleanup_automation_principal_id" {
  description = "Object ID of the cleanup automation service principal"
  type        = string
}

variable "developers_group_id" {
  description = "Object ID of the developers Azure AD group"
  type        = string
}
```

## Scope Maps for Repository-Level Access

For even more granular token-based access, ACR supports scope maps that restrict access to specific repositories within the registry.

```hcl
# scope-maps.tf
# Repository-level access control using scope maps and tokens

# Scope map for the frontend team - only access frontend repositories
resource "azurerm_container_registry_scope_map" "frontend_team" {
  name                    = "frontend-team-access"
  container_registry_name = azurerm_container_registry.main.name
  resource_group_name     = azurerm_resource_group.acr.name

  actions = [
    # Pull from frontend repositories
    "repositories/frontend/web-app/content/read",
    "repositories/frontend/web-app/metadata/read",
    # Push to frontend repositories
    "repositories/frontend/web-app/content/write",
    "repositories/frontend/web-app/metadata/write",
    # Pull shared base images
    "repositories/shared/base-images/content/read",
    "repositories/shared/base-images/metadata/read",
  ]
}

# Generate a token and password for the scope map
resource "azurerm_container_registry_token" "frontend_team" {
  name                    = "frontend-team-token"
  container_registry_name = azurerm_container_registry.main.name
  resource_group_name     = azurerm_resource_group.acr.name
  scope_map_id            = azurerm_container_registry_scope_map.frontend_team.id
  enabled                 = true
}

resource "azurerm_container_registry_token_password" "frontend_team" {
  container_registry_token_id = azurerm_container_registry_token.frontend_team.id

  password1 {}
}

# Scope map for the backend team
resource "azurerm_container_registry_scope_map" "backend_team" {
  name                    = "backend-team-access"
  container_registry_name = azurerm_container_registry.main.name
  resource_group_name     = azurerm_resource_group.acr.name

  actions = [
    "repositories/backend/*/content/read",
    "repositories/backend/*/content/write",
    "repositories/backend/*/metadata/read",
    "repositories/backend/*/metadata/write",
    "repositories/shared/base-images/content/read",
    "repositories/shared/base-images/metadata/read",
  ]
}
```

## Network Security

Restrict network access to the registry using firewall rules and private endpoints.

```hcl
# network.tf
# Network security for the container registry

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for the ACR private endpoint"
  type        = string
}

variable "private_endpoint_virtual_network_id" {
  description = "Virtual network ID to link to the ACR private DNS zone"
  type        = string
}

# Network rules to restrict access by IP
# Add this block inside azurerm_container_registry.main
network_rule_set {
  default_action = "Deny"

  # Allow CI/CD agents
  ip_rule {
    action   = "Allow"
    ip_range = "203.0.113.0/24"
  }

  # Allow office network
  ip_rule {
    action   = "Allow"
    ip_range = "198.51.100.0/24"
  }
}

# Private endpoint for VNet-connected access
resource "azurerm_private_endpoint" "acr" {
  name                = "pe-acr"
  location            = azurerm_resource_group.acr.location
  resource_group_name = azurerm_resource_group.acr.name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "acr-private-connection"
    private_connection_resource_id = azurerm_container_registry.main.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }

  private_dns_zone_group {
    name                 = "acr-dns"
    private_dns_zone_ids = [azurerm_private_dns_zone.acr.id]
  }
}

resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = azurerm_resource_group.acr.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  name                  = "acr-dns-link"
  resource_group_name   = azurerm_resource_group.acr.name
  private_dns_zone_name = azurerm_private_dns_zone.acr.name
  virtual_network_id    = var.private_endpoint_virtual_network_id
}
```

## Outputs

```hcl
# outputs.tf
output "registry_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "registry_id" {
  value = azurerm_container_registry.main.id
}

output "replication_locations" {
  value = keys(var.replication_locations)
}
```

## Summary

Azure Container Registry with geo-replication and RBAC in Terraform gives you a global, secure container hosting solution. Geo-replication keeps images close to your clusters for fast pulls, while the layered RBAC model gives you control from registry-wide roles down to individual repository access through scope maps. The Premium SKU unlocks features such as geo-replication, quarantine policies, and retention policies. With everything in Terraform, adding a new region or granting a new team access is a pull request, not a portal operation.
