# How to Use Azure Cosmos DB Partitioning with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Partitioning, State Store, Scalability

Description: Leverage Azure Cosmos DB partitioning with Dapr state store for globally distributed, elastically scalable stateful microservices.

---

## Overview

Azure Cosmos DB uses partitioning to distribute data across multiple physical partitions for horizontal scalability. When using Cosmos DB as a Dapr state store, understanding how Dapr maps state keys to Cosmos DB partition keys is essential for achieving balanced data distribution and optimal read/write throughput.

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmosdb-state
  namespace: default
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://myaccount.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmosdb-secret
      key: masterKey
  - name: database
    value: "daprdb"
  - name: collection
    value: "statestore"
  - name: contentType
    value: "application/json"
```

Create the Cosmos DB container with the correct partition key:

```bash
az cosmosdb sql container create \
  --account-name mycosmosaccount \
  --database-name daprdb \
  --name statestore \
  --resource-group myResourceGroup \
  --partition-key-path "/partitionKey" \
  --throughput 4000
```

## Partition Key Strategy

Dapr stores state with a key in the format `appId||stateKey`. The partition key in Cosmos DB is derived from this key. To maximize distribution:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

// Keys with high cardinality distribute well across partitions
// Use userId, tenantId, or orderId as part of the key

async function saveUserSession(userId, sessionData) {
  // Key: "session-service||user:us-east-789"
  await client.state.save('cosmosdb-state', [
    {
      key: `user:${userId}`,
      value: sessionData,
      metadata: {
        // Hint the partition key for better distribution
        partitionKey: userId
      }
    }
  ]);
}

async function getUserSession(userId) {
  const state = await client.state.get('cosmosdb-state', `user:${userId}`, {
    metadata: { partitionKey: userId }
  });
  return state;
}
```

## Autoscale Throughput Configuration

Use autoscale RU/s to handle variable load:

```bash
# Convert to autoscale
az cosmosdb sql container throughput migrate \
  --account-name mycosmosaccount \
  --database-name daprdb \
  --name statestore \
  --resource-group myResourceGroup \
  --throughput-type autoscale

# Set max autoscale RU/s
az cosmosdb sql container throughput update \
  --account-name mycosmosaccount \
  --database-name daprdb \
  --name statestore \
  --resource-group myResourceGroup \
  --max-throughput 10000
```

## Partition Key Analysis

Monitor partition distribution to detect hot partitions:

```bash
# Use Azure Monitor to query partition metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosaccount \
  --metrics "NormalizedRUConsumption" \
  --dimension "Region" \
  --interval PT1M
```

Use the Azure Portal's Insights tab to view per-partition RU consumption and identify hot partitions.

## Multi-Region State with Consistency Levels

Cosmos DB consistency levels (Strong, Bounded Staleness, Session, Consistent Prefix, Eventual) are configured on the Cosmos DB account itself, not through Dapr component metadata. Set the desired consistency level via the Azure Portal or CLI:

```bash
az cosmosdb update \
  --name mycosmosaccount \
  --resource-group myResourceGroup \
  --default-consistency-level BoundedStaleness
```

Configure multi-region writes:

```bash
az cosmosdb update \
  --name mycosmosaccount \
  --resource-group myResourceGroup \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=true \
  --enable-multiple-write-locations true
```

## Summary

Azure Cosmos DB partitioning with Dapr state store enables seamless horizontal scaling by distributing state across physical partitions. Using high-cardinality keys like user IDs or tenant IDs ensures even partition distribution and prevents hot partition issues. Autoscale throughput handles burst workloads automatically, while multi-region write configuration provides low-latency state access globally.
