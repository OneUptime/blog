# How to Use Dapr with Azure Cosmos DB for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Cosmos DB, MongoDB, Azure, State Management

Description: Configure Dapr state management with Azure Cosmos DB for MongoDB API, including connection string setup, partition key strategies, and multi-region write configuration.

---

## Overview

Azure Cosmos DB for MongoDB API provides a globally distributed, multi-model database that is wire-compatible with MongoDB. Dapr integrates with it through the MongoDB state store component, giving your microservices a globally replicated state store.

## Configuring the Dapr MongoDB State Store

Create a Dapr component for Cosmos DB MongoDB API:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: host
    value: my-cosmos.mongo.cosmos.azure.com:10255
  - name: username
    value: my-cosmos
  - name: password
    secretKeyRef:
      name: cosmos-mongodb-secret
      key: primaryKey
  - name: databaseName
    value: daprdb
  - name: collectionName
    value: dapr_state
  - name: params
    value: "?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@my-cosmos@"
```

Create the secret with the Cosmos DB primary key:

```bash
PRIMARY_KEY=$(az cosmosdb keys list \
  --name my-cosmos \
  --resource-group my-rg \
  --type keys \
  --query primaryMasterKey -o tsv)

kubectl create secret generic cosmos-mongodb-secret \
  --from-literal=primaryKey="$PRIMARY_KEY"
```

## Cosmos DB Partition Key for Dapr State

Configure the collection with an appropriate partition key:

```bash
# Create the database and collection with _id as shard key
az cosmosdb mongodb database create \
  --account-name my-cosmos \
  --resource-group my-rg \
  --name daprdb

az cosmosdb mongodb collection create \
  --account-name my-cosmos \
  --resource-group my-rg \
  --database-name daprdb \
  --name dapr_state \
  --shard "_id"
```

## Multi-Region Write Configuration

Enable multi-region writes for globally distributed Dapr deployments:

```bash
az cosmosdb update \
  --name my-cosmos \
  --resource-group my-rg \
  --enable-multiple-write-locations true \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=true
```

Each Dapr region connects to its local Cosmos DB endpoint:

```yaml
# East US deployment
metadata:
- name: host
  value: my-cosmos-eastus.mongo.cosmos.azure.com:10255

# West Europe deployment
metadata:
- name: host
  value: my-cosmos-westeurope.mongo.cosmos.azure.com:10255
```

## Testing Multi-Region State

Verify state replication across regions:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Write from East US pod
await client.state.save('statestore', [{ key: 'global-key', value: { region: 'eastus', data: 'hello' } }]);

// Read from West Europe pod (should replicate within seconds)
const state = await client.state.get('statestore', 'global-key');
console.log('State from WestEurope:', state);
```

## Throughput and Scaling

Monitor and adjust Cosmos DB RU/s for Dapr workloads:

```bash
# Check current throughput
az cosmosdb mongodb collection throughput show \
  --account-name my-cosmos \
  --resource-group my-rg \
  --database-name daprdb \
  --name dapr_state

# Migrate from manual to autoscale throughput
az cosmosdb mongodb collection throughput migrate \
  --account-name my-cosmos \
  --resource-group my-rg \
  --database-name daprdb \
  --name dapr_state \
  --throughput-type autoscale

# Set autoscale max throughput
az cosmosdb mongodb collection throughput update \
  --account-name my-cosmos \
  --resource-group my-rg \
  --database-name daprdb \
  --name dapr_state \
  --max-throughput 4000
```

## Summary

Azure Cosmos DB for MongoDB API provides Dapr with a globally distributed state store that replicates data across multiple regions automatically. Use the MongoDB-compatible Dapr component with `retrywrites=false` in the connection string, configure autoscale throughput to handle Dapr traffic spikes, and deploy region-specific Cosmos DB endpoints for each Dapr region to minimize latency.
