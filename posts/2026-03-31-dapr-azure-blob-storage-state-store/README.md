# How to Configure Dapr with Azure Blob Storage State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Blob Storage, State Store, Cloud

Description: Learn how to configure Dapr with Azure Blob Storage as a state store, using Azure's object storage service to persist microservice state as blobs.

---

## Overview

Azure Blob Storage is Microsoft's massively scalable object storage service. While not a traditional key-value store, Dapr's Azure Blob Storage state store component stores each state value as an individual blob, making it suitable for large state objects, binary data, or scenarios where you want to inspect state through the Azure portal or CLI.

## Prerequisites

- An Azure subscription with a Storage Account
- Dapr CLI and runtime installed
- Azure CLI for setup

## Creating the Azure Storage Account

```bash
# Create resource group
az group create --name dapr-storage-rg --location eastus

# Create storage account
az storage account create \
  --name daprstatestg001 \
  --resource-group dapr-storage-rg \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Create container for Dapr state
az storage container create \
  --name dapr-state \
  --account-name daprstatestg001 \
  --auth-mode login
```

Get the connection string:

```bash
az storage account show-connection-string \
  --name daprstatestg001 \
  --resource-group dapr-storage-rg \
  --query connectionString -o tsv
```

## Configuring the Dapr Component

Create a Kubernetes secret with the storage connection string:

```bash
kubectl create secret generic blob-secret \
  --from-literal=accountKey="<your-storage-account-key>"
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: blob-statestore
  namespace: default
spec:
  type: state.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: "daprstatestg001"
  - name: accountKey
    secretKeyRef:
      name: blob-secret
      key: accountKey
  - name: containerName
    value: "dapr-state"
```

For Managed Identity authentication (recommended for production):

```yaml
  - name: azureClientId
    value: "your-managed-identity-client-id"
```

Apply the component:

```bash
kubectl apply -f blob-statestore.yaml
```

## Using the Blob Storage State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store a large configuration document as state
await client.state.save("blob-statestore", [
  {
    key: "app-schema-v4",
    value: {
      version: 4,
      tables: [
        { name: "users", columns: ["id", "email", "created_at"] },
        { name: "orders", columns: ["id", "user_id", "total", "status"] }
      ],
      migrations: []
    }
  }
]);

const schema = await client.state.get("blob-statestore", "app-schema-v4");
console.log("Schema version:", schema.version);
```

## Inspecting State in Azure Portal

Since each state value is stored as a separate blob, you can browse, download, and modify state directly:

```bash
# List all state blobs
az storage blob list \
  --container-name dapr-state \
  --account-name daprstatestg001 \
  --auth-mode login \
  --query "[].name" -o table

# Download a specific state blob
az storage blob download \
  --container-name dapr-state \
  --name "app-schema-v4" \
  --file schema.json \
  --account-name daprstatestg001 \
  --auth-mode login
```

## Summary

Azure Blob Storage as a Dapr state store is well-suited for large state objects and scenarios where human-readable state inspection via the Azure portal is valuable. Its virtually unlimited storage capacity and deep Azure integration make it a practical choice for microservices that store document-like or binary state payloads.
