# How to Export Data from Cloud SQL Using pg_dump and pg_restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, pg_dump, pg_restore, Data Export

Description: A hands-on guide to exporting data from Cloud SQL for PostgreSQL using pg_dump and restoring it with pg_restore for migrations, backups, and environment cloning.

---

Cloud SQL has built-in backup and export features, but sometimes you need more control over your exports. Maybe you need to export specific tables, filter certain schemas, or create a portable dump that can be restored to any PostgreSQL instance. That is where `pg_dump` and `pg_restore` come in. These are the standard PostgreSQL tools for logical backups, and they work perfectly with Cloud SQL.

## When to Use pg_dump vs Cloud SQL Export

Cloud SQL has a built-in export feature (`gcloud sql export sql`), so why use pg_dump?

**Use Cloud SQL export when:**
- You want a simple full-database export
- You need to export to Cloud Storage directly
- You are staying within the Cloud SQL ecosystem

**Use pg_dump when:**
- You need to export specific tables or schemas
- You want a custom format dump for parallel restore
- You need to export to a non-Cloud SQL PostgreSQL instance
- You want more control over what gets included

## Connecting to Cloud SQL for pg_dump

You have several options for connecting:

### Option 1: Cloud SQL Auth Proxy

The recommended approach. Start the proxy, then run pg_dump against localhost:

```bash
# Start the Cloud SQL Auth Proxy in the background
cloud-sql-proxy --port=5432 my-project:us-central1:my-instance &

# Wait a moment for the proxy to initialize
sleep 3

# Run pg_dump through the proxy
pg_dump \
    --host=127.0.0.1 \
    --port=5432 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --file=mydb.dump
```

### Option 2: Direct Connection via Private IP

If you are running pg_dump from a VM in the same VPC as your Cloud SQL instance:

```bash
# Connect directly using the private IP
pg_dump \
    --host=10.100.0.5 \
    --port=5432 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --file=mydb.dump
```

### Option 3: Public IP with SSL

If your instance has a public IP, connect with SSL certificates:

```bash
# Download the SSL certificates from the Cloud Console first, then:
pg_dump \
    --host=35.123.45.67 \
    --port=5432 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --file=mydb.dump \
    "sslmode=verify-ca sslrootcert=server-ca.pem sslcert=client-cert.pem sslkey=client-key.pem"
```

## pg_dump Output Formats

pg_dump supports several output formats. Choose based on your needs.

### Custom Format (Recommended)

```bash
# Custom format - compressed, supports parallel restore, selective restore
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --compress=6 \
    --file=mydb.dump
```

Custom format is the most versatile. It is compressed by default, supports parallel restore, and lets you selectively restore specific tables or schemas.

### Plain SQL Format

```bash
# Plain SQL format - human-readable, can be edited before restore
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=plain \
    --file=mydb.sql
```

Plain SQL is useful when you need to inspect or modify the output before restoring.

### Directory Format

```bash
# Directory format - creates a directory with per-table files
# Best for very large databases and parallel operations
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=directory \
    --jobs=4 \
    --file=mydb_export/
```

Directory format enables parallel dump using the `--jobs` flag, which significantly speeds up exports for large databases.

## Exporting Specific Tables

Export only the tables you need:

```bash
# Export specific tables only
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --table=users \
    --table=orders \
    --table=products \
    --file=selected_tables.dump
```

Or exclude specific tables:

```bash
# Export everything except large log tables
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --exclude-table=audit_logs \
    --exclude-table=event_logs \
    --file=mydb_no_logs.dump
```

## Exporting Specific Schemas

```bash
# Export only the public and reporting schemas
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --schema=public \
    --schema=reporting \
    --file=selected_schemas.dump
```

## Schema-Only and Data-Only Exports

Sometimes you want to separate structure from data:

```bash
# Export only the schema (tables, indexes, constraints, functions)
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --schema-only \
    --file=schema.sql

# Export only the data (INSERT statements or COPY data)
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --data-only \
    --format=custom \
    --file=data.dump
```

This is useful for creating development environments where you want the structure but want to generate synthetic data instead.

## Restoring with pg_restore

### Basic Restore

Restore a custom-format dump into a new database:

```bash
# Create the target database first
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE mydb_restored;"

# Restore the dump into the new database
pg_restore \
    --host=127.0.0.1 \
    --port=5432 \
    --username=postgres \
    --dbname=mydb_restored \
    --no-owner \
    --no-acl \
    --verbose \
    mydb.dump
```

The `--no-owner` and `--no-acl` flags are important for Cloud SQL. Cloud SQL manages users differently than self-hosted PostgreSQL, and trying to set ownership or permissions from the dump often causes errors.

### Parallel Restore

For large databases, use parallel restore to speed things up dramatically:

```bash
# Parallel restore using 4 worker processes
# Only works with custom or directory format dumps
pg_restore \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb_restored \
    --jobs=4 \
    --no-owner \
    --no-acl \
    mydb.dump
```

The `--jobs=4` flag spawns 4 parallel workers. Each one restores a different table simultaneously. For a 100 GB database, parallel restore can cut the time from hours to minutes.

### Selective Restore

Restore only specific tables from a dump:

```bash
# List the contents of the dump to see what is available
pg_restore --list mydb.dump

# Restore only the users and orders tables
pg_restore \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb_restored \
    --table=users \
    --table=orders \
    --no-owner \
    mydb.dump
```

## Handling Large Exports

### Streaming to Cloud Storage

For very large databases, stream the dump directly to Cloud Storage:

```bash
# Pipe pg_dump output directly to Cloud Storage
# Avoids needing local disk space for the dump file
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --format=custom \
    --compress=6 \
    | gsutil cp - gs://my-backup-bucket/mydb-$(date +%Y%m%d).dump
```

### Splitting Large Exports

For databases with some very large tables, export them separately:

```bash
# Export small tables together
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --exclude-table=large_events \
    --exclude-table=raw_metrics \
    --format=custom \
    --file=mydb_small_tables.dump

# Export large tables individually with parallel dump
pg_dump \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb \
    --table=large_events \
    --format=directory \
    --jobs=4 \
    --file=large_events_export/
```

## Common Issues and Solutions

### Insufficient Permissions

If pg_dump fails with permission errors, make sure your user has the right grants:

```sql
-- Grant SELECT on all tables to the dump user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dump_user;

-- Also grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO dump_user;
```

### Extension Errors During Restore

Cloud SQL supports a subset of PostgreSQL extensions. If your dump references an unsupported extension, the restore will fail. Check supported extensions first:

```bash
# List supported extensions for your Cloud SQL version
gcloud sql instances describe my-instance \
    --format="json(settings.databaseFlags)"
```

You may need to filter out unsupported extensions from your dump:

```bash
# Create a restore list excluding problematic items
pg_restore --list mydb.dump > restore_list.txt

# Edit restore_list.txt to comment out problematic entries
# Lines starting with ; are ignored

# Restore using the filtered list
pg_restore \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb_restored \
    --use-list=restore_list.txt \
    mydb.dump
```

### Timeout on Large Tables

For extremely large tables, the connection might time out. Increase the statement timeout:

```bash
# Set a longer timeout for the restore session
PGOPTIONS='-c statement_timeout=0' pg_restore \
    --host=127.0.0.1 \
    --username=postgres \
    --dbname=mydb_restored \
    mydb.dump
```

## Automating Regular Exports

Create a script for scheduled exports:

```bash
#!/bin/bash
# automated-export.sh - Weekly pg_dump to Cloud Storage

# Configuration
INSTANCE_IP="127.0.0.1"
DB_NAME="mydb"
DB_USER="postgres"
BUCKET="gs://my-db-exports"
DATE=$(date +%Y%m%d_%H%M%S)

# Run pg_dump and stream to Cloud Storage
pg_dump \
    --host=${INSTANCE_IP} \
    --username=${DB_USER} \
    --dbname=${DB_NAME} \
    --format=custom \
    --compress=6 \
    | gsutil cp - ${BUCKET}/${DB_NAME}-${DATE}.dump

# Check exit status
if [ $? -eq 0 ]; then
    echo "Export completed successfully: ${DB_NAME}-${DATE}.dump"
else
    echo "Export failed!" >&2
    exit 1
fi

# Clean up old exports (keep last 30 days)
gsutil ls -l ${BUCKET}/ | sort -k2 | head -n -30 | awk '{print $3}' | xargs -r gsutil rm
```

## Summary

pg_dump and pg_restore give you fine-grained control over Cloud SQL PostgreSQL exports and imports. Use custom format for maximum flexibility, parallel operations for speed, and streaming to Cloud Storage to avoid local disk constraints. Remember to use `--no-owner` and `--no-acl` when restoring to Cloud SQL, and always verify your restore by checking table counts and running key application queries against the restored data.
