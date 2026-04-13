# How to Use Dapr with Workload Identity Federation on AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AKS, Workload Identity, Azure, Authentication

Description: Configure Dapr components on AKS to use Azure Workload Identity Federation for credential-free authentication to Azure services like Key Vault and Service Bus.

---

## What Is Azure Workload Identity Federation?

Azure Workload Identity Federation (the successor to AAD Pod Identity) allows Kubernetes pods to authenticate to Azure services using their Kubernetes service account identity, without needing to manage Azure credentials. It works by federating the Kubernetes OIDC token with Microsoft Entra ID to obtain Azure access tokens.

## Prerequisites

- AKS cluster with Workload Identity enabled
- Azure CLI
- `kubectl` and `helm` installed

## Step 1 - Enable Workload Identity on AKS

```bash
# Enable OIDC issuer and Workload Identity
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show --resource-group myRG --name myAKS \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
echo "OIDC Issuer: $OIDC_ISSUER"
```

## Step 2 - Create Azure Managed Identity

```bash
# Create user-assigned managed identity
az identity create \
  --name dapr-workload-identity \
  --resource-group myRG

# Get the identity's client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name dapr-workload-identity \
  --resource-group myRG \
  --query clientId -o tsv)
```

## Step 3 - Grant Azure Permissions

```bash
# Grant Key Vault Secrets User role
az role assignment create \
  --assignee $IDENTITY_CLIENT_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.KeyVault/vaults/myKeyVault
```

## Step 4 - Create Federated Identity Credential

```bash
az identity federated-credential create \
  --name dapr-federation \
  --identity-name dapr-workload-identity \
  --resource-group myRG \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:production:my-app" \
  --audience "api://AzureADTokenExchange"
```

## Step 5 - Annotate Kubernetes ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
```

## Step 6 - Configure Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "myKeyVault"
```

## Step 7 - Label the Pod for Workload Identity

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: my-app
```

## Verifying the Integration

```bash
# Test Key Vault secret retrieval
curl http://localhost:3500/v1.0/secrets/azure-keyvault/my-secret

# Check sidecar logs for auth errors
kubectl logs <pod-name> -c daprd | grep -i "azure\|keyvault\|token"
```

## Summary

Azure Workload Identity Federation on AKS eliminates Azure credential management by linking Kubernetes service accounts to Azure managed identities via OIDC federation. Enable Workload Identity on AKS, create a managed identity, create a federated credential binding the K8s SA to the Azure identity, annotate the ServiceAccount, and reference the client ID in Dapr component configuration.
