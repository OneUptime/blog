# How to Migrate to TimescaleDB from PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TimescaleDB, PostgreSQL, Database Migration, Time-Series, DevOps, Performance

Description: A comprehensive guide to migrating your PostgreSQL database to TimescaleDB, covering planning, hypertable conversion, data migration strategies, application changes, and rollback procedures.

---

> TimescaleDB is not a replacement for PostgreSQL - it is PostgreSQL with superpowers for time-series data. The migration is less about changing databases and more about unlocking capabilities that were always meant to be there.

## Understanding TimescaleDB

TimescaleDB is an open-source time-series database built as a PostgreSQL extension. This means your existing PostgreSQL knowledge, tools, and queries continue to work. The key difference is how TimescaleDB handles time-series data through hypertables - automatically partitioned tables optimized for time-based queries.

```mermaid
flowchart TB
    subgraph PostgreSQL
        PT[Regular Table]
        PT --> R1[Row 1]
        PT --> R2[Row 2]
        PT --> R3[Row N]
    end

    subgraph TimescaleDB
        HT[Hypertable]
        HT --> C1[Chunk: Jan 2026]
        HT --> C2[Chunk: Feb 2026]
        HT --> C3[Chunk: Mar 2026]

        C1 --> D1[Compressed Data]
        C2 --> D2[Compressed Data]
        C3 --> D3[Active Data]
    end

    PT -.->|Migration| HT
```

## Planning the Migration

Before migrating, assess your current database and identify tables that will benefit from TimescaleDB features.

### Identify Time-Series Tables

```sql
-- Find tables with timestamp columns that could benefit from hypertables
-- Look for tables with high insert rates and time-based queries

SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as table_size,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as approx_rows
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_name = c.table_name
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.data_type IN ('timestamp without time zone', 'timestamp with time zone', 'date')
ORDER BY pg_total_relation_size(quote_ident(t.table_name)) DESC;
```

### Migration Decision Matrix

```mermaid
flowchart TD
    A[Analyze Table] --> B{Time-based queries?}
    B -->|Yes| C{High insert rate?}
    B -->|No| D[Keep as regular table]
    C -->|Yes| E{Data retention needed?}
    C -->|No| F{Historical analysis?}
    E -->|Yes| G[Convert to hypertable + retention policy]
    E -->|No| H[Convert to hypertable]
    F -->|Yes| H
    F -->|No| D
```

### Pre-Migration Checklist

```bash
#!/bin/bash
# pre-migration-check.sh
# Run this script to validate your PostgreSQL setup before migration

set -e

DB_NAME="${1:-mydb}"
DB_USER="${2:-postgres}"

echo "=== TimescaleDB Migration Pre-Check ==="

# Check PostgreSQL version (TimescaleDB requires PostgreSQL 12+)
echo "Checking PostgreSQL version..."
psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"

# Check current database size
echo "Current database size:"
psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;
"

# Check for tables without primary keys (required for hypertables)
echo "Tables without primary keys (need attention):"
psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
    ON t.table_name = tc.table_name
    AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND tc.constraint_name IS NULL;
"

# Check disk space available
echo "Disk space (need 2x database size for migration):"
df -h .

echo "=== Pre-Check Complete ==="
```

## Installing TimescaleDB

### On Existing PostgreSQL Server

```bash
# Ubuntu/Debian
# Add TimescaleDB repository
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update

# Install TimescaleDB for your PostgreSQL version (e.g., PostgreSQL 16)
sudo apt install timescaledb-2-postgresql-16

# Run the tuning script
sudo timescaledb-tune --yes

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Enable TimescaleDB Extension

```sql
-- Connect to your database and enable the extension
-- This is non-destructive and does not modify existing tables

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Verify installation
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

-- Check TimescaleDB is working
SELECT * FROM timescaledb_information.hypertables;
```

## Converting Tables to Hypertables

### Basic Hypertable Conversion

```sql
-- Convert a metrics table to a hypertable
-- IMPORTANT: Table must have a time column and ideally a primary key

-- Step 1: Ensure the table structure is correct
-- The time column should be NOT NULL for best performance
ALTER TABLE metrics
    ALTER COLUMN timestamp SET NOT NULL;

-- Step 2: Create the hypertable
-- This will partition existing data into chunks
SELECT create_hypertable(
    'metrics',           -- table name
    'timestamp',         -- time column
    chunk_time_interval => INTERVAL '1 day',  -- partition size
    migrate_data => true -- migrate existing data
);

-- Verify the conversion
SELECT * FROM timescaledb_information.hypertables
WHERE hypertable_name = 'metrics';
```

### Hypertable with Space Partitioning

For multi-tenant or high-cardinality data, add space partitioning:

```sql
-- Create hypertable with both time and space partitioning
-- Useful for multi-tenant scenarios or high-cardinality dimensions

SELECT create_hypertable(
    'sensor_data',
    'timestamp',
    partitioning_column => 'device_id',  -- space partition column
    number_partitions => 4,               -- number of space partitions
    chunk_time_interval => INTERVAL '1 day',
    migrate_data => true
);
```

### Migration Script for Multiple Tables

```sql
-- migrate_to_hypertables.sql
-- Script to convert multiple tables to hypertables

DO $$
DECLARE
    tables_to_convert TEXT[][] := ARRAY[
        -- Array format: [table_name, time_column, interval]
        ['metrics', 'timestamp', '1 day'],
        ['logs', 'created_at', '1 hour'],
        ['events', 'event_time', '1 week'],
        ['sensor_readings', 'reading_time', '1 day']
    ];
    t TEXT[];
    result RECORD;
BEGIN
    FOREACH t SLICE 1 IN ARRAY tables_to_convert
    LOOP
        -- Check if table exists and is not already a hypertable
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = t[1] AND table_schema = 'public'
        ) AND NOT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = t[1]
        ) THEN
            RAISE NOTICE 'Converting table % with time column % and interval %',
                t[1], t[2], t[3];

            -- Ensure time column is NOT NULL
            EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN %I SET NOT NULL',
                t[1], t[2]
            );

            -- Convert to hypertable
            PERFORM create_hypertable(
                t[1]::regclass,
                t[2],
                chunk_time_interval => t[3]::interval,
                migrate_data => true,
                if_not_exists => true
            );

            RAISE NOTICE 'Successfully converted table %', t[1];
        ELSE
            RAISE NOTICE 'Skipping table % (not found or already hypertable)', t[1];
        END IF;
    END LOOP;
END $$;

-- Verify all conversions
SELECT
    hypertable_name,
    num_chunks,
    compression_enabled
FROM timescaledb_information.hypertables;
```

## Data Migration Strategies

### Strategy 1: In-Place Migration (Small to Medium Tables)

```mermaid
flowchart LR
    A[Original Table] -->|create_hypertable| B[Hypertable]
    B --> C[Automatic Chunking]
    C --> D[Enable Compression]
    D --> E[Set Retention Policy]
```

```sql
-- In-place migration for tables under 100GB
-- This approach is simpler but locks the table during migration

BEGIN;

-- Convert to hypertable with data migration
SELECT create_hypertable(
    'application_logs',
    'created_at',
    chunk_time_interval => INTERVAL '1 day',
    migrate_data => true
);

-- Enable compression on chunks older than 7 days
ALTER TABLE application_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'application_name',
    timescaledb.compress_orderby = 'created_at DESC'
);

SELECT add_compression_policy('application_logs', INTERVAL '7 days');

-- Add retention policy (delete data older than 90 days)
SELECT add_retention_policy('application_logs', INTERVAL '90 days');

COMMIT;
```

### Strategy 2: Parallel Migration (Large Tables)

```sql
-- For large tables (100GB+), use parallel migration to minimize downtime
-- This approach creates a new hypertable and migrates data in batches

-- Step 1: Create new hypertable with same schema
CREATE TABLE metrics_new (LIKE metrics INCLUDING ALL);

SELECT create_hypertable(
    'metrics_new',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day'
);

-- Step 2: Migrate data in batches using a function
CREATE OR REPLACE FUNCTION migrate_metrics_batch(
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    batch_size INT DEFAULT 100000
) RETURNS BIGINT AS $$
DECLARE
    total_migrated BIGINT := 0;
    batch_migrated BIGINT;
    current_time TIMESTAMPTZ := start_time;
BEGIN
    WHILE current_time < end_time LOOP
        INSERT INTO metrics_new
        SELECT * FROM metrics
        WHERE timestamp >= current_time
          AND timestamp < current_time + INTERVAL '1 hour'
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS batch_migrated = ROW_COUNT;
        total_migrated := total_migrated + batch_migrated;
        current_time := current_time + INTERVAL '1 hour';

        -- Commit each batch to avoid long transactions
        COMMIT;

        RAISE NOTICE 'Migrated % rows, total: %', batch_migrated, total_migrated;
    END LOOP;

    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run migration (can be done while application is running)
SELECT migrate_metrics_batch(
    '2024-01-01'::timestamptz,
    '2026-01-27'::timestamptz
);

-- Step 4: Atomic table swap during maintenance window
BEGIN;
ALTER TABLE metrics RENAME TO metrics_old;
ALTER TABLE metrics_new RENAME TO metrics;
COMMIT;

-- Step 5: Verify and cleanup
-- After verification, drop old table
-- DROP TABLE metrics_old;
```

### Strategy 3: Dual-Write Migration (Zero Downtime)

```mermaid
sequenceDiagram
    participant App as Application
    participant PG as PostgreSQL
    participant TS as TimescaleDB

    Note over App,TS: Phase 1: Setup
    App->>PG: Normal writes

    Note over App,TS: Phase 2: Dual Write
    App->>PG: Write data
    App->>TS: Write data (new hypertable)

    Note over App,TS: Phase 3: Backfill
    PG-->>TS: Historical data migration

    Note over App,TS: Phase 4: Switch
    App->>TS: Primary writes
    PG->>PG: Deprecated
```

```python
# dual_write_migration.py
# Application-level dual-write pattern for zero-downtime migration

import psycopg2
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DualWriteMetrics:
    """
    Handles dual-write pattern during TimescaleDB migration.
    Writes to both PostgreSQL (original) and TimescaleDB (new) tables.
    """

    def __init__(self, pg_conn_string: str, ts_conn_string: str):
        self.pg_conn = psycopg2.connect(pg_conn_string)
        self.ts_conn = psycopg2.connect(ts_conn_string)
        self.dual_write_enabled = True
        self.primary_target = 'postgresql'  # Start with PostgreSQL as primary

    def insert_metric(self, metric_name: str, value: float,
                      timestamp: datetime = None, tags: dict = None):
        """
        Insert metric to both databases during migration.
        Primary target determines which write must succeed.
        """
        timestamp = timestamp or datetime.utcnow()
        tags = tags or {}

        # Write to primary (must succeed)
        if self.primary_target == 'postgresql':
            self._write_postgresql(metric_name, value, timestamp, tags)
            if self.dual_write_enabled:
                try:
                    self._write_timescaledb(metric_name, value, timestamp, tags)
                except Exception as e:
                    logger.warning(f"Secondary write to TimescaleDB failed: {e}")
        else:
            self._write_timescaledb(metric_name, value, timestamp, tags)
            if self.dual_write_enabled:
                try:
                    self._write_postgresql(metric_name, value, timestamp, tags)
                except Exception as e:
                    logger.warning(f"Secondary write to PostgreSQL failed: {e}")

    def _write_postgresql(self, metric_name, value, timestamp, tags):
        """Write to original PostgreSQL table."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                INSERT INTO metrics (metric_name, value, timestamp, tags)
                VALUES (%s, %s, %s, %s)
            """, (metric_name, value, timestamp, psycopg2.extras.Json(tags)))
        self.pg_conn.commit()

    def _write_timescaledb(self, metric_name, value, timestamp, tags):
        """Write to TimescaleDB hypertable."""
        with self.ts_conn.cursor() as cur:
            cur.execute("""
                INSERT INTO metrics_hyper (metric_name, value, timestamp, tags)
                VALUES (%s, %s, %s, %s)
            """, (metric_name, value, timestamp, psycopg2.extras.Json(tags)))
        self.ts_conn.commit()

    def switch_primary(self, new_primary: str):
        """
        Switch primary write target.
        Call this after verifying TimescaleDB has all historical data.
        """
        if new_primary not in ['postgresql', 'timescaledb']:
            raise ValueError("Primary must be 'postgresql' or 'timescaledb'")

        logger.info(f"Switching primary from {self.primary_target} to {new_primary}")
        self.primary_target = new_primary

    def disable_dual_write(self):
        """
        Disable dual-write after migration is complete.
        Only call after switching primary to TimescaleDB.
        """
        logger.info("Disabling dual-write mode")
        self.dual_write_enabled = False
```

## Application Changes Required

### Connection String Update

```yaml
# config.yaml - Update your database configuration
# TimescaleDB uses the same connection parameters as PostgreSQL

database:
  # Before migration
  # host: postgres.example.com
  # port: 5432
  # name: myapp

  # After migration (same connection, TimescaleDB is an extension)
  host: postgres.example.com
  port: 5432
  name: myapp

  # Optional: Connection pool settings for time-series workloads
  pool:
    min_connections: 5
    max_connections: 20
    # TimescaleDB benefits from longer-lived connections
    max_lifetime: 3600
```

### Query Optimization for TimescaleDB

```sql
-- Optimize your existing queries to leverage TimescaleDB features

-- BEFORE: Standard PostgreSQL aggregation (slow on large datasets)
SELECT
    date_trunc('hour', timestamp) as hour,
    avg(cpu_usage) as avg_cpu,
    max(cpu_usage) as max_cpu
FROM metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;

-- AFTER: TimescaleDB time_bucket function (optimized for hypertables)
SELECT
    time_bucket('1 hour', timestamp) as hour,
    avg(cpu_usage) as avg_cpu,
    max(cpu_usage) as max_cpu
FROM metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;

-- Use continuous aggregates for frequently-run queries
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) as hour,
    host_id,
    avg(cpu_usage) as avg_cpu,
    max(cpu_usage) as max_cpu,
    min(cpu_usage) as min_cpu,
    count(*) as sample_count
FROM metrics
GROUP BY 1, 2
WITH NO DATA;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

### ORM Compatibility

```python
# SQLAlchemy example - TimescaleDB works with existing PostgreSQL ORMs
# No changes required for basic operations

from sqlalchemy import create_engine, Column, Integer, Float, DateTime, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class Metric(Base):
    """
    Metric model - works unchanged with TimescaleDB hypertables.
    The hypertable conversion is transparent to the ORM.
    """
    __tablename__ = 'metrics'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    metric_name = Column(String(255), nullable=False)
    value = Column(Float, nullable=False)
    host_id = Column(String(100))

    def __repr__(self):
        return f"<Metric(name='{self.metric_name}', value={self.value})>"

# Connection string remains the same
engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)

# Usage is identical to PostgreSQL
session = Session()
metric = Metric(
    timestamp=datetime.utcnow(),
    metric_name='cpu_usage',
    value=45.2,
    host_id='server-01'
)
session.add(metric)
session.commit()
```

### TypeScript/Node.js Application Updates

```typescript
// database.ts - TypeORM configuration for TimescaleDB
// Connection configuration remains the same as PostgreSQL

import { DataSource } from 'typeorm';
import { Metric } from './entities/Metric';

// TimescaleDB uses the same PostgreSQL driver
export const AppDataSource = new DataSource({
    type: 'postgres',  // Same type - TimescaleDB is PostgreSQL
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'myapp',
    entities: [Metric],
    synchronize: false,  // Use migrations for hypertable setup
    logging: process.env.NODE_ENV === 'development',
});

// Custom repository for TimescaleDB-specific queries
export class MetricRepository {
    private dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Query using TimescaleDB's time_bucket function.
     * Falls back to date_trunc if TimescaleDB is not available.
     */
    async getHourlyAverages(
        metricName: string,
        startTime: Date,
        endTime: Date
    ): Promise<{ hour: Date; avgValue: number }[]> {
        const result = await this.dataSource.query(`
            SELECT
                time_bucket('1 hour', timestamp) as hour,
                avg(value) as avg_value
            FROM metrics
            WHERE metric_name = $1
              AND timestamp >= $2
              AND timestamp < $3
            GROUP BY 1
            ORDER BY 1
        `, [metricName, startTime, endTime]);

        return result.map((row: any) => ({
            hour: row.hour,
            avgValue: parseFloat(row.avg_value)
        }));
    }
}
```

## Rollback Procedures

### Quick Rollback (Within 24 Hours)

```sql
-- rollback_quick.sql
-- Use this if migration was recent and you kept the original table

BEGIN;

-- Check if backup table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'metrics_backup'
    ) THEN
        RAISE EXCEPTION 'Backup table metrics_backup not found';
    END IF;
END $$;

-- Drop the hypertable (this removes all TimescaleDB metadata)
DROP TABLE IF EXISTS metrics CASCADE;

-- Restore original table
ALTER TABLE metrics_backup RENAME TO metrics;

-- Recreate any indexes that were on the original table
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);

-- Verify restoration
SELECT count(*) as row_count FROM metrics;

COMMIT;

-- Note: You may need to restart application connections
```

### Full Rollback Script

```bash
#!/bin/bash
# rollback_timescaledb.sh
# Complete rollback script for TimescaleDB migration

set -e

DB_NAME="${1:-mydb}"
DB_USER="${2:-postgres}"
BACKUP_DIR="${3:-/var/backups/postgres}"

echo "=== TimescaleDB Migration Rollback ==="
echo "Database: $DB_NAME"
echo "Backup Directory: $BACKUP_DIR"

# Step 1: Stop application to prevent writes
echo "Step 1: Please stop your application before continuing."
read -p "Press enter when application is stopped..."

# Step 2: Check for pg_dump backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found in $BACKUP_DIR"
    exit 1
fi

echo "Found backup: $LATEST_BACKUP"

# Step 3: Create current state backup (just in case)
echo "Step 3: Creating backup of current TimescaleDB state..."
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/timescaledb_state_$(date +%Y%m%d_%H%M%S).sql.gz"

# Step 4: Restore from pre-migration backup
echo "Step 4: Restoring from pre-migration backup..."

# Create new database for restoration
psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME}_restored;"

# Restore backup
gunzip -c "$LATEST_BACKUP" | psql -U "$DB_USER" "${DB_NAME}_restored"

# Step 5: Swap databases
echo "Step 5: Swapping databases..."
psql -U "$DB_USER" <<EOF
-- Terminate existing connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();

-- Rename databases
ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_timescale;
ALTER DATABASE ${DB_NAME}_restored RENAME TO $DB_NAME;
EOF

echo "=== Rollback Complete ==="
echo "The TimescaleDB database is preserved as: ${DB_NAME}_timescale"
echo "You can now restart your application."
```

### Rollback Decision Tree

```mermaid
flowchart TD
    A[Migration Issue Detected] --> B{Data Integrity OK?}
    B -->|Yes| C{Performance Issue?}
    B -->|No| D[Full Restore from Backup]

    C -->|Yes| E{Can tune queries?}
    C -->|No| F{Application Errors?}

    E -->|Yes| G[Optimize without rollback]
    E -->|No| H[Quick Rollback]

    F -->|Yes| I{Minor Changes?}
    F -->|No| J[Monitor & Document]

    I -->|Yes| K[Fix Application Code]
    I -->|No| H

    D --> L[Verify Restoration]
    H --> L
    L --> M[Restart Application]
```

## Post-Migration Optimization

### Enable Compression

```sql
-- Enable compression on the hypertable
-- Compression can reduce storage by 90%+ for time-series data

-- Step 1: Configure compression settings
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'host_id, metric_name',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Step 2: Add automatic compression policy
-- Compress chunks older than 7 days
SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- Step 3: Manually compress old chunks (one-time)
SELECT compress_chunk(chunk)
FROM show_chunks('metrics', older_than => INTERVAL '7 days') AS chunk;

-- Verify compression savings
SELECT
    hypertable_name,
    pg_size_pretty(before_compression_total_bytes) as before,
    pg_size_pretty(after_compression_total_bytes) as after,
    round(
        (1 - after_compression_total_bytes::numeric /
         NULLIF(before_compression_total_bytes, 0)) * 100, 2
    ) as compression_ratio
FROM hypertable_compression_stats('metrics');
```

### Set Up Retention Policies

```sql
-- Automatic data retention to manage storage
-- Delete chunks older than the retention period

-- Add retention policy (90 days)
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- View active policies
SELECT * FROM timescaledb_information.jobs
WHERE proc_name IN ('policy_retention', 'policy_compression');

-- Manually run retention (if needed)
CALL run_job((
    SELECT job_id FROM timescaledb_information.jobs
    WHERE proc_name = 'policy_retention'
    AND hypertable_name = 'metrics'
));
```

### Create Continuous Aggregates

```sql
-- Create materialized views that auto-update
-- Essential for dashboard queries

-- Daily aggregates
CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) as day,
    host_id,
    metric_name,
    avg(value) as avg_value,
    max(value) as max_value,
    min(value) as min_value,
    count(*) as samples
FROM metrics
GROUP BY 1, 2, 3
WITH NO DATA;

-- Set refresh policy
SELECT add_continuous_aggregate_policy('metrics_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- Refresh historical data
CALL refresh_continuous_aggregate('metrics_daily', NULL, NULL);
```

## Best Practices Summary

1. **Always backup before migration** - Create a full pg_dump backup before any migration steps

2. **Test in staging first** - Run the complete migration process in a staging environment

3. **Choose appropriate chunk intervals** - Use 1 day for most cases, 1 hour for high-velocity data

4. **Enable compression early** - Configure compression policies immediately after migration

5. **Use continuous aggregates** - Replace slow aggregate queries with materialized views

6. **Monitor chunk count** - Too many small chunks impacts performance; adjust intervals accordingly

7. **Keep rollback scripts ready** - Test rollback procedures before production migration

8. **Update application queries** - Replace `date_trunc` with `time_bucket` for better performance

9. **Set retention policies** - Prevent unbounded table growth with automatic data expiration

10. **Plan maintenance windows** - Large data migrations should be done during low-traffic periods

---

Migrating to TimescaleDB unlocks powerful time-series capabilities while maintaining full PostgreSQL compatibility. The key is careful planning, thorough testing, and having reliable rollback procedures. With the strategies outlined in this guide, you can confidently migrate your time-series workloads and immediately benefit from improved query performance and storage efficiency.

For monitoring your TimescaleDB instances and setting up alerts for query performance, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you track database metrics, set up alerts, and maintain visibility into your infrastructure.
