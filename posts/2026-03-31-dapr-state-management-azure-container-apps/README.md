# How to Use Dapr State Management on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, State Management, Cosmos DB, Azure

Description: Store and retrieve application state using Dapr on Azure Container Apps backed by Azure Cosmos DB, with transactions, bulk operations, and actor state.

---

## Overview

Dapr state management on Azure Container Apps is typically backed by Azure Cosmos DB, providing globally distributed, low-latency state storage. This guide shows how to configure the state store and use it from your applications.

## Step 1: Create Cosmos DB

```bash
az cosmosdb create \
  --name dapr-cosmosdb \
  --resource-group rg-dapr \
  --capabilities EnableServerless

az cosmosdb sql database create \
  --account-name dapr-cosmosdb \
  --resource-group rg-dapr \
  --name daprdb

az cosmosdb sql container create \
  --account-name dapr-cosmosdb \
  --resource-group rg-dapr \
  --database-name daprdb \
  --name state \
  --partition-key-path /partitionKey
```

## Step 2: Configure the Dapr State Store Component

```yaml
# statestore.yaml
componentType: state.azure.cosmosdb
version: v1
metadata:
  - name: url
    value: "https://dapr-cosmosdb.documents.azure.com:443/"
  - name: masterKey
    secretRef: cosmos-key
  - name: database
    value: "daprdb"
  - name: collection
    value: "state"
  - name: actorStateStore
    value: "true"
secrets:
  - name: cosmos-key
    value: "<your-primary-key>"
```

```bash
az containerapp env dapr-component set \
  --name aca-env \
  --resource-group rg-dapr \
  --dapr-component-name statestore \
  --yaml statestore.yaml
```

## Step 3: Save and Get State

```python
import requests

BASE = 'http://localhost:3500/v1.0/state/statestore'

# Save state
requests.post(BASE, json=[
    {'key': 'user-alice', 'value': {'name': 'Alice', 'plan': 'pro', 'credits': 100}}
])

# Get state
resp = requests.get(f'{BASE}/user-alice')
user = resp.json()
print(user)

# Delete state
requests.delete(f'{BASE}/user-alice')
```

## Step 4: Use ETag for Optimistic Concurrency

```python
# Get state with ETag
resp = requests.get(f'{BASE}/user-alice')
etag = resp.headers.get('ETag')

# Update with ETag (fails if another process modified it)
requests.post(BASE, json=[{
    'key': 'user-alice',
    'value': {'name': 'Alice', 'credits': 90},
    'etag': etag,
    'options': {'concurrency': 'first-write'}
}])
```

## Step 5: Bulk Operations

```python
# Bulk save
requests.post(f'http://localhost:3500/v1.0/state/statestore', json=[
    {'key': f'item-{i}', 'value': {'qty': i * 10}}
    for i in range(1, 6)
])

# Bulk get
resp = requests.post(
    f'http://localhost:3500/v1.0/state/statestore/bulk',
    json={'keys': [f'item-{i}' for i in range(1, 6)]}
)
print(resp.json())
```

## Step 6: Transactions

```python
requests.post(
    'http://localhost:3500/v1.0/state/statestore/transaction',
    json={
        'operations': [
            {'operation': 'upsert', 'request': {'key': 'balance-alice', 'value': 90}},
            {'operation': 'upsert', 'request': {'key': 'balance-bob', 'value': 110}},
        ]
    }
)
```

## Summary

Dapr state management on Azure Container Apps, backed by Cosmos DB, provides globally distributed, highly available application state. ETags enable optimistic concurrency control for conflict detection, while bulk operations and transactions improve efficiency for multi-record operations. The actor state store configuration enables Dapr actors to persist their state in the same Cosmos DB collection.
