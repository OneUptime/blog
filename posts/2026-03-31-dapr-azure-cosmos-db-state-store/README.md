# How to Configure Dapr with Azure Cosmos DB State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, State Store, Cloud

Description: Learn how to configure Dapr with Azure Cosmos DB as a state store, leveraging Cosmos DB's global distribution and multi-model API for cloud-native microservices.

---

## Overview

Azure Cosmos DB is Microsoft's globally distributed, multi-model database service. It offers single-digit millisecond latency, automatic horizontal scaling, and multi-region replication. As a Dapr state store, Cosmos DB is an excellent choice for cloud-native microservices running on Azure that need globally available and durable state.

## Prerequisites

- An Azure subscription with a Cosmos DB account (API for NoSQL)
- Dapr CLI and runtime installed
- Azure CLI for setup

## Creating the Cosmos DB Account and Container

```bash
# Create a resource group
az group create --name dapr-rg --location eastus

# Create Cosmos DB account
az cosmosdb create \
  --name dapr-cosmos-account \
  --resource-group dapr-rg \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false

# Create a database
az cosmosdb sql database create \
  --account-name dapr-cosmos-account \
  --resource-group dapr-rg \
  --name DaprStateDB

# Create a container (partition key must be /partitionKey)
az cosmosdb sql container create \
  --account-name dapr-cosmos-account \
  --resource-group dapr-rg \
  --database-name DaprStateDB \
  --name StateContainer \
  --partition-key-path /partitionKey \
  --throughput 400
```

Get the connection URL and key:

```bash
az cosmosdb keys list \
  --name dapr-cosmos-account \
  --resource-group dapr-rg \
  --query primaryMasterKey -o tsv
```

## Configuring the Dapr Component

Create a Kubernetes secret with the Cosmos DB key:

```bash
kubectl create secret generic cosmos-secret \
  --from-literal=masterKey=YOUR_COSMOS_DB_KEY
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmos-statestore
  namespace: default
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://dapr-cosmos-account.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "DaprStateDB"
  - name: collection
    value: "StateContainer"
  - name: actorStateStore
    value: "false"
```

Apply the component:

```bash
kubectl apply -f cosmos-statestore.yaml
```

## Using the Cosmos DB State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Save order state globally distributed
await client.state.save("cosmos-statestore", [
  {
    key: "order-INTL-5001",
    value: {
      customerId: "EU-84521",
      items: [{ sku: "WIDGET-01", qty: 2 }],
      total: 49.98,
      region: "europe-west",
      status: "confirmed"
    }
  }
]);

const order = await client.state.get("cosmos-statestore", "order-INTL-5001");
console.log("Order:", order);
```

## Enabling Managed Identity

For production, use Azure Managed Identity instead of master keys:

```yaml
  - name: azureClientId
    value: "your-managed-identity-client-id"
```

Grant the identity the `Cosmos DB Built-in Data Contributor` role:

```bash
az cosmosdb sql role assignment create \
  --account-name dapr-cosmos-account \
  --resource-group dapr-rg \
  --role-definition-name "Cosmos DB Built-in Data Contributor" \
  --principal-id YOUR_MANAGED_IDENTITY_PRINCIPAL_ID \
  --scope "/subscriptions/SUB_ID/resourceGroups/dapr-rg/providers/Microsoft.DocumentDB/databaseAccounts/dapr-cosmos-account"
```

## Summary

Azure Cosmos DB as a Dapr state store combines global distribution, automatic scaling, and single-digit millisecond latency into a fully managed service. Using Managed Identity for authentication and properly sizing the container throughput are the key steps to a production-ready Dapr and Cosmos DB integration on Azure.
