# How to Configure Velero with Azure Blob Storage via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Azure, Blob Storage, GitOps, Kubernetes, Backup

Description: Configure Velero to use Azure Blob Storage for backups with Flux CD, including Managed Identity authentication and geo-redundant storage.

---

## Introduction

Azure Blob Storage is Microsoft's object storage service, offering exceptional durability, geo-redundancy, and tight integration with AKS through Managed Identity. Using Velero with Azure Blob Storage and the `velero-plugin-for-microsoft-azure` plugin provides Kubernetes backup storage with the same reliability guarantees as Azure's storage infrastructure.

When running on AKS, you can use AAD Pod Identity or Workload Identity to authenticate Velero without managing service principal secrets. This guide covers setting up Azure Blob Storage as the Velero backend with Workload Identity for credential-free authentication.

## Prerequisites

- Velero installed on an AKS cluster
- Flux CD bootstrapped on the cluster
- Azure subscription with an AKS cluster that has Workload Identity enabled
- `az` and `kubectl` CLIs installed

## Step 1: Create the Azure Storage Account and Container

```bash
# Set variables
RESOURCE_GROUP="velero-backup-rg"
STORAGE_ACCOUNT="myclustervelerobackups"
CONTAINER="backups"
LOCATION="eastus"

# Create resource group for backup storage
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}"

# Create storage account with geo-redundant storage
az storage account create \
  --name "${STORAGE_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --sku Standard_GRS \
  --kind StorageV2 \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create the blob container for backups
az storage container create \
  --name "${CONTAINER}" \
  --account-name "${STORAGE_ACCOUNT}"
```

## Step 2: Configure Azure Workload Identity for Velero

```bash
# Create a managed identity for Velero
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
VELERO_IDENTITY_NAME="velero-backup-identity"

az identity create \
  --name "${VELERO_IDENTITY_NAME}" \
  --resource-group "${RESOURCE_GROUP}"

IDENTITY_CLIENT_ID=$(az identity show \
  --name "${VELERO_IDENTITY_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query clientId -o tsv)

# Grant the identity Contributor access to the storage account
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "${IDENTITY_CLIENT_ID}" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/${STORAGE_ACCOUNT}"

# Grant the identity Contributor access for disk snapshots
az role assignment create \
  --role "Contributor" \
  --assignee "${IDENTITY_CLIENT_ID}" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/YOUR-AKS-NODE-RESOURCE-GROUP"

# Create the federated identity credential for AKS Workload Identity
AKS_OIDC_ISSUER=$(az aks show \
  --name my-aks-cluster \
  --resource-group aks-resource-group \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name velero-federated-credential \
  --identity-name "${VELERO_IDENTITY_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --issuer "${AKS_OIDC_ISSUER}" \
  --subject "system:serviceaccount:velero:velero-server" \
  --audiences api://AzureADTokenExchange
```

## Step 3: Configure Velero HelmRelease for Azure

```yaml
# infrastructure/velero/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 10m
  chart:
    spec:
      chart: velero
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    initContainers:
      - name: velero-plugin-for-microsoft-azure
        image: velero/velero-plugin-for-microsoft-azure:v1.9.0
        volumeMounts:
          - mountPath: /target
            name: plugins

    # Use Workload Identity - no secret needed
    credentials:
      useSecret: false

    configuration:
      backupStorageLocation:
        - name: primary
          provider: azure
          bucket: backups
          config:
            resourceGroup: velero-backup-rg
            storageAccount: myclustervelerobackups
            subscriptionId: YOUR_SUBSCRIPTION_ID
          default: true
      volumeSnapshotLocation:
        - name: primary
          provider: azure
          config:
            resourceGroup: YOUR-AKS-NODE-RESOURCE-GROUP
            subscriptionId: YOUR_SUBSCRIPTION_ID
            incremental: "true"

    serviceAccount:
      server:
        create: true
        name: velero-server
        annotations:
          # Workload Identity annotation
          azure.workload.identity/client-id: "YOUR_MANAGED_IDENTITY_CLIENT_ID"

    podLabels:
      # Required for Workload Identity to inject the credential
      azure.workload.identity/use: "true"

    deployNodeAgent: true
    nodeAgent:
      podLabels:
        azure.workload.identity/use: "true"
```

## Step 4: Create the Velero Namespace with Workload Identity Labels

```yaml
# infrastructure/velero/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: velero
  labels:
    # Required for Azure Workload Identity webhook
    azure.workload.identity/use: "true"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/velero.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/velero
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: velero
      namespace: velero
```

## Step 6: Verify the Setup

```bash
# Check that Velero pods are running with Workload Identity
kubectl get pods -n velero -o yaml | grep -A5 "azure.workload.identity"

# Verify the backup storage location is available
kubectl get backupstoragelocation -n velero

# Create a test backup to verify connectivity
velero backup create azure-connectivity-test \
  --storage-location primary \
  --include-namespaces default \
  --ttl 1h --wait

# Verify the backup in Azure Blob Storage
az storage blob list \
  --container-name backups \
  --account-name myclustervelerobackups \
  --prefix "backups/azure-connectivity-test/" \
  --output table
```

## Best Practices

- Use Azure Blob Storage with the `Standard_GRS` SKU for geo-redundant backup storage. GRS replicates data to a paired region automatically.
- Use Workload Identity instead of service principal secrets for authentication. Workload Identity is more secure and eliminates secret rotation.
- Enable Azure Blob Storage soft delete (30 days recommended) to protect against accidental backup container deletion.
- Use incremental disk snapshots (`incremental: "true"`) for Azure Managed Disk snapshots to reduce snapshot costs significantly after the first full snapshot.
- Configure Azure Storage lifecycle management policies to automatically tier old backups to cool or archive storage.

## Conclusion

Velero is now configured with Azure Blob Storage as the backup backend, using Workload Identity for credential-free authentication on AKS. Backups are stored in a geo-redundant storage account, and disk snapshots use incremental mode for cost efficiency. All configuration is managed through Flux CD, ensuring the backup infrastructure is consistently applied and continuously reconciled.
