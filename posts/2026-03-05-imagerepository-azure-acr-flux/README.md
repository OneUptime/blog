# How to Configure ImageRepository for Azure ACR in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Azure ACR, Azure Container Registry

Description: Learn how to configure a Flux ImageRepository to scan Azure Container Registry for container image tags.

---

Azure Container Registry (ACR) is a managed Docker registry service from Microsoft Azure. Flux supports scanning ACR for image tags using the ImageRepository resource. This guide covers how to configure authentication and set up scanning for both public and private ACR repositories.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An Azure subscription with an ACR instance
- Azure CLI installed and configured
- kubectl access to your cluster

## Understanding ACR Authentication with Flux

Azure ACR supports several authentication methods. Flux provides native Azure provider support through the image reflector controller, which uses Azure Managed Identity or workload identity to obtain tokens. Alternatively, you can use ACR admin credentials or service principal credentials stored in a Kubernetes Secret.

## Step 1: Use Native Azure Provider Authentication

The recommended approach on AKS is to use the `provider: azure` field, which integrates with Azure workload identity.

```yaml
# imagerepository-acr.yaml
# Scan an Azure ACR image using native Azure provider authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: myregistry.azurecr.io/my-app
  interval: 5m0s
  provider: azure
```

Apply the manifest.

```bash
# Apply the ACR ImageRepository
kubectl apply -f imagerepository-acr.yaml
```

## Step 2: Configure Azure Workload Identity

For the `provider: azure` to work, set up Azure Workload Identity for the image reflector controller.

Create a managed identity in Azure.

```bash
# Create a managed identity for Flux image reflector
az identity create \
  --name flux-image-reflector \
  --resource-group my-resource-group \
  --location eastus
```

Grant the managed identity pull access to your ACR.

```bash
# Get the managed identity principal ID
IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name flux-image-reflector \
  --resource-group my-resource-group \
  --query principalId -o tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show --name myregistry --query id -o tsv)

# Assign AcrPull role to the managed identity
az role assignment create \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --role AcrPull \
  --scope "$ACR_ID"
```

Create a federated credential for the Flux service account.

```bash
# Get the managed identity client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name flux-image-reflector \
  --resource-group my-resource-group \
  --query clientId -o tsv)

# Get the OIDC issuer URL of your AKS cluster
AKS_OIDC_ISSUER=$(az aks show \
  --name my-aks-cluster \
  --resource-group my-resource-group \
  --query oidcIssuerProfile.issuerUrl -o tsv)

# Create the federated credential
az identity federated-credential create \
  --name flux-image-reflector-federated \
  --identity-name flux-image-reflector \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:flux-system:image-reflector-controller \
  --audiences api://AzureADTokenExchange
```

Annotate the image reflector controller ServiceAccount.

```yaml
# Patch the image-reflector-controller ServiceAccount for Azure Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    # Associate the Azure managed identity
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
```

## Step 3: Use ACR Admin Credentials

For a simpler setup (not recommended for production), you can use ACR admin credentials.

```bash
# Enable ACR admin user
az acr update --name myregistry --admin-enabled true

# Get the admin credentials
ACR_USERNAME=$(az acr credential show --name myregistry --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name myregistry --query "passwords[0].value" -o tsv)

# Create a Kubernetes secret with ACR admin credentials
kubectl create secret docker-registry acr-credentials \
  --docker-server=myregistry.azurecr.io \
  --docker-username="$ACR_USERNAME" \
  --docker-password="$ACR_PASSWORD" \
  -n flux-system
```

Reference the Secret in the ImageRepository.

```yaml
# imagerepository-acr-admin.yaml
# Scan ACR using admin credentials
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: myregistry.azurecr.io/my-app
  interval: 5m0s
  secretRef:
    name: acr-credentials
```

## Step 4: Use a Service Principal

For production environments without workload identity, use a service principal.

```bash
# Create a service principal with AcrPull role
ACR_ID=$(az acr show --name myregistry --query id -o tsv)
SP_CREDENTIALS=$(az ad sp create-for-rbac \
  --name flux-acr-reader \
  --role AcrPull \
  --scopes "$ACR_ID" \
  --query "{appId: appId, password: password}" -o json)

SP_APP_ID=$(echo "$SP_CREDENTIALS" | jq -r '.appId')
SP_PASSWORD=$(echo "$SP_CREDENTIALS" | jq -r '.password')

# Create a Kubernetes secret with the service principal credentials
kubectl create secret docker-registry acr-sp-credentials \
  --docker-server=myregistry.azurecr.io \
  --docker-username="$SP_APP_ID" \
  --docker-password="$SP_PASSWORD" \
  -n flux-system
```

## Step 5: Attach ACR to AKS (Alternative)

If your AKS cluster is attached to ACR, the kubelet identity has pull access. However, Flux uses its own identity and needs separate configuration.

```bash
# Attach ACR to AKS (this grants the kubelet identity access, not Flux)
az aks update \
  --name my-aks-cluster \
  --resource-group my-resource-group \
  --attach-acr myregistry
```

This alone is not sufficient for Flux. You still need to configure the `provider: azure` field or provide credentials via a Secret.

## Step 6: Verify the ACR ImageRepository

```bash
# Check the ImageRepository status
flux get image repository my-app -n flux-system

# Get detailed status
kubectl describe imagerepository my-app -n flux-system
```

## Troubleshooting

- **401 Unauthorized**: Verify the credentials or managed identity configuration.
- **AADSTS error**: Ensure the federated credential is correctly configured for workload identity.
- **Role assignment missing**: Confirm the managed identity or service principal has the `AcrPull` role on the ACR.

```bash
# Check logs for ACR-related errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "acr\|azure\|unauthorized"
```

## Summary

You have configured Flux to scan Azure Container Registry for image tags. Using Azure Workload Identity with the `provider: azure` field is the recommended approach for AKS clusters. With the ImageRepository scanning your ACR, you can pair it with ImagePolicy resources to automate image updates in your GitOps workflow.
