# How to Use Dapr State Query API with Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cosmos DB, Azure, State Store, Query API

Description: Leverage the Dapr State Query API with Azure Cosmos DB to run filtered, sorted queries against state data using Cosmos DB's SQL API and partition key design.

---

## Overview

Azure Cosmos DB is a fully managed NoSQL database that supports the Dapr State Query API via its SQL API. Dapr translates query API requests into Cosmos DB SQL queries. Understanding partition key design is critical for cost and performance since every cross-partition query incurs extra RU charges.

## Component Configuration

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
      value: "https://YOUR_ACCOUNT.documents.azure.com:443/"
    - name: masterKey
      secretKeyRef:
        name: cosmos-secret
        key: master-key
    - name: database
      value: "DaprDatabase"
    - name: collection
      value: "DaprState"
    - name: partitionKey
      value: "partitionKey"
```

Create the secret:

```bash
kubectl create secret generic cosmos-secret \
  --from-literal=master-key=YOUR_COSMOS_PRIMARY_KEY
```

For Managed Identity, omit `masterKey` and configure the pod with the appropriate Azure identity.

## Partition Key Strategy

Dapr stores all state in a single collection. The `partitionKey` metadata field controls how documents are partitioned. A common pattern is to prefix keys with a logical partition:

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    # Key structure: {partition}/{id}
    client.save_state(
        store_name="statestore",
        key="tenantA/user:123",
        value=json.dumps({"name": "Alice", "tier": "premium", "score": 90}),
        state_metadata={"partitionKey": "tenantA"}
    )
```

## Running Queries

```python
import json
from dapr.clients import DaprClient

query = {
    "filter": {
        "AND": [
            {"EQ": {"tier": "premium"}},
            {"GTE": {"score": 75}}
        ]
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
        query=json.dumps(query),
        states_metadata={"partitionKey": "tenantA"}
    )

    for item in result.results:
        data = json.loads(item.value)
        print(f"{item.key}: score={data['score']}")

    print(f"Continuation token: {result.token}")
```

## Supported Filter Operators

Cosmos DB supports all Dapr query filter operators:

```python
# Equality
{"EQ": {"status": "active"}}

# Comparison
{"GT": {"amount": 100}}
{"LT": {"age": 30}}
{"GTE": {"score": 50}}

# Set membership
{"IN": {"region": ["us-east-1", "us-west-2"]}}

# Logical
{"AND": [{"EQ": ...}, {"GT": ...}]}
{"OR":  [{"EQ": ...}, {"EQ": ...}]}
```

## Optimizing Cosmos DB Indexing

Add composite indexes for sort operations to reduce RU consumption:

```json
{
  "compositeIndexes": [
    [
      {"path": "/value/tier", "order": "ascending"},
      {"path": "/value/score", "order": "descending"}
    ]
  ]
}
```

Apply via Azure CLI:

```bash
az cosmosdb sql container update \
  --resource-group YOUR_RESOURCE_GROUP \
  --account-name YOUR_ACCOUNT \
  --database-name DaprDatabase \
  --name DaprState \
  --idx @indexing-policy.json
```

## Summary

The Dapr State Query API with Azure Cosmos DB translates filter/sort queries into Cosmos SQL, making partition key design critical for performance and cost. Pass `partitionKey` as a state metadata value to scope queries to a single partition and avoid cross-partition fan-out. Add composite Cosmos DB indexes for multi-field sort operations to minimize RU consumption per query.
