# How to Configure the MySQL Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, MySQL, Database Monitoring, Metric, Performance

Description: Complete guide to configuring the MySQL receiver in OpenTelemetry Collector for database performance monitoring with practical YAML examples and optimization strategies.

The MySQL receiver enables the OpenTelemetry Collector to collect performance metrics directly from MySQL and MariaDB databases. This receiver provides critical insights into database operations, query performance, buffer pool efficiency, and replication health, helping you maintain optimal database performance and reliability.

## Understanding MySQL Monitoring

MySQL monitoring is essential for identifying performance bottlenecks, optimizing resource usage, and preventing downtime. The MySQL receiver collects metrics by querying MySQL's performance schema and status variables, providing real-time visibility into database operations without requiring external tools or log parsing.

Key metrics include query execution rates, connection usage, buffer pool activity, InnoDB statistics, and replication lag. These metrics help you understand database behavior under load and make informed decisions about scaling, query optimization, and configuration tuning.

```mermaid
graph TD
    A[MySQL Database] -->|Status Variables| B[MySQL Receiver]
    A -->|Performance Schema| B
    B --> C[Metrics Processor]
    C --> D[Resource Detection]
    D --> E[Batch Processor]
    E --> F[OTLP Exporter]
    F --> G[Observability Backend]

    A1[SHOW GLOBAL STATUS] --> B
    A2[SHOW REPLICA STATUS / SHOW SLAVE STATUS] --> B
    A3[InnoDB Metrics] --> B
```

## Basic Configuration

The simplest configuration requires database connection details:

```yaml
receivers:
  # MySQL receiver with basic connection
  mysql:
    # Database connection endpoint
    endpoint: localhost:3306

    # Database credentials
    username: monitoring_user
    password: ${env:MYSQL_PASSWORD}

    # Database name (optional; omit to collect metrics for all databases)
    database: mysql

    # Collection interval (default: 10s)
    collection_interval: 10s

    # Transport protocol (default: tcp)
    transport: tcp

processors:
  # Batch metrics for efficiency
  batch:
    timeout: 10s
    send_batch_size: 100

exporters:
  # Export to stdout for testing
  debug:
    verbosity: basic

service:
  pipelines:
    metrics:
      receivers: [mysql]
      processors: [batch]
      exporters: [debug]
```

This configuration connects to a local MySQL instance and collects default metrics every 10 seconds. The password is securely read from an environment variable.

## Key MySQL Metrics

The receiver collects comprehensive metrics organized by functional area:

### Connection Metrics

- `mysql.connection.count`: Number of connection attempts
- `mysql.connection.errors`: Connection errors by type
- `mysql.threads`: Thread counts by state, including connected and running
- `mysql.max_used_connections`: Maximum number of simultaneous connections since startup

### Query Performance

- `mysql.query.count`: Total statements executed
- `mysql.query.client.count`: Statements sent by clients
- `mysql.query.slow.count`: Number of slow queries
- `mysql.commands`: Command execution counts by type
- `mysql.locks`: Table locks by kind, including immediate and waited

### Buffer Pool Metrics

- `mysql.buffer_pool.pages`: Buffer pool page statistics
- `mysql.buffer_pool.data_pages`: Number of data pages
- `mysql.buffer_pool.operations`: Buffer pool read/write operations
- `mysql.buffer_pool.page_flushes`: Pages flushed from buffer pool
- `mysql.buffer_pool.limit`: Configured buffer pool size
- `mysql.buffer_pool.usage`: Buffer pool usage in bytes

### InnoDB Metrics

- `mysql.operations`: InnoDB read, write, and fsync operations
- `mysql.row_locks`: Row lock statistics
- `mysql.row_operations`: Row-level operations
- `mysql.log_operations`: Log write operations

### Replication Metrics

- `mysql.replica.time_behind_source`: Seconds behind source server
- `mysql.replica.sql_delay`: SQL thread delay

## Advanced Configuration

For production environments, configure comprehensive monitoring with security:

```yaml
receivers:
  mysql:
    endpoint: mysql-primary.example.com:3306
    username: otel_monitor
    password: ${env:MYSQL_MONITORING_PASSWORD}
    database: information_schema

    # Collection interval
    collection_interval: 30s

    # TLS configuration for secure connection
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: /etc/otel/certs/mysql-ca.pem
      cert_file: /etc/otel/certs/client-cert.pem
      key_file: /etc/otel/certs/client-key.pem

    # Metric configuration
    metrics:
      # Connection metrics
      mysql.connection.count:
        enabled: true
      mysql.connection.errors:
        enabled: true
      mysql.threads:
        enabled: true

      # Query metrics
      mysql.query.count:
        enabled: true
      mysql.query.client.count:
        enabled: true
      mysql.query.slow.count:
        enabled: true

      # Buffer pool metrics
      mysql.buffer_pool.pages:
        enabled: true
      mysql.buffer_pool.operations:
        enabled: true
      mysql.buffer_pool.data_pages:
        enabled: true

      # InnoDB metrics
      mysql.operations:
        enabled: true
      mysql.row_locks:
        enabled: true
      mysql.row_operations:
        enabled: true

      # Replication metrics
      mysql.replica.time_behind_source:
        enabled: true
```

## Creating a Monitoring User

Create a dedicated monitoring user with minimal required privileges:

```sql
-- Create monitoring user with restricted access
CREATE USER 'otel_monitor'@'%' IDENTIFIED BY 'secure_password_here';

-- Grant necessary privileges for metrics collection
GRANT SELECT ON performance_schema.* TO 'otel_monitor'@'%';
GRANT SELECT ON information_schema.* TO 'otel_monitor'@'%';

-- Grant PROCESS privilege to view connection statistics
GRANT PROCESS ON *.* TO 'otel_monitor'@'%';

-- Grant REPLICATION CLIENT to collect replication metrics
GRANT REPLICATION CLIENT ON *.* TO 'otel_monitor'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify privileges
SHOW GRANTS FOR 'otel_monitor'@'%';
```

For enhanced security, restrict the monitoring user to specific hosts:

```sql
-- Create user for specific collector host
CREATE USER 'otel_monitor'@'collector.example.com' IDENTIFIED BY 'secure_password';

-- Grant same privileges as above
GRANT SELECT ON performance_schema.* TO 'otel_monitor'@'collector.example.com';
GRANT SELECT ON information_schema.* TO 'otel_monitor'@'collector.example.com';
GRANT PROCESS ON *.* TO 'otel_monitor'@'collector.example.com';
GRANT REPLICATION CLIENT ON *.* TO 'otel_monitor'@'collector.example.com';

FLUSH PRIVILEGES;
```

## Monitoring Replication

For MySQL replication topologies, monitor both source and replica servers:

```yaml
receivers:
  # Source server monitoring
  mysql/source:
    endpoint: mysql-source.example.com:3306
    username: otel_monitor
    password: ${env:MYSQL_PASSWORD}
    collection_interval: 30s

    # Enable replication source metrics
    metrics:
      mysql.connection.count:
        enabled: true
      mysql.threads:
        enabled: true
      mysql.buffer_pool.operations:
        enabled: true
      mysql.row_operations:
        enabled: true

  # Replica server monitoring
  mysql/replica:
    endpoint: mysql-replica.example.com:3306
    username: otel_monitor
    password: ${env:MYSQL_PASSWORD}
    collection_interval: 30s

    # Enable replication lag metrics
    metrics:
      mysql.replica.time_behind_source:
        enabled: true
      mysql.replica.sql_delay:
        enabled: true
      mysql.threads:
        enabled: true

processors:
  # Add cluster information
  resource:
    attributes:
      - key: mysql.cluster
        value: production-cluster
        action: insert
      - key: datacenter
        value: us-east-1
        action: insert

  batch:
    timeout: 30s

exporters:
  otlp:
    endpoint: https://observability.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [mysql/source, mysql/replica]
      processors: [resource, batch]
      exporters: [otlp]
```

## Statement and Table Metrics

Collect detailed statement and table metrics using the receiver's supported metric configuration:

```yaml
receivers:
  mysql:
    endpoint: localhost:3306
    username: otel_monitor
    password: ${env:MYSQL_PASSWORD}

    # Configure statement event metrics
    statement_events:
      digest_text_limit: 120
      time_limit: 24h
      limit: 250

    metrics:
      # Monitor table sizes and row counts
      mysql.table.rows:
        enabled: true
      mysql.table.size:
        enabled: true
      mysql.table.average_row_length:
        enabled: true

      # Monitor summarized statement events
      mysql.statement_event.count:
        enabled: true
      mysql.statement_event.wait.time:
        enabled: true

    # Monitor active queries as log events
    events:
      db.server.query_sample:
        enabled: true
```

## Production Configuration

Here's a complete production-ready configuration:

```yaml
receivers:
  mysql:
    endpoint: mysql.prod.example.com:3306
    transport: tcp
    username: otel_monitoring
    password: ${env:MYSQL_MONITORING_PASSWORD}
    database: information_schema

    # Production collection interval
    collection_interval: 30s

    # TLS configuration
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: /etc/otel/certs/mysql-ca.crt
      cert_file: /etc/otel/certs/client.crt
      key_file: /etc/otel/certs/client.key
      min_version: "1.2"

    # Enable comprehensive metrics
    metrics:
      mysql.connection.count:
        enabled: true
      mysql.connection.errors:
        enabled: true
      mysql.threads:
        enabled: true
      mysql.query.count:
        enabled: true
      mysql.query.client.count:
        enabled: true
      mysql.query.slow.count:
        enabled: true
      mysql.locks:
        enabled: true
      mysql.buffer_pool.pages:
        enabled: true
      mysql.buffer_pool.operations:
        enabled: true
      mysql.buffer_pool.data_pages:
        enabled: true
      mysql.operations:
        enabled: true
      mysql.row_locks:
        enabled: true
      mysql.row_operations:
        enabled: true
      mysql.replica.time_behind_source:
        enabled: true

processors:
  # Memory limiter
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Resource detection
  resourcedetection:
    detectors: [env, system]
    timeout: 5s

  # Add custom attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: mysql.cluster.name
        value: prod-mysql-cluster
        action: insert
      - key: mysql.cluster.region
        value: us-east-1
        action: insert

  # Filter out test databases
  filter/exclude_test:
    error_mode: ignore
    metric_conditions:
      - 'resource.attributes["mysql.database.name"] != nil and IsMatch(resource.attributes["mysql.database.name"], "^test_.*")'

  # Transform metric names
  metrics_transform:
    transforms:
      - include: mysql.threads
        action: update
        new_name: mysql.threads.by_state

  # Batch processing
  batch:
    timeout: 30s
    send_batch_size: 500

exporters:
  # Primary export to observability platform
  otlp:
    endpoint: https://observability.example.com:4317
    headers:
      api-key: ${env:OBSERVABILITY_API_KEY}
    compression: gzip
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

  # Local Prometheus endpoint
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: mysql
    const_labels:
      cluster: production
      region: us-east-1

service:
  pipelines:
    metrics:
      receivers: [mysql]
      processors:
        - memory_limiter
        - resourcedetection
        - resource
        - filter/exclude_test
        - metrics_transform
        - batch
      exporters: [otlp, prometheus]

  # Collector telemetry
  telemetry:
    logs:
      level: info
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
```

## Monitoring MySQL in Kubernetes

Deploy the collector as a sidecar to monitor MySQL in Kubernetes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: databases
data:
  config.yaml: |
    receivers:
      mysql:
        endpoint: localhost:3306
        username: otel_monitor
        password: ${env:MYSQL_PASSWORD}
        collection_interval: 30s

    processors:
      resource:
        attributes:
          - key: k8s.cluster.name
            value: prod-cluster
            action: insert
          - key: k8s.namespace.name
            value: databases
            action: insert

      batch:
        timeout: 30s

    exporters:
      otlp:
        endpoint: otel-gateway.monitoring.svc.cluster.local:4317

    service:
      pipelines:
        metrics:
          receivers: [mysql]
          processors: [resource, batch]
          exporters: [otlp]

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-with-monitoring
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        # MySQL container
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: root-password

        # OpenTelemetry Collector sidecar
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/conf/config.yaml"]
          env:
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: monitoring-password
          volumeMounts:
            - name: otel-config
              mountPath: /conf

      volumes:
        - name: otel-config
          configMap:
            name: otel-collector-config
```

## Alerting Strategies

Set up alerts for common MySQL issues:

### High Connection Usage

Alert when the number of connected threads exceeds your expected threshold:

```yaml
# Prometheus alert rule

- alert: MySQLHighConnectionUsage
  expr: |
    mysql_threads{kind="connected"} > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MySQL connection usage high on {{ $labels.instance }}"
    description: "Connected threads: {{ $value }}"
```

### High Buffer Pool Reads

Alert on sustained physical reads from the buffer pool:

```yaml
- alert: MySQLHighBufferPoolReads
  expr: rate(mysql_buffer_pool_operations{operation="reads"}[5m]) > 100
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "MySQL buffer pool physical reads high"
    description: "Buffer pool physical reads are {{ $value }} per second"
```

### Replication Lag

Alert on excessive replication delay:

```yaml
- alert: MySQLReplicationLag
  expr: mysql_replica_time_behind_source > 60
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "MySQL replication lag on {{ $labels.instance }}"
    description: "Replication is {{ $value }} seconds behind source"
```

### Slow Queries

Alert on increasing slow query rate:

```yaml
- alert: MySQLHighSlowQueryRate
  expr: rate(mysql_query_slow_count[5m]) > 10
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High slow query rate on {{ $labels.instance }}"
    description: "Slow queries: {{ $value }} per second"
```

### Table Lock Waits

Alert on high table lock contention:

```yaml
- alert: MySQLTableLockContention
  expr: |
    rate(mysql_locks{kind="waited"}[5m]) /
    rate(mysql_locks{kind="immediate"}[5m]) > 0.1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High table lock contention"
```

## Troubleshooting

### Connection Issues

If the receiver cannot connect:

1. Verify MySQL is listening on the configured endpoint
2. Check firewall rules allow traffic from collector
3. Validate credentials and user privileges
4. Review TLS configuration if using encrypted connections

### Missing Metrics

If expected metrics are not appearing:

1. Ensure monitoring user has required privileges (PROCESS, REPLICATION CLIENT)
2. Verify performance_schema is enabled: `SHOW VARIABLES LIKE 'performance_schema'`
3. Check metric enable/disable configuration
4. Review collector logs for permission errors

### High MySQL Load

If monitoring causes performance issues:

1. Increase collection_interval to reduce query frequency
2. Disable optional high-cardinality statement and table metrics
3. Ensure indexes exist on queried columns
4. Review slow query log for monitoring queries

## Integration with OneUptime

Configure the collector to send MySQL metrics to OneUptime:

```yaml
exporters:
  otlp:
    endpoint: https://opentelemetry-collector.oneuptime.com:4317
    headers:
      x-oneuptime-token: ${env:ONEUPTIME_API_KEY}
    compression: gzip

service:
  pipelines:
    metrics:
      receivers: [mysql]
      processors: [batch]
      exporters: [otlp]
```

OneUptime automatically creates MySQL dashboards with query performance analytics, replication monitoring, and intelligent alerting. For monitoring other databases, see our guides on [PostgreSQL receiver](https://oneuptime.com/blog/post/2026-02-06-postgresql-receiver-opentelemetry-collector/view) and [MongoDB receiver](https://oneuptime.com/blog/post/2026-02-06-mongodb-receiver-opentelemetry-collector/view).

## Conclusion

The MySQL receiver provides comprehensive database monitoring through the OpenTelemetry Collector. By collecting metrics on connections, queries, buffer pool efficiency, and replication, you gain complete visibility into MySQL performance and health.

Start with basic configuration to establish baseline metrics, then add statement event metrics, replication monitoring, and advanced filtering as your needs evolve. Use the collected metrics to optimize queries, tune configuration parameters, and maintain healthy MySQL operations.

For monitoring MySQL in containerized environments, combine this receiver with the [Docker Stats receiver](https://oneuptime.com/blog/post/2026-02-06-docker-stats-receiver-opentelemetry-collector/view) for complete infrastructure visibility.
