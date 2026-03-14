# How to Configure Flux with Workload Identity for Blob Storage on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Workload Identity, Blob Storage, Storage

Description: Learn how to configure Flux on AKS to use Azure Workload Identity for accessing Kubernetes manifests and Helm charts stored in Azure Blob Storage.

---

## Introduction

Azure Blob Storage can serve as a source for Kubernetes manifests, Helm charts, and OCI artifacts that Flux reconciles into your cluster. When your Blob Storage container is private, Flux needs credentials to access it. Workload Identity provides a secure way to authenticate Flux controllers to Azure Blob Storage without storing any connection strings or account keys in your cluster.

This guide covers the end-to-end setup of Flux on AKS using Workload Identity to pull deployment artifacts from a private Azure Blob Storage container.

## Prerequisites

- An Azure subscription
- Azure CLI version 2.47 or later
- An AKS cluster with OIDC issuer and workload identity enabled
- Flux CLI version 2.0 or later
- An Azure Storage account with a blob container

## Step 1: Create a Storage Account and Container

Create a storage account and a container to hold your Flux source artifacts:

```bash
az storage account create \
  --resource-group my-resource-group \
  --name myfluxstorage \
  --location eastus \
  --sku Standard_LRS

az storage container create \
  --account-name myfluxstorage \
  --name flux-artifacts \
  --auth-mode login
```

## Step 2: Enable OIDC Issuer and Workload Identity

Ensure your AKS cluster has the required features:

```bash
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

export AKS_OIDC_ISSUER=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
```

## Step 3: Create a Managed Identity for Flux

Create a user-assigned managed identity that the Flux source controller will use:

```bash
az identity create \
  --resource-group my-resource-group \
  --name flux-blob-identity \
  --location eastus

export IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name flux-blob-identity \
  --query clientId -o tsv)

export IDENTITY_OBJECT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name flux-blob-identity \
  --query principalId -o tsv)
```

## Step 4: Grant Blob Storage Access

Assign the Storage Blob Data Reader role to the managed identity:

```bash
STORAGE_ID=$(az storage account show \
  --name myfluxstorage \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id "$IDENTITY_OBJECT_ID" \
  --role "Storage Blob Data Reader" \
  --scope "$STORAGE_ID"
```

## Step 5: Create a Federated Identity Credential

Link the Flux source controller service account to the managed identity:

```bash
az identity federated-credential create \
  --name flux-blob-federated \
  --identity-name flux-blob-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:flux-system:source-controller \
  --audience api://AzureADTokenExchange
```

## Step 6: Patch the Flux Source Controller Service Account

After bootstrapping Flux, annotate the source controller service account with the managed identity client ID:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-flux-cluster \
  --personal
```

Then patch the service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    azure.workload.identity/client-id: "${IDENTITY_CLIENT_ID}"
  labels:
    azure.workload.identity/use: "true"
```

Apply this patch to the source controller deployment to ensure the workload identity webhook injects the required environment variables and token volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
```

You can manage these patches through a Kustomization overlay in your Git repository.

## Step 7: Upload Artifacts to Blob Storage

Package and upload your Kubernetes manifests to the blob container:

```bash
tar -czf artifacts.tar.gz -C ./deploy .

az storage blob upload \
  --account-name myfluxstorage \
  --container-name flux-artifacts \
  --name artifacts.tar.gz \
  --file artifacts.tar.gz \
  --auth-mode login
```

## Step 8: Create a Bucket Source in Flux

Define a Bucket source that points to your Azure Blob Storage container:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: azure-blob-source
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: flux-artifacts
  endpoint: https://myfluxstorage.blob.core.windows.net
```

The `provider: azure` field tells Flux to use the Azure credential chain, which will pick up the workload identity token from the source controller pod.

## Step 9: Create a Kustomization from the Bucket Source

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: blob-deployed-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: Bucket
    name: azure-blob-source
  path: ./
  prune: true
  targetNamespace: default
```

## Verifying the Setup

Check the Bucket source status:

```bash
flux get sources bucket
```

Verify that the Kustomization is reconciling:

```bash
flux get kustomizations
```

If there are issues, check the source controller logs:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i blob
```

## Troubleshooting

**401 Unauthorized errors**: Confirm that the federated credential subject matches `system:serviceaccount:flux-system:source-controller` exactly.

**Identity not available**: Make sure both the service account annotation and the pod label for workload identity are set. The webhook needs both to inject the token volume.

**Blob not found**: Verify the bucket name and endpoint URL match your storage account configuration. The endpoint should include the full URL with `https://`.

## Conclusion

Using Workload Identity with Flux and Azure Blob Storage eliminates the need for storage account keys or SAS tokens in your cluster. The Flux source controller authenticates transparently through federated identity tokens, and all configuration lives in your Git repository as declarative YAML. This approach aligns with security best practices and fits naturally into a GitOps workflow on AKS.
