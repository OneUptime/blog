# How to Use Dapr with Azure Workload Identity Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Workload Identity, AKS, Security, Federation

Description: Configure Azure Workload Identity Federation with Dapr on AKS to authenticate Azure components without secrets, using Kubernetes service account tokens.

---

Azure Workload Identity Federation allows Kubernetes service accounts to authenticate to Azure Active Directory without credentials. Dapr components use this mechanism to access Azure services like Key Vault, Service Bus, and Cosmos DB securely.

## Enable Workload Identity on AKS

```bash
# Enable OIDC issuer and workload identity on existing cluster
az aks update \
  --resource-group my-rg \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

echo "OIDC Issuer: $OIDC_ISSUER"
```

## Create the Azure Managed Identity

```bash
# Create user-assigned managed identity
az identity create \
  --name dapr-workload-identity \
  --resource-group my-rg \
  --location eastus

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name dapr-workload-identity \
  --resource-group my-rg \
  --query clientId --output tsv)

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name dapr-workload-identity \
  --resource-group my-rg \
  --query principalId --output tsv)

echo "Client ID: $IDENTITY_CLIENT_ID"
echo "Principal ID: $IDENTITY_PRINCIPAL_ID"
```

## Create the Federated Credential

```bash
# Create federated credential linking the Kubernetes service account to the Azure identity
az identity federated-credential create \
  --name dapr-k8s-federation \
  --identity-name dapr-workload-identity \
  --resource-group my-rg \
  --issuer "$OIDC_ISSUER" \
  --subject "system:serviceaccount:default:my-dapr-app" \
  --audiences "api://AzureADTokenExchange"
```

## Assign Azure RBAC Roles

```bash
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# Grant access to Key Vault
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/my-keyvault"

# Grant access to Service Bus
az role assignment create \
  --role "Azure Service Bus Data Owner" \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.ServiceBus/namespaces/my-servicebus"
```

## Create Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-dapr-app
  namespace: default
  annotations:
    azure.workload.identity/client-id: "YOUR_IDENTITY_CLIENT_ID"
```

## Configure Dapr Components for Workload Identity

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-keyvault
  - name: azureClientId
    value: "YOUR_IDENTITY_CLIENT_ID"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: my-servicebus.servicebus.windows.net
  - name: azureClientId
    value: "YOUR_IDENTITY_CLIENT_ID"
```

## Deploy with Workload Identity Labels

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-dapr-app
spec:
  selector:
    matchLabels:
      app: my-dapr-app
  template:
    metadata:
      labels:
        app: my-dapr-app
        azure.workload.identity/use: "true"
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-dapr-app"
        dapr.io/app-port: "8080"
    spec:
      serviceAccountName: my-dapr-app
      containers:
      - name: my-dapr-app
        image: myrepo/my-dapr-app:latest
```

## Verify the Configuration

```bash
# Check that the pod has the projected token volume
kubectl describe pod my-dapr-app-pod | grep -A5 "Volumes:"

# Test Key Vault access via Dapr
kubectl exec -it my-dapr-app-pod -c my-dapr-app -- \
  curl http://localhost:3500/v1.0/secrets/secretstore/my-secret
```

## Summary

Azure Workload Identity Federation replaces service principal secrets with Kubernetes-native OIDC tokens, eliminating credential rotation and secret leakage risks. Dapr components use the `azureClientId` metadata field to select the identity, and Azure RBAC controls exactly which services each identity can access. This approach is the recommended authentication pattern for all Dapr Azure integrations on AKS.
