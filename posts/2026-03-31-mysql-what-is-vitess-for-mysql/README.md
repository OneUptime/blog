# What Is Vitess for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Vitess, Horizontal Scaling, Sharding

Description: Vitess is an open-source database clustering system for horizontal scaling of MySQL, originally built at YouTube to scale to millions of QPS.

---

## Overview

Vitess is an open-source database clustering system designed to horizontally scale MySQL. Originally developed at YouTube (now part of CNCF), Vitess adds transparent sharding, connection multiplexing, and query routing on top of standard MySQL instances. It allows a single logical database to span many MySQL shards without application-level awareness.

Vitess is the technology behind PlanetScale's managed MySQL service.

## Key Capabilities

- Transparent sharding (horizontal partitioning across many MySQL instances)
- Connection pooling and multiplexing (handles millions of connections)
- Query routing based on shard key
- Online schema migrations with no locks
- Backup and restore orchestration
- GTID-based replication management

## Architecture Components

```text
                  Application
                      |
              VTGate (query router)
             /        |          \
        Shard 1    Shard 2    Shard 3
        VTTablet   VTTablet   VTTablet
           |           |           |
         MySQL       MySQL       MySQL
           |           |           |
         Replica     Replica     Replica
```

| Component | Role |
|-----------|------|
| `vtgate` | Stateless proxy that routes queries to the right shard |
| `vttablet` | Agent running alongside each MySQL instance |
| `vtctld` | Control plane for cluster management |
| `etcd` / `consul` | Distributed topology storage |

## Installing Vitess with Docker Compose

```bash
git clone https://github.com/vitessio/vitess
cd vitess/examples/compose

docker compose up -d

# Access VTAdmin at http://localhost:14201
```

## Defining a Keyspace and Sharding

A keyspace is Vitess's concept of a logical database:

```sql
-- Connect to VTGate (standard MySQL protocol)
mysql -h 127.0.0.1 -P 15306 -u user

-- Create a keyspace (done via vtctlclient)
```

```bash
# Unsharded keyspace
vtctldclient CreateKeyspace commerce

# Sharded keyspace (sharding is configured via VSchema, not at creation time)
vtctldclient CreateKeyspace commerce_sharded
```

## VSchema - Routing Rules

VSchema defines how Vitess routes queries:

```json
{
  "sharded": true,
  "vindexes": {
    "hash": {
      "type": "hash"
    }
  },
  "tables": {
    "orders": {
      "column_vindexes": [
        {
          "column": "customer_id",
          "name": "hash"
        }
      ]
    }
  }
}
```

## Connecting an Application to Vitess

Applications connect to VTGate using the standard MySQL protocol - no driver changes needed:

```python
import mysql.connector

conn = mysql.connector.connect(
    host='vtgate-host',
    port=15306,
    user='app_user',
    password='app_password',
    database='commerce'
)

cursor = conn.cursor()
# This query is automatically routed to the correct shard
cursor.execute("SELECT * FROM orders WHERE customer_id = %s", (42,))
```

## Online Schema Migrations

Vitess can run schema migrations without locking tables, managed by the control plane:

```sql
-- Set the online DDL strategy
SET @@ddl_strategy='vitess';

-- Submit an online DDL migration
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Check migration status
SHOW VITESS_MIGRATIONS LIKE 'orders'\G
```

## Connection Multiplexing

Vitess can handle millions of application connections while maintaining a small pool to MySQL:

```text
10,000 app connections
         |
     VTGate
         |
    100 MySQL connections
```

## Resharding (Adding More Shards)

When a shard grows too large, Vitess supports online resharding:

```bash
# Reshard from 2 shards to 4
vtctldclient Reshard --workflow reshard_workflow --target-keyspace commerce create \
  --source-shards '-80,80-' --target-shards '-40,40-80,80-c0,c0-'
vtctldclient Reshard --workflow reshard_workflow --target-keyspace commerce switchtraffic
vtctldclient Reshard --workflow reshard_workflow --target-keyspace commerce complete
```

## Summary

Vitess is the gold standard for horizontally scaling MySQL beyond what a single server can handle. By adding transparent sharding, connection multiplexing, and online schema management on top of MySQL, it allows applications to scale to billions of rows and millions of queries per second while still using standard MySQL clients and SQL syntax. It is production-proven at companies like YouTube, Slack, GitHub, and Square.
