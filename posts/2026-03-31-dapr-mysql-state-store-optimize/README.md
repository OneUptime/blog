# How to Optimize MySQL as Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MySQL, State Store, Performance, Database, Optimization

Description: Optimize MySQL as a Dapr state store with InnoDB tuning, connection pooling, and index strategies for high-throughput workloads.

---

## Overview

MySQL is a widely used relational database that Dapr supports as a state store through the MySQL component. While it offers strong ACID guarantees and familiarity for most teams, achieving high throughput requires InnoDB buffer pool tuning, proper connection pooling, and schema optimization.

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql-state
  namespace: default
spec:
  type: state.mysql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: mysql-secret
      key: connectionString
  - name: schemaName
    value: "dapr_state"
  - name: tableName
    value: "state"
  - name: cleanupInterval
    value: "1h"
  - name: timeoutInSeconds
    value: "20"
```

Create the connection string secret with optimized parameters:

```bash
kubectl create secret generic mysql-secret \
  --from-literal=connectionString="dapr:secret@tcp(mysql:3306)/dapr_state?allowNativePasswords=true&charset=utf8mb4&parseTime=true&interpolateParams=true&maxAllowedPacket=16777216"
```

## MySQL Schema Review

Dapr creates the state table automatically. Review and optimize the schema:

```sql
-- Review the auto-created table structure
DESCRIBE dapr_state.state;

-- Add index for TTL cleanup (expiredate column)
CREATE INDEX idx_state_expiredate
  ON dapr_state.state (expiredate)
  ALGORITHM=INPLACE LOCK=NONE;

-- Analyze table statistics
ANALYZE TABLE dapr_state.state;

-- Check index cardinality
SHOW INDEX FROM dapr_state.state;
```

## InnoDB Buffer Pool Tuning

```sql
-- Set buffer pool to 70-80% of available RAM (e.g., 4GB for 6GB RAM)
SET GLOBAL innodb_buffer_pool_size = 4294967296;

-- innodb_buffer_pool_instances is not dynamic;
-- set in my.cnf and restart the server:
-- innodb_buffer_pool_instances = 4

-- Tune log file size for write-heavy workloads
-- (set in my.cnf, requires restart)
-- innodb_log_file_size = 512M

-- Optimize flush behavior
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL sync_binlog = 0;
```

Add to MySQL configuration file:

```ini
[mysqld]
innodb_buffer_pool_size = 4G
innodb_buffer_pool_instances = 4
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
max_connections = 500
# thread_pool_size requires MySQL Enterprise Edition
# thread_pool_size = 16
```

## ProxySQL Connection Pooling

Use ProxySQL for connection pooling in front of MySQL:

```sql
-- Configure ProxySQL backend server
INSERT INTO mysql_servers (
  hostgroup_id, hostname, port, max_connections
) VALUES (0, 'mysql-primary', 3306, 100);

-- Configure query routing
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, destination_hostgroup
) VALUES (1, 1, '^SELECT', 1);

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Transactional State Operations

```python
import dapr.clients as dapr
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType
import json

def atomic_order_update(order_id: str, user_id: str, new_status: str):
    with dapr.DaprClient() as client:
        operations = [
            TransactionalStateOperation(
                key=f"order:{order_id}",
                data=json.dumps({"status": new_status, "updatedAt": "2026-03-31"}),
                operation_type=TransactionOperationType.upsert
            ),
            TransactionalStateOperation(
                key=f"user-order-history:{user_id}",
                data=json.dumps({"lastOrderId": order_id, "lastStatus": new_status}),
                operation_type=TransactionOperationType.upsert
            )
        ]

        client.execute_state_transaction(
            store_name="mysql-state",
            operations=operations
        )
```

## Summary

MySQL as a Dapr state store benefits from InnoDB buffer pool sizing, ProxySQL connection pooling, and flush behavior tuning for write-heavy workloads. The `cleanupInterval` setting automates TTL-based state expiration without manual maintenance jobs. For read-heavy patterns, configure a read replica and route Dapr get operations through it via ProxySQL query rules.
