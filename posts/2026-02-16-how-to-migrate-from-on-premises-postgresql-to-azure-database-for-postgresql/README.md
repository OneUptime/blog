# How to Migrate from On-Premises PostgreSQL to Azure Database for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Migration, Cloud Migration, Database Migration, DMS, pg_dump

Description: A complete guide to migrating your on-premises PostgreSQL database to Azure Database for PostgreSQL Flexible Server with multiple approaches and minimal downtime.

---

Migrating a PostgreSQL database from on-premises infrastructure to Azure is a project that requires careful planning, execution, and validation. The good news is that PostgreSQL-to-PostgreSQL migration is well-supported with mature tooling. Whether your database is 1 GB or 1 TB, there is an approach that fits your needs and downtime tolerance.

In this post, I will walk through the major migration methods, pre-migration assessment, and the step-by-step process to get your PostgreSQL database running on Azure Database for PostgreSQL Flexible Server.

## Choosing Your Migration Method

| Method | Downtime | Best For | Complexity |
|--------|----------|----------|------------|
| pg_dump/pg_restore | High (hours for large DBs) | Small databases (< 50 GB) | Low |
| Azure DMS (online) | Low (minutes) | Medium to large databases | Medium |
| Logical replication | Very low (seconds) | Any size, minimal downtime | High |
| pg_dump with parallel | Medium | Large databases (50-500 GB) | Low-Medium |

## Pre-Migration Assessment

### Check PostgreSQL Version

Azure Database for PostgreSQL Flexible Server supports versions 13 through 16. Check your source version:

```bash
# Check the source PostgreSQL version
psql -c "SELECT version();"
```

If your source is older than version 13, you may need to upgrade first or use pg_dump which handles cross-version migrations.

### Assess Database Size

```sql
-- Get the total database size
SELECT pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Get per-table sizes
SELECT
    schemaname || '.' || tablename AS table_full_name,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS data_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || quote_ident(tablename))) AS index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;
```

### Check Extensions

List all extensions used in your database and verify they are supported on Azure:

```sql
-- List installed extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

Compare this list with the extensions supported by Azure Database for PostgreSQL Flexible Server. Most common extensions are supported, but custom or rare extensions may not be.

### Check for Unsupported Features

```sql
-- Check for roles with superuser privileges
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
FROM pg_roles
WHERE rolsuper = true;

-- Check for tablespaces (not supported in managed service)
SELECT spcname, pg_tablespace_location(oid) FROM pg_tablespace
WHERE spcname NOT IN ('pg_default', 'pg_global');

-- Check for foreign data wrappers
SELECT fdwname FROM pg_foreign_data_wrapper;
```

Superuser is not available in the managed service. Tablespaces map to Azure's storage layer. Foreign data wrappers have limited support.

## Method 1: pg_dump and pg_restore

The simplest approach. Works well for databases under 50 GB.

### Step 1: Create the Target Server

```bash
# Create the target Azure PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name my-pg-azure \
  --location eastus \
  --admin-user pgadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 256
```

### Step 2: Pre-Create the Database

```bash
# Create the target database
psql "host=my-pg-azure.postgres.database.azure.com port=5432 dbname=postgres user=pgadmin sslmode=require" \
  -c "CREATE DATABASE myapp;"
```

### Step 3: Dump the Source Database

```bash
# Dump in custom format for faster parallel restore
# -Fc enables custom format, -v enables verbose output
pg_dump \
  --host=localhost \
  --username=postgres \
  --dbname=myapp \
  --format=custom \
  --verbose \
  --file=myapp.dump
```

### Step 4: Restore to Azure

```bash
# Restore with parallel jobs for faster loading
# -j 4 uses 4 parallel workers
pg_restore \
  --host=my-pg-azure.postgres.database.azure.com \
  --port=5432 \
  --username=pgadmin \
  --dbname=myapp \
  --verbose \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  "sslmode=require" \
  myapp.dump
```

The `--no-owner` and `--no-privileges` flags are important because the original ownership and permissions may reference users that do not exist on the target server.

### Step 5: Optimize Post-Restore

```sql
-- Analyze all tables to update statistics after bulk load
ANALYZE;

-- Reindex if needed
REINDEX DATABASE myapp;
```

## Method 2: Azure Database Migration Service (Online)

For minimal downtime migrations, use Azure DMS with online mode. It performs an initial full copy and then uses logical replication to keep the target in sync until cutover.

### Step 1: Prepare the Source Server

Enable logical replication on your source PostgreSQL:

```ini
# Add to postgresql.conf
# Enable write-ahead log level for logical replication
wal_level = logical
# Keep enough WAL segments for the migration duration
max_wal_senders = 10
max_replication_slots = 10
```

Restart PostgreSQL after changing these settings.

### Step 2: Create a Replication User

```sql
-- Create a user for DMS to use for replication
CREATE USER dms_user WITH REPLICATION LOGIN PASSWORD 'DMSPassword123!';

-- Grant read access to all tables
GRANT USAGE ON SCHEMA public TO dms_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dms_user;
```

### Step 3: Set Up DMS

In the Azure portal:

1. Create an Azure Database Migration Service instance.
2. Create a new migration project.
3. Set source type to PostgreSQL and target type to Azure Database for PostgreSQL.
4. Select "Online data migration."
5. Enter source connection details (your on-premises server must be reachable from Azure via VPN, ExpressRoute, or public IP).
6. Enter target connection details.
7. Select databases to migrate.
8. Map source databases to target databases.
9. Start the migration.

### Step 4: Monitor and Cutover

DMS shows the migration progress in the portal. Once the initial load completes and the ongoing sync lag drops to near zero:

1. Stop writes to the source database.
2. Wait for DMS to show zero pending changes.
3. Complete the cutover.
4. Update application connection strings.
5. Verify and resume traffic.

## Method 3: Native Logical Replication

For maximum control and minimal downtime, set up PostgreSQL's native logical replication directly.

### On the Source Server

```sql
-- Create a publication for all tables
CREATE PUBLICATION my_migration FOR ALL TABLES;
```

### On the Target (Azure) Server

First, create the schema (without data) on the target:

```bash
# Dump only the schema from the source
pg_dump --host=localhost --username=postgres --dbname=myapp \
  --schema-only --no-owner --no-privileges > schema.sql

# Apply the schema to the target
psql "host=my-pg-azure.postgres.database.azure.com port=5432 dbname=myapp user=pgadmin sslmode=require" \
  < schema.sql
```

Then create the subscription:

```sql
-- Create a subscription on the target to replicate from the source
CREATE SUBSCRIPTION my_migration
CONNECTION 'host=source-server.example.com port=5432 dbname=myapp user=dms_user password=DMSPassword123!'
PUBLICATION my_migration;
```

This starts the initial data copy followed by ongoing replication. Monitor the replication lag:

```sql
-- On the source, check replication status
SELECT
    slot_name,
    confirmed_flush_lsn,
    pg_current_wal_lsn(),
    (pg_current_wal_lsn() - confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots;
```

When the lag is near zero, perform the cutover:

```sql
-- On the target, after cutover, drop the subscription
DROP SUBSCRIPTION my_migration;

-- Reset sequences (logical replication does not replicate sequence values)
-- Do this for each sequence in your database
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
```

## Post-Migration Validation

After migration, validate thoroughly:

```sql
-- Compare row counts between source and target
-- Run on both servers and compare results
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Check that all indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify constraints
SELECT conname, conrelid::regclass, contype
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- Check extensions
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

Run your application's test suite against the new database. Pay special attention to:

- Query performance (run EXPLAIN on critical queries).
- Data integrity (spot-check specific records).
- Application functionality (end-to-end tests).

## Application Cutover

The cutover plan:

1. Enable maintenance mode on your application.
2. Ensure all pending transactions complete on the source.
3. Wait for replication lag to reach zero (if using online migration).
4. Complete the DMS cutover or drop the logical subscription.
5. Update connection strings in your application configuration.
6. Deploy the updated configuration.
7. Run smoke tests.
8. Disable maintenance mode.
9. Monitor closely for 24-48 hours.

Keep the source database running for at least one week after cutover as a rollback option.

## Common Migration Issues

**Sequence values not migrated**: Logical replication does not replicate sequence states. Manually set sequences on the target after cutover.

**Missing permissions**: The managed service does not have superuser. Use `--no-owner --no-privileges` during pg_restore and recreate permissions manually.

**Extension version mismatches**: The target might have a different extension version. Create extensions before restoring data.

**Large object migration**: pg_dump handles large objects, but logical replication does not replicate them natively. Use pg_dump for large object migration.

## Summary

Migrating PostgreSQL to Azure is a well-supported operation with multiple approaches for different requirements. For small databases, pg_dump and pg_restore is quick and reliable. For larger databases needing minimal downtime, Azure DMS or native logical replication keep your application available during the migration. Whatever method you choose, invest in pre-migration assessment, test the migration on a copy first, and have a clear rollback plan. The migration itself is typically the smoothest part - making sure everything performs correctly on Azure is where the real validation work happens.
