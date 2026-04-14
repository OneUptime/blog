# How to Use Dapr State Query API with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MongoDB, State Store, Query API, Database

Description: Use the Dapr State Query API with MongoDB to filter, sort, and paginate state data using MongoDB's native query capabilities through a standard Dapr interface.

---

## Overview

The Dapr State Query API lets you run structured queries against state stores that support it. MongoDB's flexible document model and native indexing make it an excellent backend for the query API. Dapr translates query API requests into MongoDB `find` operations.

## Component Configuration

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
      value: "mongodb:27017"
    - name: username
      value: "dapr"
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
```

## Storing Queryable State

The value you store should be JSON so fields are queryable:

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    # Store user records
    users = [
        {"userId": "u1", "name": "Alice", "tier": "premium", "score": 95},
        {"userId": "u2", "name": "Bob", "tier": "free", "score": 42},
        {"userId": "u3", "name": "Carol", "tier": "premium", "score": 78},
    ]
    for user in users:
        client.save_state(
            store_name="statestore",
            key=f"user:{user['userId']}",
            value=json.dumps(user)
        )
```

## Basic Query - Filter and Sort

```python
import json
from dapr.clients import DaprClient

query = {
    "filter": {
        "EQ": {"tier": "premium"}
    },
    "sort": [
        {"key": "score", "order": "DESC"}
    ],
    "page": {
        "limit": 10
    }
}

with DaprClient() as client:
    result = client.query_state(
        store_name="statestore",
        query=json.dumps(query)
    )
    print(f"Found {len(result.results)} results")
    for item in result.results:
        data = json.loads(item.value)
        print(f"  {item.key}: {data['name']} score={data['score']}")
```

## Compound Filter

```python
query = {
    "filter": {
        "AND": [
            {"EQ": {"tier": "premium"}},
            {"GT": {"score": 70}},
            {"IN": {"region": ["us-east", "eu-west"]}}
        ]
    },
    "sort": [
        {"key": "score", "order": "DESC"}
    ],
    "page": {
        "limit": 5,
        "token": result.token  # pagination token from previous result
    }
}
```

## Pagination

```python
token = None
all_results = []

while True:
    q = {"filter": {"EQ": {"status": "active"}}, "page": {"limit": 50}}
    if token:
        q["page"]["token"] = token

    with DaprClient() as client:
        result = client.query_state("statestore", json.dumps(q))
        all_results.extend(result.results)
        token = result.token
        if not token:
            break

print(f"Total active records: {len(all_results)}")
```

## Adding MongoDB Indexes for Query Performance

Create indexes on the fields you query most:

```javascript
db.state.createIndex({ "value.tier": 1, "value.score": -1 });
db.state.createIndex({ "value.status": 1 });
db.state.createIndex({ "value.region": 1 });
```

```bash
# Apply via mongosh
kubectl exec -it mongodb-0 -- mongosh daprstate \
  --eval 'db.state.createIndex({"value.tier": 1, "value.score": -1})'
```

## Summary

The Dapr State Query API with MongoDB enables filtering, sorting, and paginating state records using a backend-agnostic JSON query format. MongoDB translates these queries into native `find` operations, so adding compound indexes on frequently queried `value.*` fields is essential for production performance. Use pagination tokens to iterate over large result sets without re-running the full query.
