# How to Use Dapr State Management with Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Azure Cosmos DB, Azure, Microservice

Description: Configure Dapr state management with Azure Cosmos DB as the backing store for globally distributed, multi-model state with partition key support.

---

## Why Use Cosmos DB as a Dapr State Store?

Azure Cosmos DB provides globally distributed, low-latency storage with SLA-backed availability. When combined with Dapr state management, you get a consistent API for reading and writing state that works locally and at planet scale. Dapr's Cosmos DB component supports single-item operations, bulk operations, and transactional state changes.

## Prerequisites

- Azure subscription with a Cosmos DB account (Core/SQL API)
- A Cosmos DB database and container created
- Dapr CLI initialized

## Creating the Cosmos DB Resources

Using the Azure CLI:

```bash
# Create resource group
az group create --name dapr-demo --location eastus

# Create Cosmos DB account
az cosmosdb create \
  --name my-dapr-cosmos \
  --resource-group dapr-demo \
  --default-consistency-level Session

# Create database
az cosmosdb sql database create \
  --account-name my-dapr-cosmos \
  --resource-group dapr-demo \
  --name daprdb

# Create container with partition key
az cosmosdb sql container create \
  --account-name my-dapr-cosmos \
  --resource-group dapr-demo \
  --database-name daprdb \
  --name statestore \
  --partition-key-path "/partitionKey"
```

Get the primary key:

```bash
az cosmosdb keys list \
  --name my-dapr-cosmos \
  --resource-group dapr-demo \
  --query primaryMasterKey -o tsv
```

## Configuring the Cosmos DB State Store Component

```yaml
# statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://my-dapr-cosmos.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "daprdb"
  - name: collection
    value: "statestore"
  - name: contentType
    value: "application/json"
```

For self-hosted mode, create a local secret:

```json
{
  "cosmos-secret": {
    "masterKey": "YOUR_COSMOS_PRIMARY_KEY=="
  }
}
```

Reference it in the component:

```yaml
auth:
  secretStore: localsecretstore
```

Or inline the value for development:

```yaml
  - name: masterKey
    value: "YOUR_COSMOS_PRIMARY_KEY=="
```

## Saving and Reading State

The Dapr API is identical regardless of the backing store:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "order:123", "value": {"amount": 99.99, "status": "pending"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/order:123
```

## Using Partition Keys

Cosmos DB requires a partition key for each document. Dapr stores the app ID as the partition key by default. You can customize this with the `keyPrefix` metadata option.

The stored document in Cosmos DB looks like:

```json
{
  "id": "myapp||order:123",
  "partitionKey": "myapp",
  "value": {"amount": 99.99, "status": "pending"},
  "_etag": "\"00000000-0000-0000-xxxx-xxxxxxxxxxxx\"",
  "_ts": 1617000000
}
```

## Python Example

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Concurrency
import json

with DaprClient() as client:
    # Save an order
    order = {"orderId": "123", "amount": 99.99, "status": "pending"}
    client.save_state(
        store_name="statestore",
        key="order:123",
        value=json.dumps(order)
    )

    # Retrieve the order
    result = client.get_state(store_name="statestore", key="order:123")
    order_data = json.loads(result.data)
    print(f"Order: {order_data}")

    # Update with optimistic concurrency using etag
    client.save_state(
        store_name="statestore",
        key="order:123",
        value=json.dumps({"orderId": "123", "amount": 99.99, "status": "completed"}),
        etag=result.etag,
        options=StateOptions(concurrency=Concurrency.first_write),
        state_metadata={"contentType": "application/json"}
    )
```

## Go Example

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    order := map[string]interface{}{
        "orderId": "456",
        "amount":  149.99,
        "status":  "pending",
    }
    data, _ := json.Marshal(order)

    // Save state
    if err := client.SaveState(ctx, "statestore", "order:456", data, nil); err != nil {
        log.Fatal(err)
    }

    // Get state
    item, err := client.GetState(ctx, "statestore", "order:456", nil)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Order data: %s\n", item.Value)
    fmt.Printf("ETag: %s\n", item.Etag)
}
```

## Using Managed Identity (No Keys)

Instead of a master key, use Azure Managed Identity:

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
    value: "https://my-dapr-cosmos.documents.azure.com:443/"
  - name: database
    value: "daprdb"
  - name: collection
    value: "statestore"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

Assign the "Cosmos DB Built-in Data Contributor" role to the managed identity.

## Configuring Consistency Level

Control the Dapr consistency level for individual state operations:

```bash
# Strong consistency (read your own writes)
curl "http://localhost:3500/v1.0/state/statestore/order:123?consistency=strong"

# Eventual consistency
curl "http://localhost:3500/v1.0/state/statestore/order:123?consistency=eventual"
```

Supported values: `eventual`, `strong`. These are Dapr-level consistency options that control read behavior. They are separate from the Cosmos DB account-level consistency setting configured during account creation.

## Summary

Dapr state management with Azure Cosmos DB gives you global distribution, low latency, and multi-region replication through the same simple key-value API. The Cosmos DB component maps Dapr state keys to Cosmos documents with the app ID as the partition key. All Dapr state operations (save, get, delete, transaction, bulk) work identically to any other state store, making it easy to switch backends as your requirements evolve.
