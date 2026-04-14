# How to Use Dapr State Store with PostgreSQL v2 Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, State Store, Database, Kubernetes

Description: Configure and use the Dapr PostgreSQL v2 state store component, covering schema changes, ETag-based concurrency, and query API support.

---

## What Changed in PostgreSQL v2

The Dapr PostgreSQL state store v2 component (`state.postgresql` with `version: v2`) introduced a revised schema that stores values as binary (`BYTEA`) instead of JSONB, uses UUID-based ETags instead of the `xmin` system column, and provides better handling of TTL expiry. Note that v2 does **not** support the State Query API (which was available in v1 due to its JSONB storage). It uses a different table structure than v1.

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
    - name: tablePrefix
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
    key         TEXT NOT NULL PRIMARY KEY,
    value       BYTEA NOT NULL,
    etag        UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ
);

CREATE INDEX ON dapr_state (expires_at);
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
        from dapr.clients.grpc._state import StateOptions, Concurrency

        client.save_state(
            store_name="statestore",
            key="user:123",
            value='{"name": "Alice", "score": 100}',
            etag=etag,
            options=StateOptions(concurrency=Concurrency.first_write),
        )
    except Exception as e:
        print(f"Concurrent update detected: {e}")
        # Re-read and retry
```

## State Query API with PostgreSQL v2

The PostgreSQL v2 component does **not** support the Dapr State Query API. This is because v2 stores values as `BYTEA` (binary) instead of `JSONB`, making it impossible to filter or sort on JSON fields within the database. If you need the State Query API, you must use the v1 component (`state.postgresql` with `version: v1`), which stores values as `JSONB` and supports query operations.

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
# Set a new tablePrefix in v2 component config:
# tablePrefix: "dapr_state_v2"

# Migrate data (v2 uses BYTEA for value and has no isbinary column):
psql -c "INSERT INTO dapr_state_v2 (key, value, etag)
         SELECT key, value::bytea, gen_random_uuid()
         FROM state_table_v1"
```

## Summary

The Dapr PostgreSQL v2 state store uses BYTEA columns with UUID ETags and an index on `expires_at` for efficient TTL cleanup. Unlike v1, it does **not** support the State Query API because values are stored as binary rather than JSONB. Use `StateOptions(concurrency=Concurrency.first_write)` with ETags to implement safe optimistic locking in concurrent update scenarios.
