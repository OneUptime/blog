# How to Use Dapr State Management with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, PostgreSQL, SQL, Microservice

Description: Configure Dapr state management with PostgreSQL as a durable, transactional backing store with support for state queries, ETags, and bulk operations.

---

## Why Use PostgreSQL as a Dapr State Store?

PostgreSQL provides ACID transactions, rich query capabilities, and long-term durability. Using it as a Dapr state store is ideal when you need strong consistency, auditability, or when you want to keep state data in an existing relational database alongside other application data.

## Prerequisites

- PostgreSQL instance (local or cloud-hosted)
- Dapr CLI initialized
- `psql` client (optional, for verification)

## Setting Up PostgreSQL

Start PostgreSQL with Docker for local development:

```bash
docker run -d \
  --name dapr-postgres \
  -e POSTGRES_PASSWORD=secretpassword \
  -e POSTGRES_DB=daprstate \
  -p 5432:5432 \
  postgres:15
```

Dapr will automatically create the required table if it does not exist.

## Configuring the PostgreSQL State Store Component

```yaml
# statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    value: "host=localhost user=postgres password=secretpassword dbname=daprstate port=5432 sslmode=disable"
  - name: tableName
    value: "dapr_state"
  - name: cleanupInterval
    value: "1h"
```

For Kubernetes with a secret:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
  - name: tableName
    value: "dapr_state"
```

Create the secret:

```bash
kubectl create secret generic postgres-secret \
  --from-literal=connectionString="host=postgres-service user=postgres password=secretpassword dbname=daprstate port=5432 sslmode=require"
```

## Auto-Created Table Schema

Dapr automatically creates the state table with this schema:

```sql
CREATE TABLE IF NOT EXISTS dapr_state (
    key          TEXT NOT NULL PRIMARY KEY,
    value        JSONB NOT NULL,
    isbinary     BOOLEAN NOT NULL,
    expiredate   TIMESTAMPTZ DEFAULT NULL,
    updatedate   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Note: There is no explicit `etag` column. Dapr v1 uses PostgreSQL's built-in `xmin` system column as the ETag for optimistic concurrency control.

Verify it was created:

```bash
psql -h localhost -U postgres -d daprstate -c "\d dapr_state"
```

## Saving and Getting State

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "product:123", "value": {"name": "Widget", "price": 9.99, "stock": 100}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/product:123
```

## Python Example

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    # Save a product record
    product = {
        "productId": "123",
        "name": "Widget",
        "price": 9.99,
        "stock": 100,
        "category": "hardware"
    }
    client.save_state(
        store_name="statestore",
        key="product:123",
        value=json.dumps(product)
    )

    # Read it back
    result = client.get_state(
        store_name="statestore",
        key="product:123"
    )
    p = json.loads(result.data)
    print(f"Product: {p['name']}, Price: {p['price']}")

    # Save multiple products
    items = [
        {"key": "product:124", "value": json.dumps({"name": "Bolt", "price": 0.99})},
        {"key": "product:125", "value": json.dumps({"name": "Nut", "price": 0.50})},
    ]
    client.save_bulk_state(store_name="statestore", states=[
        dapr.clients.grpc._state.StateItem(key=i["key"], value=i["value"].encode())
        for i in items
    ])
```

## Using State Transactions for Atomicity

PostgreSQL's ACID properties enable true atomic transactions:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

with DaprClient() as client:
    # Atomic transfer: deduct from source, add to destination
    operations = [
        TransactionalStateOperation(
            key="account:alice",
            data=json.dumps({"balance": 800}).encode(),
            operation_type=TransactionOperationType.upsert
        ),
        TransactionalStateOperation(
            key="account:bob",
            data=json.dumps({"balance": 1200}).encode(),
            operation_type=TransactionOperationType.upsert
        )
    ]
    client.execute_state_transaction(
        store_name="statestore",
        operations=operations
    )
```

## Querying State in PostgreSQL Directly

Since state is stored as JSONB, you can run queries directly in PostgreSQL:

```sql
-- Find all products in the hardware category
SELECT key, value->>'name', (value->>'price')::numeric
FROM dapr_state
WHERE key LIKE 'myapp||product:%'
  AND value->>'category' = 'hardware';

-- Find expensive products
SELECT key, value->>'name', value->>'price'
FROM dapr_state
WHERE (value->>'price')::numeric > 5.00;
```

## Connection Pooling Configuration

For high-throughput workloads, configure connection pooling:

```yaml
  - name: connectionString
    value: "host=postgres-service user=postgres password=secret dbname=daprstate pool_max_conns=20 pool_min_conns=5"
  - name: connectionMaxIdleTime
    value: "15m"
```

## Enabling SSL

For production PostgreSQL with SSL:

```yaml
  - name: connectionString
    value: "host=db.example.com user=dapr password=secret dbname=daprstate sslmode=verify-full sslrootcert=/certs/ca.crt"
```

## Summary

Dapr state management with PostgreSQL leverages the database's ACID properties for durable, transactional state storage. The component auto-creates the state table and stores values as JSONB, enabling direct SQL queries on state data. This is ideal for applications that need strong consistency, queryable state, or integration with existing PostgreSQL infrastructure.
