# How to Configure Azure Backend with Managed Identity in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Azure, Security

Description: Learn how to configure the OpenTofu azurerm backend to authenticate using Azure Managed Identity for credential-free state access on Azure-hosted infrastructure.

## Introduction

Azure Managed Identity provides an identity for Azure resources such as VMs and Azure Container Instances that eliminates the need to manage credentials. For AKS workloads, the equivalent pattern is Microsoft Entra Workload ID. When OpenTofu runs on Azure-hosted infrastructure, Managed Identity is the most secure and operationally simple authentication method for the azurerm backend.

## Types of Managed Identities

- **System-assigned**: Tied to a specific Azure resource, deleted with the resource
- **User-assigned**: Standalone identity that can be shared across multiple resources

## Step 1: Create a User-Assigned Managed Identity (Recommended)

```hcl
# managed-identity.tf

resource "azurerm_resource_group" "identity" {
  name     = "rg-terraform-identities"
  location = "East US"
}

resource "azurerm_user_assigned_identity" "terraform" {
  name                = "id-opentofu-runner"
  location            = azurerm_resource_group.identity.location
  resource_group_name = azurerm_resource_group.identity.name
}

# Grant access to the state storage account
resource "azurerm_role_assignment" "terraform_state" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.terraform.principal_id
}

output "managed_identity_client_id" {
  value = azurerm_user_assigned_identity.terraform.client_id
}
```

## Step 2: Assign Managed Identity to Your Compute Resource

### For Azure VM

```hcl
resource "azurerm_linux_virtual_machine" "runner" {
  name                = "vm-terraform-runner"
  resource_group_name = azurerm_resource_group.runners.name
  location            = azurerm_resource_group.runners.location
  size                = "Standard_B2s"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.terraform.id]
  }

  # ... rest of VM config
}
```

### For Azure Container Instance

```hcl
resource "azurerm_container_group" "runner" {
  name                = "aci-terraform-runner"
  resource_group_name = azurerm_resource_group.runners.name
  location            = azurerm_resource_group.runners.location
  os_type             = "Linux"
  ip_address_type     = "None"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.terraform.id]
  }

  container {
    name   = "runner"
    image  = "ghcr.io/opentofu/opentofu:latest"
    cpu    = "1"
    memory = "2"

    environment_variables = {
      ARM_USE_MSI         = "true"
      ARM_USE_AZUREAD     = "true"
      ARM_SUBSCRIPTION_ID = var.subscription_id
      ARM_TENANT_ID       = var.tenant_id
      ARM_CLIENT_ID       = azurerm_user_assigned_identity.terraform.client_id
    }
  }
}
```

### For AKS with Microsoft Entra Workload ID

```yaml
# Kubernetes ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: opentofu-runner
  namespace: opentofu
  annotations:
    azure.workload.identity/client-id: "<MANAGED_IDENTITY_CLIENT_ID>"
```

Pods that use this service account must also include the label `azure.workload.identity/use: "true"`.

## Step 3: Configure the Backend for Managed Identity

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Use Managed Identity with Entra ID auth to the state container
    use_msi          = true
    use_azuread_auth = true
    subscription_id  = "SUBSCRIPTION_ID"
    tenant_id        = "TENANT_ID"

    # For user-assigned MI, specify the client ID
    client_id = "MANAGED_IDENTITY_CLIENT_ID"
  }
}
```

Or use environment variables:

```bash
export ARM_USE_MSI=true
export ARM_USE_AZUREAD=true
export ARM_SUBSCRIPTION_ID="SUBSCRIPTION_ID"
export ARM_TENANT_ID="TENANT_ID"
export ARM_CLIENT_ID="MANAGED_IDENTITY_CLIENT_ID"  # User-assigned MI
```

When running inside AKS with Workload Identity, use `use_aks_workload_identity = true` (or `ARM_USE_AKS_WORKLOAD_IDENTITY=true`) instead of `use_msi = true`.

## System-Assigned Managed Identity

For simpler setups using system-assigned identity:

```hcl
resource "azurerm_linux_virtual_machine" "runner" {
  # ...
  identity {
    type = "SystemAssigned"  # System-assigned MI
  }
}

# Grant access after VM creation
resource "azurerm_role_assignment" "vm_state_access" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_virtual_machine.runner.identity[0].principal_id
}
```

Backend configuration for system-assigned MI:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    use_msi          = true
    use_azuread_auth = true
    subscription_id  = "SUBSCRIPTION_ID"
    tenant_id        = "TENANT_ID"
    # No client_id needed for system-assigned MI
  }
}
```

## Using with GitHub Actions via Workload Identity Federation

```yaml
# GitHub Actions with Azure OIDC (preferred for GitHub-hosted runners)
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Azure Login
        uses: azure/login@v3
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Deploy
        env:
          ARM_USE_OIDC: true
          ARM_USE_AZUREAD: true
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          tofu init
          tofu apply -auto-approve
```

## Conclusion

Managed Identity is the most secure and operationally simple authentication method for the azurerm backend when running on Azure. It eliminates credential management entirely - no secrets to rotate, no risk of credential exposure. User-assigned managed identities are preferred over system-assigned for their reusability and explicit lifecycle management. For GitHub-hosted runners, workload identity federation provides equivalent benefits.
