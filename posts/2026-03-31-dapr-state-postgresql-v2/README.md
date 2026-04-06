# How to Use Dapr State Store with PostgreSQL v2 Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, State Store, Database, Kubernetes

Description: Configure and use the Dapr PostgreSQL v2 state store component, covering schema changes, ETag-based concurrency, and query API support.

---

## What Changed in PostgreSQL v2

The Dapr PostgreSQL state store v2 component (`state.postgresql/v2`) introduced a revised schema with improved indexing, native support for the State Query API, and better handling of TTL expiry. It requires PostgreSQL 12 or later and uses a different table structure than v1.

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
    - name: connectionString
      value: "host=postgres port=5432 user=dapr password=secret dbname=dapr sslmode=disable"
    - name: tableName
      value: "dapr_state"
    - name: metadataTableName
      value: "dapr_metadata"
    - name: cleanupInterval
      value: "1m"
```

For production, use a secret reference:

```yaml
metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connection-string
```

```bash
kubectl create secret generic postgres-secret \
  --from-literal=connection-string="host=postgres port=5432 user=dapr password=secret dbname=dapr sslmode=require"
```

## V2 Schema Overview

The v2 component creates this table structure:

```sql
CREATE TABLE IF NOT EXISTS dapr_state (
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    isbinary    BOOLEAN NOT NULL,
    etag        UUID NOT NULL DEFAULT gen_random_uuid(),
    expiredate  TIMESTAMPTZ,
    updatetime  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS idx_dapr_state_expiredate
    ON dapr_state (expiredate)
    WHERE expiredate IS NOT NULL;
```

## ETag-Based Optimistic Concurrency

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    # First read to get current ETag
    result = client.get_state("statestore", "user:123")
    etag = result.etag

    # Update with ETag - fails if another process updated first
    try:
        client.save_state(
            store_name="statestore",
            key="user:123",
            value='{"name": "Alice", "score": 100}',
            etag=etag,
            state_metadata={"concurrency": "first-write"}
        )
    except Exception as e:
        print(f"Concurrent update detected: {e}")
        # Re-read and retry
```

## State Query API with PostgreSQL v2

```python
query = {
    "filter": {
        "AND": [
            {"EQ": {"status": "active"}},
            {"GT": {"score": 50}}
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
        query=json.dumps(query)
    )
    for item in result.results:
        print(item.key, item.data)
```

## TTL Support

```python
# State expires after 300 seconds
with DaprClient() as client:
    client.save_state(
        store_name="statestore",
        key="session:abc",
        value='{"userId": "123"}',
        state_metadata={"ttlInSeconds": "300"}
    )
```

## Migrating from v1 to v2

```bash
# v1 and v2 use different table schemas - do not reuse the same table
# Set a new tableName in v2 component config:
# tableName: "dapr_state_v2"

# Migrate data:
psql -c "INSERT INTO dapr_state_v2 (key, value, isbinary, etag)
         SELECT key, value, isbinary, gen_random_uuid()
         FROM state_table_v1"
```

## Summary

The Dapr PostgreSQL v2 state store uses JSONB columns with UUID ETags and a partial index on `expiredate` for efficient TTL cleanup. Unlike v1, it fully supports the State Query API, allowing filter and sort operations directly against stored JSON values. Use `concurrency: first-write` mode with ETags to implement safe optimistic locking in concurrent update scenarios.
