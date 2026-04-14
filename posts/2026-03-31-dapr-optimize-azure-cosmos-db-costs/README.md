# How to Optimize Azure Cosmos DB Costs with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, Cost, State Management

Description: Optimize Azure Cosmos DB costs when used as a Dapr state store by configuring throughput settings, TTL policies, partition key strategies, and right-sizing RU/s allocation.

---

## Why Cosmos DB Costs Escalate with Dapr

When using Azure Cosmos DB as a Dapr state store, each state operation (get, set, delete, query) consumes Request Units (RUs). At high throughput, RU consumption translates directly to cost. Poor partition key design, missing TTLs, and over-provisioned throughput are the top drivers of unnecessary Cosmos DB spend.

## Configure the Dapr Cosmos DB Component

Start with the component configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://my-cosmos.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: master-key
  - name: database
    value: "dapr-state"
  - name: collection
    value: "state"
  - name: partitionKey
    value: "partitionKey"
```

## Optimize Partition Key Strategy

The partition key determines how data is distributed and how many RUs queries consume. Set the partition key to your app's natural sharding attribute:

```yaml
metadata:
- name: partitionKey
  value: "partitionKey"
```

In application code, include the partition key in state operations:

```javascript
await daprClient.state.save('statestore', [
  {
    key: 'user:123:profile',
    value: { name: 'Alice', plan: 'premium' },
    metadata: {
      partitionKey: 'user:123'  // High-cardinality partition key
    }
  }
]);
```

A good partition key avoids "hot partitions" that exhaust a single partition's throughput.

## Enable TTL to Control Storage Costs

Cosmos DB charges for storage. Enable TTL on ephemeral state to delete records automatically:

```yaml
metadata:
- name: defaultDocumentTimeToLiveInSeconds
  value: "86400"  # 24 hours default TTL
```

Override per item in application code:

```javascript
await daprClient.state.save('statestore', [
  {
    key: 'session:abc',
    value: sessionData,
    metadata: {
      ttlInSeconds: '3600'  // Session expires in 1 hour
    }
  }
]);
```

## Use Serverless Cosmos DB for Variable Workloads

For unpredictable workloads, Serverless Cosmos DB charges per operation rather than per provisioned RU/s:

```bash
# Create serverless Cosmos DB account
az cosmosdb create \
  --name my-dapr-cosmos \
  --resource-group my-rg \
  --capabilities EnableServerless \
  --locations regionName=eastus

# Create database and container
az cosmosdb sql database create \
  --account-name my-dapr-cosmos \
  --resource-group my-rg \
  --name dapr-state

az cosmosdb sql container create \
  --account-name my-dapr-cosmos \
  --resource-group my-rg \
  --database-name dapr-state \
  --name state \
  --partition-key-path "/partitionKey"
```

## Monitor RU Consumption

Track RU usage to identify expensive operations:

```bash
# Query Cosmos DB metrics for RU consumption
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/my-rg/providers/Microsoft.DocumentDB/databaseAccounts/my-dapr-cosmos \
  --metric TotalRequestUnits \
  --interval PT1M \
  --aggregation Total
```

## Use Autoscale for Provisioned Throughput

If you use provisioned throughput, enable autoscale to automatically scale between 10% and 100% of the configured max RU/s:

```bash
az cosmosdb sql database throughput update \
  --account-name my-dapr-cosmos \
  --resource-group my-rg \
  --name dapr-state \
  --max-throughput 10000
```

## Summary

Optimize Azure Cosmos DB costs with Dapr by choosing a high-cardinality partition key to distribute load evenly, enabling TTL policies to automatically expire ephemeral state, using Serverless mode for unpredictable workloads, and enabling autoscale for provisioned throughput environments. Monitor RU consumption through Azure Monitor to identify expensive operations and adjust access patterns accordingly.
