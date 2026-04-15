# How to Authenticate Dapr with Azure Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Authentication, Managed Identity, Security

Description: Learn how to authenticate Dapr components with Azure services using service principals, managed identities, and workload identity federation for Key Vault, Service Bus, and more.

---

Dapr components that integrate with Azure services - Cosmos DB, Service Bus, Key Vault, Blob Storage - require Azure credentials. Dapr supports service principal credentials, managed identities, and Azure Workload Identity Federation.

## Authentication Method 1: Service Principal

Store client secret in a Kubernetes Secret and reference it in the component:

```bash
# Create a service principal
az ad sp create-for-rbac \
  --name dapr-service-principal \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-rg

# Store credentials as Kubernetes secret
kubectl create secret generic azure-sp-credentials \
  --from-literal=clientId="YOUR_CLIENT_ID" \
  --from-literal=clientSecret="YOUR_CLIENT_SECRET"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: https://mycosmosdb.documents.azure.com:443/
  - name: database
    value: dapr-state
  - name: collection
    value: states
  - name: azureTenantId
    value: "YOUR_TENANT_ID"
  - name: azureClientId
    secretKeyRef:
      name: azure-sp-credentials
      key: clientId
  - name: azureClientSecret
    secretKeyRef:
      name: azure-sp-credentials
      key: clientSecret
```

## Authentication Method 2: System-Assigned Managed Identity

When running on Azure VMs, AKS nodes, or Azure Container Apps, use managed identity:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: https://mycosmosdb.documents.azure.com:443/
  - name: database
    value: dapr-state
  - name: collection
    value: states
  # Omit azureClientId to use system-assigned managed identity
```

Grant the managed identity access to the Azure resource:

```bash
# Get the managed identity object ID
IDENTITY_OBJECT_ID=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query "identityProfile.kubeletidentity.objectId" \
  --output tsv)

# Assign Cosmos DB role
az cosmosdb sql role assignment create \
  --resource-group my-rg \
  --account-name mycosmosdb \
  --role-definition-id "00000000-0000-0000-0000-000000000002" \
  --principal-id "$IDENTITY_OBJECT_ID" \
  --scope "/subscriptions/YOUR_SUB_ID/resourceGroups/my-rg/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb"
```

## Authentication Method 3: User-Assigned Managed Identity

```bash
# Create user-assigned managed identity
az identity create \
  --name dapr-identity \
  --resource-group my-rg

# Get the client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name dapr-identity \
  --resource-group my-rg \
  --query clientId --output tsv)
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: https://mycosmosdb.documents.azure.com:443/
  - name: database
    value: dapr-state
  - name: collection
    value: states
  - name: azureClientId
    value: "YOUR_IDENTITY_CLIENT_ID"
```

## Authentication Method 4: Azure Workload Identity

For AKS with workload identity enabled:

```bash
# Enable workload identity on AKS
az aks update \
  --resource-group my-rg \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Create federated credential
az identity federated-credential create \
  --name dapr-federation \
  --identity-name dapr-identity \
  --resource-group my-rg \
  --issuer "$(az aks show -g my-rg -n my-aks-cluster --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject "system:serviceaccount:default:my-app" \
  --audience "api://AzureADTokenExchange"
```

## Summary

Dapr Azure component authentication follows a clear hierarchy: workload identity federation for AKS production workloads, managed identity for other Azure hosting environments, and service principal credentials for non-Azure or development environments. Workload identity is preferred because it requires no credential management and integrates with Azure RBAC for least-privilege access.
