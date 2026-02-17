# How to Create and Manage Read Replicas in Cloud SQL for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Read Replicas, Database Scaling

Description: A detailed guide to creating and managing read replicas in Cloud SQL for PostgreSQL to distribute read traffic and improve database performance.

---

PostgreSQL workloads on Cloud SQL can benefit enormously from read replicas. If your application does significantly more reads than writes - which is true for most web apps, APIs, and dashboards - you can offload those reads to replica instances while the primary handles writes. In this post, I will cover how to set up replicas, monitor them, and handle the quirks specific to PostgreSQL replication in Cloud SQL.

## PostgreSQL Replication in Cloud SQL

Cloud SQL for PostgreSQL uses streaming replication based on WAL (Write-Ahead Log) shipping. The primary instance streams WAL records to each replica, which replays them to stay in sync. This is asynchronous by default, meaning there is a small delay between a write on the primary and its appearance on the replica.

Key characteristics:

- Replicas are read-only (you cannot write to them)
- Each primary supports up to 10 replicas
- Replicas can be in the same region or a different region
- Replication lag is typically under a second but can vary with write volume

## Prerequisites

Your primary instance needs these settings before you can create replicas:

- Automated backups enabled
- Point-in-time recovery enabled (which enables WAL archiving)

Verify your instance configuration:

```bash
# Check if backups and PITR are enabled on the primary
gcloud sql instances describe pg-primary \
    --format="json(settings.backupConfiguration)"
```

If they are not enabled:

```bash
# Enable backups and point-in-time recovery
gcloud sql instances patch pg-primary \
    --backup-start-time=03:00 \
    --enable-point-in-time-recovery
```

## Creating a Read Replica

The basic command to create a read replica:

```bash
# Create a read replica from the primary instance
gcloud sql instances create pg-replica-1 \
    --master-instance-name=pg-primary \
    --tier=db-custom-2-8192 \
    --storage-type=SSD \
    --storage-size=100GB \
    --storage-auto-increase \
    --availability-type=ZONAL
```

Note that replicas default to `ZONAL` availability. You can make a replica highly available too (with its own standby), but that is usually overkill unless the replica is serving critical read traffic.

Using Terraform:

```hcl
# Terraform configuration for a PostgreSQL read replica
resource "google_sql_database_instance" "replica" {
  name                 = "pg-replica-1"
  master_instance_name = google_sql_database_instance.primary.name
  database_version     = "POSTGRES_15"
  region               = "us-central1"

  settings {
    tier              = "db-custom-2-8192"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network
    }
  }
}
```

## Replica Sizing Considerations

One of the most common mistakes is under-sizing replicas. The replica needs to be able to replay WAL records at least as fast as the primary generates them. If it falls behind, replication lag grows.

Consider these factors when choosing replica size:

- **CPU**: WAL replay is mostly single-threaded in PostgreSQL, but the replica also needs CPU for serving read queries
- **Memory**: The replica should have enough memory for shared buffers and active queries
- **Disk I/O**: WAL replay is I/O-intensive. Use SSD storage for replicas
- **Network**: Cross-region replicas are limited by inter-region bandwidth

A good starting point is to match the replica's tier to the primary, then adjust based on monitoring data.

## Creating Cross-Region Replicas

For disaster recovery or to serve users in other regions:

```bash
# Create a replica in Europe for lower latency reads from EU users
gcloud sql instances create pg-replica-eu \
    --master-instance-name=pg-primary \
    --tier=db-custom-4-16384 \
    --region=europe-west1 \
    --storage-type=SSD \
    --storage-size=100GB
```

Cross-region replicas have higher replication lag due to network latency. Expect 100-500ms of additional lag depending on the regions involved.

## Monitoring Replication

PostgreSQL provides detailed replication statistics. On the primary instance, you can query:

```sql
-- Check replication status from the primary
-- Shows each connected replica and its lag
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;
```

On the replica:

```sql
-- Check how far behind this replica is
SELECT
    now() - pg_last_xact_replay_timestamp() AS replay_lag,
    pg_is_in_recovery() AS is_replica,
    pg_last_wal_receive_lsn() AS received_lsn,
    pg_last_wal_replay_lsn() AS replayed_lsn;
```

For Cloud Monitoring, the key metric is:

```
cloudsql.googleapis.com/database/replication/replica_lag
```

Set up an alert for when lag exceeds your tolerance:

```bash
# Alert when replication lag exceeds 10 seconds for 5 minutes
gcloud monitoring policies create \
    --display-name="PG Replica Lag Alert" \
    --condition-display-name="Lag > 10s" \
    --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/replication/replica_lag"' \
    --condition-threshold-value=10 \
    --condition-threshold-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Configuring Application Read/Write Splitting

Your application needs to send writes to the primary and reads to replicas. Here is a pattern using Python with psycopg2:

```python
# Connection management for primary and replicas
import psycopg2
from psycopg2 import pool
import random

# Connection pool for the primary (writes)
write_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=20,
    host="primary-ip",
    port=5432,
    dbname="myapp",
    user="app_user",
    password="password"
)

# Connection pools for each replica (reads)
replica_pools = [
    psycopg2.pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=20,
        host=ip,
        port=5432,
        dbname="myapp",
        user="app_user",
        password="password"
    )
    for ip in ["replica-1-ip", "replica-2-ip"]
]

def execute_read(query, params=None):
    """Execute a read query on a random replica."""
    replica_pool = random.choice(replica_pools)
    conn = replica_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    finally:
        replica_pool.putconn(conn)

def execute_write(query, params=None):
    """Execute a write query on the primary."""
    conn = write_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
    finally:
        write_pool.putconn(conn)
```

## Using PgBouncer for Connection Pooling

PostgreSQL has a relatively high per-connection overhead. If you are connecting from many application instances to multiple replicas, consider running PgBouncer in front of each replica:

```ini
# pgbouncer.ini - Configuration for connection pooling to a replica
[databases]
myapp = host=replica-1-ip port=5432 dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
```

Transaction-mode pooling (`pool_mode = transaction`) is the most efficient option for read replicas since reads are typically short-lived.

## Promoting a Replica

If your primary goes down and you need to promote a replica to serve writes:

```bash
# Promote a replica to a standalone primary instance
# WARNING: This permanently breaks the replication link
gcloud sql instances promote-replica pg-replica-1
```

After promotion:

- The replica becomes a fully independent instance
- It starts accepting writes
- Replication from the old primary stops permanently
- Other replicas still point to the old primary - they will not follow the promoted instance

If you promote a replica for disaster recovery, you will need to create new replicas from the newly promoted instance and update your application's connection strings.

## Cascading Replicas

Cloud SQL does not support cascading replication (replica of a replica) directly. Each replica must replicate from the primary instance. This means:

- All replication traffic comes from the primary
- Adding many replicas increases the primary's network and I/O load
- If you need more than 10 replicas, consider using an external read proxy layer

## Database Flags for Replicas

You can customize certain PostgreSQL parameters on replicas independently:

```bash
# Set specific database flags on a replica
# For example, increase work_mem for analytical queries on replicas
gcloud sql instances patch pg-replica-1 \
    --database-flags=work_mem=256MB,max_parallel_workers_per_gather=4
```

This is useful when your replicas serve different workloads than the primary - for instance, analytical queries that benefit from more memory or parallelism.

## Best Practices

1. **Monitor replication lag continuously**. A replica with growing lag will serve increasingly stale data.

2. **Use private IP for all replica connections**. No reason to route replica traffic over the public internet.

3. **Test replica failover regularly**. Promote a replica in staging to understand the process and timing.

4. **Consider read-your-writes consistency**. After a write, read from the primary for a few seconds to avoid returning stale data.

5. **Scale replicas with traffic**. Add replicas during high-traffic periods and remove them when traffic drops.

6. **Keep replica storage in sync**. Replicas should have at least as much storage as the primary to avoid running out of disk during catch-up.

## Summary

Read replicas in Cloud SQL for PostgreSQL give you a clean way to scale read traffic without overloading your primary instance. Create them with a single gcloud command, point your read queries at them, and monitor replication lag. For PostgreSQL-specific monitoring, the `pg_stat_replication` view on the primary gives you detailed insight into each replica's state. Use cross-region replicas for disaster recovery, and always size replicas large enough to keep up with the primary's write throughput.
