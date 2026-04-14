# How to Use State Store Partitioning in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Partitioning, Scalability, Microservice

Description: Learn how Dapr state store partitioning works, how keys map to partitions, and how to design your key schema to achieve even data distribution and horizontal scalability.

---

## Introduction

Partitioning distributes data across multiple nodes or shards in a state store, enabling horizontal scaling beyond a single node's capacity. Dapr does not manage partitioning directly - that responsibility belongs to the underlying state store (Redis Cluster, Cosmos DB, DynamoDB, etc.) - but your key design has a direct impact on how evenly data is distributed. This guide explains the relationship and best practices.

## How Partitioning Works

```mermaid
graph TD
    App -->|key: order-user-1-001| Dapr[Dapr Sidecar]
    Dapr -->|Hash(key) -> shard| S1[(Shard 1\norders for users 1-100)]
    Dapr -->|Hash(key) -> shard| S2[(Shard 2\norders for users 101-200)]
    Dapr -->|Hash(key) -> shard| S3[(Shard 3\norders for users 201-300)]
```

The state store hashes the key (as stored, including any Dapr prefix) to determine which shard holds the data. Poor key design leads to hotspots.

## Key Design for Even Distribution

### Bad Key Design (Hotspot)

```text
order-2024-01-01-001
order-2024-01-01-002
order-2024-01-01-003
...
```

All keys share a date-based prefix with low cardinality. In state stores that use range-based partitioning, keys that sort together land on the same partition, causing write hotspots.

### Good Key Design (Distributed)

Include a high-cardinality field early in the key:

```text
{userId}-order-{orderId}
{sessionId}-cart
{tenantId}-{resourceType}-{resourceId}
```

Example:

```bash
# Good: user ID first (high cardinality)
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user-8423-order-001", "value": {"item": "laptop"}},
    {"key": "user-1209-order-002", "value": {"item": "mouse"}},
    {"key": "user-5521-order-003", "value": {"item": "keyboard"}}
  ]'
```

## Redis Cluster Partitioning

Redis Cluster uses hash slots (0-16383). The key is hashed using CRC16 to determine the slot and therefore the node:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-cluster:6379
    - name: enableTLS
      value: "false"
    - name: redisType
      value: cluster
```

With `keyPrefix: appId` (the default), Dapr stores keys as `appid||userkey`. The entire string including the prefix is hashed.

### Redis Hash Tags for Colocation

If you need related keys to land on the same shard (for multi-key operations), use Redis hash tags:

```bash
# Keys with the same hash tag {...} land on the same shard
# Dapr key: myapp||{user-42}-cart
# Dapr key: myapp||{user-42}-wishlist
# Both hash to the same slot based on "user-42"
```

With Dapr's `keyPrefix: none`:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "{user-42}-cart", "value": {"items": []}},
    {"key": "{user-42}-wishlist", "value": {"items": []}}
  ]'
```

## Cosmos DB Partitioning

Azure Cosmos DB uses a partition key that you define on the container. Dapr's Cosmos DB state store uses the full key as the partition key by default:

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
      value: https://myaccount.documents.azure.com:443/
    - name: masterKey
      secretKeyRef:
        name: cosmosdb-secret
        key: masterKey
    - name: database
      value: ordersdb
    - name: collection
      value: orders
    - name: partitionKey
      value: "/partitionKey"
```

Design your values to include a `partitionKey` field that maps to a logical partition:

```json
{
  "orderId": "order-001",
  "partitionKey": "user-8423",
  "item": "laptop"
}
```

## DynamoDB Partitioning

DynamoDB partitions based on the primary key (partition key + optional sort key):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
    - name: table
      value: dapr-state
    - name: region
      value: us-east-1
    - name: partitionKey
      value: key
```

Dapr writes the full key (with prefix) as the DynamoDB partition key. Use high-cardinality key prefixes to distribute load.

## Monitoring Partition Distribution

```bash
# Redis Cluster: check key distribution across nodes
redis-cli --cluster info redis-cluster:6379

# Check shard sizes
redis-cli -h redis-cluster -p 6379 cluster nodes

# Count keys per shard
redis-cli --cluster call redis-cluster:6379 dbsize
```

## Summary

Dapr delegates partitioning to the underlying state store (Redis Cluster, Cosmos DB, DynamoDB). Your responsibility is key design: place high-cardinality fields (user ID, tenant ID) at the beginning of the key to ensure even hash distribution across shards. Use Redis hash tags to colocate related keys when multi-key atomicity is required. Configure the state store component to match the backend's partitioning scheme, and monitor shard distribution to detect and address hotspots early.
