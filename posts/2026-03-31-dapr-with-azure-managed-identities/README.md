# How to Use Dapr with Azure Managed Identities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Managed Identity, AKS, Security, Authentication

Description: Configure Dapr Azure components to use system-assigned and user-assigned managed identities on AKS and Azure Container Apps, eliminating credential management.

---

Azure Managed Identities provide an automatically managed identity for Azure-hosted services. Dapr components use managed identities to authenticate to Azure services like Key Vault, Service Bus, and Blob Storage without credentials in configuration files.

## System-Assigned Managed Identity on AKS

Enable the managed identity on the AKS cluster:

```bash
# Create AKS cluster with managed identity enabled
az aks create \
  --resource-group my-rg \
  --name my-aks-cluster \
  --enable-managed-identity \
  --generate-ssh-keys

# Get the kubelet managed identity object ID
IDENTITY_OBJECT_ID=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query "identityProfile.kubeletidentity.objectId" \
  --output tsv)

echo "Identity Object ID: $IDENTITY_OBJECT_ID"
```

## Assign RBAC Roles to the Identity

```bash
SUBSCRIPTION_ID=$(az account show --query id --output tsv)

# Grant Key Vault access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$IDENTITY_OBJECT_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/my-keyvault"

# Grant Service Bus access
az role assignment create \
  --role "Azure Service Bus Data Owner" \
  --assignee "$IDENTITY_OBJECT_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.ServiceBus/namespaces/my-servicebus"
```

## Configure Dapr with System-Assigned Identity

For system-assigned identity, omit `azureClientId` or set it to empty:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-keyvault
  # No credentials needed - uses AKS node managed identity
```

## User-Assigned Managed Identity

User-assigned identities provide more granular control:

```bash
# Create user-assigned identity
az identity create \
  --name dapr-app-identity \
  --resource-group my-rg

IDENTITY_CLIENT_ID=$(az identity show \
  --name dapr-app-identity \
  --resource-group my-rg \
  --query clientId --output tsv)

IDENTITY_RESOURCE_ID=$(az identity show \
  --name dapr-app-identity \
  --resource-group my-rg \
  --query id --output tsv)

# Assign the identity to the AKS node pool VMSS
NODE_RESOURCE_GROUP=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query nodeResourceGroup --output tsv)

VMSS_NAME=$(az vmss list \
  --resource-group "$NODE_RESOURCE_GROUP" \
  --query "[0].name" --output tsv)

az vmss identity assign \
  --resource-group "$NODE_RESOURCE_GROUP" \
  --name "$VMSS_NAME" \
  --identities "$IDENTITY_RESOURCE_ID"
```

```yaml
# Use user-assigned identity in Dapr component
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: my-servicebus.servicebus.windows.net
  - name: azureClientId
    value: "YOUR_IDENTITY_CLIENT_ID"
```

## Managed Identity on Azure Container Apps

```bash
# Create Container App Environment
az containerapp env create \
  --name dapr-environment \
  --resource-group my-rg \
  --location eastus

# Create container app with managed identity
az containerapp create \
  --name my-dapr-app \
  --resource-group my-rg \
  --environment dapr-environment \
  --image myrepo/my-app:latest \
  --enable-dapr \
  --dapr-app-id my-dapr-app \
  --dapr-app-port 8080 \
  --system-assigned
```

```bash
# Get the Container App managed identity principal ID
PRINCIPAL_ID=$(az containerapp show \
  --name my-dapr-app \
  --resource-group my-rg \
  --query "identity.principalId" --output tsv)

# Assign roles
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$PRINCIPAL_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/my-rg/providers/Microsoft.KeyVault/vaults/my-keyvault"
```

## Verify the Managed Identity

```bash
# Test from within a pod
kubectl exec -it my-dapr-app-pod -- \
  curl http://localhost:3500/v1.0/secrets/secretstore/test-secret

# Check the Dapr sidecar logs for auth errors
kubectl logs my-dapr-app-pod -c daprd | grep -i "auth\|identity\|token"
```

## Summary

Azure Managed Identities provide credential-free authentication for Dapr components on AKS and Azure Container Apps. System-assigned identities are simpler to set up but share access across all pods on a node, while user-assigned identities offer per-pod access control. For maximum isolation, combine user-assigned managed identities with workload identity federation, assigning only the minimum required RBAC roles to each identity.
