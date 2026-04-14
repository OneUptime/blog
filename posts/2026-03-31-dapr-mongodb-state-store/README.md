# How to Configure Dapr with MongoDB State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MongoDB, State Store, Configuration, Microservice

Description: Learn how to configure the Dapr MongoDB state store component, connecting to MongoDB Atlas or self-hosted instances for document-oriented state persistence.

---

MongoDB as a Dapr state store provides document-oriented state persistence with rich query capabilities, native JSON storage, and horizontal scalability. It is a strong choice when your state values are complex nested documents that benefit from MongoDB's query language.

## Prerequisites

- Dapr CLI installed and initialized
- MongoDB instance (local Docker, MongoDB Atlas, or self-hosted)

## Running MongoDB Locally

```bash
docker run -d \
  --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=dapruser \
  -e MONGO_INITDB_ROOT_PASSWORD=daprpassword \
  -p 27017:27017 \
  mongo:7
```

## Creating the MongoDB State Store Component

```yaml
# components/mongodb-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.mongodb
  version: v1
  metadata:
    - name: host
      value: "localhost:27017"
    - name: username
      value: "dapruser"
    - name: password
      secretKeyRef:
        name: mongodb-secret
        key: password
    - name: databaseName
      value: "daprstate"
    - name: collectionName
      value: "state"
    - name: actorStateStore
      value: "true"
    - name: writeConcern
      value: "majority"
    - name: readConcern
      value: "majority"
    - name: operationTimeout
      value: "5s"
```

Store the password:

```bash
kubectl create secret generic mongodb-secret \
  --from-literal=password=daprpassword
```

## Connecting to MongoDB Atlas

For MongoDB Atlas (managed cloud service):

```yaml
    - name: server
      value: "mongodb+srv://cluster0.abc123.mongodb.net"
    - name: username
      value: "dapruser"
    - name: password
      secretKeyRef:
        name: mongodb-atlas-secret
        key: password
    - name: databaseName
      value: "daprstate"
    - name: params
      value: "?retryWrites=true&w=majority"
```

## Using MongoDB Connection String

Alternatively, use a full connection string:

```yaml
    - name: connectionString
      secretKeyRef:
        name: mongodb-secret
        key: connection-string
```

```bash
kubectl create secret generic mongodb-secret \
  --from-literal=connection-string="mongodb://dapruser:daprpassword@localhost:27017/daprstate?authSource=admin"
```

## Basic State Operations

```bash
# Save a complex document as state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "product:xyz-001",
    "value": {
      "name": "Widget Pro",
      "price": 29.99,
      "tags": ["electronics", "gadgets"],
      "specs": {
        "weight": "200g",
        "dimensions": "10x5x3cm"
      }
    }
  }]'

# Retrieve the state
curl http://localhost:3500/v1.0/state/statestore/product:xyz-001
```

## State Queries with MongoDB

MongoDB state store supports the Dapr query API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "AND": [
        {"EQ": {"status": "active"}},
        {"GT": {"price": 10.0}}
      ]
    },
    "sort": [
      {"key": "price", "order": "DESC"}
    ],
    "page": {
      "limit": 20
    }
  }'
```

## Connecting to a Replica Set

For production high availability:

```yaml
    - name: host
      value: "mongo1:27017,mongo2:27017,mongo3:27017"
    - name: params
      value: "?replicaSet=rs0"
    - name: writeConcern
      value: "majority"
```

## Inspecting State in MongoDB Directly

```javascript
// Using mongosh
use daprstate

// List all state keys
db.state.find({}, { _id: 1, value: 0, _etag: 0 }).limit(20)

// Find by value field
db.state.find({ "value.status": "active" })

// List recent entries by etag
db.state.find({}, { _id: 1, _etag: 1 }).limit(10)
```

## Summary

The Dapr MongoDB state store is ideal for applications with complex, document-oriented state that benefits from MongoDB's flexible schema and query capabilities. Whether connecting to a local instance, replica set, or MongoDB Atlas, the component configuration follows the same pattern with adjustments for authentication and connection topology.
