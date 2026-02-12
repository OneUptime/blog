# How to Migrate from Self-Managed PostgreSQL to RDS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, PostgreSQL, Migration, Database

Description: Step-by-step guide to migrating your self-managed PostgreSQL database to Amazon RDS using pg_dump, logical replication, and AWS DMS with minimal downtime.

---

If you're running PostgreSQL on your own servers or EC2 instances, migrating to RDS removes a huge chunk of operational work. No more handling OS patches, managing replication failover, or worrying about backup scripts. RDS handles all of that, and you get features like automated snapshots, Multi-AZ failover, and Performance Insights out of the box.

The migration process for PostgreSQL is a bit different from MySQL. PostgreSQL has its own set of tools and replication mechanisms. Let's walk through the options and how to execute each one.

## Migration Options

| Approach | Best For | Downtime | Complexity |
|---|---|---|---|
| pg_dump/pg_restore | Small to medium databases (< 50 GB) | Minutes to hours | Low |
| Logical replication | PostgreSQL 10+ with ongoing replication | Seconds (cutover only) | Medium |
| AWS DMS | Any size, managed approach | Seconds (cutover only) | Medium |

## Pre-Migration Assessment

Start by understanding your source database:

```sql
-- Check PostgreSQL version
SELECT version();

-- Check database sizes
SELECT pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- List installed extensions
SELECT extname, extversion FROM pg_extension;

-- Check for unsupported features (custom C extensions, etc.)
SELECT * FROM pg_available_extensions WHERE installed_version IS NOT NULL;
```

Important considerations:
- Verify all extensions you use are supported on RDS. Most popular ones are (pg_stat_statements, PostGIS, pgcrypto, etc.), but custom or obscure extensions might not be.
- Check if you're using any features that require superuser access, since RDS doesn't grant superuser to users.
- Make sure the target RDS PostgreSQL version is compatible.

## Creating the Target RDS Instance

```bash
# Create the RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier my-postgres-rds \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 16.2 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name my-subnet-group \
  --multi-az \
  --max-allocated-storage 500 \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

## Method 1: pg_dump and pg_restore

For smaller databases or when downtime is acceptable, pg_dump is the most straightforward approach.

### Using Custom Format (Recommended)

Custom format allows parallel restore, which is much faster for large databases:

```bash
# Dump the database in custom format with compression
pg_dump \
  --host=source-postgres-server.example.com \
  --username=admin \
  --format=custom \
  --compress=9 \
  --verbose \
  --file=/tmp/myapp_dump.pgdump \
  myapp_production
```

Before restoring, create the database and any required extensions on RDS:

```bash
# Connect to RDS and create the target database
psql \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=postgres \
  -c "CREATE DATABASE myapp_production;"

# Create required extensions (must be done as the admin user)
psql \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=myapp_production \
  -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

Restore with parallel jobs for speed:

```bash
# Restore using 4 parallel jobs for faster loading
pg_restore \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=myapp_production \
  --jobs=4 \
  --verbose \
  --no-owner \
  --no-privileges \
  /tmp/myapp_dump.pgdump
```

The `--no-owner` and `--no-privileges` flags are important because the original ownership and permissions from your self-managed server likely won't match the RDS user setup.

### Using Plain SQL Format

For simple migrations or when you need to inspect the dump:

```bash
# Dump as plain SQL
pg_dump \
  --host=source-postgres-server.example.com \
  --username=admin \
  --format=plain \
  --no-owner \
  --no-privileges \
  myapp_production > /tmp/myapp_dump.sql

# Restore from plain SQL
psql \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=myapp_production \
  < /tmp/myapp_dump.sql
```

## Method 2: Logical Replication (Near-Zero Downtime)

PostgreSQL's built-in logical replication (available since version 10) lets you replicate data continuously from your source to RDS. This is the best approach for minimal downtime migrations.

### Step 1: Configure the Source for Logical Replication

On your source PostgreSQL server, update `postgresql.conf`:

```ini
# Required for logical replication
wal_level = logical
max_replication_slots = 4
max_wal_senders = 4
```

And update `pg_hba.conf` to allow the RDS instance to connect:

```
# Allow RDS to connect for replication
host    replication    repl_user    10.0.0.0/8    md5
```

Restart PostgreSQL after these changes.

### Step 2: Create a Replication User

```sql
-- On the source server
CREATE USER repl_user WITH REPLICATION PASSWORD 'strong_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO repl_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO repl_user;
```

### Step 3: Create a Publication on the Source

```sql
-- Create a publication for all tables in the database
CREATE PUBLICATION my_migration FOR ALL TABLES;
```

### Step 4: Do the Initial Data Load

First, dump and restore the schema and data:

```bash
# Dump schema only
pg_dump \
  --host=source-postgres-server.example.com \
  --username=admin \
  --schema-only \
  --no-owner \
  --no-privileges \
  myapp_production > /tmp/schema.sql

# Restore schema to RDS
psql \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=myapp_production \
  < /tmp/schema.sql

# Dump and restore data
pg_dump \
  --host=source-postgres-server.example.com \
  --username=admin \
  --data-only \
  --format=custom \
  myapp_production > /tmp/data.pgdump

pg_restore \
  --host=my-postgres-rds.abc123.us-east-1.rds.amazonaws.com \
  --username=admin \
  --dbname=myapp_production \
  --data-only \
  --jobs=4 \
  /tmp/data.pgdump
```

### Step 5: Create a Subscription on RDS

Connect to the RDS instance and create a subscription:

```sql
-- On the RDS instance
CREATE SUBSCRIPTION my_migration_sub
  CONNECTION 'host=source-postgres-server.example.com port=5432 dbname=myapp_production user=repl_user password=strong_password'
  PUBLICATION my_migration
  WITH (copy_data = false);  -- We already loaded the data
```

### Step 6: Monitor Replication

```sql
-- On the source, check replication status
SELECT * FROM pg_stat_replication;

-- On the RDS target, check subscription status
SELECT * FROM pg_stat_subscription;

-- Check replication lag
SELECT now() - confirmed_flush_lsn::text::pg_lsn AS replication_lag
FROM pg_replication_slots
WHERE slot_name = 'my_migration_sub';
```

### Step 7: Cut Over

When replication lag is zero and you're ready to switch:

1. Stop application writes to the source
2. Verify replication is fully caught up
3. Drop the subscription on RDS:

```sql
-- On RDS
DROP SUBSCRIPTION my_migration_sub;
```

4. On the source, clean up:

```sql
-- On the source
DROP PUBLICATION my_migration;
SELECT pg_drop_replication_slot('my_migration_sub');
```

5. Update your application connection string to point to RDS
6. Resume application traffic

## Post-Migration Verification

After migrating, run some checks:

```sql
-- Compare row counts for key tables
-- Run on both source and target
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;

-- Verify sequences are at the right values
SELECT sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public';

-- Run ANALYZE to update statistics on the new instance
ANALYZE VERBOSE;
```

## Post-Migration Configuration

Set up the operational essentials on your new RDS instance:

```bash
# Enable Enhanced Monitoring
aws rds modify-db-instance \
  --db-instance-identifier my-postgres-rds \
  --monitoring-interval 10 \
  --monitoring-role-arn arn:aws:iam::123456789012:role/rds-enhanced-monitoring-role

# Set up storage auto scaling
aws rds modify-db-instance \
  --db-instance-identifier my-postgres-rds \
  --max-allocated-storage 500
```

Don't forget to set up [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view) and [event notifications](https://oneuptime.com/blog/post/enable-rds-event-notifications-via-sns/view) for your new instance.

## Common Pitfalls

**Extension compatibility**: If your source uses an extension that RDS doesn't support, you'll need to refactor the dependent code before migrating.

**Sequence values**: After a pg_dump/pg_restore, sequences are usually correct. With logical replication, double-check that sequences on the target are at least as high as the source to avoid primary key conflicts.

**Large objects**: pg_dump with `--no-blobs` skips large objects. If you use them, make sure they're included in your dump.

**Permissions**: RDS doesn't have a true superuser. Some operations that worked on your self-managed server might need to be done differently. The `rds_superuser` role covers most cases but not all.

Migrating to RDS is a significant operational improvement. Once you're on RDS, you get automated backups, easy scaling, and managed patching without any additional effort. The migration might take a day of focused work, but it saves countless hours of operational overhead over the following months and years.
