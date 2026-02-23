# How to Create Azure User-Assigned Managed Identities in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Managed Identities, Security, Infrastructure as Code, RBAC, Identity Management

Description: Learn how to create and assign Azure User-Assigned Managed Identities with Terraform to securely authenticate your applications without managing credentials.

---

Managing credentials is one of the biggest security headaches in cloud infrastructure. Service accounts with passwords, API keys stored in environment variables, certificates that expire - all of these create operational burden and security risk. Azure Managed Identities eliminate this problem by giving your resources an identity in Azure Active Directory without any credentials to manage.

This guide covers creating user-assigned managed identities with Terraform, assigning roles, and attaching them to various Azure resources.

## System-Assigned vs User-Assigned Managed Identities

Azure offers two types of managed identities:

**System-Assigned**: Created automatically with a resource and tied to its lifecycle. When the resource is deleted, the identity is deleted too. You cannot share it across resources.

**User-Assigned**: Created as a standalone resource. You can assign it to multiple resources, and it persists independently of any single resource. This is the more flexible option and the focus of this guide.

When should you use user-assigned identities? Here are the common scenarios:

- Multiple resources need the same permissions (shared identity across a microservices cluster)
- You need the identity to exist before the resource that uses it (for pre-configuring RBAC)
- You want to manage the identity lifecycle independently of the resources

## Creating a User-Assigned Managed Identity

The Terraform resource is straightforward:

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

# Resource group for identity resources
resource "azurerm_resource_group" "identity" {
  name     = "rg-identity-prod-eastus"
  location = "East US"
}

# User-assigned managed identity
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-app-prod"
  location            = azurerm_resource_group.identity.location
  resource_group_name = azurerm_resource_group.identity.name

  tags = {
    environment = "production"
    application = "web-api"
    managed_by  = "terraform"
  }
}
```

## Assigning Roles to the Identity

An identity without permissions is useless. Use role assignments to grant the identity access to specific resources:

```hcl
# Grant the identity read access to a storage account
resource "azurerm_role_assignment" "storage_reader" {
  scope                = azurerm_storage_account.data.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Grant the identity access to Key Vault secrets
resource "azurerm_role_assignment" "keyvault_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Grant the identity contributor access to a specific resource group
resource "azurerm_role_assignment" "rg_contributor" {
  scope                = azurerm_resource_group.app.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

The `principal_id` is the identity's object ID in Azure AD. Terraform exposes this as an attribute on the identity resource, so you do not need to look it up manually.

## Attaching to a Virtual Machine

Here is how to assign the identity to a Linux VM:

```hcl
resource "azurerm_linux_virtual_machine" "app" {
  name                = "vm-app-prod-01"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  size                = "Standard_D2s_v5"
  admin_username      = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [
    azurerm_network_interface.app.id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # Assign the user-assigned managed identity
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }
}
```

You can also use both system-assigned and user-assigned identities on the same resource:

```hcl
  identity {
    type         = "SystemAssigned, UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }
```

## Attaching to an App Service

Web apps and function apps support managed identities too:

```hcl
resource "azurerm_linux_web_app" "api" {
  name                = "app-api-prod"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
  }

  # Assign the managed identity
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  # Use the managed identity for Key Vault references in app settings
  key_vault_reference_identity_id = azurerm_user_assigned_identity.app.id

  app_settings = {
    # Key Vault reference - the app will fetch the secret using the managed identity
    "DatabaseConnectionString" = "@Microsoft.KeyVault(VaultName=kv-prod;SecretName=db-connection)"
  }
}
```

## Attaching to Azure Kubernetes Service

AKS workload identity lets pods use managed identities through Kubernetes service accounts:

```hcl
# Managed identity for AKS workloads
resource "azurerm_user_assigned_identity" "aks_workload" {
  name                = "id-aks-workload-prod"
  location            = azurerm_resource_group.identity.location
  resource_group_name = azurerm_resource_group.identity.name
}

# Federated identity credential links the Kubernetes service account
# to the managed identity
resource "azurerm_federated_identity_credential" "aks" {
  name                = "fed-aks-prod"
  resource_group_name = azurerm_resource_group.identity.name
  parent_id           = azurerm_user_assigned_identity.aks_workload.id

  # The OIDC issuer URL from the AKS cluster
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url

  # Subject matches the Kubernetes service account
  subject             = "system:serviceaccount:default:my-app-sa"

  # Audience is always this value for Azure
  audience            = ["api://AzureADTokenExchange"]
}

# Grant the identity access to resources the pods need
resource "azurerm_role_assignment" "aks_storage" {
  scope                = azurerm_storage_account.data.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_workload.principal_id
}
```

## Creating Multiple Identities with for_each

For microservices architectures where each service needs its own identity:

```hcl
# Define identities for each microservice
variable "service_identities" {
  description = "Map of service names to their required roles"
  type = map(object({
    roles = list(object({
      scope     = string
      role_name = string
    }))
  }))
  default = {
    "api-gateway" = {
      roles = [
        { scope = "storage", role_name = "Storage Blob Data Reader" },
      ]
    }
    "order-service" = {
      roles = [
        { scope = "storage", role_name = "Storage Blob Data Contributor" },
        { scope = "servicebus", role_name = "Azure Service Bus Data Sender" },
      ]
    }
    "notification-service" = {
      roles = [
        { scope = "servicebus", role_name = "Azure Service Bus Data Receiver" },
      ]
    }
  }
}

# Create an identity for each service
resource "azurerm_user_assigned_identity" "services" {
  for_each = var.service_identities

  name                = "id-${each.key}-prod"
  location            = azurerm_resource_group.identity.location
  resource_group_name = azurerm_resource_group.identity.name

  tags = {
    service     = each.key
    environment = "production"
  }
}
```

## Outputs

Export the identity details for use in other modules:

```hcl
# outputs.tf
output "identity_id" {
  description = "Resource ID of the managed identity"
  value       = azurerm_user_assigned_identity.app.id
}

output "identity_principal_id" {
  description = "Object ID of the identity in Azure AD"
  value       = azurerm_user_assigned_identity.app.principal_id
}

output "identity_client_id" {
  description = "Client ID of the identity (used in application code)"
  value       = azurerm_user_assigned_identity.app.client_id
}

output "identity_tenant_id" {
  description = "Tenant ID of the identity"
  value       = azurerm_user_assigned_identity.app.tenant_id
}
```

The `client_id` is particularly important because your application code needs it to acquire tokens from the managed identity endpoint.

## Best Practices

**Follow least privilege.** Give each identity only the permissions it needs. Do not use Contributor at the subscription level when Reader on a specific resource group is sufficient.

**Use separate identities for separate concerns.** If two applications need different permissions, give them separate identities instead of one identity with all permissions combined.

**Name identities clearly.** Include the application name, environment, and purpose in the identity name so you can identify them at a glance in the portal.

**Centralize identity management.** Keep all your managed identities in a dedicated resource group. This makes it easier to audit who has access to what.

**Use Key Vault references instead of app settings.** Instead of fetching secrets in your code and injecting them as app settings, use Key Vault references with managed identity authentication. The platform handles the secret retrieval.

## Wrapping Up

User-assigned managed identities eliminate the need to manage credentials in your applications. Create the identity in Terraform, assign the roles it needs, attach it to your resources, and your application authenticates automatically. No passwords to rotate, no certificates to renew, no secrets to leak. It is one of the simplest security wins you can get in Azure, and Terraform makes it easy to manage at scale across your entire infrastructure.
