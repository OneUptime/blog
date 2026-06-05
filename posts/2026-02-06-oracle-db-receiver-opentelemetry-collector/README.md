# How to Configure the Oracle DB Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Oracle, Database Monitoring, Metric, Performance Tuning

Description: Master Oracle Database monitoring with OpenTelemetry Collector by configuring the Oracle DB receiver to collect performance metrics, track tablespace usage, monitor sessions.

Oracle Database powers mission-critical enterprise applications worldwide. Monitoring Oracle performance is essential for maintaining application responsiveness, preventing outages, and optimizing resource utilization. The Oracle DB receiver in the OpenTelemetry Collector provides native integration with Oracle Database, automatically collecting key performance indicators from Oracle's system views and data dictionary.

## What is the Oracle DB Receiver?

The Oracle DB receiver is a specialized OpenTelemetry Collector component designed specifically for Oracle Database monitoring. It connects to Oracle instances using standard database protocols and automatically queries Oracle's rich set of performance views (V$ views, DBA views) to collect comprehensive metrics.

The receiver monitors critical Oracle Database aspects including:

- Tablespace usage and growth trends
- Session and connection statistics
- Logical and physical read statistics
- Physical and logical I/O operations
- SQL execution and parse statistics
- Transaction activity
- PGA memory usage
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
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracledb.internal:1521/ORCL"

    # Collection interval - how often to scrape metrics
    collection_interval: 30s

    # Enable basic metric collection
    metrics:
      # Tablespace metrics - critical for capacity planning
      oracledb.tablespace_size.limit:
        enabled: true
      oracledb.tablespace_size.usage:
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

The receiver supports the connection formats exposed by the Oracle Go driver:

### Easy Connect (Recommended)

The simplest format for most environments:

```yaml
receivers:
  oracledb:
    # Easy Connect format: oracle://user:pass@host:port/service_name
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB"
```

### Easy Connect with Options

Add connection options supported by the Oracle Go driver:

```yaml
receivers:
  oracledb:
    # Easy Connect with SSL and wallet location
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:2484/PRODDB?ssl=true&wallet=/opt/oracle/wallet"
```

### JDBC Descriptor Connection

Use an Oracle connect descriptor through the Oracle Go driver's connection string option:

```yaml
receivers:
  oracledb:
    # URL-encode the descriptor when it contains characters that are not valid in a URL query value.
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB?connStr=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=oracle-prod.internal)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=PRODDB)))"
```

### Separate Connection Fields

If you prefer not to put credentials in a single DSN, configure the receiver with separate connection fields:

```yaml
receivers:
  oracledb:
    endpoint: oracle-prod.internal:1521
    username: monitor
    password: ${ORACLE_PASSWORD}
    service: PRODDB
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
      oracledb.tablespace_size.limit:
        enabled: true

      oracledb.tablespace_size.usage:
        enabled: true

      oracledb.user_rollbacks:
        enabled: true

      # Session and connection metrics
      oracledb.sessions.usage:
        enabled: true

      oracledb.sessions.limit:
        enabled: true

      # Process metrics
      oracledb.processes.usage:
        enabled: true

      oracledb.processes.limit:
        enabled: true

      # Memory metrics - PGA
      oracledb.pga_memory:
        enabled: true

      # Read metrics - critical for performance
      oracledb.logical_reads:
        enabled: true

      oracledb.physical_reads:
        enabled: true

      oracledb.db_block_gets:
        enabled: true

      # Transaction metrics
      oracledb.transactions.usage:
        enabled: true

      oracledb.transactions.limit:
        enabled: true

      oracledb.user_commits:
        enabled: true

      # Physical I/O metrics
      oracledb.physical_read_io_requests:
        enabled: true

      oracledb.physical_write_io_requests:
        enabled: true

      # CPU metrics
      oracledb.cpu_time:
        enabled: true

      # Parse metrics - SQL efficiency
      oracledb.hard_parses:
        enabled: true

      oracledb.parse_calls:
        enabled: true

      # Lock metrics
      oracledb.enqueue_locks.usage:
        enabled: true

      oracledb.dml_locks.usage:
        enabled: true
```

This comprehensive configuration provides visibility into Oracle Database performance, covering storage, sessions, memory, I/O, parsing, locking, and transactions.

## Multi-Database Monitoring

Monitor multiple Oracle databases (RAC, standby, or separate instances) from a single Collector:

```yaml
receivers:
  # Production primary database
  oracledb/production_primary:
    datasource: "oracle://monitor:${ORACLE_PROD_PASSWORD}@prod-db1.internal:1521/PRODDB"
    collection_interval: 30s
    metrics:
      oracledb.tablespace_size.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.logical_reads:
        enabled: true
      oracledb.physical_reads:
        enabled: true

  # Production standby database (Data Guard)
  oracledb/production_standby:
    datasource: "oracle://monitor:${ORACLE_PROD_PASSWORD}@prod-db2.internal:1521/PRODDB_STDBY"
    collection_interval: 60s
    metrics:
      oracledb.tablespace_size.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.transactions.usage:
        enabled: true
      oracledb.user_commits:
        enabled: true

  # Test database
  oracledb/test:
    datasource: "oracle://monitor:${ORACLE_TEST_PASSWORD}@test-db.internal:1521/TESTDB"
    collection_interval: 120s
    metrics:
      oracledb.tablespace_size.usage:
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
      oracledb.tablespace_size.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.physical_read_io_requests:
        enabled: true
      oracledb.physical_write_io_requests:
        enabled: true
      oracledb.logical_reads:
        enabled: true

  # RAC Node 2
  oracledb/rac_node2:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@rac-node2.internal:1521/RACDB"
    collection_interval: 30s
    metrics:
      oracledb.tablespace_size.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.physical_read_io_requests:
        enabled: true
      oracledb.physical_write_io_requests:
        enabled: true
      oracledb.logical_reads:
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

    # Enable only critical metrics for busy systems
    metrics:
      # Core performance indicators
      oracledb.tablespace_size.usage:
        enabled: true
      oracledb.sessions.usage:
        enabled: true
      oracledb.logical_reads:
        enabled: true
      oracledb.physical_reads:
        enabled: true

      # Disable verbose metrics that query heavily
      oracledb.consistent_gets:
        enabled: false
      oracledb.db_block_gets:
        enabled: false

processors:
  # Add resource detection for automatic host tagging
  resource_detection:
    detectors: [env, system, docker]
    timeout: 5s

  # Filter out null or zero values to reduce noise
  filter/remove_empty:
    error_mode: ignore
    metric_conditions:
      # Drop zero-value deadlock metrics
      - 'metric.name == "oracledb.enqueue_deadlocks" and datapoint.value_int == 0'

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
      processors: [resource_detection, filter/remove_empty, batch]
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
GRANT SELECT ON v_$sysstat TO monitor;
GRANT SELECT ON v_$resource_limit TO monitor;

-- Grant SELECT on DBA views for tablespace monitoring
GRANT SELECT ON dba_tablespaces TO monitor;
GRANT SELECT ON dba_data_files TO monitor;
GRANT SELECT ON dba_tablespace_usage_metrics TO monitor;

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
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:2484/PRODDB?ssl=true&wallet=/opt/oracle/wallet"
```

For native network encryption and data integrity, use the driver's URL options:

```yaml
receivers:
  oracledb:
    datasource: "oracle://monitor:${ORACLE_PASSWORD}@oracle-prod.internal:1521/PRODDB?encryption=required&data%20integrity=required"
```

## Alerting on Critical Oracle Metrics

Configure alerts for critical Oracle Database conditions:

**Tablespace Usage High**: Alert when any tablespace exceeds 85% usage to prevent out-of-space errors.

**Physical Reads Increasing**: Alert when physical reads or physical read I/O requests rise sharply, indicating possible storage pressure or inefficient queries.

**Session Limit Approaching**: Alert when active sessions reach 80% of session limit.

**Lock Usage High**: Alert when DML lock or enqueue lock usage approaches its configured limit.

**Transaction Limit Approaching**: Alert when active transactions reach 80% of the transaction limit.

**Parse Activity High**: Alert when hard parse counts grow unexpectedly.

These metrics are exported in OpenTelemetry format and can drive alerting policies in your observability backend.

## Troubleshooting

### Connection Failures

If the receiver can't connect to Oracle:

1. Verify Oracle listener is running: `lsnrctl status`
2. Check network connectivity and firewall rules
3. Confirm the service name or connection descriptor resolves correctly
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
3. Disable optional metrics that are expensive in your environment
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

The Oracle DB receiver provides Oracle Database monitoring through the OpenTelemetry Collector contrib distribution. It automatically collects metrics from Oracle's system views, covering tablespaces, sessions, memory, I/O, transactions, and more.

Configure the receiver with appropriate authentication, enable relevant metrics for your Oracle version and architecture, and export data to OneUptime for powerful visualization and alerting. Follow security best practices by creating dedicated monitoring users with read-only permissions and using encrypted connections.

Whether monitoring a single Oracle instance or a complex multi-node RAC cluster with Data Guard standby databases, the Oracle DB receiver scales to meet enterprise observability requirements. Start with core metrics and expand coverage as your monitoring needs evolve.

Need a robust backend for your Oracle Database metrics? OneUptime offers native OpenTelemetry support with advanced analytics, correlation, and alerting capabilities designed for enterprise database observability.
