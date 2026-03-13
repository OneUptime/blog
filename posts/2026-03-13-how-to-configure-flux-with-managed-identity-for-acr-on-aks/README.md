# How to Configure Flux with Managed Identity for ACR on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Managed Identity, ACR, Azure Container Registry

Description: Learn how to configure Flux CD to pull container images from Azure Container Registry using Managed Identity on AKS, eliminating the need for image pull secrets.

---

## Introduction

When running workloads on Azure Kubernetes Service, pulling container images from Azure Container Registry is a core requirement. Traditionally, teams rely on image pull secrets or service principal credentials to authenticate with ACR. Managed Identity offers a cleaner, more secure alternative by letting your AKS nodes authenticate to ACR without storing any credentials.

Flux CD, the GitOps toolkit for Kubernetes, can leverage this Managed Identity integration to reconcile deployments that reference images in ACR. This guide walks through the complete setup process, from enabling Managed Identity on your AKS cluster to configuring Flux source controllers to authenticate with ACR seamlessly.

## Prerequisites

Before you begin, make sure you have the following in place:

- An Azure subscription with permissions to create and manage AKS clusters and ACR instances
- Azure CLI version 2.40 or later installed
- kubectl configured to communicate with your cluster
- Flux CLI installed (version 2.0 or later)

## Step 1: Create an ACR Instance

If you do not already have an Azure Container Registry, create one:

```bash
az acr create \
  --resource-group my-resource-group \
  --name myfluxacr \
  --sku Standard \
  --location eastus
```

Note the login server output, which will look like `myfluxacr.azurecr.io`. You will reference this in your Flux configuration.

## Step 2: Create an AKS Cluster with Managed Identity

Create an AKS cluster with system-assigned managed identity enabled:

```bash
az aks create \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --node-count 2 \
  --enable-managed-identity \
  --generate-ssh-keys
```

If you already have an AKS cluster, verify that it uses managed identity:

```bash
az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query identity
```

## Step 3: Attach ACR to AKS

The simplest way to grant your AKS cluster pull access to ACR is with the `az aks update` command:

```bash
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --attach-acr myfluxacr
```

This command assigns the AcrPull role to the kubelet managed identity on the specified ACR. You can verify the role assignment:

```bash
ACR_ID=$(az acr show --name myfluxacr --query id -o tsv)
KUBELET_IDENTITY=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query identityProfile.kubeletidentity.objectId -o tsv)

az role assignment list \
  --assignee "$KUBELET_IDENTITY" \
  --scope "$ACR_ID" \
  --output table
```

## Step 4: Bootstrap Flux on AKS

Get credentials for your cluster and bootstrap Flux:

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-flux-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-flux-cluster \
  --personal
```

Flux will install its controllers and begin reconciling from the specified Git repository.

## Step 5: Configure an OCIRepository Source for ACR

With the ACR attachment in place, the kubelet identity already has pull access. Create an OCIRepository source that points to your ACR:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myfluxacr.azurecr.io/my-app
  ref:
    tag: latest
  provider: azure
```

The `provider: azure` field tells the Flux source controller to use the Azure credential chain, which includes the managed identity assigned to the node. Save this file in your Git repository under the cluster path and push it. Flux will pick up the change and begin pulling artifacts from ACR.

## Step 6: Deploy a Kustomization Using the OCI Source

Create a Kustomization resource that references the OCIRepository:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: my-app
  path: ./deploy
  prune: true
  targetNamespace: default
```

## Step 7: Configure Image Automation with ACR

If you want Flux to automatically update image tags when new versions are pushed to ACR, set up an ImageRepository:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: myfluxacr.azurecr.io/my-app
  interval: 5m
  provider: azure
```

Then define an ImagePolicy to select the latest semver tag:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

## Verifying the Configuration

Check that all Flux resources are healthy:

```bash
flux get sources oci
flux get kustomizations
flux get images repository
```

You should see all resources reporting a ready state with no authentication errors. If you encounter issues, inspect the source controller logs:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i acr
```

## Troubleshooting Common Issues

**Authentication failures**: Ensure the ACR attachment completed successfully. Run `az aks check-acr --name my-flux-cluster --resource-group my-resource-group --acr myfluxacr.azurecr.io` to validate connectivity.

**Identity not found**: If the kubelet identity was recently created, allow a few minutes for the role assignment to propagate before retrying.

**Provider field missing**: Without `provider: azure` in your source definitions, Flux will not attempt managed identity authentication and will fail with anonymous pull errors on private registries.

## Conclusion

Using Managed Identity to connect Flux with ACR on AKS removes the operational burden of managing image pull secrets and rotating credentials. The integration is straightforward: attach ACR to AKS, set the provider field to azure in your Flux sources, and let the managed identity handle authentication. This approach follows Azure security best practices and keeps your GitOps pipeline clean and maintainable.
