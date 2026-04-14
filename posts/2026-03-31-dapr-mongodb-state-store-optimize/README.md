# How to Optimize MongoDB as Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MongoDB, State Store, Performance, Database, Optimization

Description: Optimize MongoDB as a Dapr state store with proper indexing, write concerns, and connection pool tuning for production performance.

---

## Overview

MongoDB is a flexible Dapr state store that works well for document-oriented state where the payload is semi-structured JSON. Proper index configuration, write concern settings, and connection pooling are critical to achieving the performance and durability characteristics your application needs.

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mongodb-state
  namespace: default
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: host
    value: "mongodb://mongodb:27017"
  - name: username
    secretKeyRef:
      name: mongodb-secret
      key: username
  - name: password
    secretKeyRef:
      name: mongodb-secret
      key: password
  - name: databaseName
    value: "daprstate"
  - name: collectionName
    value: "state"
  - name: writeConcern
    value: "majority"
  - name: readConcern
    value: "majority"
  - name: operationTimeout
    value: "5s"
  - name: params
    value: "?authSource=admin&replicaSet=rs0"
```

## MongoDB Index Optimization

The Dapr MongoDB state component stores state in a collection with a `_id` field as the key. Add indexes for TTL and query patterns:

```javascript
// Connect to MongoDB
use daprstate

// TTL index for automatic state expiration
db.state.createIndex(
  { "_ttl": 1 },
  { expireAfterSeconds: 0 }
)

// Compound index for key + ETag lookups
db.state.createIndex(
  { "_id": 1, "_etag": 1 }
)

// Check index usage
db.state.aggregate([
  { $indexStats: {} }
])
```

## Write Concern Tuning

Choose the right write concern based on your consistency requirements:

```javascript
// For maximum performance (acknowledge from primary only)
// Set in Dapr component: writeConcern: "1"

// For durability across replica set majority (recommended)
// Set in Dapr component: writeConcern: "majority"

// Check default read/write concern
db.adminCommand({ getDefaultRWConcern: 1 })
```

## Connection Pool Configuration

For Atlas or replica set connections, optimize the URI:

```bash
kubectl create secret generic mongodb-secret \
  --from-literal=uri="mongodb+srv://dapr-user:secret@cluster0.mongodb.net/daprstate?retryWrites=true&w=majority&maxPoolSize=20&minPoolSize=5&maxIdleTimeMS=30000&connectTimeoutMS=5000&socketTimeoutMS=30000"
```

## Bulk State Operations

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func bulkSaveUserProfiles(profiles []UserProfile) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()
    items := make([]*dapr.SetStateItem, len(profiles))

    for i, p := range profiles {
        data, _ := json.Marshal(p)
        items[i] = &dapr.SetStateItem{
            Key:   fmt.Sprintf("user:%s", p.ID),
            Value: data,
            Options: &dapr.StateOptions{
                Consistency: dapr.StateConsistencyStrong,
                Concurrency: dapr.StateConcurrencyLastWrite,
            },
        }
    }

    return client.SaveBulkState(ctx, "mongodb-state", items...)
}
```

## MongoDB Replica Set for High Availability

```yaml
replicaSet:
  name: rs0
  members:
    - id: 0
      host: mongodb-0.mongodb:27017
      priority: 2
    - id: 1
      host: mongodb-1.mongodb:27017
      priority: 1
    - id: 2
      host: mongodb-2.mongodb:27017
      priority: 1
      votes: 1
```

Monitor replica set lag:

```javascript
rs.printSecondaryReplicationInfo()
rs.status()
```

## Summary

MongoDB as a Dapr state store excels for document-heavy workloads with flexible schemas. Setting write concern to `majority` ensures durability across replica failures, while TTL indexes automate state expiration. Proper connection pool sizing prevents connection exhaustion under high concurrency, and the `operationTimeout` setting prevents long-running state operations from blocking application threads.
