# How to Use Dapr Azure Bindings with Managed Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Managed Identity, Binding, Security

Description: Learn how to configure Dapr Azure bindings to use Azure Managed Identity and AKS Workload Identity for credential-free authentication to Azure services in production.

---

## Why Use Managed Identity for Dapr Azure Bindings?

Managed Identity eliminates the need to store, rotate, or audit static Azure credentials. Instead, your AKS pods get temporary tokens issued by Azure AD that automatically rotate. This is the most secure and operationally simple authentication approach for Dapr Azure bindings running in Kubernetes.

## Types of Managed Identity

**System-assigned**: Tied to the lifecycle of a specific Azure resource (VM, AKS node pool). Deleted when the resource is deleted.

**User-assigned**: Independent resource that can be assigned to multiple services. Preferred for Dapr - one identity per microservice or per binding type.

## Setting Up AKS Workload Identity for Dapr Bindings

### Step 1: Enable OIDC and Workload Identity on AKS

```bash
az aks update \
  --name production-cluster \
  --resource-group my-rg \
  --enable-oidc-issuer \
  --enable-workload-identity

OIDC_ISSUER=$(az aks show \
  --name production-cluster \
  --resource-group my-rg \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)
```

### Step 2: Create the User-Assigned Managed Identity

```bash
az identity create \
  --name dapr-storage-identity \
  --resource-group my-rg \
  --location eastus

IDENTITY_CLIENT_ID=$(az identity show \
  --name dapr-storage-identity \
  --resource-group my-rg \
  --query clientId --output tsv)

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --name dapr-storage-identity \
  --resource-group my-rg \
  --query principalId --output tsv)
```

### Step 3: Assign Azure RBAC Roles

```bash
STORAGE_RESOURCE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group my-rg \
  --query id --output tsv)

# Blob Storage
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope $STORAGE_RESOURCE_ID

# Storage Queues
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Storage Queue Data Contributor" \
  --scope $STORAGE_RESOURCE_ID

# Event Hubs (if needed)
EVENTHUBS_RESOURCE_ID=$(az eventhubs namespace show \
  --name my-eventhubs-namespace \
  --resource-group my-rg \
  --query id --output tsv)

az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Azure Event Hubs Data Owner" \
  --scope $EVENTHUBS_RESOURCE_ID
```

### Step 4: Federate the Identity with a Kubernetes Service Account

```bash
az identity federated-credential create \
  --name dapr-order-service-federated \
  --identity-name dapr-storage-identity \
  --resource-group my-rg \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:production:order-service" \
  --audiences api://AzureADTokenExchange
```

### Step 5: Create the Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
```

### Step 6: Configure Dapr Bindings Without Credentials

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: document-store
  namespace: production
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: containerName
      value: "documents"
    - name: azureClientId
      value: "<IDENTITY_CLIENT_ID>"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: task-queue
  namespace: production
spec:
  type: bindings.azure.storagequeues
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: queueName
      value: "task-queue"
    - name: azureClientId
      value: "<IDENTITY_CLIENT_ID>"
```

### Step 7: Configure Pod Labels for Workload Identity

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myrepo/order-service:latest
```

## Verifying Workload Identity

Check that the workload identity webhook has injected the required environment variables into the pod:

```bash
kubectl exec -it order-service-pod -- env | grep AZURE_
```

A successful configuration shows `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE`, and `AZURE_AUTHORITY_HOST`. You can also verify the projected service account token exists:

```bash
kubectl exec -it order-service-pod -- cat $AZURE_FEDERATED_TOKEN_FILE
```

This should output a signed JWT token that Dapr exchanges for an Azure AD access token via the federated credential.

## Summary

AKS Workload Identity with user-assigned Managed Identity provides the most secure authentication model for Dapr Azure bindings. Enable OIDC on AKS, create the identity, assign minimal RBAC roles, federate with a Kubernetes service account, and set `azureClientId` in your binding component. No secrets, no rotation, and no credential leakage risk - the token lifecycle is fully managed by Azure AD.
