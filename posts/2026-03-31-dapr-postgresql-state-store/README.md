# How to Configure Dapr with PostgreSQL State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, State Store, Configuration, Microservice

Description: Learn how to configure the Dapr PostgreSQL state store component, enabling durable state persistence with ACID transactions and queryable state in microservices.

---

PostgreSQL as a Dapr state store provides ACID-compliant state persistence with support for state queries, strong consistency, and transactional operations. It is ideal when you need durable state that survives process restarts and supports complex queries.

## Prerequisites

- Dapr CLI installed and initialized
- PostgreSQL instance (local Docker or managed service)

## Running PostgreSQL Locally

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=daprpassword \
  -e POSTGRES_DB=daprstate \
  -p 5432:5432 \
  postgres:16-alpine
```

## Creating the PostgreSQL State Store Component

```yaml
# components/postgres-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: postgres-secret
        key: connection-string
    - name: actorStateStore
      value: "true"
    - name: tableName
      value: "dapr_state"
```

Store the connection string:

```bash
# Kubernetes
kubectl create secret generic postgres-secret \
  --from-literal=connection-string="host=postgres port=5432 user=postgres password=daprpassword dbname=daprstate sslmode=disable"

# Local dev
export POSTGRES_CONN="host=localhost port=5432 user=postgres password=daprpassword dbname=daprstate sslmode=disable"
```

## What Dapr Creates in PostgreSQL

When Dapr first connects, it creates a state table:

```sql
CREATE TABLE dapr_state (
    key          TEXT NOT NULL,
    value        JSONB NOT NULL,
    isbinary     BOOLEAN NOT NULL,
    etag         UUID,
    expiredtime  TIMESTAMP WITH TIME ZONE,
    updatetime   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (key)
);
```

## Using State Queries with PostgreSQL

PostgreSQL v1 state store supports the Dapr State Query API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"status": "active"}
    },
    "sort": [
      {"key": "name", "order": "ASC"}
    ],
    "page": {
      "limit": 10
    }
  }'
```

## Strong Consistency and Transactions

PostgreSQL supports strong consistency and transactions:

```bash
# Transactional state update
curl -X POST http://localhost:3500/v1.0/state/statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operation": "upsert",
        "request": {
          "key": "order:1001",
          "value": {"status": "processing", "amount": 99.99},
          "options": {"consistency": "strong"}
        }
      },
      {
        "operation": "upsert",
        "request": {
          "key": "inventory:item-A",
          "value": {"stock": 49},
          "options": {"consistency": "strong"}
        }
      }
    ]
  }'
```

## Connecting to Managed PostgreSQL

For AWS RDS, Azure Database for PostgreSQL, or Supabase:

```yaml
    - name: connectionString
      value: "host=your-db.rds.amazonaws.com port=5432 user=dapruser password=secret dbname=daprstate sslmode=require"
```

For connection pooling with PgBouncer:

```yaml
    - name: connectionString
      value: "host=pgbouncer port=5432 user=dapruser password=secret dbname=daprstate sslmode=disable"
    - name: connectionMaxIdleTime
      value: "5m"
```

## Inspecting State Directly in PostgreSQL

```sql
-- List all state keys
SELECT key, updatetime, expiredtime
FROM dapr_state
ORDER BY updatetime DESC
LIMIT 20;

-- Find states by value field
SELECT key, value
FROM dapr_state
WHERE value->>'status' = 'active';

-- Check TTL-expired states
SELECT COUNT(*) FROM dapr_state
WHERE expiredtime < NOW();
```

## Summary

The Dapr PostgreSQL state store provides ACID-compliant, queryable state persistence suitable for production workloads requiring strong consistency and durable storage. Using version v1 of the component enables state query support, allowing complex filtering directly against JSONB-stored state data.
