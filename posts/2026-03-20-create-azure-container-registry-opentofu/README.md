# How to Create Azure Container Registry with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Container Registry, ACR, Infrastructure as Code

Description: Learn how to create Azure Container Registry with OpenTofu for private container image storage that integrates with AKS, App Service, and Azure Functions.

Azure Container Registry (ACR) stores and manages private container images for Azure deployments. Managing ACR in OpenTofu ensures consistent SKU, network access, and replication settings alongside the services that consume images.

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

## Creating a Container Registry

```hcl
resource "azurerm_resource_group" "registry" {
  name     = "registry-rg"
  location = "eastus"
}

resource "azurerm_container_registry" "main" {
  name                = "myappregistry"  # Must be globally unique, alphanumeric
  resource_group_name = azurerm_resource_group.registry.name
  location            = azurerm_resource_group.registry.location

  sku = "Premium"  # Basic, Standard, Premium

  admin_enabled = false  # Use RBAC instead of admin credentials

  # Enable anonymous pull (read-only, for public images)
  anonymous_pull_enabled = false

  # Retention policy for untagged manifests (Premium only)
  retention_policy {
    days    = 7
    enabled = true
  }

  # Trust policy for signed images (Premium only)
  trust_policy {
    enabled = true
  }

  # Export policy (Premium only)
  export_policy_enabled = true

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}
```

## Network Access Rules (Premium)

```hcl
resource "azurerm_container_registry" "private" {
  name                = "myappregistryprivate"
  resource_group_name = azurerm_resource_group.registry.name
  location            = azurerm_resource_group.registry.location
  sku                 = "Premium"
  admin_enabled       = false

  # Disable public access - require private endpoint
  public_network_access_enabled = false

  network_rule_set {
    default_action = "Deny"

    ip_rule {
      action   = "Allow"
      ip_range = var.ci_cd_ip_range  # Allow CI/CD runners
    }
  }
}

# Private endpoint for AKS access

resource "azurerm_private_endpoint" "acr" {
  name                = "acr-private-endpoint"
  location            = azurerm_resource_group.registry.location
  resource_group_name = azurerm_resource_group.registry.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "acr-connection"
    private_connection_resource_id = azurerm_container_registry.private.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }
}
```

## RBAC for Image Pull

```hcl
# Allow AKS kubelet identity to pull images
resource "azurerm_role_assignment" "aks_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# Allow CI/CD service principal to push images
resource "azurerm_role_assignment" "ci_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.cicd.principal_id
}
```

## Lifecycle Purge Task

```hcl
resource "azurerm_container_registry_task" "purge_untagged" {
  name                  = "purge-untagged-manifests"
  container_registry_id = azurerm_container_registry.main.id

  platform {
    os = "Linux"
  }

  timer_trigger {
    name     = "daily-purge"
    schedule = "0 3 * * *"  # Daily at 3 AM
    enabled  = true
  }

  encoded_step {
    task_content = base64encode(<<-TASK
      version: v1.1.0
      steps:
        - cmd: acr purge --filter '.*:.*' --untagged --ago 7d
          timeout: 3600
    TASK
    )
  }
}
```

## Outputs

```hcl
output "login_server" {
  value = azurerm_container_registry.main.login_server
}
```

## Conclusion

Azure Container Registry in OpenTofu provides secure, managed container storage. Use the Premium SKU for private endpoints, geo-replication, and content trust. Always disable the admin account and use RBAC - AcrPull for compute identities, AcrPush for CI/CD. Set a retention policy to automatically clean up untagged manifests and reduce storage costs.
