# How to Create Azure Container Registry in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Container Registry, ACR, Docker, Containers, Infrastructure as Code

Description: Learn how to create and configure Azure Container Registry with Terraform, including geo-replication, private endpoints, webhooks, and CI/CD integration.

---

Azure Container Registry (ACR) is a managed Docker registry for storing and managing container images. It integrates natively with Azure Kubernetes Service, App Service, Container Instances, and other Azure services. ACR handles image storage, vulnerability scanning, geo-replication, and access control so you can focus on building your applications.

Managing ACR through Terraform ensures your registry configuration is consistent across environments and can be reproduced. This guide covers creating registries at different SKUs, configuring geo-replication, setting up private access, and integrating with CI/CD pipelines.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- Docker installed (for building and pushing images)
- An Azure subscription

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Foundation Resources

```hcl
resource "azurerm_resource_group" "acr" {
  name     = "rg-containers-prod-eus"
  location = "East US"

  tags = {
    Environment = "production"
    Service     = "container-registry"
  }
}
```

## Understanding ACR SKUs

ACR comes in three tiers:

- **Basic**: For development and low-volume production. Limited storage and throughput.
- **Standard**: For most production workloads. More storage and better throughput.
- **Premium**: Geo-replication, private link, content trust, and higher storage/throughput limits.

## Creating a Basic Registry

```hcl
# Basic container registry for development
resource "azurerm_container_registry" "dev" {
  name                = "myappcrdev"
  resource_group_name = azurerm_resource_group.acr.name
  location            = azurerm_resource_group.acr.location
  sku                 = "Basic"

  # Disable admin user in favor of managed identities or service principals
  admin_enabled = false

  tags = {
    Environment = "development"
  }
}
```

## Production Registry with Premium Features

```hcl
# Premium container registry for production
resource "azurerm_container_registry" "prod" {
  name                = "myappcrprod"
  resource_group_name = azurerm_resource_group.acr.name
  location            = azurerm_resource_group.acr.location
  sku                 = "Premium"

  # Enable admin user only if needed for specific integrations
  admin_enabled = false

  # Enable content trust (image signing)
  trust_policy_enabled = true

  # Enable retention policy for untagged manifests
  retention_policy_in_days = 30

  # Enable quarantine policy for new images
  quarantine_policy_enabled = true

  # Export policy - disable to prevent image export
  export_policy_enabled = true

  # Network rule set
  network_rule_set {
    default_action = "Deny"

    ip_rule {
      action   = "Allow"
      ip_range = "203.0.113.0/24"  # Your CI/CD IP range
    }
  }

  # Enable zone redundancy
  zone_redundancy_enabled = true

  tags = {
    Environment = "production"
    Tier        = "premium"
  }
}
```

## Geo-Replication

Premium registries can replicate images to multiple regions for low-latency pulls:

```hcl
# Geo-replication to West US
resource "azurerm_container_registry" "geo_replicated" {
  name                = "myappcrgeorep"
  resource_group_name = azurerm_resource_group.acr.name
  location            = azurerm_resource_group.acr.location
  sku                 = "Premium"
  admin_enabled       = false

  # Primary region is set by the location field
  # Add replicas for other regions
  georeplications {
    location                = "West US"
    zone_redundancy_enabled = true

    tags = {
      Region = "west-us"
    }
  }

  georeplications {
    location                = "West Europe"
    zone_redundancy_enabled = true

    tags = {
      Region = "west-europe"
    }
  }

  georeplications {
    location                = "Southeast Asia"
    zone_redundancy_enabled = false

    tags = {
      Region = "southeast-asia"
    }
  }

  tags = {
    Environment   = "production"
    Replication   = "global"
  }
}
```

## Private Endpoint Access

Restrict registry access to your VNet using Private Link:

```hcl
# VNet for private access
resource "azurerm_virtual_network" "acr" {
  name                = "vnet-acr-prod"
  location            = azurerm_resource_group.acr.location
  resource_group_name = azurerm_resource_group.acr.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "acr_endpoint" {
  name                 = "snet-acr-endpoint"
  resource_group_name  = azurerm_resource_group.acr.name
  virtual_network_name = azurerm_virtual_network.acr.name
  address_prefixes     = ["10.0.1.0/24"]

  # Disable network policies for private endpoints
  private_endpoint_network_policies_enabled = false
}

# Private endpoint for ACR
resource "azurerm_private_endpoint" "acr" {
  name                = "pe-acr-prod"
  location            = azurerm_resource_group.acr.location
  resource_group_name = azurerm_resource_group.acr.name
  subnet_id           = azurerm_subnet.acr_endpoint.id

  private_service_connection {
    name                           = "psc-acr"
    private_connection_resource_id = azurerm_container_registry.prod.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }

  # Private DNS zone integration
  private_dns_zone_group {
    name                 = "acr-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.acr.id]
  }

  tags = {
    Environment = "production"
  }
}

# Private DNS zone for ACR
resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = azurerm_resource_group.acr.name

  tags = {
    Purpose = "acr-private-dns"
  }
}

# Link DNS zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  name                  = "acr-dns-link"
  resource_group_name   = azurerm_resource_group.acr.name
  private_dns_zone_name = azurerm_private_dns_zone.acr.name
  virtual_network_id    = azurerm_virtual_network.acr.id

  tags = {
    Purpose = "dns-resolution"
  }
}
```

## Role-Based Access Control

Grant specific permissions to users, groups, and services:

```hcl
# Allow AKS to pull images
resource "azurerm_role_assignment" "aks_pull" {
  principal_id                     = var.aks_kubelet_identity_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.prod.id
  skip_service_principal_aad_check = true
}

# Allow CI/CD service principal to push images
resource "azurerm_role_assignment" "cicd_push" {
  principal_id         = var.cicd_service_principal_id
  role_definition_name = "AcrPush"
  scope                = azurerm_container_registry.prod.id
}

# Allow developers to read images
resource "azurerm_role_assignment" "dev_reader" {
  principal_id         = var.dev_group_object_id
  role_definition_name = "AcrPull"
  scope                = azurerm_container_registry.prod.id
}

variable "aks_kubelet_identity_id" {
  description = "Object ID of the AKS kubelet identity"
  type        = string
  default     = ""
}

variable "cicd_service_principal_id" {
  description = "Object ID of the CI/CD service principal"
  type        = string
  default     = ""
}

variable "dev_group_object_id" {
  description = "Object ID of the developers Azure AD group"
  type        = string
  default     = ""
}
```

## Webhooks for CI/CD

Trigger actions when images are pushed or deleted:

```hcl
# Webhook for image push events
resource "azurerm_container_registry_webhook" "push_notification" {
  name                = "pushnotification"
  registry_name       = azurerm_container_registry.prod.name
  resource_group_name = azurerm_resource_group.acr.name
  location            = azurerm_resource_group.acr.location

  service_uri = "https://ci.example.com/webhooks/acr"
  status      = "enabled"
  scope       = "myapp:*"  # Only trigger for the myapp repository

  actions = ["push", "delete"]

  custom_headers = {
    "Authorization" = "Bearer ${var.webhook_token}"
  }

  tags = {
    Purpose = "ci-cd-trigger"
  }
}

variable "webhook_token" {
  description = "Authentication token for the webhook endpoint"
  type        = string
  sensitive   = true
  default     = ""
}
```

## ACR Tasks for Automated Builds

ACR Tasks can build images in the cloud without a local Docker daemon:

```hcl
# ACR Task for automated image builds
resource "azurerm_container_registry_task" "build" {
  name                  = "build-myapp"
  container_registry_id = azurerm_container_registry.prod.id

  platform {
    os           = "Linux"
    architecture = "amd64"
  }

  # Build from a GitHub repository
  source_trigger {
    name           = "github-commit"
    events         = ["commit"]
    repository_url = "https://github.com/myorg/myapp"
    branch         = "main"

    authentication {
      token      = var.github_pat
      token_type = "PAT"
    }
  }

  # Docker build step
  docker_step {
    dockerfile_path      = "Dockerfile"
    context_path         = "https://github.com/myorg/myapp#main"
    context_access_token = var.github_pat
    image_names          = ["myapp:{{.Run.ID}}", "myapp:latest"]
  }

  tags = {
    Purpose = "automated-builds"
  }
}

variable "github_pat" {
  description = "GitHub personal access token for ACR Tasks"
  type        = string
  sensitive   = true
  default     = ""
}
```

## Scope Maps and Tokens

Create fine-grained access tokens for specific repositories:

```hcl
# Scope map defining permissions
resource "azurerm_container_registry_scope_map" "readonly_myapp" {
  name                    = "readonly-myapp"
  container_registry_name = azurerm_container_registry.prod.name
  resource_group_name     = azurerm_resource_group.acr.name

  actions = [
    "repositories/myapp/content/read",
    "repositories/myapp/metadata/read"
  ]
}

# Token using the scope map
resource "azurerm_container_registry_token" "readonly" {
  name                    = "readonly-token"
  container_registry_name = azurerm_container_registry.prod.name
  resource_group_name     = azurerm_resource_group.acr.name
  scope_map_id            = azurerm_container_registry_scope_map.readonly_myapp.id

  enabled = true
}
```

## Outputs

```hcl
output "acr_login_server" {
  description = "Login server URL for the container registry"
  value       = azurerm_container_registry.prod.login_server
}

output "acr_id" {
  description = "ID of the container registry"
  value       = azurerm_container_registry.prod.id
}

output "acr_admin_username" {
  description = "Admin username (if enabled)"
  value       = azurerm_container_registry.prod.admin_username
  sensitive   = true
}
```

## Monitoring Your Registry

A registry outage blocks every deployment that depends on it. Monitor your ACR with OneUptime to track image pull latency, storage usage, and task execution status. Getting alerted when pulls start failing or latency spikes prevents a registry issue from cascading into deployment failures across your entire platform.

## Security Best Practices

- Disable the admin user and use managed identities or service principals instead.
- Enable content trust to ensure images are signed before deployment.
- Use private endpoints to keep registry traffic off the public internet.
- Set a retention policy to automatically clean up old, untagged manifests.
- Use scope maps and tokens instead of granting broad registry access.
- Regularly scan images for vulnerabilities using Azure Defender for container registries.

## Summary

Azure Container Registry is the backbone of container workloads in Azure. By defining it in Terraform, you ensure your registry configuration - SKU, networking, access control, and replication - is consistent and auditable. Start with the Standard SKU for most workloads and upgrade to Premium when you need geo-replication or private endpoints. The combination of RBAC, private networking, and content trust gives you a secure foundation for your container supply chain.
