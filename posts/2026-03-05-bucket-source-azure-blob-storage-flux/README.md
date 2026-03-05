# How to Configure Bucket Source with Azure Blob Storage in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Azure, Blob Storage, Bucket

Description: Learn how to configure Flux CD to pull Kubernetes manifests from Azure Blob Storage using shared keys, SAS tokens, and Managed Identity.

---

## Introduction

Azure Blob Storage integrates with Flux CD as a Bucket source, allowing you to store and deliver Kubernetes manifests through Azure's object storage service. The `azure` provider in Flux supports multiple authentication methods, including storage account shared keys, SAS tokens, and Azure Managed Identity for AKS clusters. This guide walks through each approach.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- An Azure Storage Account with a Blob container
- Azure CLI configured
- `kubectl` access to your cluster
- For Managed Identity: an AKS cluster with Managed Identity enabled

## Preparing Azure Blob Storage

Create a storage account and container, then upload your manifests.

```bash
# Create a resource group
az group create --name flux-rg --location eastus

# Create a storage account
az storage account create \
  --name fluxmanifests \
  --resource-group flux-rg \
  --location eastus \
  --sku Standard_LRS

# Create a blob container
az storage container create \
  --name my-app-manifests \
  --account-name fluxmanifests

# Upload manifests
az storage blob upload-batch \
  --destination my-app-manifests \
  --source ./manifests/ \
  --account-name fluxmanifests
```

## Option 1: Shared Access Key

The simplest authentication method uses the storage account's shared access key.

```bash
# Get the storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name fluxmanifests \
  --resource-group flux-rg \
  --query '[0].value' -o tsv)

# Create a Kubernetes secret with the Azure credentials
kubectl create secret generic azure-bucket-creds \
  --namespace flux-system \
  --from-literal=accountKey="${STORAGE_KEY}"
```

Create the Bucket source with the `azure` provider.

```yaml
# flux-system/azure-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use the azure provider for native Azure Blob Storage integration
  provider: azure
  bucketName: my-app-manifests
  # Azure Blob Storage endpoint format
  endpoint: https://fluxmanifests.blob.core.windows.net
  secretRef:
    name: azure-bucket-creds
```

Apply and verify.

```bash
# Apply the Bucket source
kubectl apply -f azure-bucket-source.yaml

# Verify it becomes ready
flux get sources bucket -n flux-system
```

## Option 2: SAS Token

A Shared Access Signature (SAS) token provides time-limited, scoped access to the container.

```bash
# Generate a SAS token with read and list permissions (valid for 1 year)
SAS_TOKEN=$(az storage container generate-sas \
  --name my-app-manifests \
  --account-name fluxmanifests \
  --permissions rl \
  --expiry $(date -u -d '+1 year' +%Y-%m-%dT%H:%MZ) \
  --output tsv)

# Create a Kubernetes secret with the SAS token
kubectl create secret generic azure-sas-creds \
  --namespace flux-system \
  --from-literal=sasToken="${SAS_TOKEN}"
```

```yaml
# flux-system/azure-bucket-sas.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app-sas
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: my-app-manifests
  endpoint: https://fluxmanifests.blob.core.windows.net
  secretRef:
    name: azure-sas-creds
```

## Option 3: Azure Managed Identity (Recommended for AKS)

Azure Managed Identity eliminates the need for static credentials on AKS clusters. Flux's source-controller can authenticate using the pod's managed identity.

```bash
# Enable Managed Identity on your AKS cluster (if not already enabled)
az aks update \
  --resource-group flux-rg \
  --name my-aks-cluster \
  --enable-managed-identity

# Get the managed identity's client ID
IDENTITY_CLIENT_ID=$(az aks show \
  --resource-group flux-rg \
  --name my-aks-cluster \
  --query "identityProfile.kubeletidentity.clientId" -o tsv)

# Get the storage account resource ID
STORAGE_ID=$(az storage account show \
  --name fluxmanifests \
  --resource-group flux-rg \
  --query id -o tsv)

# Assign Storage Blob Data Reader role to the managed identity
az role assignment create \
  --assignee "${IDENTITY_CLIENT_ID}" \
  --role "Storage Blob Data Reader" \
  --scope "${STORAGE_ID}"
```

With Managed Identity configured, the Bucket source does not need a `secretRef`.

```yaml
# flux-system/azure-bucket-managed-identity.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # The azure provider enables Managed Identity authentication
  provider: azure
  bucketName: my-app-manifests
  endpoint: https://fluxmanifests.blob.core.windows.net
  # No secretRef needed -- Managed Identity handles authentication
```

## Using Prefixes

Scope the downloaded files to a specific path prefix within the container.

```yaml
# flux-system/azure-bucket-prefix.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: deployment-artifacts
  endpoint: https://fluxmanifests.blob.core.windows.net
  # Only download files under the production/my-app/ prefix
  prefix: production/my-app/
  secretRef:
    name: azure-bucket-creds
```

## Connecting a Kustomization

Reference the Bucket source in a Kustomization to deploy the manifests.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration with Azure DevOps

Upload manifests to Azure Blob Storage from an Azure DevOps pipeline.

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - manifests/*

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    displayName: 'Upload manifests to Blob Storage'
    inputs:
      azureSubscription: 'my-azure-subscription'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Sync manifests to the blob container
        az storage blob upload-batch \
          --destination my-app-manifests \
          --source ./manifests/ \
          --account-name fluxmanifests \
          --overwrite true
```

## Verifying the Setup

```bash
# Check the Bucket source status
flux get sources bucket -n flux-system

# Describe the Bucket for detailed status
kubectl describe bucket my-app -n flux-system

# Check source-controller logs
kubectl logs -n flux-system deployment/source-controller | grep -i "my-app"
```

## Troubleshooting

**Error: AuthorizationPermissionMismatch**

The identity or credentials do not have sufficient permissions. Verify the role assignment.

```bash
# List role assignments for the storage account
az role assignment list --scope "${STORAGE_ID}" --output table
```

**Error: AuthenticationFailed**

The storage account key or SAS token is invalid or expired. Regenerate and update the secret.

```bash
# Rotate the secret with a new key
STORAGE_KEY=$(az storage account keys list \
  --account-name fluxmanifests \
  --resource-group flux-rg \
  --query '[0].value' -o tsv)

kubectl delete secret azure-bucket-creds -n flux-system
kubectl create secret generic azure-bucket-creds \
  --namespace flux-system \
  --from-literal=accountKey="${STORAGE_KEY}"
```

## Best Practices

1. **Use Managed Identity on AKS.** Avoid static credentials in production and leverage Azure's identity platform.

2. **Use SAS tokens with minimal permissions.** When static credentials are necessary, use SAS tokens scoped to read-only and with an expiration date.

3. **Enable soft delete.** Turn on blob soft delete to protect against accidental deletions.

4. **Use private endpoints.** Configure Azure Private Endpoints for the storage account to keep traffic within the Azure network.

5. **Monitor with Azure Monitor.** Set up diagnostic logging on the storage account to track access patterns.

## Conclusion

Configuring Flux CD with Azure Blob Storage as a Bucket source provides a native integration for Azure-based Kubernetes deployments. The `azure` provider supports shared access keys, SAS tokens, and Managed Identity, giving you flexibility to match your security requirements. For AKS clusters, Managed Identity is the recommended approach as it eliminates credential management overhead while maintaining strong security.
