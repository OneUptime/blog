# How to Configure Read Replicas in Azure Database for PostgreSQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Read Replica, Flexible Server, Replication, Scalability, Performance

Description: A practical guide to setting up and managing read replicas in Azure Database for PostgreSQL Flexible Server for scaling read-heavy workloads.

---

When your PostgreSQL database is handling more read traffic than a single server can comfortably serve, read replicas let you spread that load across multiple servers. Azure Database for PostgreSQL Flexible Server supports up to five read replicas, each with its own endpoint that your application can use for read-only queries. This is especially useful for dashboards, analytics, reporting, and any workload where reads vastly outnumber writes.

In this post, I will cover how to create and manage read replicas, how they work under the hood, and how to integrate them into your application architecture.

## How Read Replicas Work

PostgreSQL read replicas on Azure use asynchronous streaming replication. The primary server streams its write-ahead log (WAL) to each replica, which replays the changes to stay in sync.

```mermaid
graph LR
    A[Application Writes] --> B[Primary Server]
    B -->|WAL Streaming| C[Replica 1]
    B -->|WAL Streaming| D[Replica 2]
    E[Application Reads] --> C
    E --> D
```

Key characteristics:

- Replication is **asynchronous** - there will be some lag between the primary and replicas.
- Replicas are **read-only** - you cannot write to them.
- Each replica has its own **independent endpoint**.
- Replicas can be in the **same region** or a **different region**.
- Up to **5 replicas** per primary server.

Since replication is asynchronous, reads from replicas may return slightly stale data. For most applications this is fine, but if you need guaranteed up-to-date reads, direct those queries to the primary.

## Prerequisites

- The primary server must be on General Purpose or Memory Optimized tier.
- The `wal_level` parameter must be set to `replica` or `logical` (default is `replica`).
- Sufficient subscription quota for the additional compute resources.

## Creating a Read Replica

### Using Azure CLI

```bash
# Create a same-region read replica

az postgres flexible-server replica create \
  --resource-group myResourceGroup \
  --replica-name my-pg-replica-1 \
  --source-server my-pg-primary \
  --zone 2
```

The replica inherits the primary's compute tier, SKU, and storage configuration by default, although some compute, storage, and performance settings can be changed during or after creation within Azure's read replica constraints. You can specify a different availability zone.

For a cross-region replica:

```bash
# Create a cross-region read replica
az postgres flexible-server replica create \
  --resource-group myResourceGroup \
  --replica-name my-pg-replica-westus \
  --source-server my-pg-primary \
  --location westus2
```

### Using the Azure Portal

1. Navigate to your PostgreSQL Flexible Server.
2. Click "Replication" under Settings.
3. Click "Add Replica."
4. Enter a name, choose the region and availability zone.
5. Click "Create."

Replica creation takes a few minutes. Azure creates a new server, fills it with data from the primary, and starts WAL streaming. Same-region replicas use a snapshot approach, while geo-replicas use a base backup transmitted over the network.

## Monitoring Replication

### Check Replication Status

```bash
# List all replicas for a primary server
az postgres flexible-server replica list \
  --resource-group myResourceGroup \
  --name my-pg-primary \
  --output table
```

### Monitor Replication Lag

Connect to the primary and check replication statistics:

```sql
-- On the primary: check replication lag for each replica
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replay_lag_pretty
FROM pg_stat_replication;
```

Connect to the replica to check from its perspective:

```sql
-- On the replica: check how far behind the primary it is
SELECT
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn,
    pg_last_xact_replay_timestamp() AS last_replay_time,
    NOW() - pg_last_xact_replay_timestamp() AS replication_delay;
```

### Set Up Replication Lag Alerts

```bash
# Alert when replication lag exceeds 60 seconds
az monitor metrics alert create \
  --name pg-replica-lag-alert \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.DBforPostgreSQL/flexibleServers/my-pg-replica-1" \
  --condition "avg physical_replication_delay_in_seconds > 60" \
  --description "Replica lag exceeded 60 seconds" \
  --action-group myActionGroup
```

## Integrating Replicas Into Your Application

### Basic Read/Write Splitting

The simplest approach is maintaining separate connection configurations:

```python
import psycopg2

# Write connection - always goes to primary
write_dsn = (
    "host=my-pg-primary.postgres.database.azure.com "
    "port=5432 dbname=myapp user=appuser "
    "password=AppPassword456! sslmode=require"
)

# Read connections - distributed across replicas
read_dsns = [
    "host=my-pg-replica-1.postgres.database.azure.com "
    "port=5432 dbname=myapp user=appuser "
    "password=AppPassword456! sslmode=require",
    "host=my-pg-replica-2.postgres.database.azure.com "
    "port=5432 dbname=myapp user=appuser "
    "password=AppPassword456! sslmode=require",
]

import random

def get_read_connection():
    """Get a connection to a random read replica."""
    dsn = random.choice(read_dsns)
    return psycopg2.connect(dsn)

def get_write_connection():
    """Get a connection to the primary for write operations."""
    return psycopg2.connect(write_dsn)
```

### Using SQLAlchemy with Read Replicas

SQLAlchemy supports multiple engine binds:

```python
from sqlalchemy import create_engine, text

# Primary engine for writes
primary_engine = create_engine(
    "postgresql://appuser:AppPassword456!@my-pg-primary.postgres.database.azure.com:5432/myapp",
    pool_size=20,
    connect_args={"sslmode": "require"}
)

# Replica engine for reads
replica_engine = create_engine(
    "postgresql://appuser:AppPassword456!@my-pg-replica-1.postgres.database.azure.com:5432/myapp",
    pool_size=20,
    connect_args={"sslmode": "require"}
)

def read_query(query, params=None):
    """Execute a read query against the replica."""
    with replica_engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return result.fetchall()

def write_query(query, params=None):
    """Execute a write query against the primary."""
    with primary_engine.begin() as conn:
        conn.execute(text(query), params or {})
```

### Handling Replication Lag in Application Logic

For critical reads that must see the latest data, route them to the primary:

```python
def get_user(user_id, require_current=False):
    """
    Fetch a user. Use primary if current data is required,
    otherwise use a replica for better load distribution.
    """
    query = "SELECT * FROM users WHERE id = %s"
    if require_current:
        # Read from primary when freshness is critical
        conn = get_write_connection()
    else:
        # Read from replica for general queries
        conn = get_read_connection()

    cursor = conn.cursor()
    cursor.execute(query, (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result
```

## Scaling Replicas Independently

Each replica is an independent server, but it must stay within Azure's read replica sizing constraints. For compute scaling, scale replicas up before scaling the primary up, and scale the primary down before scaling replicas down. The primary's compute and storage must be equal to or smaller than the smallest replica.

```bash
# Scale a replica up before increasing the primary
az postgres flexible-server update \
  --resource-group myResourceGroup \
  --name my-pg-replica-1 \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose
```

This is useful when you need a replica to keep up with heavier read or replication workloads.

## Promoting a Replica

To promote a replica to an independent read-write server:

```bash
# Promote the replica to a standalone server
az postgres flexible-server replica promote \
  --resource-group myResourceGroup \
  --name my-pg-replica-1 \
  --promote-mode standalone \
  --promote-option planned
```

After promotion:

- The replica becomes an independent read-write server.
- It stops receiving updates from the primary.
- This operation cannot be reversed.

Common use cases for promotion:

- **Disaster recovery**: If the primary region goes down, promote a cross-region replica.
- **Testing**: Promote a replica to get a writable copy of production data for testing.
- **Splitting workloads**: Separate a reporting database from the transactional database.

## Cross-Region Replicas

Cross-region replicas serve two purposes:

1. **Disaster recovery**: A warm standby in another region.
2. **Geo-distributed reads**: Serve reads from the closest region to your users.

```bash
# Create replicas in different regions for geographic distribution
az postgres flexible-server replica create \
  --resource-group myResourceGroup \
  --replica-name my-pg-replica-eu \
  --source-server my-pg-primary \
  --location northeurope

az postgres flexible-server replica create \
  --resource-group myResourceGroup \
  --replica-name my-pg-replica-asia \
  --source-server my-pg-primary \
  --location southeastasia
```

Cross-region replication has higher latency than same-region, so expect more lag. For disaster recovery, this is acceptable. For user-facing reads, make sure the lag is within your application's tolerance.

## Limitations

- Read replicas do not support high availability (HA). Only the primary can have zone-redundant HA.
- Maximum of 5 direct replicas per primary.
- Cascading read replicas are supported in supported regions for PostgreSQL 14 and later, with up to two levels of replication and up to five replicas per source read replica.
- Replicas are read-only - no writes, no DDL.
- If you need to delete a primary server that has read replicas, delete the read replicas first.
- Some server parameter changes on the primary do not automatically propagate to replicas.

## Performance Considerations

- **WAL generation**: Heavy write workloads generate more WAL, which increases network traffic and can increase replica lag.
- **Long-running transactions on primary**: Can delay WAL application on replicas.
- **Replica resource constraints**: If a replica's CPU or I/O is maxed out, it cannot keep up with replication.
- **Vacuum on primary**: Large vacuum operations generate significant WAL, temporarily increasing lag.

## Summary

Read replicas in Azure Database for PostgreSQL Flexible Server are a practical way to scale read-heavy workloads and improve geographic availability. Setting them up takes a single CLI command, and the integration into your application is a matter of routing reads to replica endpoints and writes to the primary. Monitor replication lag, size your replicas appropriately, and make sure your application logic accounts for the asynchronous nature of replication. With up to five replicas and cross-region support, you have solid tools for both performance scaling and disaster preparedness.
