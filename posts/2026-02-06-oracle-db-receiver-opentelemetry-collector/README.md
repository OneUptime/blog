# How to Configure the Oracle DB Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Oracle, Database Monitoring, Metrics, Performance Tuning

Description: Master Oracle Database monitoring with OpenTelemetry Collector by configuring the Oracle DB receiver to collect performance metrics, track tablespace usage, monitor sessions, and export comprehensive database telemetry.

Oracle Database powers mission-critical enterprise applications worldwide. Monitoring Oracle performance is essential for maintaining application responsiveness, preventing outages, and optimizing resource utilization. The Oracle DB receiver in the OpenTelemetry Collector provides native integration with Oracle Database, automatically collecting key performance indicators from Oracle's system views and data dictionary.

## What is the Oracle DB Receiver?

The Oracle DB receiver is a specialized OpenTelemetry Collector component designed specifically for Oracle Database monitoring. It connects to Oracle instances using standard database protocols and automatically queries Oracle's rich set of performance views (V$ views, DBA views) to collect comprehensive metrics.

The receiver monitors critical Oracle Database aspects including:

- Tablespace usage and growth trends
- Session and connection statistics
- Buffer cache hit ratios and memory usage
- Physical and logical I/O operations
- Wait events and contention
- SQL execution statistics
- Redo log activity
- System global area (SGA) metrics
- Process and resource utilization

Unlike generic database receivers, the Oracle DB receiver understands Oracle-specific architecture and collects metrics that align with Oracle Database best practices.

## How the Oracle DB Receiver Works

The receiver establishes a connection to the Oracle instance and periodically executes queries against system views to gather metrics. These metrics are converted to OpenTelemetry format and sent through the Collector pipeline:

```mermaid
graph LR
    A[Oracle DB Receiver] -->|Query V$ & DBA Views| B[(Oracle Database)]
    B -->|Return Metrics| A
    A -->|Convert to OTel Format| C[Processors]
    C -->|Batch & Enrich| D[Exporters]
    D -->|Send Telemetry| E[OneUptime/Backend]
```

The receiver handles Oracle-specific connection patterns, metric normalization, and error handling. You configure connection details and select which metric categories to collect.

## Basic Configuration

Start monitoring an Oracle Database with this minimal configuration:

```yaml
# Receivers section - defines how telemetry enters the Collector
receivers:
  # Oracle DB receiver for Oracle Database monitoring
  oracledb:
    # Data Source Name (DSN) for Oracle connection
    # Format: oracle://username:password@hostname:port/service_name
    # For Oracle 19c and later, use thick mode if needed
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracledb.internal:1521/ORCL"

    # Collection interval - how often to scrape metrics
    collection_interval: 30s

    # Enable basic metric collection
    metrics:
      # Tablespace metrics - critical for capacity planning
      oracledb.tablespace.size:
        enabled: true
      oracledb.tablespace.used:
        enabled: true

      # Session metrics - monitor concurrent users
      oracledb.sessions.usage:
        enabled: true

# Processors - transform collected metrics
processors:
  # Batch metrics to reduce network overhead
  batch:
    timeout: 10s
    send_batch_size: 100

# Exporters - define where metrics are sent
exporters:
  # Export to OneUptime via OTLP HTTP
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# Service section - wire components into pipelines
service:
  pipelines:
    # Metrics pipeline for Oracle data
    metrics:
      receivers: [oracledb]
      processors: [batch]
      exporters: [otlphttp]
```

This basic configuration connects to an Oracle instance and collects essential tablespace and session metrics. For production environments, you'll enable comprehensive metric collection and add resilience features.

## Connection String Formats

Oracle supports various connection string formats depending on your environment and Oracle client version:

### Easy Connect (Recommended)

The simplest format for most environments:

```yaml
receivers:
  oracledb:
    # Easy Connect format: oracle://user:pass@host:port/service_name
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB"
```

### Easy Connect with Options

Add connection options for SSL, timeout, and pooling:

```yaml
receivers:
  oracledb:
    # Easy Connect with SSL and wallet location
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:2484/PRODDB?ssl=true&wallet_location=/opt/oracle/wallet"
```

### TNS Names Connection

Use existing TNS names from tnsnames.ora:

```yaml
receivers:
  oracledb:
    # TNS name format: oracle://user:pass@tns_name
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@PRODDB"
    # Set TNS_ADMIN environment variable to point to tnsnames.ora location
    # export TNS_ADMIN=/opt/oracle/network/admin
```

### Connection Pooling Configuration

For efficient connection management in high-availability environments:

```yaml
receivers:
  oracledb:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB"

    # Connection pool settings - reduce connection overhead
    connection_pool:
      # Maximum number of open connections
      max_open_connections: 5
      # Maximum number of idle connections to keep
      max_idle_connections: 2
      # Maximum lifetime of a connection
      max_connection_lifetime: 10m
      # Maximum idle time before closing
      max_connection_idle_time: 5m
```

## Comprehensive Metrics Configuration

The Oracle DB receiver supports extensive metric collection. Here's a production-ready configuration:

```yaml
receivers:
  oracledb:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB"
    collection_interval: 30s

    # Enable comprehensive Oracle monitoring
    metrics:
      # Tablespace metrics - capacity planning and growth tracking
      oracledb.tablespace.size:
        enabled: true
        description: "Total size of tablespace in bytes"

      oracledb.tablespace.used:
        enabled: true
        description: "Used space in tablespace in bytes"

      oracledb.tablespace.usage:
        enabled: true
        description: "Tablespace usage percentage"

      # Session and connection metrics
      oracledb.sessions.usage:
        enabled: true
        description: "Current active sessions"

      oracledb.sessions.limit:
        enabled: true
        description: "Maximum allowed sessions"

      oracledb.sessions.count:
        enabled: true
        description: "Total session count by status and type"

      # Process metrics
      oracledb.processes.usage:
        enabled: true
        description: "Number of active processes"

      oracledb.processes.limit:
        enabled: true
        description: "Maximum allowed processes"

      # Memory metrics - SGA and PGA
      oracledb.memory.sga.size:
        enabled: true
        description: "System Global Area size in bytes"

      oracledb.memory.pga.size:
        enabled: true
        description: "Program Global Area size in bytes"

      oracledb.memory.sga.free:
        enabled: true
        description: "Free memory in SGA"

      # Buffer cache metrics - critical for performance
      oracledb.buffer_cache.hit_ratio:
        enabled: true
        description: "Buffer cache hit ratio (target >95%)"

      oracledb.buffer_cache.physical_reads:
        enabled: true
        description: "Physical reads from disk"

      oracledb.buffer_cache.logical_reads:
        enabled: true
        description: "Logical reads from cache"

      # Library cache metrics - SQL parsing efficiency
      oracledb.library_cache.hit_ratio:
        enabled: true
        description: "Library cache hit ratio (target >95%)"

      oracledb.library_cache.reloads:
        enabled: true
        description: "Library cache reloads (target: minimize)"

      # Transaction and redo log metrics
      oracledb.transactions.count:
        enabled: true
        description: "Active transaction count"

      oracledb.redo.size:
        enabled: true
        description: "Redo log size generated"

      oracledb.redo.writes:
        enabled: true
        description: "Redo log write operations"

      # Physical I/O metrics
      oracledb.physical_reads:
        enabled: true
        description: "Physical read operations"

      oracledb.physical_writes:
        enabled: true
        description: "Physical write operations"

      oracledb.physical_read_bytes:
        enabled: true
        description: "Bytes read from disk"

      oracledb.physical_write_bytes:
        enabled: true
        description: "Bytes written to disk"

      # Wait events - identify bottlenecks
      oracledb.wait_time.total:
        enabled: true
        description: "Total wait time across all wait events"

      oracledb.wait_time.by_class:
        enabled: true
        description: "Wait time broken down by wait class"

      # CPU metrics
      oracledb.cpu.time:
        enabled: true
        description: "CPU time consumed by database"

      # Parse metrics - SQL efficiency
      oracledb.parse.hard:
        enabled: true
        description: "Hard parse count (target: minimize)"

      oracledb.parse.soft:
        enabled: true
        description: "Soft parse count"

      # Lock metrics
      oracledb.locks.count:
        enabled: true
        description: "Number of active locks"

      oracledb.locks.waiting:
        enabled: true
        description: "Sessions waiting for locks"
```

This comprehensive configuration provides deep visibility into Oracle Database performance, covering memory, I/O, parsing, locking, and wait events.

## Multi-Database Monitoring

Monitor multiple Oracle databases (RAC, standby, or separate instances) from a single Collector:

```yaml
receivers:
  # Production primary database
  oracledb/production_primary:
    datasource: "oracle://monitor:${ORACLE_PROD_PASSWORD}@prod-db1.internal:1521/PRODDB"
    collection_interval: 30s
    metrics:
      oracledb.tablespace.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.buffer_cache.hit_ratio:
        enabled: true
      oracledb.wait_time.by_class:
        enabled: true

  # Production standby database (Data Guard)
  oracledb/production_standby:
    datasource: "oracle://monitor:${ORACLE_PROD_PASSWORD}@prod-db2.internal:1521/PRODDB_STDBY"
    collection_interval: 60s
    metrics:
      oracledb.tablespace.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      # Monitor Data Guard specific metrics
      oracledb.dataguard.lag:
        enabled: true
      oracledb.dataguard.apply_rate:
        enabled: true

  # Test database
  oracledb/test:
    datasource: "oracle://monitor:${ORACLE_TEST_PASSWORD}@test-db.internal:1521/TESTDB"
    collection_interval: 120s
    metrics:
      oracledb.tablespace.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true

# Add environment labels to distinguish databases
processors:
  attributes/production_primary:
    actions:
      - key: environment
        value: production
        action: insert
      - key: database_role
        value: primary
        action: insert
      - key: instance_name
        value: PRODDB
        action: insert

  attributes/production_standby:
    actions:
      - key: environment
        value: production
        action: insert
      - key: database_role
        value: standby
        action: insert
      - key: instance_name
        value: PRODDB_STDBY
        action: insert

  attributes/test:
    actions:
      - key: environment
        value: test
        action: insert
      - key: database_role
        value: standalone
        action: insert
      - key: instance_name
        value: TESTDB
        action: insert

  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics/production_primary:
      receivers: [oracledb/production_primary]
      processors: [attributes/production_primary, batch]
      exporters: [otlphttp]

    metrics/production_standby:
      receivers: [oracledb/production_standby]
      processors: [attributes/production_standby, batch]
      exporters: [otlphttp]

    metrics/test:
      receivers: [oracledb/test]
      processors: [attributes/test, batch]
      exporters: [otlphttp]
```

This configuration monitors multiple Oracle instances with different collection intervals and applies environment-specific labels for easy filtering in your observability platform.

## Oracle RAC (Real Application Clusters) Monitoring

For Oracle RAC environments, monitor each node individually and aggregate cluster-wide metrics:

```yaml
receivers:
  # RAC Node 1
  oracledb/rac_node1:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@rac-node1.internal:1521/RACDB"
    collection_interval: 30s
    metrics:
      oracledb.tablespace.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.rac.interconnect.traffic:
        enabled: true
      oracledb.rac.global_cache.blocks_received:
        enabled: true
      oracledb.rac.global_cache.blocks_served:
        enabled: true

  # RAC Node 2
  oracledb/rac_node2:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@rac-node2.internal:1521/RACDB"
    collection_interval: 30s
    metrics:
      oracledb.tablespace.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.rac.interconnect.traffic:
        enabled: true
      oracledb.rac.global_cache.blocks_received:
        enabled: true
      oracledb.rac.global_cache.blocks_served:
        enabled: true

processors:
  attributes/rac_node1:
    actions:
      - key: cluster_name
        value: RAC_CLUSTER
        action: insert
      - key: node_name
        value: rac-node1
        action: insert

  attributes/rac_node2:
    actions:
      - key: cluster_name
        value: RAC_CLUSTER
        action: insert
      - key: node_name
        value: rac-node2
        action: insert

  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics/rac_node1:
      receivers: [oracledb/rac_node1]
      processors: [attributes/rac_node1, batch]
      exporters: [otlphttp]

    metrics/rac_node2:
      receivers: [oracledb/rac_node2]
      processors: [attributes/rac_node2, batch]
      exporters: [otlphttp]
```

## Performance Optimization

Optimize the receiver for high-load production environments:

```yaml
receivers:
  oracledb:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@busy-db.internal:1521/BUSYDB"

    # Increase interval to reduce query load
    collection_interval: 60s

    # Set query timeout to prevent hangs
    timeout: 15s

    # Optimize connection pooling
    connection_pool:
      max_open_connections: 3
      max_idle_connections: 1
      max_connection_lifetime: 15m
      max_connection_idle_time: 5m

    # Enable only critical metrics for busy systems
    metrics:
      # Core performance indicators
      oracledb.tablespace.usage:
        enabled: true
      oracledb.buffer_cache.hit_ratio:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.wait_time.by_class:
        enabled: true

      # Disable verbose metrics that query heavily
      oracledb.sessions.count:
        enabled: false
      oracledb.locks.count:
        enabled: false

processors:
  # Add resource detection for automatic host tagging
  resourcedetection:
    detectors: [env, system, docker]
    timeout: 5s

  # Filter out null or zero values to reduce noise
  filter/remove_empty:
    metrics:
      datapoint:
        # Drop datapoints with zero values for specific metrics
        - 'metric.name == "oracledb.locks.waiting" and value_int == 0'

  batch:
    timeout: 30s
    send_batch_size: 1000

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    metrics:
      receivers: [oracledb]
      processors: [resourcedetection, filter/remove_empty, batch]
      exporters: [otlphttp]
```

## Security Best Practices

Secure your Oracle monitoring deployment:

### Create a Dedicated Monitoring User

Create an Oracle user with read-only permissions for monitoring:

```sql
-- Connect to Oracle as SYSDBA and execute:

-- Create monitoring user
CREATE USER monitor IDENTIFIED BY "StrongPassword123!";

-- Grant basic connection privilege
GRANT CREATE SESSION TO monitor;

-- Grant SELECT on necessary system views
GRANT SELECT ON v_$session TO monitor;
GRANT SELECT ON v_$process TO monitor;
GRANT SELECT ON v_$sysstat TO monitor;
GRANT SELECT ON v_$system_event TO monitor;
GRANT SELECT ON v_$sesstat TO monitor;
GRANT SELECT ON v_$waitstat TO monitor;
GRANT SELECT ON v_$sga TO monitor;
GRANT SELECT ON v_$pgastat TO monitor;
GRANT SELECT ON v_$transaction TO monitor;
GRANT SELECT ON v_$log TO monitor;
GRANT SELECT ON v_$instance TO monitor;

-- Grant SELECT on DBA views for tablespace monitoring
GRANT SELECT ON dba_tablespaces TO monitor;
GRANT SELECT ON dba_data_files TO monitor;
GRANT SELECT ON dba_free_space TO monitor;
GRANT SELECT ON dba_temp_files TO monitor;

-- Grant SELECT on performance views
GRANT SELECT ON v_$sql TO monitor;
GRANT SELECT ON v_$sqlarea TO monitor;
GRANT SELECT ON v_$sqlstats TO monitor;

-- For Oracle 12c+ with PDB (pluggable databases)
-- Execute in CDB and each PDB you want to monitor
ALTER SESSION SET CONTAINER = CDB$ROOT;
CREATE USER c##monitor IDENTIFIED BY "StrongPassword123!";
GRANT CREATE SESSION TO c##monitor CONTAINER=ALL;
GRANT SELECT_CATALOG_ROLE TO c##monitor CONTAINER=ALL;
```

### Use Environment Variables

Never hardcode credentials:

```yaml
receivers:
  oracledb:
    # Use environment variables for sensitive data
    datasource: "oracle://${ORACLE_MONITOR_USER}:${ORACLE_MONITOR_PASSWORD}@${ORACLE_HOST}:${ORACLE_PORT}/${ORACLE_SERVICE}"
```

Set in your environment:

```bash
export ORACLE_MONITOR_USER="monitor"
export ORACLE_MONITOR_PASSWORD="StrongPassword123!"
export ORACLE_HOST="oracle-prod.internal"
export ORACLE_PORT="1521"
export ORACLE_SERVICE="PRODDB"
```

### Enable Encrypted Connections

Use Oracle Native Network Encryption or SSL/TLS:

```yaml
receivers:
  oracledb:
    # Use SSL with Oracle Wallet
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST=oracle-prod.internal)(PORT=2484))(CONNECT_DATA=(SERVICE_NAME=PRODDB)))?wallet_location=/opt/oracle/wallet"
```

Configure Oracle sqlnet.ora for encryption:

```text
# sqlnet.ora
SQLNET.ENCRYPTION_CLIENT = REQUIRED
SQLNET.ENCRYPTION_TYPES_CLIENT = (AES256, AES192, AES128)
SQLNET.CRYPTO_CHECKSUM_CLIENT = REQUIRED
SQLNET.CRYPTO_CHECKSUM_TYPES_CLIENT = (SHA256, SHA1)
```

## Alerting on Critical Oracle Metrics

Configure alerts for critical Oracle Database conditions:

**Tablespace Usage High**: Alert when any tablespace exceeds 85% usage to prevent out-of-space errors.

**Buffer Cache Hit Ratio Low**: Alert when buffer cache hit ratio drops below 95%, indicating memory pressure or inefficient queries.

**Session Limit Approaching**: Alert when active sessions reach 80% of session limit.

**Wait Events Excessive**: Alert on high wait times for critical wait classes (I/O, latch, lock).

**Archive Log Backlog**: Alert when archive log generation exceeds archive rate, risking instance hang.

**Data Guard Lag**: Alert when standby database lag exceeds acceptable thresholds.

These metrics are exported in OpenTelemetry format and can drive alerting policies in your observability backend.

## Troubleshooting

### Connection Failures

If the receiver can't connect to Oracle:

1. Verify Oracle listener is running: `lsnrctl status`
2. Check network connectivity and firewall rules
3. Confirm TNS names resolution if using tnsnames.ora
4. Test connection with SQL*Plus: `sqlplus monitor@PRODDB`
5. Verify user credentials and account status
6. Check Oracle error logs in $ORACLE_BASE/diag

Enable debug logging:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

### Permission Errors

If queries fail with permission errors:

1. Verify monitoring user has SELECT grants on V$ and DBA views
2. Check for SYSDBA requirement (avoid if possible)
3. Grant SELECT_CATALOG_ROLE for broader access
4. For CDB/PDB environments, verify container-level grants

### Missing Metrics

If some metrics don't appear:

1. Check Oracle version compatibility (some metrics are version-specific)
2. Verify features are enabled (RAC metrics only in RAC environments)
3. Review Collector logs for query errors
4. Ensure monitoring user can access required views

### Performance Impact

If monitoring impacts database performance:

1. Increase collection_interval to reduce query frequency
2. Disable expensive metrics (detailed session stats)
3. Use connection pooling to avoid connection overhead
4. Review Oracle wait events to identify monitoring impact
5. Consider deploying Collector closer to database (reduce network latency)

## Monitoring the Receiver

Monitor the Oracle DB receiver to ensure reliable telemetry:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - periodic:
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: https://oneuptime.com/otlp
                headers:
                  x-oneuptime-token: ${ONEUPTIME_TOKEN}
```

Watch these internal metrics:

- `otelcol_receiver_accepted_metric_points`: Successful collections
- `otelcol_receiver_refused_metric_points`: Collection failures
- `otelcol_scraper_errored_metric_points`: Scraper errors

## Related Topics

For comprehensive database monitoring with OpenTelemetry:

- [How to Configure the SQL Query Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-sql-query-receiver-opentelemetry-collector/view)
- [How to Configure the SQL Server Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-sql-server-receiver-opentelemetry-collector/view)
- [OpenTelemetry Collector: What It Is and When You Need It](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to collect internal metrics from OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)

## Summary

The Oracle DB receiver provides production-grade monitoring for Oracle Database environments. It automatically collects comprehensive metrics from Oracle's system views, covering tablespaces, sessions, memory, I/O, wait events, and more.

Configure the receiver with appropriate authentication, enable relevant metrics for your Oracle version and architecture (standalone, RAC, Data Guard), and export data to OneUptime for powerful visualization and alerting. Follow security best practices by creating dedicated monitoring users with read-only permissions and using encrypted connections.

Whether monitoring a single Oracle instance or a complex multi-node RAC cluster with Data Guard standby databases, the Oracle DB receiver scales to meet enterprise observability requirements. Start with core metrics and expand coverage as your monitoring needs evolve.

Need a robust backend for your Oracle Database metrics? OneUptime offers native OpenTelemetry support with advanced analytics, correlation, and alerting capabilities designed for enterprise database observability.
