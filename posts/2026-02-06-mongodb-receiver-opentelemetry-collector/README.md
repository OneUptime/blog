# How to Configure the MongoDB Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, MongoDB, NoSQL, Database Monitoring, Metric, Performance

Description: Learn how to configure the MongoDB receiver in OpenTelemetry Collector to monitor NoSQL database performance with practical YAML examples, replication tracking, and sharding metrics.

The MongoDB receiver enables the OpenTelemetry Collector to collect performance metrics directly from MongoDB instances. This receiver provides insights into database operations, collection statistics, connections, and resource utilization, making it essential for maintaining healthy MongoDB deployments at scale.

## Why Monitor MongoDB

MongoDB monitoring helps you understand database performance, identify bottlenecks, and optimize resource allocation. Unlike relational databases, MongoDB's document-based architecture and distributed nature require monitoring specific metrics like collection size, index size, cache behavior, and connection utilization.

The MongoDB receiver collects metrics by connecting to MongoDB instances and querying MongoDB's `serverStatus` and `dbStats` commands. This approach provides real-time metrics without requiring log parsing or external agents.

```mermaid
graph TD
    A[MongoDB Instance] -->|serverStatus| B[MongoDB Receiver]
    A -->|dbStats| B
    B --> C[Metrics Processor]
    C --> D[Resource Detection]
    D --> E[Batch Processor]
    E --> F[OTLP Exporter]
    F --> G[Observability Backend]
```

## Basic Configuration

The minimal configuration requires connection details and credentials:

```yaml
receivers:
  # MongoDB receiver with basic connection
  mongodb:
    # Connection hosts
    # For standalone: hostname:port
    # For replica sets, specify all replica set members and set replica_set
    hosts:
      - endpoint: localhost:27017

    # Authentication credentials
    username: monitoring_user
    password: ${env:MONGODB_PASSWORD}
    auth_source: admin

    # Collection interval (default: 1m)
    collection_interval: 1m

    # TLS configuration
    tls:
      insecure: true

processors:
  # Batch metrics for efficiency
  batch:
    timeout: 30s
    send_batch_size: 100

exporters:
  # Export to stdout for testing
  debug:
    verbosity: normal

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors: [batch]
      exporters: [debug]
```

This configuration connects to a local MongoDB instance and collects metrics every minute. The password is securely read from an environment variable.

## Understanding MongoDB Metrics

The receiver collects comprehensive metrics across multiple categories:

### Connection Metrics

- `mongodb.connection.count`: Number of connections, with `type` values such as `current`, `active`, and `available`
- `mongodb.network.request.count`: Number of requests received by the server

### Operation Metrics

- `mongodb.operation.count`: Operations by type (query, insert, update, delete)
- `mongodb.operation.time`: Operation execution time
- `mongodb.document.operation.count`: Document operations by type
- `mongodb.operation.latency.time`: Operation latency time when explicitly enabled

### Database Metrics

- `mongodb.database.count`: Number of databases
- `mongodb.collection.count`: Number of collections per database
- `mongodb.data.size`: Data size by database
- `mongodb.storage.size`: Storage allocated by database
- `mongodb.object.count`: Number of objects
- `mongodb.index.count`: Number of indexes
- `mongodb.index.size`: Total index size
- `mongodb.index.access.count`: Index access counts

### Replication-Related Metrics

- `mongodb.operation.repl.count`: Replicated operations executed when explicitly enabled
- `mongodb.repl_inserts_per_sec`: Replicated insertions per second when explicitly enabled
- `mongodb.repl_updates_per_sec`: Replicated updates per second when explicitly enabled
- `mongodb.repl_deletes_per_sec`: Replicated deletes per second when explicitly enabled

### Memory and Resource Metrics

- `mongodb.memory.usage`: Memory usage breakdown
- `mongodb.network.io.receive`: Bytes received
- `mongodb.network.io.transmit`: Bytes transmitted
- `mongodb.cursor.count`: Open cursors
- `mongodb.cursor.timeout.count`: Cursors that timed out

### Lock Metrics

- `mongodb.lock.acquire.count`: Lock acquisitions by type
- `mongodb.lock.acquire.wait_count`: Locks that had to wait
- `mongodb.lock.acquire.time`: Time spent acquiring locks
- `mongodb.lock.deadlock.count`: Lock acquisitions that encountered deadlocks

## Advanced Configuration

For production environments, configure comprehensive monitoring with authentication and security:

```yaml
receivers:
  mongodb:
    # Replica set hosts
    hosts:
      - endpoint: mongo1.example.com:27017
      - endpoint: mongo2.example.com:27017
      - endpoint: mongo3.example.com:27017
    replica_set: prod-rs

    # Authentication
    username: otel_monitor
    password: ${env:MONGODB_MONITORING_PASSWORD}
    auth_source: admin

    # Collection interval
    collection_interval: 30s

    # Timeout for MongoDB commands
    timeout: 10s

    # TLS configuration
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: /etc/otel/certs/mongodb-ca.pem
      cert_file: /etc/otel/certs/client-cert.pem
      key_file: /etc/otel/certs/client-key.pem

    # Metric configuration
    metrics:
      # Connection metrics
      mongodb.connection.count:
        enabled: true
      mongodb.network.request.count:
        enabled: true

      # Operation metrics
      mongodb.operation.count:
        enabled: true
      mongodb.operation.time:
        enabled: true
      mongodb.document.operation.count:
        enabled: true
      mongodb.operation.latency.time:
        enabled: true

      # Database metrics
      mongodb.database.count:
        enabled: true
      mongodb.collection.count:
        enabled: true
      mongodb.data.size:
        enabled: true
      mongodb.storage.size:
        enabled: true
      mongodb.index.count:
        enabled: true
      mongodb.index.size:
        enabled: true

      # Replication-related metrics
      mongodb.operation.repl.count:
        enabled: true
      mongodb.repl_inserts_per_sec:
        enabled: true

      # Resource metrics
      mongodb.memory.usage:
        enabled: true
      mongodb.cursor.count:
        enabled: true

      # Lock metrics
      mongodb.lock.acquire.count:
        enabled: true
      mongodb.lock.acquire.wait_count:
        enabled: true
```

## Creating a Monitoring User

Create a dedicated monitoring user with read-only access:

```javascript
// Connect to admin database
use admin

// Create monitoring user with required roles
db.createUser({
  user: "otel_monitor",
  pwd: "secure_password_here",
  roles: [
    // Read-only role for accessing metrics
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})

// Verify user creation
db.getUser("otel_monitor")
```

For more granular control, create a custom role:

```javascript
use admin

// Create custom monitoring role
db.createRole({
  role: "customMonitoring",
  privileges: [
    {
      resource: { cluster: true },
      actions: [
        "serverStatus",
        "listDatabases"
      ]
    },
    {
      resource: { db: "", collection: "" },
      actions: [
        "dbStats",
        "collStats",
        "indexStats",
        "listCollections",
        "listIndexes"
      ]
    }
  ],
  roles: []
})

// Create user with custom role
db.createUser({
  user: "otel_monitor",
  pwd: "secure_password_here",
  roles: [
    { role: "customMonitoring", db: "admin" }
  ]
})
```

## Monitoring Replica Sets

Configure monitoring for MongoDB replica sets by listing the replica set members and setting the replica set name. When `replica_set` is set, the receiver can autodiscover nodes in the replica set:

```yaml
receivers:
  mongodb:
    hosts:
      - endpoint: mongo-primary.example.com:27017
      - endpoint: mongo-secondary.example.com:27017
    replica_set: prod-rs
    username: otel_monitor
    password: ${env:MONGODB_PASSWORD}
    auth_source: admin
    collection_interval: 30s

    # Enable operation and replication-related metrics
    metrics:
      mongodb.operation.count:
        enabled: true
      mongodb.operation.repl.count:
        enabled: true
      mongodb.repl_inserts_per_sec:
        enabled: true

processors:
  # Add cluster information
  resource:
    attributes:
      - key: mongodb.cluster
        value: production-cluster
        action: insert
      - key: mongodb.replica_set
        value: prod-rs
        action: insert

  batch:
    timeout: 30s

exporters:
  otlp:
    endpoint: https://observability.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors: [resource, batch]
      exporters: [otlp]
```

## Monitoring Sharded Clusters

For sharded MongoDB deployments, configure the receiver with the `mongos` router hosts:

```yaml
receivers:
  mongodb:
    hosts:
      - endpoint: mongos-1.example.com:27017
      - endpoint: mongos-2.example.com:27017
    username: otel_monitor
    password: ${env:MONGODB_PASSWORD}
    auth_source: admin
    collection_interval: 30s

processors:
  resource:
    attributes:
      - key: mongodb.cluster
        value: sharded-prod-cluster
        action: insert
      - key: mongodb.component
        value: mongos
        action: insert

  batch:
    timeout: 30s

exporters:
  otlp:
    endpoint: https://observability.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors: [resource, batch]
      exporters: [otlp]
```

## Production Configuration

Here's a complete production-ready configuration with all best practices:

```yaml
receivers:
  mongodb:
    # Connection with all replica set members
    hosts:
      - endpoint: mongo1.prod.example.com:27017
      - endpoint: mongo2.prod.example.com:27017
      - endpoint: mongo3.prod.example.com:27017
    replica_set: prod-rs

    # Authentication
    username: otel_monitoring
    password: ${env:MONGODB_MONITORING_PASSWORD}
    auth_source: admin

    # Collection interval
    collection_interval: 30s

    # Command timeout
    timeout: 15s

    # TLS configuration
    tls:
      insecure: false
      insecure_skip_verify: false
      ca_file: /etc/otel/certs/mongodb-ca.crt
      cert_file: /etc/otel/certs/client.crt
      key_file: /etc/otel/certs/client.key
      min_version: "1.2"

    # Enable comprehensive metrics
    metrics:
      mongodb.connection.count:
        enabled: true
      mongodb.network.request.count:
        enabled: true
      mongodb.operation.count:
        enabled: true
      mongodb.operation.time:
        enabled: true
      mongodb.document.operation.count:
        enabled: true
      mongodb.operation.latency.time:
        enabled: true
      mongodb.database.count:
        enabled: true
      mongodb.collection.count:
        enabled: true
      mongodb.data.size:
        enabled: true
      mongodb.storage.size:
        enabled: true
      mongodb.index.count:
        enabled: true
      mongodb.index.size:
        enabled: true
      mongodb.operation.repl.count:
        enabled: true
      mongodb.repl_inserts_per_sec:
        enabled: true
      mongodb.memory.usage:
        enabled: true
      mongodb.network.io.receive:
        enabled: true
      mongodb.network.io.transmit:
        enabled: true
      mongodb.cursor.count:
        enabled: true
      mongodb.cursor.timeout.count:
        enabled: true
      mongodb.lock.acquire.count:
        enabled: true
      mongodb.lock.acquire.wait_count:
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
      - key: mongodb.cluster.name
        value: prod-mongodb-cluster
        action: insert
      - key: mongodb.cluster.region
        value: us-east-1
        action: insert

  # Filter system databases
  filter/exclude_system:
    error_mode: ignore
    metric_conditions:
      - datapoint.attributes["db.namespace"] == "admin"
      - datapoint.attributes["db.namespace"] == "config"
      - datapoint.attributes["db.namespace"] == "local"

  # Transform metric names
  metricstransform:
    transforms:
      - include: mongodb.connection.count
        action: update
        new_name: mongodb.connections.total

  # Batch processing
  batch:
    timeout: 30s
    send_batch_size: 500

exporters:
  # Primary export
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

  # Prometheus endpoint
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: mongodb
    const_labels:
      cluster: production
      region: us-east-1

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors:
        - memory_limiter
        - resourcedetection
        - resource
        - filter/exclude_system
        - metricstransform
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

## Monitoring MongoDB Atlas

For MongoDB Atlas (managed service), use a similar configuration with Atlas connection strings:

```yaml
receivers:
  mongodb:
    # Atlas SRV host
    hosts:
      - endpoint: cluster0.example.mongodb.net
    scheme: mongodb+srv

    # Atlas credentials
    username: otel_monitor
    password: ${env:ATLAS_PASSWORD}
    auth_source: admin

    # Collection interval
    collection_interval: 60s

    # TLS is required for Atlas
    tls:
      insecure: false

    metrics:
      mongodb.operation.count:
        enabled: true
      mongodb.operation.latency.time:
        enabled: true
      mongodb.data.size:
        enabled: true
      mongodb.index.size:
        enabled: true

processors:
  resource:
    attributes:
      - key: cloud.provider
        value: mongodb_atlas
        action: insert

  batch:
    timeout: 30s

exporters:
  otlp:
    endpoint: https://observability.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors: [resource, batch]
      exporters: [otlp]
```

## Alerting Strategies

Configure alerts for common MongoDB issues:

### High Replicated Operation Rate

Alert on unusually high replicated operation volume when `mongodb.operation.repl.count` is enabled:

```yaml
# Prometheus alert rule using OTLP metric names. If your Prometheus exporter translates
# metric names, adjust the metric selectors to match the exported names.

- alert: MongoDBHighReplicatedOperationRate
  expr: 'rate({__name__="mongodb.operation.repl.count"}[5m]) > 1000'
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB replicated operation rate high on {{ $labels.instance }}"
    description: "Replicated operations: {{ $value }} per second"
```

### Connection Pool Exhaustion

Alert when connections are near limit:

```yaml
- alert: MongoDBHighConnectionUsage
  expr: |
    (
      {__name__="mongodb.connection.count", type="active"} /
      {__name__="mongodb.connection.count", type="current"}
    ) > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB connection pool usage high"
    description: "Connection usage: {{ $value | humanizePercentage }}"
```

### High Index Size

Alert when index size grows beyond an expected threshold:

```yaml
- alert: MongoDBHighIndexSize
  expr: '{__name__="mongodb.index.size"} > 107374182400'
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB index size high"
    description: "Index size: {{ $value | humanize1024 }}B"
```

### High Lock Wait Time

Alert on lock contention:

```yaml
- alert: MongoDBHighLockWaitTime
  expr: |
    rate({__name__="mongodb.lock.acquire.wait_count"}[5m]) /
    rate({__name__="mongodb.lock.acquire.count"}[5m]) > 0.1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High lock contention detected"
```

### Cursor Timeout Rate

Alert on high cursor timeout rate:

```yaml
- alert: MongoDBHighCursorTimeoutRate
  expr: 'rate({__name__="mongodb.cursor.timeout.count"}[5m]) > 10'
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High cursor timeout rate"
    description: "Cursor timeouts: {{ $value }} per second"
```

## Monitoring in Kubernetes

Deploy the collector to monitor MongoDB in Kubernetes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-mongodb-config
  namespace: databases
data:
  config.yaml: |
    receivers:
      mongodb:
        hosts:
          - endpoint: mongodb-service:27017
        username: otel_monitor
        password: ${env:MONGODB_PASSWORD}
        auth_source: admin
        collection_interval: 30s

    processors:
      resource:
        attributes:
          - key: k8s.cluster.name
            value: prod-k8s
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
          receivers: [mongodb]
          processors: [resource, batch]
          exporters: [otlp]

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-mongodb-collector
  namespace: databases
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-mongodb-collector
  template:
    metadata:
      labels:
        app: otel-mongodb-collector
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.153.0
          args: ["--config=/conf/config.yaml"]
          env:
            - name: MONGODB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: monitoring-password
          volumeMounts:
            - name: config
              mountPath: /conf

      volumes:
        - name: config
          configMap:
            name: otel-mongodb-config
```

## Troubleshooting

### Authentication Failures

If the receiver cannot authenticate:

1. Verify username and password are correct
2. Check user has required roles (clusterMonitor)
3. Ensure authentication database is correct (usually admin)
4. Review MongoDB logs for authentication attempts

### Missing Metrics

If expected metrics are missing:

1. Verify MongoDB version supports the metrics (some require 4.0+)
2. Check user permissions allow running admin commands
3. Review metric enable/disable configuration
4. Check collector logs for errors

### High MongoDB Load

If monitoring impacts performance:

1. Increase collection_interval to reduce frequency
2. Monitor a secondary directly when that matches your deployment and permissions
3. Reduce number of enabled metrics
4. Ensure proper indexes on system collections

## Integration with OneUptime

Configure the collector to send MongoDB metrics to OneUptime:

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
      receivers: [mongodb]
      processors: [batch]
      exporters: [otlp]
```

OneUptime provides MongoDB-specific dashboards and intelligent alerting for NoSQL workloads. For monitoring other databases, see our guides on [PostgreSQL receiver](https://oneuptime.com/blog/post/2026-02-06-postgresql-receiver-opentelemetry-collector/view) and [MySQL receiver](https://oneuptime.com/blog/post/2026-02-06-mysql-receiver-opentelemetry-collector/view).

## Conclusion

The MongoDB receiver provides comprehensive monitoring for MongoDB deployments through the OpenTelemetry Collector. By collecting metrics on operations, collections, indexes, connections, and resource usage, you gain visibility into MongoDB performance and health.

Start with basic configuration for standalone instances, then expand to monitor replica sets and sharded clusters as your architecture grows. Use the collected metrics to optimize queries, tune resource allocation, and maintain healthy MongoDB operations at scale.

For monitoring MongoDB in containerized environments, combine this receiver with the [Docker Stats receiver](https://oneuptime.com/blog/post/2026-02-06-docker-stats-receiver-opentelemetry-collector/view). To monitor cache layers alongside MongoDB, explore our guide on the [Redis receiver](https://oneuptime.com/blog/post/2026-02-06-redis-receiver-opentelemetry-collector/view).
