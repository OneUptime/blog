# How to Configure the SQL Server Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, SQL Server, Microsoft, Database Monitoring, Metrics, Performance

Description: Configure the SQL Server receiver in OpenTelemetry Collector to monitor Microsoft SQL Server performance, collect database metrics, track query performance, and export telemetry data for comprehensive database observability.

Microsoft SQL Server is one of the most widely used relational database management systems in enterprise environments. Monitoring SQL Server performance is critical for maintaining application health, preventing outages, and optimizing query performance. The SQL Server receiver in the OpenTelemetry Collector provides native integration to collect comprehensive metrics from SQL Server instances without requiring custom queries or third-party agents.

## What is the SQL Server Receiver?

The SQL Server receiver is a specialized component of the OpenTelemetry Collector that connects to Microsoft SQL Server instances and automatically collects performance metrics. Unlike the generic SQL Query receiver that requires you to write custom SQL queries, the SQL Server receiver has built-in knowledge of SQL Server's Dynamic Management Views (DMVs) and system tables, automatically collecting dozens of relevant metrics out of the box.

The receiver monitors critical aspects of SQL Server including:

- Database file sizes and growth rates
- Connection pool usage and wait times
- Lock statistics and deadlocks
- Buffer cache hit ratios
- Page life expectancy
- Transaction log usage
- Query execution statistics
- Resource usage (CPU, memory, I/O)

## How the SQL Server Receiver Works

The receiver connects to SQL Server using standard database protocols and periodically queries system DMVs to collect metrics. These metrics are then converted to OpenTelemetry format and sent through the Collector pipeline:

```mermaid
graph LR
    A[SQL Server Receiver] -->|Query DMVs| B[(SQL Server Instance)]
    B -->|Return Metrics| A
    A -->|Convert to OTel Format| C[Processors]
    C -->|Batch & Transform| D[Exporters]
    D -->|Send Telemetry| E[OneUptime/Backend]
```

The receiver handles authentication, connection pooling, metric parsing, and error handling automatically. You simply configure the connection details and which metrics to collect.

## Basic Configuration

Here's a minimal configuration to start monitoring a SQL Server instance:

```yaml
# Receivers section - defines how telemetry enters the Collector
receivers:
  # SQL Server receiver for Microsoft SQL Server monitoring
  sqlserver:
    # SQL Server instance connection string
    # Format: sqlserver://username:password@hostname:port/instance
    # For default instance, omit /instance
    server: "localhost"
    port: 1433

    # Authentication credentials
    # Use SQL Server authentication or Windows authentication
    username: "monitor"
    password: ${SQLSERVER_PASSWORD}

    # Collection interval - how often to scrape metrics
    collection_interval: 30s

    # Metrics to collect - start with default set
    # The receiver knows which DMVs to query for each metric
    metrics:
      sqlserver.database.count:
        enabled: true
      sqlserver.database.state:
        enabled: true

# Processors - transform collected metrics
processors:
  # Batch metrics to reduce network calls
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
    # Metrics pipeline for SQL Server data
    metrics:
      receivers: [sqlserver]
      processors: [batch]
      exporters: [otlphttp]
```

This basic configuration connects to a local SQL Server instance and begins collecting database count and state metrics. For production use, you'll want to enable many more metrics and add resilience features.

## Authentication Options

SQL Server supports two authentication modes: SQL Server authentication and Windows authentication. Choose based on your environment:

### SQL Server Authentication

Standard username and password authentication:

```yaml
receivers:
  sqlserver:
    server: "sqlserver.example.com"
    port: 1433
    # SQL Server login credentials
    username: "monitor_user"
    password: ${SQLSERVER_PASSWORD}
    # Optional: specify database to connect to (default: master)
    database: "master"
```

### Windows Authentication

For Windows integrated security, use the current Windows user or a service account:

```yaml
receivers:
  sqlserver:
    server: "sqlserver.internal.corp"
    port: 1433
    # Use Windows authentication instead of SQL auth
    # The Collector process must run as a user with SQL Server access
    # On Linux, use NTLM or Kerberos
    # Leave username/password empty for Windows auth
    use_windows_auth: true
```

### Named Instances

SQL Server supports multiple instances on the same host. To connect to a named instance:

```yaml
receivers:
  sqlserver:
    # Named instance format: hostname\instancename
    server: "sqlserver.example.com\\PRODUCTION"
    # Named instances often use dynamic ports
    # Omit port to use SQL Server Browser service
    username: "monitor_user"
    password: ${SQLSERVER_PASSWORD}
```

## Comprehensive Metrics Configuration

The SQL Server receiver can collect extensive metrics. Here's a production-ready configuration with the most important metrics enabled:

```yaml
receivers:
  sqlserver:
    server: "prod-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_PASSWORD}
    collection_interval: 30s

    # Enable comprehensive metric collection
    metrics:
      # Database-level metrics
      sqlserver.database.count:
        enabled: true
        description: "Total number of databases on the instance"

      sqlserver.database.state:
        enabled: true
        description: "Database state (online, offline, restoring, etc.)"

      sqlserver.database.size:
        enabled: true
        description: "Database size in bytes including data and log files"

      sqlserver.database.file.size:
        enabled: true
        description: "Individual database file sizes"

      sqlserver.database.file.space_used:
        enabled: true
        description: "Used space in database files"

      sqlserver.database.transactions:
        enabled: true
        description: "Transaction rate per database"

      sqlserver.database.operations:
        enabled: true
        description: "Database I/O operations (reads, writes)"

      # Connection and session metrics
      sqlserver.user.connections:
        enabled: true
        description: "Number of user connections to the instance"

      sqlserver.connection.count:
        enabled: true
        description: "Active connection count by database"

      # Lock and blocking metrics
      sqlserver.lock.wait_time:
        enabled: true
        description: "Time spent waiting for locks"

      sqlserver.lock.count:
        enabled: true
        description: "Number of active locks by type"

      # Buffer cache and memory metrics
      sqlserver.buffer.cache_hit_ratio:
        enabled: true
        description: "Buffer cache hit ratio (higher is better, target >90%)"

      sqlserver.buffer.page_life_expectancy:
        enabled: true
        description: "Page life expectancy in seconds (target >300s)"

      sqlserver.memory.target:
        enabled: true
        description: "Target memory for SQL Server"

      sqlserver.memory.used:
        enabled: true
        description: "Memory currently used by SQL Server"

      # Transaction log metrics
      sqlserver.log.used:
        enabled: true
        description: "Transaction log space used"

      sqlserver.log.growth:
        enabled: true
        description: "Transaction log growth events"

      # Performance counters
      sqlserver.batch.requests:
        enabled: true
        description: "Batch requests per second"

      sqlserver.batch.sql_compilations:
        enabled: true
        description: "SQL compilations per second"

      sqlserver.batch.sql_recompilations:
        enabled: true
        description: "SQL recompilations per second (target: minimize)"

      # Resource usage
      sqlserver.resource.cpu.time:
        enabled: true
        description: "CPU time used by SQL Server"

      sqlserver.resource.io.disk_read_bytes:
        enabled: true
        description: "Bytes read from disk"

      sqlserver.resource.io.disk_write_bytes:
        enabled: true
        description: "Bytes written to disk"
```

This configuration provides visibility into all critical aspects of SQL Server performance. The metrics follow OpenTelemetry semantic conventions and include helpful descriptions.

## Multi-Instance Monitoring

Many production environments run multiple SQL Server instances. Monitor them all from a single Collector by defining multiple receiver instances:

```yaml
receivers:
  # Production SQL Server instance
  sqlserver/production:
    server: "prod-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_PROD_PASSWORD}
    collection_interval: 30s
    metrics:
      sqlserver.database.count:
        enabled: true
      sqlserver.database.size:
        enabled: true
      sqlserver.buffer.cache_hit_ratio:
        enabled: true
      sqlserver.user.connections:
        enabled: true

  # Staging SQL Server instance
  sqlserver/staging:
    server: "staging-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_STAGING_PASSWORD}
    collection_interval: 60s
    metrics:
      sqlserver.database.count:
        enabled: true
      sqlserver.database.size:
        enabled: true

  # Reporting SQL Server instance
  sqlserver/reporting:
    server: "reports-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_REPORTING_PASSWORD}
    collection_interval: 120s
    metrics:
      sqlserver.database.count:
        enabled: true
      sqlserver.user.connections:
        enabled: true

# Add attributes to distinguish between instances
processors:
  # Add instance-specific labels to production metrics
  attributes/production:
    actions:
      - key: environment
        value: production
        action: insert
      - key: sql_instance
        value: prod-sql
        action: insert

  attributes/staging:
    actions:
      - key: environment
        value: staging
        action: insert
      - key: sql_instance
        value: staging-sql
        action: insert

  attributes/reporting:
    actions:
      - key: environment
        value: reporting
        action: insert
      - key: sql_instance
        value: reports-sql
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
    # Separate pipelines with instance-specific attributes
    metrics/production:
      receivers: [sqlserver/production]
      processors: [attributes/production, batch]
      exporters: [otlphttp]

    metrics/staging:
      receivers: [sqlserver/staging]
      processors: [attributes/staging, batch]
      exporters: [otlphttp]

    metrics/reporting:
      receivers: [sqlserver/reporting]
      processors: [attributes/reporting, batch]
      exporters: [otlphttp]
```

This pattern allows you to monitor multiple instances with different collection intervals and attributes, making it easy to filter and query metrics by environment or instance in your observability backend.

## Performance Tuning and Optimization

In high-load SQL Server environments, optimize the receiver configuration to minimize overhead:

```yaml
receivers:
  sqlserver:
    server: "high-load-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_PASSWORD}

    # Increase interval to reduce query load on busy servers
    collection_interval: 60s

    # Configure connection pooling for efficiency
    connection_pool:
      max_lifetime: 5m
      max_idle_time: 1m
      max_open_connections: 3
      max_idle_connections: 1

    # Set query timeout to prevent hanging
    timeout: 10s

    # Enable only essential metrics for high-load systems
    metrics:
      # Critical performance indicators only
      sqlserver.buffer.cache_hit_ratio:
        enabled: true
      sqlserver.database.size:
        enabled: true
      sqlserver.user.connections:
        enabled: true
      sqlserver.lock.wait_time:
        enabled: true
      sqlserver.resource.cpu.time:
        enabled: true

processors:
  # Add resource detection for automatic host tagging
  resourcedetection:
    detectors: [env, system]
    timeout: 5s

  # Filter out noisy metrics if needed
  filter/drop_low_value:
    metrics:
      # Example: drop metrics for offline databases
      exclude:
        match_type: strict
        metric_names:
          - sqlserver.database.state
        resource_attributes:
          - key: database.state
            value: offline

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

service:
  pipelines:
    metrics:
      receivers: [sqlserver]
      processors: [resourcedetection, filter/drop_low_value, batch]
      exporters: [otlphttp]
```

## Monitoring Availability Groups

For SQL Server Always On Availability Groups, monitor replica health and synchronization:

```yaml
receivers:
  sqlserver:
    server: "ag-primary.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_PASSWORD}
    collection_interval: 30s

    metrics:
      # Standard database metrics
      sqlserver.database.count:
        enabled: true
      sqlserver.database.state:
        enabled: true

      # Availability Group specific metrics
      sqlserver.availability_group.replica.role:
        enabled: true
        description: "Replica role (primary, secondary)"

      sqlserver.availability_group.replica.synchronization_health:
        enabled: true
        description: "Synchronization health status"

      sqlserver.availability_group.replica.synchronization_state:
        enabled: true
        description: "Synchronization state (synchronized, synchronizing, etc.)"

      sqlserver.availability_group.database.synchronization_lag:
        enabled: true
        description: "Synchronization lag in seconds"
```

## Security Best Practices

Secure your SQL Server monitoring setup:

### Create a Dedicated Monitoring User

Never use sa or admin accounts. Create a dedicated monitoring user with minimal permissions:

```sql
-- Connect to SQL Server as admin and run these commands

-- Create login for monitoring
CREATE LOGIN monitor WITH PASSWORD = 'StrongPassword123!';

-- Create user in each database you want to monitor
USE master;
CREATE USER monitor FOR LOGIN monitor;

-- Grant VIEW SERVER STATE permission for DMV access
GRANT VIEW SERVER STATE TO monitor;

-- Grant VIEW DATABASE STATE for database-level metrics
USE YourDatabase;
CREATE USER monitor FOR LOGIN monitor;
GRANT VIEW DATABASE STATE TO monitor;

-- For SQL Server 2016+, use the more granular permission
-- GRANT VIEW ANY DEFINITION TO monitor;
```

### Use Environment Variables for Credentials

Never hardcode passwords in configuration files:

```yaml
receivers:
  sqlserver:
    server: "prod-sql.internal"
    port: 1433
    # Reference environment variables for credentials
    username: ${SQL_MONITOR_USER}
    password: ${SQL_MONITOR_PASSWORD}
```

Set these in your deployment environment:

```bash
export SQL_MONITOR_USER="monitor"
export SQL_MONITOR_PASSWORD="StrongPassword123!"
```

### Enable Encrypted Connections

Always use TLS encryption for SQL Server connections:

```yaml
receivers:
  sqlserver:
    server: "prod-sql.internal"
    port: 1433
    username: "monitor"
    password: ${SQLSERVER_PASSWORD}
    # Enable TLS encryption
    encrypt: true
    # Verify server certificate (recommended for production)
    trust_server_certificate: false
```

## Alerting on Critical Metrics

Configure alerts in OneUptime for critical SQL Server conditions:

**Buffer Cache Hit Ratio Below Threshold**: Alert when cache hit ratio drops below 90%, indicating potential memory pressure or inefficient queries.

**Page Life Expectancy Too Low**: Alert when PLE drops below 300 seconds, suggesting memory pressure and potential performance degradation.

**Transaction Log Growth**: Alert on rapid log growth that could fill disk space.

**High Lock Wait Times**: Alert when lock contention exceeds acceptable thresholds.

**Failed Connections**: Alert on authentication failures or connection errors.

The SQL Server receiver exports these metrics in a format compatible with alerting rules in modern observability platforms.

## Troubleshooting

### Connection Issues

If the receiver can't connect to SQL Server:

1. Verify SQL Server is running and accepting TCP/IP connections
2. Check Windows Firewall allows port 1433 (or your custom port)
3. Enable SQL Server Authentication if using SQL auth
4. Verify user credentials and permissions
5. Test connectivity with SQL Server Management Studio first

Enable debug logging to see connection errors:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

### Missing Metrics

If some metrics aren't appearing:

1. Verify the monitoring user has VIEW SERVER STATE permission
2. Check SQL Server version supports the requested metrics
3. Some metrics only appear when relevant (e.g., AG metrics on AG instances)
4. Review Collector logs for permission errors

### High Overhead

If monitoring causes performance impact:

1. Increase collection_interval to reduce query frequency
2. Disable non-essential metrics
3. Ensure monitoring user has appropriate permissions (no table scans)
4. Review DMV query performance in SQL Server
5. Use connection pooling to avoid connection overhead

## Monitoring the Receiver Itself

Monitor the SQL Server receiver to ensure reliable telemetry:

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

- `otelcol_receiver_accepted_metric_points`: Successful metric collection
- `otelcol_receiver_refused_metric_points`: Collection failures
- `otelcol_scraper_errored_metric_points`: Scraper errors
- `otelcol_receiver_scraped_metric_points`: Total scraped metrics

## Related Topics

For comprehensive SQL Server and database monitoring:

- [How to Configure the SQL Query Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/sql-query-receiver-opentelemetry-collector/view)
- [How to Configure the Oracle DB Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/oracle-db-receiver-opentelemetry-collector/view)
- [OpenTelemetry Collector: What It Is and When You Need It](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to collect internal metrics from OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)

## Summary

The SQL Server receiver provides comprehensive, out-of-the-box monitoring for Microsoft SQL Server instances. By leveraging SQL Server's rich set of Dynamic Management Views, the receiver automatically collects dozens of critical performance metrics without requiring custom query development.

Configure the receiver with appropriate authentication, enable relevant metrics for your environment, and export data to OneUptime for powerful visualization and alerting. Follow security best practices by creating dedicated monitoring users with minimal permissions and using encrypted connections.

Whether you're monitoring a single instance or a complex multi-instance environment with Availability Groups, the SQL Server receiver scales to meet your observability needs. Start with essential metrics and expand coverage as your monitoring practice matures.

Need a powerful backend for your SQL Server metrics? OneUptime provides native OpenTelemetry support with advanced analytics, alerting, and visualization capabilities for database observability.
