# How to Configure Debezium with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Debezium, PostgreSQL, CDC, Change Data Capture, Kafka, Database Replication, Streaming

Description: A comprehensive guide to configuring Debezium with PostgreSQL for real-time change data capture, covering WAL configuration, logical replication, connector setup, and production best practices.

---

> Change Data Capture (CDC) transforms your database into a real-time event stream. With Debezium and PostgreSQL, every INSERT, UPDATE, and DELETE becomes a message your downstream systems can consume instantly.

Debezium is an open-source distributed platform for change data capture. It captures row-level changes in your databases and streams them to Kafka topics, enabling real-time data pipelines, event-driven architectures, and reliable data synchronization across systems.

This guide walks through configuring Debezium with PostgreSQL from scratch, covering everything from WAL settings to production-ready connector configuration.

---

## Table of Contents

1. PostgreSQL WAL Configuration
2. Logical Replication Setup
3. Connector Configuration
4. Handling Schema Changes
5. Snapshot Modes
6. Signal Tables
7. Heartbeat Configuration
8. Best Practices Summary

---

## 1. PostgreSQL WAL Configuration

PostgreSQL's Write-Ahead Log (WAL) is the foundation of change data capture. Debezium reads changes from the WAL using logical replication, so proper configuration is essential.

### Modify postgresql.conf

```sql
-- Enable logical replication (requires restart)
-- wal_level must be 'logical' for CDC to work
ALTER SYSTEM SET wal_level = 'logical';

-- Number of replication slots to support
-- Each Debezium connector requires one slot
ALTER SYSTEM SET max_replication_slots = 4;

-- Number of concurrent WAL sender processes
-- Should be at least equal to max_replication_slots
ALTER SYSTEM SET max_wal_senders = 4;

-- Keep WAL segments for logical replication subscribers
-- Prevents removal of WAL segments still needed by Debezium
ALTER SYSTEM SET wal_keep_size = '1GB';
```

### Verify WAL Configuration

After restarting PostgreSQL, verify the settings:

```sql
-- Check current WAL level (must be 'logical')
SHOW wal_level;

-- Verify replication slot capacity
SHOW max_replication_slots;

-- Check WAL sender processes available
SHOW max_wal_senders;
```

### Understanding WAL Segments

WAL segments are 16MB files by default. Key considerations:

```sql
-- Monitor WAL disk usage
SELECT
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) as total_wal_generated,
    pg_size_pretty(sum(size)) as wal_directory_size
FROM pg_ls_waldir();

-- Check replication lag (how far behind Debezium is)
SELECT
    slot_name,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as replication_lag
FROM pg_replication_slots;
```

---

## 2. Logical Replication Setup

Debezium requires a PostgreSQL user with replication privileges and a publication for the tables you want to capture.

### Create Replication User

```sql
-- Create a dedicated user for Debezium
-- REPLICATION privilege allows creating replication slots
-- LOGIN allows the user to connect
CREATE ROLE debezium_user WITH REPLICATION LOGIN PASSWORD 'secure_password_here';

-- Grant connect privilege to your database
GRANT CONNECT ON DATABASE your_database TO debezium_user;

-- Grant usage on schema (typically public)
GRANT USAGE ON SCHEMA public TO debezium_user;

-- Grant SELECT on tables you want to capture
-- Option 1: Grant on specific tables
GRANT SELECT ON TABLE orders, customers, products TO debezium_user;

-- Option 2: Grant on all tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium_user;

-- Grant privilege for future tables (optional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO debezium_user;
```

### Create Publication

Publications define which tables participate in logical replication:

```sql
-- Option 1: Create publication for specific tables
CREATE PUBLICATION debezium_publication FOR TABLE orders, customers, products;

-- Option 2: Create publication for all tables
CREATE PUBLICATION debezium_publication FOR ALL TABLES;

-- Option 3: Create publication with filtering (PostgreSQL 15+)
CREATE PUBLICATION debezium_publication FOR TABLE orders WHERE (status = 'completed');
```

### Configure pg_hba.conf

Allow replication connections from Debezium:

```text
# Allow replication connections from Debezium host
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     debezium_user   10.0.0.0/8              scram-sha-256
host    your_database   debezium_user   10.0.0.0/8              scram-sha-256
```

### Verify Replication Setup

```sql
-- List existing publications
SELECT * FROM pg_publication;

-- Show tables in a publication
SELECT * FROM pg_publication_tables WHERE pubname = 'debezium_publication';

-- Check replication slots (created by Debezium connector)
SELECT * FROM pg_replication_slots;
```

---

## 3. Connector Configuration

The Debezium PostgreSQL connector is deployed to Kafka Connect. Here is a production-ready configuration:

### Basic Connector Configuration

```json
{
  "name": "postgres-connector",
  "config": {
    // Connector class for PostgreSQL CDC
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",

    // Number of tasks (usually 1 for PostgreSQL)
    "tasks.max": "1",

    // Database connection settings
    "database.hostname": "postgres.example.com",
    "database.port": "5432",
    "database.user": "debezium_user",
    "database.password": "${file:/secrets/postgres-password.txt}",
    "database.dbname": "your_database",

    // Logical prefix for Kafka topics
    // Topics will be named: topic.prefix.schema.table
    "topic.prefix": "dbserver1",

    // PostgreSQL publication name
    "publication.name": "debezium_publication",

    // Replication slot name (auto-created if not exists)
    "slot.name": "debezium_slot",

    // Plugin for logical decoding
    // pgoutput is native to PostgreSQL 10+
    "plugin.name": "pgoutput",

    // Schema and table inclusion filters
    // Use regex patterns to match tables
    "schema.include.list": "public",
    "table.include.list": "public.orders,public.customers,public.products"
  }
}
```

### Advanced Connector Configuration

```json
{
  "name": "postgres-connector-advanced",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",

    // Connection settings
    "database.hostname": "postgres.example.com",
    "database.port": "5432",
    "database.user": "debezium_user",
    "database.password": "${file:/secrets/postgres-password.txt}",
    "database.dbname": "your_database",
    "topic.prefix": "dbserver1",
    "publication.name": "debezium_publication",
    "slot.name": "debezium_slot",
    "plugin.name": "pgoutput",

    // Table filtering
    "schema.include.list": "public,inventory",
    "table.include.list": "public.orders,public.customers,inventory.*",

    // Column filtering (exclude sensitive data)
    "column.exclude.list": "public.customers.ssn,public.customers.credit_card",

    // Column masking (hash sensitive values)
    "column.mask.hash.SHA-256.with.salt.my-salt": "public.customers.email",

    // Snapshot configuration
    "snapshot.mode": "initial",
    "snapshot.locking.mode": "minimal",

    // Heartbeat to prevent WAL bloat during low activity
    "heartbeat.interval.ms": "10000",
    "heartbeat.action.query": "UPDATE debezium_heartbeat SET last_heartbeat = NOW()",

    // Signal table for runtime commands
    "signal.data.collection": "public.debezium_signals",
    "signal.enabled.channels": "source",

    // Tombstone events for deletes
    "tombstones.on.delete": "true",

    // Event flattening (simpler message format)
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.unwrap.delete.handling.mode": "rewrite",

    // Error handling
    "errors.tolerance": "all",
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",

    // Performance tuning
    "max.batch.size": "2048",
    "max.queue.size": "8192",
    "poll.interval.ms": "500"
  }
}
```

### Deploy Connector to Kafka Connect

```bash
# Deploy connector using Kafka Connect REST API
curl -X POST http://kafka-connect:8083/connectors \
  -H "Content-Type: application/json" \
  -d @postgres-connector.json

# Check connector status
curl http://kafka-connect:8083/connectors/postgres-connector/status

# Pause connector
curl -X PUT http://kafka-connect:8083/connectors/postgres-connector/pause

# Resume connector
curl -X PUT http://kafka-connect:8083/connectors/postgres-connector/resume

# Delete connector
curl -X DELETE http://kafka-connect:8083/connectors/postgres-connector
```

---

## 4. Handling Schema Changes

Debezium captures schema changes automatically, but proper configuration ensures smooth evolution.

### Schema History Configuration

```json
{
  "config": {
    // Store schema history in Kafka topic
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "schema-changes.your_database",

    // Schema history retention
    "schema.history.internal.store.only.captured.tables.ddl": "true",
    "schema.history.internal.store.only.captured.databases.ddl": "true"
  }
}
```

### Safe Schema Migration Patterns

```sql
-- SAFE: Add nullable column (no lock, compatible change)
ALTER TABLE orders ADD COLUMN notes TEXT;

-- SAFE: Add column with default (PostgreSQL 11+, no rewrite)
ALTER TABLE orders ADD COLUMN priority INTEGER DEFAULT 0;

-- CAUTION: Rename column (breaks downstream consumers)
-- Better: Add new column, migrate data, deprecate old column
ALTER TABLE orders ADD COLUMN order_notes TEXT;
UPDATE orders SET order_notes = notes WHERE notes IS NOT NULL;
-- Later: DROP COLUMN notes

-- CAUTION: Change column type (may require table rewrite)
-- Better: Add new column with new type
ALTER TABLE orders ADD COLUMN amount_decimal DECIMAL(10,2);
UPDATE orders SET amount_decimal = amount::DECIMAL(10,2);
```

### Debezium Schema Compatibility

Debezium publishes both the schema and data in each message:

```json
{
  "schema": {
    "type": "struct",
    "fields": [
      {"field": "before", "type": "struct"},
      {"field": "after", "type": "struct"},
      {"field": "source", "type": "struct"},
      {"field": "op", "type": "string"},
      {"field": "ts_ms", "type": "int64"}
    ]
  },
  "payload": {
    "before": null,
    "after": {"id": 1, "customer_name": "John", "amount": 99.99},
    "source": {"version": "2.4.0", "connector": "postgresql", "ts_ms": 1706380800000},
    "op": "c",
    "ts_ms": 1706380800123
  }
}
```

---

## 5. Snapshot Modes

Debezium can capture the initial state of tables before streaming changes.

### Available Snapshot Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| initial | Snapshot all data on first start, then stream | New deployments |
| initial_only | Snapshot only, no streaming | One-time data migration |
| never | Skip snapshot, stream only | When initial data exists elsewhere |
| when_needed | Snapshot if no offset exists | Recovery scenarios |
| no_data | Capture schema only, no data | Schema synchronization |
| recovery | Re-snapshot after connector failure | Disaster recovery |

### Snapshot Configuration

```json
{
  "config": {
    // Snapshot mode selection
    "snapshot.mode": "initial",

    // Locking strategy during snapshot
    // minimal: Short lock for schema, then consistent read
    // none: No locks (may have inconsistencies)
    // extended: Hold lock during entire snapshot
    "snapshot.locking.mode": "minimal",

    // Query for selecting snapshot data
    // Use for filtering or ordering large tables
    "snapshot.select.statement.overrides": "public.orders",
    "snapshot.select.statement.overrides.public.orders": "SELECT * FROM orders WHERE created_at > '2024-01-01'",

    // Chunk size for snapshot queries
    "snapshot.fetch.size": "10240",

    // Maximum threads for parallel snapshot
    "snapshot.max.threads": "1",

    // Include only specific tables in snapshot
    "snapshot.include.collection.list": "public.orders,public.customers"
  }
}
```

### Incremental Snapshots

Debezium 1.6+ supports incremental snapshots that run alongside streaming:

```json
{
  "config": {
    // Enable signal table for triggering incremental snapshots
    "signal.data.collection": "public.debezium_signals",
    "signal.enabled.channels": "source",

    // Incremental snapshot chunk size
    "incremental.snapshot.chunk.size": "1024",

    // Allow parallel incremental snapshots
    "incremental.snapshot.allow.schema.changes": "true"
  }
}
```

Trigger an incremental snapshot via signal table:

```sql
-- Create signal table if not exists
CREATE TABLE IF NOT EXISTS debezium_signals (
    id VARCHAR(42) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    data VARCHAR(2048) NULL
);

-- Trigger incremental snapshot of orders table
INSERT INTO debezium_signals (id, type, data) VALUES (
    'ad-hoc-1',
    'execute-snapshot',
    '{"data-collections": ["public.orders"], "type": "incremental"}'
);
```

---

## 6. Signal Tables

Signal tables allow runtime control of Debezium connectors without restarts.

### Create Signal Table

```sql
-- Signal table schema
CREATE TABLE debezium_signals (
    -- Unique identifier for each signal
    id VARCHAR(42) PRIMARY KEY,

    -- Signal type: execute-snapshot, stop-snapshot, pause-incremental, resume-incremental
    type VARCHAR(32) NOT NULL,

    -- JSON payload with signal parameters
    data VARCHAR(2048) NULL,

    -- Optional: track when signals were processed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Grant Debezium user access
GRANT SELECT, INSERT, DELETE ON debezium_signals TO debezium_user;
```

### Signal Types and Examples

```sql
-- Execute incremental snapshot of specific tables
INSERT INTO debezium_signals (id, type, data) VALUES (
    'snapshot-orders-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'execute-snapshot',
    '{"data-collections": ["public.orders"], "type": "incremental"}'
);

-- Execute incremental snapshot with condition
INSERT INTO debezium_signals (id, type, data) VALUES (
    'snapshot-recent-orders',
    'execute-snapshot',
    '{"data-collections": ["public.orders"], "type": "incremental", "additional-condition": "created_at > ''2024-01-01''"}'
);

-- Stop an ongoing incremental snapshot
INSERT INTO debezium_signals (id, type, data) VALUES (
    'stop-snapshot-1',
    'stop-snapshot',
    '{"data-collections": ["public.orders"], "type": "incremental"}'
);

-- Pause incremental snapshot
INSERT INTO debezium_signals (id, type, data) VALUES (
    'pause-1',
    'pause-incremental',
    '{}'
);

-- Resume incremental snapshot
INSERT INTO debezium_signals (id, type, data) VALUES (
    'resume-1',
    'resume-incremental',
    '{}'
);

-- Log a message to connector logs
INSERT INTO debezium_signals (id, type, data) VALUES (
    'log-1',
    'log',
    '{"message": "Manual checkpoint triggered by ops team"}'
);
```

### Connector Configuration for Signals

```json
{
  "config": {
    // Enable signal table
    "signal.data.collection": "public.debezium_signals",

    // Enable source channel (database polling)
    "signal.enabled.channels": "source",

    // Optional: Kafka signal channel for external control
    "signal.kafka.topic": "debezium-signals",
    "signal.kafka.bootstrap.servers": "kafka:9092"
  }
}
```

---

## 7. Heartbeat Configuration

Heartbeats prevent WAL bloat when tables have low write activity.

### The WAL Bloat Problem

When Debezium captures a table with infrequent updates, PostgreSQL cannot reclaim WAL segments because the replication slot's confirmed position does not advance. This leads to disk space exhaustion.

### Heartbeat Configuration

```json
{
  "config": {
    // Send heartbeat every 10 seconds
    "heartbeat.interval.ms": "10000",

    // Execute this query on each heartbeat
    // Updates a dedicated table to advance the replication position
    "heartbeat.action.query": "UPDATE public.debezium_heartbeat SET last_heartbeat = NOW() WHERE id = 1"
  }
}
```

### Create Heartbeat Table

```sql
-- Create heartbeat table
CREATE TABLE debezium_heartbeat (
    id INTEGER PRIMARY KEY,
    last_heartbeat TIMESTAMP NOT NULL
);

-- Initialize with a single row
INSERT INTO debezium_heartbeat (id, last_heartbeat) VALUES (1, NOW());

-- Grant update permission
GRANT UPDATE ON debezium_heartbeat TO debezium_user;

-- Include in publication
ALTER PUBLICATION debezium_publication ADD TABLE debezium_heartbeat;
```

### Monitor Replication Lag

```sql
-- Check replication slot lag (should stay small with heartbeats)
SELECT
    slot_name,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as pending_wal
FROM pg_replication_slots
WHERE slot_name = 'debezium_slot';

-- Alert if lag exceeds threshold
SELECT
    slot_name,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) / 1024 / 1024 as lag_mb
FROM pg_replication_slots
WHERE pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824; -- 1GB
```

### Heartbeat Topic

Debezium publishes heartbeat events to a dedicated topic:

```text
Topic: dbserver1.heartbeat
```

Downstream consumers can use these events to detect connector liveness.

---

## 8. Best Practices Summary

### PostgreSQL Configuration Checklist

| Setting | Recommended Value | Purpose |
|---------|-------------------|---------|
| wal_level | logical | Enable logical decoding |
| max_replication_slots | >= number of connectors + 2 | Support failover |
| max_wal_senders | >= max_replication_slots | Match slot capacity |
| wal_keep_size | 1GB or higher | Prevent premature WAL removal |

### Security Best Practices

```sql
-- Use dedicated user with minimal privileges
CREATE ROLE debezium_user WITH REPLICATION LOGIN PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE production TO debezium_user;
GRANT USAGE ON SCHEMA public TO debezium_user;
GRANT SELECT ON captured_tables TO debezium_user;

-- Use SSL for connections
-- In postgresql.conf: ssl = on
-- In connector config: "database.sslmode": "require"
```

### Monitoring and Alerting

```sql
-- Monitor replication slot health
SELECT
    slot_name,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag
FROM pg_replication_slots;

-- Set up alerts for:
-- 1. Replication lag > 100MB
-- 2. Slot inactive for > 5 minutes
-- 3. WAL disk usage > 80%
```

### Performance Tuning

| Parameter | Default | Tuning Guidance |
|-----------|---------|-----------------|
| max.batch.size | 2048 | Increase for high-throughput tables |
| max.queue.size | 8192 | Should be 4x max.batch.size |
| poll.interval.ms | 500 | Lower for latency, higher for throughput |
| snapshot.fetch.size | 10240 | Match to average row size |

### Operational Runbook

```bash
# Check connector status
curl -s http://kafka-connect:8083/connectors/postgres-connector/status | jq .

# Restart failed task
curl -X POST http://kafka-connect:8083/connectors/postgres-connector/tasks/0/restart

# View connector configuration
curl -s http://kafka-connect:8083/connectors/postgres-connector/config | jq .

# Update connector configuration
curl -X PUT http://kafka-connect:8083/connectors/postgres-connector/config \
  -H "Content-Type: application/json" \
  -d @updated-config.json

# List all connectors
curl -s http://kafka-connect:8083/connectors | jq .

# View Kafka Connect cluster info
curl -s http://kafka-connect:8083/ | jq .
```

### Disaster Recovery

1. **Slot Lost**: If the replication slot is accidentally dropped, perform a new initial snapshot
2. **WAL Bloat**: Enable heartbeats and monitor slot lag
3. **Schema Mismatch**: Use schema history topic to recover schema state
4. **Connector Failure**: Check logs, fix configuration, restart task

### Quick Reference

```text
Minimum PostgreSQL version: 10 (for pgoutput plugin)
Recommended PostgreSQL version: 14+ (improved logical replication)
Debezium connector version: 2.x (latest stable)
Required privileges: REPLICATION, SELECT on captured tables
Default Kafka topic pattern: {topic.prefix}.{schema}.{table}
```

---

## Conclusion

Debezium with PostgreSQL provides a robust foundation for real-time data pipelines. Key takeaways:

1. **Configure WAL properly**: Set wal_level to logical and allocate sufficient replication slots
2. **Use heartbeats**: Prevent WAL bloat during low-activity periods
3. **Plan for schema evolution**: Use compatible changes and test migrations
4. **Monitor continuously**: Track replication lag and connector health
5. **Secure your setup**: Use dedicated users with minimal privileges

With these configurations in place, you can reliably stream database changes to Kafka and build event-driven architectures that react to data changes in real time.

---

*Need to monitor your Debezium pipelines and PostgreSQL databases? [OneUptime](https://oneuptime.com) provides comprehensive observability for your entire data infrastructure, from database health to Kafka consumer lag.*
