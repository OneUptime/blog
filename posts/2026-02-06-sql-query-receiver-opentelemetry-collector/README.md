# How to Configure the SQL Query Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, SQL, Database Monitoring, Metrics, Observability

Description: Learn how to configure the SQL Query receiver in OpenTelemetry Collector to monitor any SQL database through custom queries, track performance metrics, and export database telemetry to your observability backend.

The SQL Query receiver is one of the most flexible receivers in the OpenTelemetry Collector ecosystem. Unlike database-specific receivers that are limited to particular database types, the SQL Query receiver works with any SQL-compliant database. This makes it invaluable when you need custom metrics from databases that don't have dedicated receivers, or when you want to track business-specific metrics stored in your database.

## What is the SQL Query Receiver?

The SQL Query receiver executes SQL queries against a database at regular intervals and converts the results into OpenTelemetry metrics. It supports any database with a SQL driver, including PostgreSQL, MySQL, Microsoft SQL Server, Oracle, SQLite, and more. The receiver is particularly useful for:

- Monitoring custom business metrics stored in databases
- Tracking table row counts and growth rates
- Measuring query execution times
- Monitoring data freshness and staleness
- Collecting application-specific metrics that live in your database

Unlike specialized database receivers that collect system-level metrics through database APIs, the SQL Query receiver gives you complete control over what data to collect by writing your own SQL queries.

## How the SQL Query Receiver Works

The receiver operates on a simple polling model. At configured intervals, it executes your SQL queries against the target database, parses the results, and converts them into OpenTelemetry metrics. The flow looks like this:

```mermaid
graph LR
    A[SQL Query Receiver] -->|Execute Query| B[(Database)]
    B -->|Return Results| A
    A -->|Convert to Metrics| C[Processors]
    C -->|Process & Batch| D[Exporters]
    D -->|Send Telemetry| E[OneUptime/Backend]
```

Each query result row becomes one or more metric data points. You define the metric name, type, and attributes through the receiver configuration.

## Basic Configuration

The SQL Query receiver requires three main components: database connection details, queries to execute, and metric definitions. Here's a minimal working configuration:

```yaml
# Receivers section - defines how telemetry enters the Collector
receivers:
  # SQL Query receiver for custom database monitoring
  sqlquery:
    # Database driver - supported: postgres, mysql, sqlserver, oracle, sqlite
    driver: postgres

    # Data Source Name (DSN) - connection string for your database
    # Format varies by driver (see driver-specific sections below)
    datasource: "host=localhost port=5432 user=monitor password=secret dbname=production sslmode=disable"

    # Queries to execute - each query generates metrics
    queries:
      # Query name - used for logging and debugging
      - sql: "SELECT COUNT(*) as user_count FROM users WHERE active = true"
        # Metrics generated from this query
        metrics:
          # Metric name in OpenTelemetry format
          - metric_name: database.users.active.count
            # Metric type: gauge (point-in-time value) or sum (cumulative)
            value_type: int
            # Column name from query result containing the metric value
            value_column: "user_count"
            # Description for the metric
            description: "Number of active users in the database"
            # Metric unit
            unit: "users"

# Processors - transform and batch the collected metrics
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

# Service section - wire everything together into pipelines
service:
  pipelines:
    # Metrics pipeline
    metrics:
      receivers: [sqlquery]
      processors: [batch]
      exporters: [otlphttp]
```

This configuration connects to a PostgreSQL database and tracks the number of active users. The query runs at the default interval (10 seconds), and results are exported to OneUptime.

## Database-Specific Configuration

Each database type requires a specific driver and DSN format. Here are examples for common databases:

### PostgreSQL

```yaml
receivers:
  sqlquery:
    driver: postgres
    # PostgreSQL DSN format
    # host=hostname port=5432 user=username password=password dbname=database sslmode=disable
    datasource: "host=postgres.example.com port=5432 user=monitor password=secure123 dbname=myapp sslmode=require"

    queries:
      - sql: |
          SELECT
            schemaname,
            COUNT(*) as table_count
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          GROUP BY schemaname
        metrics:
          - metric_name: postgres.schema.table.count
            value_type: int
            value_column: "table_count"
            # Attributes from query columns - creates labeled metrics
            attribute_columns: ["schemaname"]
```

### MySQL

```yaml
receivers:
  sqlquery:
    driver: mysql
    # MySQL DSN format
    # username:password@tcp(hostname:port)/database
    datasource: "monitor:secure123@tcp(mysql.example.com:3306)/myapp"

    queries:
      - sql: |
          SELECT
            table_schema as db_name,
            SUM(data_length + index_length) as size_bytes
          FROM information_schema.tables
          WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
          GROUP BY table_schema
        metrics:
          - metric_name: mysql.database.size.bytes
            value_type: int
            value_column: "size_bytes"
            attribute_columns: ["db_name"]
            unit: "bytes"
```

### Microsoft SQL Server

```yaml
receivers:
  sqlquery:
    driver: sqlserver
    # SQL Server DSN format
    # sqlserver://username:password@hostname:port?database=dbname
    datasource: "sqlserver://monitor:secure123@sqlserver.example.com:1433?database=myapp"

    queries:
      - sql: |
          SELECT
            DB_NAME() as database_name,
            COUNT(*) as connection_count
          FROM sys.dm_exec_connections
        metrics:
          - metric_name: sqlserver.connections.active
            value_type: int
            value_column: "connection_count"
            attribute_columns: ["database_name"]
```

## Advanced Configuration: Multiple Queries and Scheduling

In production, you'll typically run multiple queries with different collection intervals. Here's a comprehensive example:

```yaml
receivers:
  sqlquery:
    driver: postgres
    datasource: "host=prod-db.internal port=5432 user=monitor password=${DB_PASSWORD} dbname=production sslmode=require"

    # Collection interval - how often to execute queries (default: 10s)
    collection_interval: 30s

    queries:
      # Fast-changing metric: active sessions (collect frequently)
      - sql: |
          SELECT COUNT(*) as session_count
          FROM pg_stat_activity
          WHERE state = 'active'
        # Override collection interval for this specific query
        collection_interval: 5s
        metrics:
          - metric_name: postgres.sessions.active
            value_type: int
            value_column: "session_count"
            description: "Number of active database sessions"

      # Table-level metrics with labels
      - sql: |
          SELECT
            schemaname,
            tablename,
            n_live_tup as row_count,
            n_dead_tup as dead_rows
          FROM pg_stat_user_tables
        metrics:
          # Multiple metrics from one query
          - metric_name: postgres.table.rows.live
            value_type: int
            value_column: "row_count"
            attribute_columns: ["schemaname", "tablename"]
          - metric_name: postgres.table.rows.dead
            value_type: int
            value_column: "dead_rows"
            attribute_columns: ["schemaname", "tablename"]

      # Business metric: orders processed per hour
      - sql: |
          SELECT
            COUNT(*) as order_count,
            SUM(total_amount) as revenue,
            AVG(total_amount) as avg_order_value
          FROM orders
          WHERE created_at > NOW() - INTERVAL '1 hour'
            AND status = 'completed'
        collection_interval: 60s
        metrics:
          - metric_name: business.orders.hourly.count
            value_type: int
            value_column: "order_count"
          - metric_name: business.revenue.hourly
            value_type: double
            value_column: "revenue"
            unit: "USD"
          - metric_name: business.order.average_value
            value_type: double
            value_column: "avg_order_value"
            unit: "USD"
```

This configuration demonstrates several important patterns:

1. **Global and per-query intervals**: The receiver has a default 30s interval, but individual queries override it as needed
2. **Multiple metrics from one query**: The table stats query produces two metrics efficiently
3. **Business metrics**: Track domain-specific KPIs directly from your database
4. **Attribute columns**: Add labels to metrics for filtering and grouping

## Production Configuration with Resilience

In production environments, you need to handle connection failures, timeouts, and protect against slow queries. Here's a production-ready configuration:

```yaml
receivers:
  sqlquery:
    driver: postgres
    datasource: "host=prod-db.internal port=5432 user=monitor password=${DB_PASSWORD} dbname=production sslmode=require connect_timeout=5"

    collection_interval: 30s

    # Connection pool settings - reuse connections for efficiency
    max_open_connections: 5
    max_idle_connections: 2

    # Timeout for query execution - prevents hanging on slow queries
    query_timeout: 10s

    queries:
      - sql: |
          SELECT
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_orders
          FROM orders
          WHERE created_at > NOW() - INTERVAL '5 minutes'
        metrics:
          - metric_name: orders.recent.total
            value_type: int
            value_column: "total_orders"
          - metric_name: orders.recent.pending
            value_type: int
            value_column: "pending_orders"
          - metric_name: orders.recent.failed
            value_type: int
            value_column: "failed_orders"

# Add resource detection to tag metrics with host information
processors:
  # Detect and add resource attributes (hostname, cloud provider, etc.)
  resourcedetection:
    detectors: [env, system, docker]

  # Batch metrics for efficient export
  batch:
    timeout: 10s
    send_batch_size: 100

  # Add custom attributes to all metrics
  attributes:
    actions:
      - key: environment
        value: production
        action: insert
      - key: database.type
        value: postgresql
        action: insert

exporters:
  # Export to OneUptime
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    # Retry on failures
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    metrics:
      receivers: [sqlquery]
      processors: [resourcedetection, attributes, batch]
      exporters: [otlphttp]
```

## Monitoring Query Performance

The SQL Query receiver itself emits internal metrics about query execution. Enable these to monitor the health of your monitoring:

```yaml
# Enable Collector internal metrics
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

Key metrics to watch:

- `otelcol_receiver_accepted_metric_points`: Number of metrics successfully collected
- `otelcol_receiver_refused_metric_points`: Metrics rejected due to errors
- `otelcol_exporter_send_failed_metric_points`: Metrics that failed to export

## Common Use Cases

### Track Data Freshness

Monitor when data was last updated to catch stale data issues:

```yaml
queries:
  - sql: |
      SELECT
        table_name,
        EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) as seconds_since_update
      FROM (
        SELECT 'users' as table_name, MAX(updated_at) as updated_at FROM users
        UNION ALL
        SELECT 'orders', MAX(updated_at) FROM orders
        UNION ALL
        SELECT 'products', MAX(updated_at) FROM products
      ) t
      GROUP BY table_name
    metrics:
      - metric_name: database.table.staleness.seconds
        value_type: double
        value_column: "seconds_since_update"
        attribute_columns: ["table_name"]
        unit: "seconds"
```

### Monitor Queue Depths

Track job queues or message backlogs:

```yaml
queries:
  - sql: |
      SELECT
        queue_name,
        COUNT(*) as pending_count,
        MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) as oldest_job_age
      FROM job_queue
      WHERE status = 'pending'
      GROUP BY queue_name
    metrics:
      - metric_name: queue.jobs.pending
        value_type: int
        value_column: "pending_count"
        attribute_columns: ["queue_name"]
      - metric_name: queue.oldest_job.age.seconds
        value_type: double
        value_column: "oldest_job_age"
        attribute_columns: ["queue_name"]
        unit: "seconds"
```

### Track SLA Compliance

Monitor if you're meeting service level objectives:

```yaml
queries:
  - sql: |
      SELECT
        COUNT(*) FILTER (WHERE response_time_ms <= 200) * 100.0 / COUNT(*) as success_rate,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency
      FROM api_requests
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    metrics:
      - metric_name: api.sla.success_rate.percent
        value_type: double
        value_column: "success_rate"
        unit: "percent"
      - metric_name: api.latency.p95.milliseconds
        value_type: double
        value_column: "p95_latency"
        unit: "milliseconds"
```

## Security Best Practices

When configuring the SQL Query receiver, follow these security guidelines:

1. **Use dedicated monitoring users**: Create database users with read-only access
2. **Store credentials securely**: Use environment variables, never hardcode passwords
3. **Limit query scope**: Only grant access to necessary tables and views
4. **Use SSL/TLS**: Always enable encrypted connections in production
5. **Set query timeouts**: Prevent resource exhaustion from slow queries
6. **Monitor failed queries**: Alert on authentication failures or permission errors

Example read-only PostgreSQL user setup:

```sql
-- Create monitoring user with minimal permissions
CREATE USER monitor WITH PASSWORD 'secure_password';

-- Grant connect permission
GRANT CONNECT ON DATABASE production TO monitor;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO monitor;

-- Grant select only on specific tables
GRANT SELECT ON users, orders, products TO monitor;

-- Or grant select on all tables in schema (for broader monitoring)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;

-- For PostgreSQL system metrics, grant pg_monitor role
GRANT pg_monitor TO monitor;
```

## Troubleshooting

### Connection Failures

If the receiver can't connect to the database:

1. Verify the DSN format matches your database driver
2. Check network connectivity and firewall rules
3. Confirm credentials and user permissions
4. Enable debug logging to see connection errors:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

### Missing Metrics

If queries run but metrics don't appear:

1. Check column names match exactly (including case)
2. Verify value columns contain numeric data
3. Ensure queries return at least one row
4. Look for processor errors in Collector logs

### Performance Issues

If queries are slow or timing out:

1. Add indexes to queried columns
2. Reduce collection intervals for expensive queries
3. Optimize SQL queries with EXPLAIN ANALYZE
4. Consider creating materialized views for complex metrics
5. Increase query_timeout if legitimate queries need more time

## Related Topics

For more information about OpenTelemetry Collector receivers and database monitoring:

- [OpenTelemetry Collector: What It Is and When You Need It](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
- [How to Configure the SQL Server Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/sql-server-receiver-opentelemetry-collector/view)
- [How to Configure the Oracle DB Receiver in OpenTelemetry Collector](https://oneuptime.com/blog/post/oracle-db-receiver-opentelemetry-collector/view)
- [How to collect internal metrics from OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)

## Summary

The SQL Query receiver provides unmatched flexibility for database monitoring. By writing custom SQL queries, you can collect exactly the metrics your team needs, whether that's system-level database stats, business KPIs, or application-specific measurements. The receiver works with any SQL database and integrates seamlessly into OpenTelemetry pipelines.

Start with simple queries to monitor basic metrics, then expand to track business-critical data as your observability practice matures. Remember to follow security best practices, optimize query performance, and monitor the receiver itself to ensure reliable telemetry collection.

Need a backend for your database metrics? OneUptime natively supports OpenTelemetry and provides powerful visualization and alerting for all your database telemetry.
