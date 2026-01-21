# How to Scale Loki for High Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Scaling, High Volume, Horizontal Scaling, Sharding, Performance

Description: A comprehensive guide to scaling Grafana Loki for high-volume log ingestion, covering horizontal scaling strategies, component sizing, sharding configuration, and performance optimization for production deployments.

---

As log volume grows, scaling Loki becomes essential for maintaining performance and reliability. This guide covers strategies for scaling Loki to handle millions of log lines per second while maintaining query performance.

## Prerequisites

Before starting, ensure you have:

- Loki deployed in microservices or simple scalable mode
- Kubernetes cluster with auto-scaling capabilities
- Object storage configured (S3, GCS, Azure Blob)
- Understanding of Loki's architecture

## Understanding Loki Scaling

### Component Scaling

| Component | Scaling Strategy | Key Metric |
|-----------|------------------|------------|
| Distributor | Horizontal | Ingestion rate |
| Ingester | Horizontal | Memory usage, streams |
| Querier | Horizontal | Query load |
| Query Frontend | Horizontal | Concurrent queries |
| Compactor | Single instance | Storage size |

### Bottleneck Identification

```promql
# Ingestion rate
sum(rate(loki_distributor_bytes_received_total[5m]))

# Write latency
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route="/loki/api/v1/push"}[5m])) by (le))

# Query latency
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))
```

## Horizontal Scaling Configuration

### Distributor Scaling

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-distributor
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: distributor
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loki-distributor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loki-distributor
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Ingester Scaling

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-ingester
spec:
  replicas: 6
  podManagementPolicy: Parallel
  template:
    spec:
      containers:
        - name: ingester
          resources:
            requests:
              cpu: 1000m
              memory: 4Gi
            limits:
              cpu: 4000m
              memory: 8Gi
          volumeMounts:
            - name: data
              mountPath: /loki
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

### Querier Scaling

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-querier
spec:
  replicas: 10
  template:
    spec:
      containers:
        - name: querier
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 4000m
              memory: 8Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loki-querier-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loki-querier
  minReplicas: 5
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## Loki Configuration for Scale

### High-Volume Configuration

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  grpc_server_max_recv_msg_size: 104857600  # 100MB
  grpc_server_max_send_msg_size: 104857600

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: memberlist

distributor:
  ring:
    kvstore:
      store: memberlist

ingester:
  lifecycler:
    ring:
      kvstore:
        store: memberlist
      replication_factor: 3
    num_tokens: 512
    heartbeat_period: 5s
  chunk_idle_period: 30m
  chunk_block_size: 262144
  chunk_retain_period: 1m
  max_transfer_retries: 0
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 8GB

limits_config:
  ingestion_rate_mb: 64
  ingestion_burst_size_mb: 128
  max_streams_per_user: 100000
  max_global_streams_per_user: 500000
  per_stream_rate_limit: 10MB
  per_stream_rate_limit_burst: 50MB
  max_query_parallelism: 64
  max_query_series: 5000
  max_entries_limit_per_query: 50000

query_scheduler:
  max_outstanding_requests_per_tenant: 4096

query_frontend:
  max_outstanding_per_tenant: 4096
  compress_responses: true
  log_queries_longer_than: 10s

querier:
  max_concurrent: 32
  query_ingesters_within: 3h
```

### Sharding Configuration

```yaml
# Enable query sharding for parallel execution
query_range:
  parallelise_shardable_queries: true
  split_queries_by_interval: 30m

frontend:
  max_outstanding_per_tenant: 2048
  compress_responses: true

# TSDB sharding
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: s3
```

## Read Path Optimization

### Query Frontend Configuration

```yaml
query_frontend:
  max_outstanding_per_tenant: 4096
  compress_responses: true
  tail_proxy_url: http://loki-querier:3100

  # Query scheduling
  scheduler_address: loki-query-scheduler:9095

query_scheduler:
  max_outstanding_requests_per_tenant: 4096
  grpc_client_config:
    max_send_msg_size: 104857600
```

### Caching

```yaml
# Memcached for chunk cache
chunk_store_config:
  chunk_cache_config:
    memcached:
      batch_size: 256
      parallelism: 10
    memcached_client:
      host: memcached.loki.svc
      service: memcache
      timeout: 500ms

# Results cache
query_range:
  cache_results: true
  results_cache:
    cache:
      memcached_client:
        host: memcached.loki.svc
        service: memcache
        timeout: 500ms

# Index cache
storage_config:
  index_queries_cache_config:
    memcached:
      batch_size: 256
      parallelism: 10
    memcached_client:
      host: memcached.loki.svc
      service: memcache
```

### Memcached Deployment

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: memcached
  namespace: loki
spec:
  serviceName: memcached
  replicas: 3
  selector:
    matchLabels:
      app: memcached
  template:
    metadata:
      labels:
        app: memcached
    spec:
      containers:
        - name: memcached
          image: memcached:1.6
          args:
            - -m 4096
            - -I 5m
            - -c 16384
          ports:
            - containerPort: 11211
          resources:
            requests:
              cpu: 500m
              memory: 4Gi
            limits:
              cpu: 2000m
              memory: 5Gi
```

## Write Path Optimization

### Ingester Tuning

```yaml
ingester:
  chunk_idle_period: 30m
  chunk_block_size: 262144  # 256KB
  chunk_encoding: snappy
  chunk_target_size: 1572864  # 1.5MB
  max_chunk_age: 2h

  # WAL settings for durability
  wal:
    enabled: true
    dir: /loki/wal
    replay_memory_ceiling: 8GB
    flush_on_shutdown: true
```

### Distributor Tuning

```yaml
distributor:
  ring:
    kvstore:
      store: memberlist

limits_config:
  enforce_metric_name: false
  ingestion_rate_mb: 64
  ingestion_burst_size_mb: 128
  per_stream_rate_limit: 10MB
  per_stream_rate_limit_burst: 50MB
```

## Multi-Zone Deployment

### Zone-Aware Replication

```yaml
common:
  replication_factor: 3
  ring:
    zone_awareness_enabled: true

ingester:
  lifecycler:
    ring:
      replication_factor: 3
    availability_zone: ${ZONE}  # Set from environment
```

### Kubernetes Zone Configuration

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-ingester-zone-a
spec:
  replicas: 2
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
      containers:
        - name: ingester
          env:
            - name: ZONE
              value: "zone-a"
```

## Monitoring and Alerting

### Key Scaling Metrics

```promql
# Ingestion rate per distributor
sum by (pod) (rate(loki_distributor_bytes_received_total[5m])) / 1024 / 1024

# Ingester memory pressure
sum by (pod) (loki_ingester_memory_chunks) * 100 / sum by (pod) (loki_ingester_chunks_stored_total)

# Query queue depth
loki_query_scheduler_queue_length

# Cache hit rate
sum(rate(loki_cache_hits_total[5m])) / sum(rate(loki_cache_requests_total[5m]))
```

### Scaling Alerts

```yaml
groups:
  - name: loki-scaling
    rules:
      - alert: LokiIngestionHigh
        expr: |
          sum(rate(loki_distributor_bytes_received_total[5m])) / 1024 / 1024 > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High ingestion rate - consider scaling"

      - alert: LokiQueryQueueHigh
        expr: |
          loki_query_scheduler_queue_length > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Query queue building up - scale queriers"

      - alert: LokiIngesterMemoryHigh
        expr: |
          sum by (pod) (container_memory_usage_bytes{container="ingester"})
          /
          sum by (pod) (container_spec_memory_limit_bytes{container="ingester"})
          > 0.85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Ingester memory usage high"
```

## Capacity Planning

### Sizing Guidelines

| Volume | Distributors | Ingesters | Queriers | Memory/Ingester |
|--------|--------------|-----------|----------|-----------------|
| 100 GB/day | 2 | 3 | 3 | 4 GB |
| 500 GB/day | 3 | 6 | 6 | 8 GB |
| 1 TB/day | 5 | 10 | 10 | 16 GB |
| 5 TB/day | 10 | 20 | 20 | 32 GB |

### Formula-Based Sizing

```
Ingesters = (Daily Volume GB / 100) * Replication Factor
Queriers = Concurrent Queries / 10
Distributors = Ingesters / 3
```

## Best Practices

### Scaling Do's

1. Scale ingesters for write capacity
2. Scale queriers for read capacity
3. Use caching aggressively
4. Monitor before scaling
5. Use auto-scaling for variable loads

### Scaling Don'ts

1. Don't scale compactor horizontally
2. Don't ignore memory limits
3. Don't skip WAL configuration
4. Don't overlook network bandwidth

## Conclusion

Scaling Loki requires understanding component responsibilities and bottlenecks. Key takeaways:

- Scale distributors for ingestion throughput
- Scale ingesters for stream capacity and memory
- Scale queriers for query parallelism
- Enable caching for read performance
- Use auto-scaling for variable workloads
- Monitor metrics to guide scaling decisions

With proper scaling configuration, Loki can handle petabytes of logs while maintaining query performance.
