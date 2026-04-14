# How to Optimize PostgreSQL as Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, State Store, Performance, Database, Optimization

Description: Optimize PostgreSQL as a Dapr state store with connection pooling, indexing strategies, and schema tuning for production workloads.

---

## Overview

PostgreSQL is a popular Dapr state store for workloads requiring strong consistency, complex queries, and ACID transactions. Unlike Redis, PostgreSQL provides durable state with SQL-level guarantees, but requires careful tuning to achieve acceptable performance at scale.

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-state
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: postgres-secret
      key: connectionString
  - name: tableName
    value: "dapr_state"
  - name: schemaName
    value: "dapr"
  - name: maxConns
    value: "20"
  - name: connectionMaxIdleTime
    value: "5m"
  - name: cleanupInterval
    value: "1h"
  - name: actorStateStore
    value: "false"
```

Create the secret:

```bash
kubectl create secret generic postgres-secret \
  --from-literal=connectionString="host=postgres port=5432 user=dapr password=secret dbname=statedb sslmode=require pool_max_conns=20"
```

## PostgreSQL Schema Optimization

Dapr creates the state table automatically, but you can add indexes for better performance:

```sql
-- Add index for TTL-based cleanup queries
CREATE INDEX CONCURRENTLY idx_dapr_state_expiredate
  ON dapr.dapr_state (expiredate)
  WHERE expiredate IS NOT NULL;

-- Add index for key prefix queries (if you use namespaced keys)
CREATE INDEX CONCURRENTLY idx_dapr_state_key_prefix
  ON dapr.dapr_state (left(key, 50));

-- Check table and index sizes
SELECT
  pg_size_pretty(pg_total_relation_size('dapr.dapr_state')) AS total_size,
  pg_size_pretty(pg_indexes_size('dapr.dapr_state')) AS index_size,
  pg_size_pretty(pg_relation_size('dapr.dapr_state')) AS table_size;
```

## PgBouncer Connection Pooling

PostgreSQL has a per-connection overhead cost. Use PgBouncer to pool connections:

```ini
# pgbouncer.ini
[databases]
statedb = host=postgres port=5432 dbname=statedb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
log_connections = 0
log_disconnections = 0
```

Update Dapr to connect through PgBouncer:

```bash
kubectl create secret generic postgres-secret \
  --from-literal=connectionString="host=pgbouncer port=6432 user=dapr password=secret dbname=statedb"
```

## Transactional State Operations

Dapr PostgreSQL state store supports multi-key transactions:

```python
import json
from dapr.clients import DaprClient
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

def transfer_inventory(from_item: str, to_item: str, quantity: int):
    with DaprClient() as client:
        operations = [
            TransactionalStateOperation(
                key=f"inventory:{from_item}",
                data=json.dumps({"quantity": -quantity}),
                operation_type=TransactionOperationType.upsert
            ),
            TransactionalStateOperation(
                key=f"inventory:{to_item}",
                data=json.dumps({"quantity": quantity}),
                operation_type=TransactionOperationType.upsert
            ),
        ]

        client.execute_state_transaction(
            store_name="postgres-state",
            operations=operations
        )
        print(f"Transferred {quantity} units from {from_item} to {to_item}")
```

## PostgreSQL Server Tuning

```sql
-- Tune for OLTP workloads
-- Note: shared_buffers and wal_buffers require a server restart to take effect.
-- The other parameters below can be applied with pg_reload_conf().
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET random_page_cost = '1.1';

-- Reload config for parameters that don't require a restart
SELECT pg_reload_conf();
-- Then restart PostgreSQL to apply shared_buffers and wal_buffers
```

## Summary

Optimizing PostgreSQL as a Dapr state store requires a combination of schema-level indexing, external connection pooling with PgBouncer, and server-side memory tuning. The v2 PostgreSQL component supports TTL-based cleanup and multi-key transactions, making it suitable for complex stateful workflows. For read-heavy workloads, consider adding a read replica and routing Dapr reads through it.
