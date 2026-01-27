# How to Use Grafana Mimir for Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Mimir, Metrics, Prometheus, Observability, Time-Series, Multi-Tenancy, Kubernetes, Scalability, Remote Write, Query Federation

Description: A comprehensive guide to deploying and using Grafana Mimir for scalable, long-term metrics storage with Prometheus-compatible APIs, multi-tenancy, and query federation.

---

> Grafana Mimir transforms Prometheus from a single-node metrics store into a horizontally scalable, multi-tenant, long-term storage solution without changing your existing instrumentation or queries.

Prometheus is the de facto standard for metrics collection in cloud-native environments. However, as your infrastructure grows, single-node Prometheus hits limits: storage capacity, query performance, and retention windows. Grafana Mimir solves these challenges by providing a distributed, horizontally scalable metrics backend that speaks native PromQL.

This guide covers everything you need to deploy Mimir, configure Prometheus remote write, enable multi-tenancy, federate queries across clusters, and scale your metrics infrastructure effectively.

---

## Mimir Architecture

Grafana Mimir is built on a microservices architecture with several key components that can run independently or combined into a single binary.

### Core Components

| Component | Responsibility |
|-----------|---------------|
| **Distributor** | Receives incoming samples via remote write, validates them, and forwards to ingesters |
| **Ingester** | Batches samples in memory, creates compressed blocks, and uploads to long-term storage |
| **Querier** | Executes PromQL queries by fetching data from ingesters (recent) and storage (historical) |
| **Query Frontend** | Splits and caches queries for better performance and deduplication |
| **Store Gateway** | Serves historical data from object storage for queries |
| **Compactor** | Merges and deduplicates blocks in object storage |
| **Ruler** | Evaluates recording and alerting rules |
| **Alertmanager** | Handles alert routing and notifications |

### Data Flow

```
Prometheus --[remote_write]--> Distributor --> Ingester --> Object Storage
                                                    |
                              Query Frontend --> Querier --> Store Gateway
```

Samples flow through the write path (distributor, ingester) while queries flow through the read path (query frontend, querier, store gateway). Object storage (S3, GCS, Azure Blob, or MinIO) serves as the durable backend for long-term retention.

---

## Deployment Modes

Mimir supports three deployment modes based on your scale and operational requirements.

### Monolithic Mode

All components run in a single process. Ideal for development, testing, or small-scale deployments handling up to 1 million active series.

```yaml
# mimir-monolithic.yaml
# Single binary deployment for small-scale environments
# Suitable for development and testing (up to 1M active series)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mimir
  template:
    metadata:
      labels:
        app: mimir
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            # Run all components in single process
            - -target=all
            # Configuration file path
            - -config.file=/etc/mimir/mimir.yaml
          ports:
            # HTTP API and UI
            - containerPort: 8080
              name: http
            # gRPC for internal communication
            - containerPort: 9095
              name: grpc
          volumeMounts:
            - name: config
              mountPath: /etc/mimir
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
      volumes:
        - name: config
          configMap:
            name: mimir-config
        - name: data
          persistentVolumeClaim:
            claimName: mimir-data
```

### Read-Write Mode

Separates read and write paths for independent scaling. Write path handles ingestion while read path handles queries.

```yaml
# mimir-read-write.yaml
# Separated read and write paths for independent scaling
# Write path: distributor + ingester
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-write
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mimir-write
  template:
    metadata:
      labels:
        app: mimir-write
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            # Write path components only
            - -target=write
            - -config.file=/etc/mimir/mimir.yaml
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9095
              name: grpc
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
---
# Read path: query-frontend + querier + store-gateway
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-read
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mimir-read
  template:
    metadata:
      labels:
        app: mimir-read
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            # Read path components only
            - -target=read
            - -config.file=/etc/mimir/mimir.yaml
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9095
              name: grpc
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
```

### Microservices Mode

Each component runs as a separate deployment for maximum scalability and fine-grained resource control. Recommended for large-scale production (10M+ active series).

```yaml
# mimir-microservices.yaml
# Full microservices deployment for large-scale production
# Each component scales independently

# Distributor - receives remote write requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-distributor
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mimir-distributor
  template:
    metadata:
      labels:
        app: mimir-distributor
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            - -target=distributor
            - -config.file=/etc/mimir/mimir.yaml
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
---
# Ingester - batches samples and creates blocks
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir-ingester
  namespace: monitoring
spec:
  serviceName: mimir-ingester
  replicas: 3
  selector:
    matchLabels:
      app: mimir-ingester
  template:
    metadata:
      labels:
        app: mimir-ingester
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            - -target=ingester
            - -config.file=/etc/mimir/mimir.yaml
          resources:
            requests:
              cpu: "1"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "16Gi"
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
---
# Querier - executes PromQL queries
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mimir-querier
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mimir-querier
  template:
    metadata:
      labels:
        app: mimir-querier
    spec:
      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            - -target=querier
            - -config.file=/etc/mimir/mimir.yaml
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
```

---

## Configuring Prometheus Remote Write

Remote write sends metrics from Prometheus to Mimir for long-term storage. Configure your existing Prometheus instances to forward samples.

### Basic Remote Write Configuration

```yaml
# prometheus.yaml
# Configure Prometheus to send metrics to Mimir
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  # External labels are attached to all metrics sent via remote write
  external_labels:
    cluster: production-us-east-1
    environment: production

# Remote write configuration for Mimir
remote_write:
  # Mimir distributor endpoint
  - url: http://mimir-distributor.monitoring.svc:8080/api/v1/push

    # Tenant ID header for multi-tenancy
    # All metrics from this Prometheus go to this tenant
    headers:
      X-Scope-OrgID: team-platform

    # Queue configuration for reliability
    queue_config:
      # Maximum samples per send
      max_samples_per_send: 1000
      # Batch send timeout
      batch_send_deadline: 5s
      # Maximum retry backoff
      max_backoff: 5s
      # Number of shards (parallel senders)
      max_shards: 200
      # Capacity of each shard
      capacity: 2500

    # Retry on temporary failures
    write_relabel_configs:
      # Drop high-cardinality metrics that cause issues
      - source_labels: [__name__]
        regex: go_gc_.*
        action: drop

# Your existing scrape configs remain unchanged
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
```

### Remote Write with Authentication

```yaml
# prometheus-auth.yaml
# Remote write with various authentication methods
remote_write:
  # Basic authentication
  - url: https://mimir.example.com/api/v1/push
    basic_auth:
      username: prometheus
      password_file: /etc/prometheus/mimir-password
    headers:
      X-Scope-OrgID: team-platform

    # TLS configuration
    tls_config:
      ca_file: /etc/prometheus/ca.crt
      cert_file: /etc/prometheus/client.crt
      key_file: /etc/prometheus/client.key
      insecure_skip_verify: false

---
# Alternative: Bearer token authentication
remote_write:
  - url: https://mimir.example.com/api/v1/push
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/mimir-token
    headers:
      X-Scope-OrgID: team-platform
```

### Mimir Configuration for Receiving Remote Write

```yaml
# mimir-config.yaml
# Core Mimir configuration
# Store this in a ConfigMap and mount to Mimir pods

# Target components to run (use 'all' for monolithic)
target: all

# Multi-tenancy configuration
multitenancy_enabled: true

# Server configuration
server:
  http_listen_port: 8080
  grpc_listen_port: 9095
  log_level: info

# Distributor configuration
distributor:
  # Hash ring for distributing samples to ingesters
  ring:
    kvstore:
      store: memberlist

# Ingester configuration
ingester:
  ring:
    # Replication factor for durability
    replication_factor: 3
    kvstore:
      store: memberlist
  # How long to retain samples in memory before flushing
  max_chunk_age: 2h

# Long-term storage backend (S3 example)
blocks_storage:
  backend: s3
  s3:
    endpoint: s3.amazonaws.com
    bucket_name: mimir-metrics-prod
    region: us-east-1
    # Use IAM role for authentication (recommended)
    # Or specify access_key_id and secret_access_key
  bucket_store:
    # Sync interval for discovering new blocks
    sync_interval: 15m
  tsdb:
    # Directory for local block storage before upload
    dir: /data/tsdb

# Query configuration
querier:
  # Query recent data from ingesters
  query_ingesters_within: 13h

# Store gateway configuration
store_gateway:
  sharding_ring:
    replication_factor: 3

# Compactor configuration
compactor:
  data_dir: /data/compactor
  sharding_ring:
    kvstore:
      store: memberlist

# Limits configuration (per-tenant defaults)
limits:
  # Maximum active series per tenant
  max_global_series_per_user: 1500000
  # Ingestion rate limit (samples/second)
  ingestion_rate: 100000
  # Maximum label names per series
  max_label_names_per_series: 30
  # Maximum query lookback
  max_query_lookback: 31d
  # Retention period
  compactor_blocks_retention_period: 365d

# Memberlist for component discovery
memberlist:
  join_members:
    - mimir-memberlist.monitoring.svc:7946
```

---

## Multi-Tenancy

Mimir provides native multi-tenancy, allowing multiple teams or customers to share infrastructure while maintaining isolation.

### Tenant Configuration

```yaml
# mimir-runtime-config.yaml
# Per-tenant overrides
# This file is loaded at runtime and can be updated without restart

overrides:
  # Team with high ingestion needs
  team-platform:
    max_global_series_per_user: 5000000
    ingestion_rate: 500000
    ingestion_burst_size: 1000000
    max_label_names_per_series: 50
    max_query_lookback: 90d
    compactor_blocks_retention_period: 730d

  # Standard team limits
  team-backend:
    max_global_series_per_user: 1000000
    ingestion_rate: 100000
    ingestion_burst_size: 200000
    max_query_lookback: 30d
    compactor_blocks_retention_period: 365d

  # Development environment with lower limits
  team-dev:
    max_global_series_per_user: 100000
    ingestion_rate: 10000
    max_query_lookback: 7d
    compactor_blocks_retention_period: 30d
```

### Configuring Runtime Overrides

```yaml
# mimir-config.yaml (additional section)
# Enable runtime configuration for dynamic per-tenant limits
runtime_config:
  # Path to runtime config file
  file: /etc/mimir/runtime-config.yaml
  # How often to reload the file
  period: 10s
```

### Tenant Header in Requests

Every request to Mimir must include a tenant identifier:

```bash
# Writing metrics (from Prometheus or direct push)
curl -X POST \
  -H "X-Scope-OrgID: team-platform" \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @samples.pb \
  http://mimir-distributor:8080/api/v1/push

# Querying metrics
curl -H "X-Scope-OrgID: team-platform" \
  "http://mimir-query-frontend:8080/prometheus/api/v1/query?query=up"

# Multiple tenants in one query (federation)
curl -H "X-Scope-OrgID: team-platform|team-backend" \
  "http://mimir-query-frontend:8080/prometheus/api/v1/query?query=up"
```

### Grafana Data Source Configuration

```yaml
# grafana-datasource.yaml
# Configure Grafana to query Mimir with tenant header
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  mimir.yaml: |
    apiVersion: 1
    datasources:
      - name: Mimir-Platform
        type: prometheus
        url: http://mimir-query-frontend.monitoring.svc:8080/prometheus
        access: proxy
        isDefault: true
        jsonData:
          httpMethod: POST
          # Custom header for tenant ID
          httpHeaderName1: X-Scope-OrgID
        secureJsonData:
          httpHeaderValue1: team-platform
```

---

## Query Federation

Query federation allows you to query metrics across multiple Mimir clusters or combine data from different sources.

### Cross-Cluster Federation

```yaml
# mimir-federation.yaml
# Query frontend configuration for federation
# Useful when running multiple Mimir clusters across regions

# Primary cluster configuration
server:
  http_listen_port: 8080

frontend:
  # Cache query results
  results_cache:
    backend: memcached
    memcached:
      addresses: memcached.monitoring.svc:11211
      timeout: 500ms

  # Split queries by time interval for parallelism
  split_queries_by_interval: 24h

  # Align queries to time boundaries
  align_queries_with_step: true

# Federation targets (other Mimir clusters)
# This is typically handled at the application/proxy level
```

### Prometheus Federation from Mimir

```yaml
# prometheus-federate.yaml
# Pull aggregated metrics from Mimir into another Prometheus
# Useful for global views or edge-to-central architectures

scrape_configs:
  # Federate from Mimir
  - job_name: mimir-federation
    honor_labels: true
    metrics_path: /prometheus/federate
    params:
      # Select specific metrics to federate
      match[]:
        - '{job=~".+"}'
        - 'up'
        - 'node_cpu_seconds_total'
        - 'http_requests_total'
    static_configs:
      - targets:
          - mimir-query-frontend.monitoring.svc:8080
    # Include tenant header
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/mimir-token
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_tenant
        replacement: team-platform
```

### Recording Rules for Cross-Tenant Aggregation

```yaml
# mimir-ruler-config.yaml
# Recording rules evaluated by Mimir Ruler
# Aggregate metrics across services for dashboards

groups:
  - name: aggregations
    interval: 1m
    rules:
      # Aggregate request rates across all services
      - record: cluster:http_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (cluster, environment)

      # Calculate error rate percentage
      - record: cluster:http_error_rate:ratio
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (cluster)
          /
          sum(rate(http_requests_total[5m])) by (cluster)

      # P99 latency aggregation
      - record: cluster:http_latency:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, cluster)
          )

  - name: alerts
    rules:
      - alert: HighErrorRate
        expr: cluster:http_error_rate:ratio > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in cluster {{ $labels.cluster }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

### Ruler Configuration

```yaml
# mimir-config.yaml (ruler section)
ruler:
  # Enable the ruler component
  enable_api: true

  # Storage for rule files
  rule_path: /data/rules

  # How to store rule configurations
  storage:
    type: local
    local:
      directory: /etc/mimir/rules

  # Evaluation configuration
  evaluation_interval: 1m

  # Alertmanager configuration
  alertmanager_url: http://alertmanager.monitoring.svc:9093

  ring:
    kvstore:
      store: memberlist
```

---

## Scaling

Mimir scales horizontally by adding more instances of each component. Understanding capacity planning helps you scale efficiently.

### Capacity Planning Guidelines

| Metric | Small (< 1M series) | Medium (1-10M series) | Large (> 10M series) |
|--------|--------------------|-----------------------|---------------------|
| Deployment mode | Monolithic | Read-Write | Microservices |
| Distributors | 1 | 3 | 5+ |
| Ingesters | 1 | 3 | 6+ |
| Queriers | 1 | 2 | 4+ |
| Store Gateways | 0 | 2 | 3+ |
| Memory per ingester | 2GB | 8GB | 16GB+ |

### Horizontal Pod Autoscaler

```yaml
# mimir-hpa.yaml
# Autoscale Mimir components based on load

# Distributor HPA - scale based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mimir-distributor-hpa
  namespace: monitoring
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mimir-distributor
  minReplicas: 2
  maxReplicas: 10
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on incoming request rate
    - type: Pods
      pods:
        metric:
          name: cortex_distributor_received_samples_total
        target:
          type: AverageValue
          averageValue: "100000"
---
# Querier HPA - scale based on query load
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mimir-querier-hpa
  namespace: monitoring
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mimir-querier
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

### Ingester Scaling

Ingesters are stateful and require careful scaling to avoid data loss.

```yaml
# mimir-ingester-scaling.yaml
# StatefulSet with proper scaling configuration
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mimir-ingester
  namespace: monitoring
spec:
  serviceName: mimir-ingester
  # Scale ingesters carefully - use zone awareness
  replicas: 6
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: mimir-ingester
  template:
    metadata:
      labels:
        app: mimir-ingester
    spec:
      # Anti-affinity to spread across nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: mimir-ingester
              topologyKey: kubernetes.io/hostname

      # Termination grace period for safe shutdown
      terminationGracePeriodSeconds: 1200

      containers:
        - name: mimir
          image: grafana/mimir:2.11.0
          args:
            - -target=ingester
            - -config.file=/etc/mimir/mimir.yaml

          # Lifecycle hooks for graceful shutdown
          lifecycle:
            preStop:
              httpGet:
                path: /ingester/shutdown
                port: 8080

          # Probes for health checking
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 10

          livenessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 120
            periodSeconds: 30

          resources:
            requests:
              cpu: "2"
              memory: "8Gi"
            limits:
              cpu: "4"
              memory: "16Gi"
```

### Zone-Aware Replication

```yaml
# mimir-config.yaml (zone awareness section)
# Distribute replicas across availability zones for resilience

ingester:
  ring:
    replication_factor: 3
    # Enable zone awareness
    zone_awareness_enabled: true
    kvstore:
      store: memberlist

# Set zone via environment variable in pod spec
# containers:
#   - name: mimir
#     env:
#       - name: AVAILABILITY_ZONE
#         valueFrom:
#           fieldRef:
#             fieldPath: metadata.labels['topology.kubernetes.io/zone']
#     args:
#       - -ingester.ring.instance-availability-zone=$(AVAILABILITY_ZONE)
```

---

## Best Practices Summary

### Deployment

- Start with monolithic mode for simplicity, migrate to microservices as you scale
- Use StatefulSets for ingesters with persistent volumes
- Deploy at least 3 ingesters with replication factor 3 for production
- Enable zone-aware replication across availability zones
- Set appropriate termination grace periods (20+ minutes for ingesters)

### Configuration

- Set per-tenant limits to prevent noisy neighbors
- Configure query timeouts and max samples to protect queriers
- Use recording rules to pre-aggregate expensive queries
- Enable query result caching with memcached or Redis

### Remote Write

- Configure appropriate queue sizes and shard counts based on cardinality
- Use write relabeling to drop unnecessary metrics at the source
- Monitor remote write lag and error rates
- Set up multiple remote write endpoints for redundancy

### Monitoring Mimir Itself

- Deploy Mimir dashboards from the Grafana Mimir mixin
- Alert on ingestion lag, query errors, and component health
- Monitor object storage latency and error rates
- Track per-tenant usage for capacity planning

### Cost Optimization

- Use lifecycle policies on object storage to tier old data
- Configure appropriate retention periods per tenant
- Use downsampling for long-term historical data
- Monitor and optimize query patterns to reduce resource usage

---

## Conclusion

Grafana Mimir provides a production-ready solution for scaling Prometheus metrics to millions of active series with long-term retention. Its native multi-tenancy, Prometheus compatibility, and flexible deployment modes make it suitable for organizations of any size.

Key takeaways:

1. **Start simple** - Monolithic mode works well for getting started
2. **Plan for growth** - Microservices mode enables horizontal scaling
3. **Leverage multi-tenancy** - Isolate teams while sharing infrastructure
4. **Use recording rules** - Pre-compute expensive aggregations
5. **Monitor your metrics system** - Mimir provides extensive self-instrumentation

For a complete observability stack that integrates metrics, logs, traces, and alerting, check out [OneUptime](https://oneuptime.com). OneUptime provides a unified platform for monitoring, incident management, and status pages - helping you maintain reliability across your entire infrastructure.
