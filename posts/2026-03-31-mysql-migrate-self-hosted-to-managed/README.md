# How to Migrate from Self-Hosted MySQL to a Managed Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Migration, Cloud, Database, Backup

Description: Migrate from a self-hosted MySQL server to a managed cloud database service with minimal downtime using mysqldump, binlog replication, or DMS tools.

---

Migrating from a self-hosted MySQL server to a managed cloud service requires careful planning to minimize downtime and ensure data integrity. The approach depends on database size, acceptable downtime window, and target platform.

## Pre-Migration Checklist

Before migrating, audit compatibility between your source MySQL version and the managed service:

```sql
-- Check current MySQL version
SELECT VERSION();

-- Check character sets in use
SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME
FROM information_schema.SCHEMATA;

-- Check storage engines
SELECT TABLE_SCHEMA, TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
  AND ENGINE != 'InnoDB';

-- Estimate database size
SELECT
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS 'Size (GB)'
FROM information_schema.TABLES
GROUP BY table_schema;
```

## Small Database Migration with mysqldump

For databases under 50 GB, `mysqldump` with a short downtime window is the simplest approach:

```bash
# On source server - take a logical dump with consistent read
mysqldump \
  --single-transaction \
  --source-data=2 \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --set-gtid-purged=OFF \
  --all-databases \
  > full_dump.sql

# Compress it
gzip full_dump.sql

# Transfer to a host with access to the managed service
scp full_dump.sql.gz user@migration-host:/tmp/

# Import into the managed service
gunzip -c /tmp/full_dump.sql.gz | mysql \
  --host=managed-mysql-host \
  --port=3306 \
  --user=admin \
  --password \
  --ssl-ca=ca-cert.pem
```

## Near-Zero Downtime Migration Using Replication

For production databases requiring minimal downtime:

1. Take a dump from the source with binary log coordinates
2. Import into the managed service
3. Set up replication from source to managed service
4. Cut over application connections
5. Stop replication

```bash
# Step 1: Dump with binlog position
mysqldump --single-transaction --source-data=1 \
  --all-databases > dump_with_position.sql

# The dump includes a CHANGE REPLICATION SOURCE TO statement at the top
head -30 dump_with_position.sql | grep "CHANGE REPLICATION SOURCE"
```

On the managed service side, configure it as a replica:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='self-hosted-mysql-ip',
  SOURCE_USER='replication_user',
  SOURCE_PASSWORD='replication_password',
  SOURCE_LOG_FILE='mysql-bin.000123',
  SOURCE_LOG_POS=456789;

START REPLICA;
SHOW REPLICA STATUS\G
```

Monitor replication lag until `Seconds_Behind_Source` reaches zero, then cut over.

## Using AWS Database Migration Service

AWS DMS provides continuous replication for larger databases:

```bash
# Create a replication instance
aws dms create-replication-instance \
  --replication-instance-identifier my-migration \
  --replication-instance-class dms.r5.large \
  --allocated-storage 100

# Create source endpoint (self-hosted MySQL)
aws dms create-endpoint \
  --endpoint-identifier source-mysql \
  --endpoint-type source \
  --engine-name mysql \
  --username admin \
  --password secret \
  --server-name 192.168.1.100 \
  --port 3306

# Create target endpoint (managed MySQL)
aws dms create-endpoint \
  --endpoint-identifier target-rds \
  --endpoint-type target \
  --engine-name mysql \
  --username admin \
  --password secret \
  --server-name my-rds.cluster.us-east-1.rds.amazonaws.com \
  --port 3306
```

## Post-Migration Validation

After migration, verify data integrity:

```sql
-- Compare row counts
SELECT table_name, table_rows
FROM information_schema.TABLES
WHERE table_schema = 'myapp'
ORDER BY table_name;

-- Verify checksums on critical tables
CHECKSUM TABLE orders, users, products;
```

## Summary

Migrating from self-hosted MySQL to a managed service follows three phases: pre-migration compatibility checks, data transfer using mysqldump for small databases or binlog replication for near-zero downtime on large ones, and post-migration validation. Use AWS DMS or Google Database Migration Service for complex migrations with ongoing replication until you are confident to cut over. Always test the migration process on a non-production copy before executing it against production data.
