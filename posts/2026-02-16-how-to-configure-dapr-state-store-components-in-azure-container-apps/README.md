# How to Configure Dapr State Store Components in Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Dapr, State Management, Redis, Cosmos DB, Microservices

Description: A hands-on guide to configuring Dapr state store components in Azure Container Apps using Redis, Cosmos DB, and Azure Blob Storage.

---

State management is one of those problems every microservice architect faces. Where do you store session data, caches, or intermediate processing results? Dapr provides a state management building block that abstracts the underlying data store behind a consistent API. You write your code against the Dapr state API, and if you later decide to switch from Redis to Cosmos DB, you change a configuration file instead of rewriting your application. Azure Container Apps supports Dapr components natively, making the setup straightforward.

## How Dapr State Management Works

Dapr's state management API gives your application simple key-value operations: get, set, and delete. Your application calls the Dapr sidecar on localhost, and the sidecar handles the actual interaction with the backing store. The API supports optional features like transactions, ETags for optimistic concurrency, and first-write-wins semantics.

The state store component is configured separately from your application code. This means you can have different state stores for development and production without changing a single line of code.

## Step 1: Create a State Store Component for Redis

Let us start with Azure Cache for Redis, which is a common choice for fast state storage.

First, create the Redis instance.

```bash
# Create an Azure Cache for Redis instance
az redis create \
  --name my-redis-cache \
  --resource-group my-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0

# Get the connection details
REDIS_HOST=$(az redis show --name my-redis-cache --resource-group my-rg --query "hostName" -o tsv)
REDIS_KEY=$(az redis list-keys --name my-redis-cache --resource-group my-rg --query "primaryKey" -o tsv)
```

Now create a Dapr component in your Container Apps environment.

```bash
# Create the Dapr state store component pointing to Redis
az containerapp env dapr-component set \
  --name my-env \
  --resource-group my-rg \
  --dapr-component-name statestore \
  --yaml dapr-statestore-redis.yaml
```

The YAML file for the Redis state store looks like this.

```yaml
# dapr-statestore-redis.yaml
componentType: state.redis
version: v1
metadata:
  - name: redisHost
    value: "my-redis-cache.redis.cache.windows.net:6380"
  - name: redisPassword
    secretRef: redis-password
  - name: enableTLS
    value: "true"
  - name: actorStateStore
    value: "true"
secrets:
  - name: redis-password
    value: "<your-redis-primary-key>"
scopes:
  - order-service
  - cart-service
```

The `scopes` field is important. It restricts which container apps can access this state store. Only the services listed will have access.

## Step 2: Use the State Store from Your Application

With the component configured, your application can read and write state through the Dapr sidecar.

Here is how to use it in a Node.js service.

```javascript
const axios = require('axios');

const DAPR_PORT = process.env.DAPR_HTTP_PORT || 3500;
const STATE_STORE = 'statestore'; // Matches the component name

// Save state - stores a key-value pair in Redis
async function saveCartItem(userId, cartData) {
  const url = `http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}`;

  await axios.post(url, [
    {
      key: `cart-${userId}`,
      value: cartData,
      options: {
        consistency: 'strong' // Options: strong, eventual
      }
    }
  ]);
}

// Get state - retrieves the value for a given key
async function getCartItem(userId) {
  const url = `http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}/cart-${userId}`;

  const response = await axios.get(url);
  return response.data;
}

// Delete state - removes the key-value pair
async function clearCart(userId) {
  const url = `http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}/cart-${userId}`;

  await axios.delete(url);
}
```

## Step 3: Configure Cosmos DB as a State Store

For workloads that need global distribution, partitioning, or more durability than Redis provides, Azure Cosmos DB is a good choice.

```bash
# Create a Cosmos DB account
az cosmosdb create \
  --name my-cosmos-account \
  --resource-group my-rg \
  --kind GlobalDocumentDB

# Create a database and container
az cosmosdb sql database create \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --name daprstate

az cosmosdb sql container create \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --database-name daprstate \
  --name statestore \
  --partition-key-path "/partitionKey"
```

Now configure the Dapr component for Cosmos DB.

```yaml
# dapr-statestore-cosmos.yaml
componentType: state.azure.cosmosdb
version: v1
metadata:
  - name: url
    value: "https://my-cosmos-account.documents.azure.com:443/"
  - name: masterKey
    secretRef: cosmos-key
  - name: database
    value: "daprstate"
  - name: collection
    value: "statestore"
secrets:
  - name: cosmos-key
    value: "<your-cosmos-primary-key>"
scopes:
  - order-service
```

The great thing is that your application code does not change at all. The same get, set, and delete calls work exactly the same way whether the backend is Redis or Cosmos DB.

## Step 4: Use Transactions for Atomic Operations

Dapr supports multi-item transactions on state stores that support them (like Redis and Cosmos DB).

```javascript
// Perform a transactional state operation
// Both operations succeed or both fail
async function transferItem(fromUser, toUser, item) {
  const url = `http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}/transaction`;

  await axios.post(url, {
    operations: [
      {
        operation: 'upsert',
        request: {
          key: `inventory-${toUser}`,
          value: { item: item, status: 'received' }
        }
      },
      {
        operation: 'delete',
        request: {
          key: `inventory-${fromUser}-${item}`
        }
      }
    ]
  });
}
```

## Step 5: Use ETags for Optimistic Concurrency

When multiple instances of your service might update the same key, ETags prevent lost updates.

```javascript
// Read state with ETag for concurrency control
async function updateCartWithConcurrency(userId, updateFn) {
  const url = `http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}/cart-${userId}`;

  // Get current state with ETag
  const getResponse = await axios.get(url);
  const currentData = getResponse.data;
  const etag = getResponse.headers['etag'];

  // Apply the update
  const updatedData = updateFn(currentData);

  // Save with ETag - fails if another writer modified the data
  await axios.post(`http://localhost:${DAPR_PORT}/v1.0/state/${STATE_STORE}`, [
    {
      key: `cart-${userId}`,
      value: updatedData,
      etag: etag,
      options: {
        concurrency: 'first-write-wins'
      }
    }
  ]);
}
```

## Step 6: Configure Azure Blob Storage as a State Store

For scenarios where you need cheap, durable storage and do not need low-latency access, Azure Blob Storage works as a state store.

```yaml
# dapr-statestore-blob.yaml
componentType: state.azure.blobstorage
version: v1
metadata:
  - name: accountName
    value: "mystorageaccount"
  - name: accountKey
    secretRef: storage-key
  - name: containerName
    value: "daprstate"
secrets:
  - name: storage-key
    value: "<your-storage-account-key>"
scopes:
  - batch-processor
```

## Choosing the Right State Store

Here is a quick comparison to help you decide.

| Feature | Redis | Cosmos DB | Blob Storage |
|---------|-------|-----------|--------------|
| Latency | Sub-millisecond | Single-digit ms | Tens of ms |
| Transactions | Yes | Yes | No |
| Cost | Medium | Higher | Lowest |
| Durability | Depends on tier | Very high | Very high |
| Global distribution | No | Yes | Yes (RA-GRS) |
| Best for | Caching, sessions | Mission-critical | Bulk state, archival |

## Troubleshooting

**Component not found errors:** Make sure the component name in your API call matches the `dapr-component-name` you used when creating the component. Also check the `scopes` list to ensure your app's Dapr ID is included.

**Authentication failures:** Verify that secrets are correctly set. For managed identity setups, make sure the identity has the right role assignments on the backing store.

**Slow state operations:** If using Cosmos DB, check that the partition key strategy aligns with your access patterns. A hot partition can cause throttling.

**Data not persisting across restarts:** Redis without persistence configured will lose data on restart. Use a Standard or Premium tier for persistence, or switch to Cosmos DB for critical state.

## Summary

Dapr state management on Azure Container Apps decouples your application from the storage backend. You configure the state store as a component, write code against a consistent API, and swap backends without code changes. For most applications, start with Redis for speed and switch to Cosmos DB if you need stronger durability or global distribution. The component model keeps things flexible, and the scoping feature ensures proper isolation between services.
