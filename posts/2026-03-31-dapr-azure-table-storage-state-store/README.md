# How to Configure Dapr with Azure Table Storage State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Table Storage, State Store, Cloud

Description: Learn how to configure Dapr with Azure Table Storage as a state store, a cost-effective NoSQL option for storing structured microservice state at scale on Azure.

---

## Overview

Azure Table Storage is a NoSQL key-value store that offers massively scalable structured data storage at low cost. It is part of Azure Storage accounts and provides a simple schema-less data model. As a Dapr state store, Azure Table Storage is a cost-efficient choice for microservices that need durable state without the complexity or cost of Cosmos DB.

## Prerequisites

- An Azure subscription with a Storage Account
- Dapr CLI and runtime installed
- Azure CLI for provisioning

## Setting Up Azure Table Storage

```bash
# Create a storage account (reuse an existing one if available)
az storage account create \
  --name daprstatestg \
  --resource-group dapr-rg \
  --sku Standard_LRS \
  --kind StorageV2

# Create a table for Dapr state
az storage table create \
  --name DaprState \
  --account-name daprstatestg \
  --auth-mode login
```

Get the storage account key:

```bash
az storage account keys list \
  --account-name daprstatestg \
  --resource-group dapr-rg \
  --query "[0].value" -o tsv
```

## Configuring the Dapr Component

Create the secret and component:

```bash
kubectl create secret generic table-storage-secret \
  --from-literal=accountKey=YOUR_STORAGE_ACCOUNT_KEY
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: table-statestore
  namespace: default
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: accountName
    value: "daprstatestg"
  - name: accountKey
    secretKeyRef:
      name: table-storage-secret
      key: accountKey
  - name: tableName
    value: "DaprState"
  - name: cosmosDbMode
    value: "false"
```

Set `cosmosDbMode: true` if your storage account is backed by Cosmos DB Table API for better performance and global distribution.

Apply the component:

```bash
kubectl apply -f table-statestore.yaml
```

## Using Azure Table Storage State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store tenant configuration state
await client.state.save("table-statestore", [
  {
    key: "tenant-acme-config",
    value: {
      tenantId: "acme",
      plan: "enterprise",
      maxUsers: 5000,
      features: { analytics: true, sso: true, api: true }
    }
  }
]);

const config = await client.state.get("table-statestore", "tenant-acme-config");
console.log("Tenant config:", config);
```

## Cost Comparison

Azure Table Storage is significantly cheaper than Cosmos DB:

| Service | Storage cost | Write cost (per 10K ops) |
|---------|-------------|--------------------------|
| Table Storage | $0.045/GB | $0.00036 |
| Cosmos DB (400 RU/s) | $0.25/GB | ~$0.008 |

For state stores with predictable, moderate throughput, Table Storage can be 10-20x cheaper.

## Querying State Directly

```bash
# List entities in the state table
az storage entity query \
  --table-name DaprState \
  --account-name daprstatestg \
  --auth-mode login \
  --select RowKey Value
```

## Summary

Azure Table Storage as a Dapr state store provides a cost-effective, serverless NoSQL backend that requires no capacity planning. It is ideal for microservices with moderate throughput requirements where cost efficiency matters more than the advanced querying and global distribution capabilities of Azure Cosmos DB.
