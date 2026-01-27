# How to Configure Debezium for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Debezium, MySQL, Change Data Capture, CDC, Kafka, Database, Streaming, Real-time, Event-Driven

Description: A comprehensive guide to configuring Debezium for MySQL change data capture, covering binlog setup, connector configuration, GTID mode, schema history, snapshot modes, and table filtering.

---

> Debezium transforms your MySQL database into an event stream, capturing every INSERT, UPDATE, and DELETE as they happen - enabling real-time data pipelines without polling or application changes.

Change Data Capture (CDC) has become essential for building event-driven architectures, real-time analytics, and data synchronization between systems. Debezium is the leading open-source CDC platform, and its MySQL connector is one of the most widely used. This guide walks you through the complete setup process, from MySQL binary log configuration to production-ready connector deployment.

---

## Prerequisites

Before diving in, ensure you have:

- MySQL 5.7+ or MySQL 8.0+ (or MariaDB 10.2+)
- Apache Kafka cluster running
- Kafka Connect cluster deployed
- Administrative access to MySQL

---

## MySQL Binary Log Configuration

Debezium relies on MySQL's binary log (binlog) to capture changes. The binlog must be enabled and configured in ROW format for Debezium to work correctly.

### Enable Binary Logging

Add these settings to your MySQL configuration file (`my.cnf` or `my.ini`):

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Enable binary logging - required for Debezium
server-id = 1

# Binary log file name prefix
log_bin = mysql-bin

# CRITICAL: Must be ROW format for Debezium to capture column values
# STATEMENT format only logs SQL statements, not actual data changes
# MIXED format is unreliable for CDC purposes
binlog_format = ROW

# Include actual row images (before and after values)
# FULL captures all columns for UPDATE operations
# MINIMAL only captures changed columns (less data but loses context)
binlog_row_image = FULL

# Expire binary logs after 7 days to prevent disk exhaustion
# Adjust based on your replication lag tolerance and disk capacity
expire_logs_days = 7

# For MySQL 8.0+, use binlog_expire_logs_seconds instead
# binlog_expire_logs_seconds = 604800
```

### Verify Binary Log Settings

After restarting MySQL, verify the configuration:

```sql
-- Check if binary logging is enabled
SHOW VARIABLES LIKE 'log_bin';
-- Expected: log_bin = ON

-- Verify the binary log format is ROW
SHOW VARIABLES LIKE 'binlog_format';
-- Expected: binlog_format = ROW

-- Check row image setting
SHOW VARIABLES LIKE 'binlog_row_image';
-- Expected: binlog_row_image = FULL

-- List current binary log files
SHOW BINARY LOGS;

-- View current binary log position (useful for debugging)
SHOW MASTER STATUS;
```

---

## Creating a Debezium MySQL User

Debezium needs a MySQL user with specific privileges to read the binlog and query table schemas.

```sql
-- Create a dedicated user for Debezium
-- Use a strong password in production!
CREATE USER 'debezium'@'%' IDENTIFIED BY 'your_secure_password_here';

-- Grant replication privileges (required to read binlog)
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'debezium'@'%';

-- Grant SELECT on databases you want to capture
-- Option 1: Grant on specific database (recommended for security)
GRANT SELECT ON your_database.* TO 'debezium'@'%';

-- Option 2: Grant on all databases (use with caution)
-- GRANT SELECT ON *.* TO 'debezium'@'%';

-- For MySQL 8.0+: Grant RELOAD for consistent snapshots
-- This allows Debezium to acquire global read locks during initial snapshot
GRANT RELOAD ON *.* TO 'debezium'@'%';

-- Apply the privilege changes
FLUSH PRIVILEGES;
```

---

## GTID Mode Configuration

Global Transaction Identifiers (GTIDs) provide a more robust way to track replication positions compared to traditional binlog file and position tracking. GTIDs survive server restarts and make failover scenarios much simpler.

### Enable GTID Mode in MySQL

Add these settings to your MySQL configuration:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Enable GTID mode for more reliable position tracking
gtid_mode = ON

# Enforce GTID consistency - prevents statements that cannot be logged safely
enforce_gtid_consistency = ON
```

### Verify GTID Configuration

```sql
-- Check GTID mode status
SHOW VARIABLES LIKE 'gtid_mode';
-- Expected: gtid_mode = ON

-- View executed GTIDs (useful for debugging replication state)
SHOW VARIABLES LIKE 'gtid_executed';

-- Check GTID consistency enforcement
SHOW VARIABLES LIKE 'enforce_gtid_consistency';
-- Expected: enforce_gtid_consistency = ON
```

### Benefits of GTID Mode

- **Automatic failover**: Debezium can resume from the correct position after MySQL failover
- **No binlog file/position tracking**: GTIDs are globally unique and persistent
- **Simpler disaster recovery**: Easier to identify which transactions have been replicated

---

## Debezium Connector Configuration

Now configure the Debezium MySQL connector. This JSON configuration is submitted to Kafka Connect's REST API.

### Basic Connector Configuration

```json
{
  "name": "mysql-connector",
  "config": {
    // Connector class - specifies the Debezium MySQL connector
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",

    // Number of tasks - MySQL connector only supports 1 task
    "tasks.max": "1",

    // MySQL connection settings
    "database.hostname": "mysql.example.com",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "your_secure_password_here",

    // Unique identifier for this MySQL server in the CDC topology
    // This becomes the prefix for Kafka topic names
    "topic.prefix": "mysql-prod",

    // Unique numeric ID for this connector (must be unique across all connectors)
    // Used as the MySQL server_id when connecting as a replica
    "database.server.id": "184054",

    // Databases to include (comma-separated list)
    "database.include.list": "inventory,customers",

    // Schema history topic - stores DDL changes for schema evolution
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "schema-changes.mysql-prod"
  }
}
```

### Deploy the Connector

Submit the configuration to Kafka Connect:

```bash
# Deploy the connector using curl
curl -X POST http://kafka-connect:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mysql-connector.json

# Check connector status
curl http://kafka-connect:8083/connectors/mysql-connector/status

# List all connectors
curl http://kafka-connect:8083/connectors

# View connector configuration
curl http://kafka-connect:8083/connectors/mysql-connector/config
```

---

## Schema History Configuration

Debezium maintains a history of all DDL (schema) changes in a dedicated Kafka topic. This is critical for correctly parsing binlog events when table structures change.

### Schema History Settings

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",

    // ... other settings ...

    // Kafka cluster for schema history storage
    "schema.history.internal.kafka.bootstrap.servers": "kafka-1:9092,kafka-2:9092,kafka-3:9092",

    // Topic name for schema history (create with high retention)
    "schema.history.internal.kafka.topic": "schema-changes.mysql-prod",

    // Recovery settings - how many attempts to read schema history on startup
    "schema.history.internal.kafka.recovery.attempts": "100",

    // Polling interval during schema history recovery (milliseconds)
    "schema.history.internal.kafka.recovery.poll.interval.ms": "100",

    // Store only schema changes for captured tables (reduces storage)
    "schema.history.internal.store.only.captured.tables.ddl": "true",

    // Skip unparseable DDL statements instead of failing
    "schema.history.internal.skip.unparseable.ddl": "true"
  }
}
```

### Create the Schema History Topic

Create the topic with appropriate settings before starting the connector:

```bash
# Create schema history topic with infinite retention
# This topic should NEVER expire - it contains critical schema evolution data
kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --topic schema-changes.mysql-prod \
  --partitions 1 \
  --replication-factor 3 \
  --config cleanup.policy=delete \
  --config retention.ms=-1

# Verify topic configuration
kafka-topics.sh --describe \
  --bootstrap-server kafka:9092 \
  --topic schema-changes.mysql-prod
```

---

## Snapshot Modes

When Debezium first starts, it can take a snapshot of the existing database state before streaming changes. The snapshot mode determines how this initial data capture works.

### Available Snapshot Modes

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",

    // ... other settings ...

    // Snapshot mode options:

    // "initial" (default) - Full snapshot on first start, then stream changes
    // Best for: New deployments where you need all existing data
    "snapshot.mode": "initial",

    // "initial_only" - Take snapshot and stop (no streaming)
    // Best for: One-time data migration
    // "snapshot.mode": "initial_only",

    // "schema_only" - Capture schema but skip existing data
    // Best for: When you only care about new changes going forward
    // "snapshot.mode": "schema_only",

    // "schema_only_recovery" - Re-read schema after connector restart
    // Best for: Recovering from schema history corruption
    // "snapshot.mode": "schema_only_recovery",

    // "never" - Never snapshot, fail if no offset exists
    // Best for: Strict streaming-only scenarios
    // "snapshot.mode": "never",

    // "when_needed" - Snapshot if offsets are missing or invalid
    // Best for: Self-healing deployments
    // "snapshot.mode": "when_needed"
  }
}
```

### Snapshot Locking Behavior

Configure how Debezium handles table locks during snapshots:

```json
{
  "name": "mysql-connector",
  "config": {
    // ... other settings ...

    // Locking mode during snapshot
    // "minimal" - Hold global read lock only during schema capture
    // "minimal_percona" - Use Percona-specific backup locks
    // "extended" - Hold lock for entire snapshot (most consistent but blocks writes)
    // "none" - No locks (may cause inconsistencies)
    "snapshot.locking.mode": "minimal",

    // How to handle snapshot fetch operations
    // "cursor" - Use server-side cursor (low memory, slower)
    // "select_all" - Load entire result set (fast, high memory)
    "snapshot.fetch.size": "10240",

    // Maximum time for snapshot (0 = no timeout)
    "snapshot.max.threads": "1"
  }
}
```

---

## Filtering Tables and Columns

In production, you often want to capture only specific tables or exclude sensitive columns. Debezium provides flexible filtering options.

### Table Filtering

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",

    // ... other settings ...

    // Include only specific databases (comma-separated)
    "database.include.list": "inventory,orders",

    // Or exclude specific databases
    // "database.exclude.list": "mysql,sys,information_schema,performance_schema",

    // Include only specific tables (format: database.table)
    // Supports regex patterns
    "table.include.list": "inventory.products,inventory.categories,orders.orders,orders.order_items",

    // Or exclude specific tables
    // "table.exclude.list": "inventory.audit_log,orders.temp_.*",

    // Filter by table regex pattern
    // This example captures all tables except those ending in '_backup'
    // "table.exclude.list": ".*\\..*_backup"
  }
}
```

### Column Filtering and Masking

```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",

    // ... other settings ...

    // Exclude sensitive columns from capture
    // Format: fully.qualified.table.column (comma-separated)
    "column.exclude.list": "customers.customers.ssn,customers.customers.credit_card,orders.orders.payment_token",

    // Or include only specific columns
    // "column.include.list": "inventory.products.id,inventory.products.name,inventory.products.price",

    // Mask columns with hash (useful for PII that needs to be trackable but not readable)
    // Uses SHA-256 hash with optional salt
    "column.mask.hash.SHA-256.with.salt.salt_value": "customers.customers.email",

    // Mask columns with fixed length asterisks
    "column.mask.with.12.chars": "customers.customers.phone",

    // Truncate long text columns to save space
    "column.truncate.to.1024.chars": "orders.orders.notes,inventory.products.description"
  }
}
```

### Complete Production Configuration Example

```json
{
  "name": "mysql-production-connector",
  "config": {
    // Connector identification
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "1",

    // MySQL connection
    "database.hostname": "mysql-primary.internal",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "${file:/secrets/mysql-password.txt}",

    // Server identification
    "topic.prefix": "prod-mysql",
    "database.server.id": "184054",

    // Database and table filtering
    "database.include.list": "ecommerce,analytics",
    "table.include.list": "ecommerce.products,ecommerce.orders,ecommerce.customers,analytics.events",
    "column.exclude.list": "ecommerce.customers.password_hash,ecommerce.customers.ssn",

    // Schema history
    "schema.history.internal.kafka.bootstrap.servers": "kafka-1:9092,kafka-2:9092,kafka-3:9092",
    "schema.history.internal.kafka.topic": "dbhistory.prod-mysql",
    "schema.history.internal.store.only.captured.tables.ddl": "true",

    // Snapshot configuration
    "snapshot.mode": "initial",
    "snapshot.locking.mode": "minimal",
    "snapshot.fetch.size": "10240",

    // Message transformation
    "tombstones.on.delete": "true",
    "decimal.handling.mode": "double",
    "time.precision.mode": "connect",

    // Error handling
    "errors.log.enable": "true",
    "errors.log.include.messages": "true",
    "errors.tolerance": "none",

    // Heartbeat for idle databases (keeps offsets fresh)
    "heartbeat.interval.ms": "10000",
    "heartbeat.topics.prefix": "__debezium-heartbeat",

    // Performance tuning
    "max.batch.size": "2048",
    "max.queue.size": "8192",
    "poll.interval.ms": "1000"
  }
}
```

---

## Best Practices Summary

### MySQL Configuration

- Always use `binlog_format = ROW` - STATEMENT and MIXED formats do not work with Debezium
- Enable `binlog_row_image = FULL` to capture all column values for UPDATE operations
- Use GTID mode for reliable failover and position tracking
- Set appropriate binary log retention to balance disk usage and replication lag tolerance

### Security

- Create a dedicated MySQL user for Debezium with minimal required privileges
- Store credentials securely using Kafka Connect's external secrets or environment variables
- Filter out sensitive columns using `column.exclude.list` or masking options
- Use TLS for MySQL connections in production (`database.ssl.mode`)

### Schema History

- Create the schema history topic with infinite retention (`retention.ms=-1`)
- Use replication factor of 3 for the schema history topic
- Enable `store.only.captured.tables.ddl` to reduce storage
- Never delete or compact the schema history topic

### Snapshots

- Use `snapshot.mode=initial` for new deployments to capture existing data
- Use `snapshot.mode=schema_only` when you only need new changes
- Configure appropriate `snapshot.locking.mode` based on write tolerance
- Monitor snapshot progress for large databases

### Filtering

- Always filter at the source - do not capture data you do not need
- Use `database.include.list` instead of `exclude.list` for explicit control
- Document your filtering configuration for compliance and debugging
- Test filter patterns before production deployment

### Monitoring

- Enable heartbeats for databases with infrequent changes
- Monitor connector lag using Debezium metrics
- Set up alerts for connector failures and rebalances
- Track schema history topic growth

---

## Troubleshooting Common Issues

### Connector Fails to Start

```bash
# Check connector status and error messages
curl http://kafka-connect:8083/connectors/mysql-connector/status | jq

# Common causes:
# - MySQL user lacks REPLICATION SLAVE privilege
# - Binary logging not enabled
# - Schema history topic does not exist or is inaccessible
# - Invalid database/table filters
```

### Missing Change Events

```sql
-- Verify binlog format
SHOW VARIABLES LIKE 'binlog_format';
-- Must be ROW, not STATEMENT or MIXED

-- Check if table is using a storage engine that supports binlog
SHOW TABLE STATUS WHERE Name = 'your_table';
-- Engine should be InnoDB (MyISAM has limited binlog support)
```

### High Replication Lag

```json
{
  // Increase batch sizes for higher throughput
  "max.batch.size": "4096",
  "max.queue.size": "16384",

  // Reduce poll interval for more frequent reads
  "poll.interval.ms": "500"
}
```

---

## Next Steps

With Debezium configured for MySQL, you can now:

- Build real-time data pipelines to data warehouses
- Implement event-driven microservices architectures
- Create materialized views and caches that stay synchronized
- Enable audit logging without application changes
- Power real-time analytics dashboards

For monitoring your Debezium connectors and the downstream systems they feed, consider using [OneUptime](https://oneuptime.com) to track connector health, message lag, and end-to-end data pipeline latency.

---

**Related Reading:**

- [What is OpenTelemetry Collector and Why Use One?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [The Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
