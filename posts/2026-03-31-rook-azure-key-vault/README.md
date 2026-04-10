# How to Set Up Azure Key Vault with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Azure, Security

Description: Integrate Azure Key Vault as a KMS backend for Rook-Ceph encrypted volumes using service principal or managed identity authentication.

---

## Overview

Azure Key Vault provides centralized secret and key management for workloads running in Azure Kubernetes Service (AKS) or any Kubernetes cluster with Azure connectivity. Rook-Ceph supports Azure Key Vault as a KMS backend through ceph-csi, storing per-volume encryption passphrases as secrets in Azure Key Vault.

## Prerequisites

- Azure subscription with Key Vault service
- Kubernetes cluster with network access to Azure Key Vault
- Azure Service Principal or Managed Identity with Key Vault access
- Rook-Ceph 1.14 or later

## Step 1 - Create an Azure Key Vault

```bash
az group create --name rook-ceph-rg --location eastus
az keyvault create \
  --name rook-ceph-kv \
  --resource-group rook-ceph-rg \
  --location eastus \
  --sku premium
```

## Step 2 - Create a Service Principal with Certificate Authentication

```bash
# Create service principal with certificate-based authentication
az ad sp create-for-rbac \
  --name rook-ceph-kv-sp \
  --create-cert
```

Note the `appId`, `tenant`, and `fileWithCertAndPrivateKey` from the output.

## Step 3 - Grant Key Vault Access to the Service Principal

```bash
# Grant Key Vault secret permissions (ceph-csi stores passphrases as secrets)
az keyvault set-policy \
  --name rook-ceph-kv \
  --spn <service-principal-app-id> \
  --secret-permissions get set delete
```

## Step 4 - Store the Certificate as a Kubernetes Secret

```bash
kubectl create secret generic azure-kv-credentials \
  --from-file=CLIENT_CERT=<path-to-certificate.pem> \
  -n rook-ceph
```

## Step 5 - Configure the KMS ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "azure-kv-kms": {
        "KMS_PROVIDER": "azure-kv",
        "AZURE_VAULT_URL": "https://rook-ceph-kv.vault.azure.net/",
        "AZURE_CLIENT_ID": "<service-principal-app-id>",
        "AZURE_TENANT_ID": "<azure-tenant-id>",
        "AZURE_CERT_SECRET_NAME": "azure-kv-credentials"
      }
    }
```

## Step 6 - Create an Encrypted StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-azure-kv
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  encrypted: "true"
  encryptionKMSID: azure-kv-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Workload Identity (AKS Recommended)

For AKS clusters, use Workload Identity instead of service principal secrets:

```bash
# Enable workload identity on AKS
az aks update --resource-group rook-rg --name rook-aks \
  --enable-workload-identity --enable-oidc-issuer

# Create a managed identity and federate it
az identity create --name rook-ceph-identity --resource-group rook-rg
az keyvault set-policy --name rook-ceph-kv \
  --object-id <managed-identity-principal-id> \
  --secret-permissions get set delete
```

## Summary

Azure Key Vault integration in Rook-Ceph provides centralized encryption passphrase management for workloads on Azure. Per-volume encryption passphrases are stored as secrets in Azure Key Vault, keeping sensitive key material in a managed service rather than on the cluster. For AKS environments, Workload Identity eliminates service principal credential management entirely.
