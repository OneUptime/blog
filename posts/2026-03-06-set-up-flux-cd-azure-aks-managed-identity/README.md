# How to Set Up Flux CD on Azure AKS with Managed Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, Azure, AKS, managed-identity, GitOps, Kubernetes, RBAC

Description: A step-by-step guide to deploying Flux CD on Azure Kubernetes Service using managed identities for secure, passwordless authentication.

---

## Introduction

Flux CD is a powerful GitOps toolkit for Kubernetes that keeps your clusters in sync with configuration stored in Git repositories and OCI artifacts. When running on Azure Kubernetes Service (AKS), you can leverage managed identities to eliminate the need for storing credentials, providing a more secure and maintainable setup.

This guide walks you through setting up Flux CD on AKS with both system-assigned and user-assigned managed identities, configuring Azure Container Registry (ACR) pull access, and setting up proper RBAC permissions.

## Prerequisites

Before you begin, ensure you have the following tools installed and configured:

- Azure CLI (v2.50 or later)
- kubectl (v1.28 or later)
- Flux CLI (v2.2 or later)
- An active Azure subscription
- An Azure DevOps or GitHub repository for your GitOps configuration

## Step 1: Create an AKS Cluster with Managed Identity

AKS clusters created with the Azure CLI use system-assigned managed identity by default. Let us create a new cluster with this enabled.

```bash
# Set variables for reuse throughout the guide
export RESOURCE_GROUP="rg-fluxcd-demo"
export CLUSTER_NAME="aks-fluxcd-demo"
export LOCATION="eastus"
export ACR_NAME="acrfluxcddemo"

# Create a resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create an AKS cluster with system-assigned managed identity
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --node-count 3 \
  --enable-managed-identity \
  --generate-ssh-keys \
  --network-plugin azure \
  --network-policy calico
```

## Step 2: Retrieve Cluster Credentials

Get the kubeconfig for your new AKS cluster so you can interact with it using kubectl.

```bash
# Get credentials for kubectl
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --overwrite-existing

# Verify connectivity
kubectl get nodes
```

## Step 3: Understand System-Assigned vs User-Assigned Managed Identity

AKS supports two types of managed identities:

### System-Assigned Managed Identity

A system-assigned identity is tied to the lifecycle of the AKS cluster. When the cluster is deleted, the identity is automatically removed. This is the default when you create an AKS cluster.

```bash
# Retrieve the system-assigned managed identity principal ID
export IDENTITY_PRINCIPAL_ID=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "identity.principalId" \
  --output tsv)

echo "System-assigned identity principal ID: $IDENTITY_PRINCIPAL_ID"
```

### User-Assigned Managed Identity

A user-assigned identity exists independently of the cluster and can be shared across multiple resources. This is useful when you need more control over the identity lifecycle.

```bash
# Create a user-assigned managed identity
export IDENTITY_NAME="id-fluxcd-demo"

az identity create \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --location $LOCATION

# Get the identity resource ID and client ID
export USER_IDENTITY_RESOURCE_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --query "id" \
  --output tsv)

export USER_IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --query "clientId" \
  --output tsv)

echo "User-assigned identity client ID: $USER_IDENTITY_CLIENT_ID"
```

## Step 4: Enable Workload Identity on AKS

Workload identity allows Flux CD pods to authenticate with Azure services using a Kubernetes service account federated with a managed identity.

```bash
# Update the AKS cluster to enable workload identity and OIDC issuer
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
export OIDC_ISSUER=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

echo "OIDC Issuer URL: $OIDC_ISSUER"
```

## Step 5: Set Up ACR Pull Access with Managed Identity

Create an Azure Container Registry and grant your managed identity pull access.

```bash
# Create an Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard

# Get the ACR resource ID
export ACR_ID=$(az acr show \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --query "id" \
  --output tsv)

# Grant AcrPull role to the user-assigned managed identity
az role assignment create \
  --assignee $USER_IDENTITY_CLIENT_ID \
  --role "AcrPull" \
  --scope $ACR_ID
```

## Step 6: Create Federated Credential for Flux CD

Set up the federation between the Kubernetes service account used by Flux CD and the managed identity.

```bash
# Create a federated credential for the source-controller service account
az identity federated-credential create \
  --name "flux-source-controller" \
  --identity-name $IDENTITY_NAME \
  --resource-group $RESOURCE_GROUP \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:flux-system:source-controller" \
  --audiences "api://AzureADTokenExchange"

# Create a federated credential for the kustomize-controller service account
az identity federated-credential create \
  --name "flux-kustomize-controller" \
  --identity-name $IDENTITY_NAME \
  --resource-group $RESOURCE_GROUP \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:flux-system:kustomize-controller" \
  --audiences "api://AzureADTokenExchange"
```

## Step 7: Install Flux CD on AKS

Bootstrap Flux CD with the managed identity configuration.

```bash
# Bootstrap Flux CD using a GitHub repository
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/aks-fluxcd-demo \
  --personal
```

## Step 8: Patch Flux Service Accounts for Workload Identity

After Flux is installed, annotate the service accounts with the managed identity client ID.

```yaml
# File: clusters/aks-fluxcd-demo/flux-system/patches/workload-identity.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    # Associate the service account with the user-assigned managed identity
    azure.workload.identity/client-id: "<USER_IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    # Associate the service account with the user-assigned managed identity
    azure.workload.identity/client-id: "<USER_IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
```

Apply the patches using a Kustomization overlay:

```yaml
# File: clusters/aks-fluxcd-demo/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/workload-identity.yaml
    target:
      kind: ServiceAccount
```

## Step 9: Configure RBAC for Flux CD

Create appropriate Kubernetes RBAC roles to limit what Flux CD can manage in your cluster.

```yaml
# File: clusters/aks-fluxcd-demo/rbac/flux-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-deployer
rules:
  # Allow Flux to manage common Kubernetes resources
  - apiGroups: [""]
    resources: ["namespaces", "configmaps", "secrets", "services", "serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-deployer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-deployer
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Step 10: Configure an OCI Source from ACR

Now that managed identity is configured, set up an OCI repository source pointing to your Azure Container Registry.

```yaml
# File: clusters/aks-fluxcd-demo/sources/acr-oci-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://<ACR_NAME>.azurecr.io/manifests/app
  ref:
    tag: latest
  provider: azure
  # The 'azure' provider tells Flux to use workload identity
  # or managed identity for authentication automatically
```

## Step 11: Verify the Setup

Confirm that Flux CD is running and can authenticate with Azure services.

```bash
# Check Flux components are healthy
flux check

# Verify all Flux resources are reconciled
flux get all

# Check source-controller logs for authentication issues
kubectl logs -n flux-system deployment/source-controller \
  --tail=50

# Verify the OCI repository source is ready
flux get sources oci
```

## Troubleshooting

### Common Issues

**Identity not found errors**: Ensure the federated credentials are created with the exact service account name and namespace.

```bash
# List federated credentials to verify
az identity federated-credential list \
  --identity-name $IDENTITY_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table
```

**ACR pull failures**: Verify the role assignment is correct.

```bash
# Check role assignments on the ACR
az role assignment list \
  --scope $ACR_ID \
  --output table
```

**OIDC issuer mismatch**: Ensure the OIDC issuer URL in the federated credential matches the cluster.

```bash
# Verify the OIDC issuer URL
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv
```

## Cleanup

To remove all resources created in this guide:

```bash
# Delete the resource group and all contained resources
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait
```

## Conclusion

You have successfully set up Flux CD on Azure AKS with managed identity authentication. This approach eliminates the need for storing long-lived credentials, improves security posture, and simplifies credential rotation. The workload identity federation ensures that Flux controllers can securely access Azure Container Registry and other Azure services without any static secrets.
