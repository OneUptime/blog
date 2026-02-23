# How to Configure Azure Provider with Managed Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Managed Identity, Authentication, AzureRM, Security

Description: Learn how to configure the Terraform AzureRM provider with Azure Managed Identity to eliminate credential management for VMs, containers, and CI/CD runners.

---

Managed identities let Azure resources authenticate to other Azure services without storing credentials anywhere. No client secrets to rotate, no certificates to manage, no environment variables holding sensitive values. The identity is tied directly to the Azure resource running your code. This makes managed identities the most secure way to authenticate Terraform when running on Azure infrastructure.

## Managed Identity Types

Azure offers two types of managed identities:

**System-assigned** - Created and tied to a specific Azure resource (like a VM or App Service). When the resource is deleted, the identity is deleted too. Each resource gets its own unique identity.

**User-assigned** - Created as a standalone Azure resource. You can assign it to multiple resources. It persists independently of any single resource.

For Terraform automation, both work. System-assigned is simpler for single-VM setups. User-assigned is better when multiple resources need the same identity.

## Prerequisites

Managed identity authentication requires that Terraform runs on an Azure resource that has a managed identity. Common scenarios:

- Azure Virtual Machine running Terraform
- Azure Container Instance running Terraform
- Azure Kubernetes Service pods with workload identity
- Azure DevOps self-hosted agents on Azure VMs
- GitHub Actions runners hosted on Azure VMs

You cannot use managed identity from your laptop or from a CI runner outside of Azure. For those cases, use a [service principal](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-azure-provider-with-service-principal/view) instead.

## Setting Up System-Assigned Managed Identity

### Step 1 - Enable the Identity on Your VM

```bash
# Enable system-assigned managed identity on an existing VM
az vm identity assign \
  --resource-group my-terraform-rg \
  --name my-terraform-vm

# The output includes the principal ID - save this
# {
#   "systemAssignedIdentity": "abcdef12-3456-7890-abcd-ef1234567890"
# }
```

### Step 2 - Grant Permissions

The identity needs role assignments to manage Azure resources:

```bash
# Get the principal ID
PRINCIPAL_ID=$(az vm identity show \
  --resource-group my-terraform-rg \
  --name my-terraform-vm \
  --query principalId -o tsv)

# Grant Contributor role on the subscription
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"

# For more restrictive permissions, scope to a resource group
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Contributor" \
  --scope "/subscriptions/SUB_ID/resourceGroups/target-rg"
```

### Step 3 - Configure the Terraform Provider

```hcl
# versions.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

# provider.tf
provider "azurerm" {
  features {}

  # Tell the provider to use managed identity
  use_msi         = true
  subscription_id = "your-subscription-id"
  tenant_id       = "your-tenant-id"
}
```

That is it. No client ID, no client secret. The provider contacts the Azure Instance Metadata Service (IMDS) running on the VM to get a token.

## Setting Up User-Assigned Managed Identity

User-assigned identities are useful when you want the same identity across multiple VMs or when you want the identity to persist even if the VM is recreated.

### Step 1 - Create the Identity

```bash
# Create a user-assigned managed identity
az identity create \
  --resource-group my-terraform-rg \
  --name terraform-identity

# Get the client ID and resource ID
az identity show \
  --resource-group my-terraform-rg \
  --name terraform-identity \
  --query '{clientId: clientId, id: id, principalId: principalId}' -o json
```

Output:

```json
{
  "clientId": "11111111-2222-3333-4444-555555555555",
  "id": "/subscriptions/SUB_ID/resourceGroups/my-terraform-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/terraform-identity",
  "principalId": "66666666-7777-8888-9999-000000000000"
}
```

### Step 2 - Assign the Identity to Your VM

```bash
# Assign the user-assigned identity to the VM
az vm identity assign \
  --resource-group my-terraform-rg \
  --name my-terraform-vm \
  --identities "/subscriptions/SUB_ID/resourceGroups/my-terraform-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/terraform-identity"
```

### Step 3 - Grant Permissions

```bash
PRINCIPAL_ID="66666666-7777-8888-9999-000000000000"

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

### Step 4 - Configure Terraform with the Client ID

When a VM has multiple identities (both system-assigned and user-assigned, or multiple user-assigned), you need to tell Terraform which one to use:

```hcl
provider "azurerm" {
  features {}

  use_msi   = true
  msi_endpoint = "http://169.254.169.254/metadata/identity/oauth2/token"

  # Specify which user-assigned identity to use
  client_id       = "11111111-2222-3333-4444-555555555555"
  subscription_id = "your-subscription-id"
  tenant_id       = "your-tenant-id"
}
```

## Using Managed Identity with Azure Kubernetes Service

If your Terraform runs inside a Kubernetes pod on AKS, you can use workload identity (the modern replacement for AAD pod identity):

### Step 1 - Enable Workload Identity on AKS

```bash
# Create AKS cluster with OIDC issuer and workload identity enabled
az aks create \
  --resource-group my-aks-rg \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show \
  --resource-group my-aks-rg \
  --name my-aks-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
```

### Step 2 - Create a Federated Credential

```bash
# Create the user-assigned managed identity
az identity create \
  --resource-group my-aks-rg \
  --name terraform-workload-identity

CLIENT_ID=$(az identity show \
  --resource-group my-aks-rg \
  --name terraform-workload-identity \
  --query clientId -o tsv)

# Create federated credential linking the K8s service account to the identity
az identity federated-credential create \
  --name terraform-federated-cred \
  --identity-name terraform-workload-identity \
  --resource-group my-aks-rg \
  --issuer "$OIDC_ISSUER" \
  --subject "system:serviceaccount:terraform:terraform-sa" \
  --audiences "api://AzureADTokenExchange"
```

### Step 3 - Create Kubernetes Service Account

```yaml
# k8s/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: terraform-sa
  namespace: terraform
  annotations:
    azure.workload.identity/client-id: "CLIENT_ID_HERE"
  labels:
    azure.workload.identity/use: "true"
```

### Step 4 - Configure the Provider

```hcl
provider "azurerm" {
  features {}

  use_oidc        = true
  client_id       = "CLIENT_ID_HERE"
  subscription_id = "your-subscription-id"
  tenant_id       = "your-tenant-id"
}
```

## Configuring Remote State with Managed Identity

When using Azure Blob Storage for remote state, managed identity works there too:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Use managed identity for state storage access
    use_msi = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}
```

Make sure the managed identity has the "Storage Blob Data Contributor" role on the storage account:

```bash
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/SUB_ID/resourceGroups/terraform-state-rg/providers/Microsoft.Storage/storageAccounts/tfstate12345"
```

## Troubleshooting

### "No managed identity endpoint found"

Terraform cannot reach the IMDS endpoint. This means either:
- You are not running on an Azure VM or supported Azure resource
- The IMDS endpoint is blocked by a firewall or network policy

Verify IMDS is accessible:

```bash
curl -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/" -s
```

### "Identity not found"

The managed identity might not have propagated yet. Azure AD can take up to a few minutes to propagate new identities. Wait and retry.

### Permission Errors

Check role assignments:

```bash
az role assignment list --assignee "$PRINCIPAL_ID" --output table
```

Make sure the identity has the right role at the right scope.

## Security Benefits

Using managed identity over service principals gives you:

1. **No secret management** - No passwords or certificates to store, rotate, or accidentally commit to Git
2. **No credential exposure** - Tokens are obtained from the IMDS and are short-lived
3. **Automatic rotation** - Azure handles token refresh automatically
4. **Audit trail** - Identity usage is logged in Azure AD sign-in logs
5. **Reduced attack surface** - No long-lived credentials that could be stolen

## Summary

Managed identity is the gold standard for authenticating Terraform with Azure when your Terraform process runs on Azure infrastructure. System-assigned identities are the simplest setup for single-VM runners. User-assigned identities give you more flexibility for multi-resource setups. Either way, you eliminate the operational burden of managing service principal secrets while improving your security posture.
