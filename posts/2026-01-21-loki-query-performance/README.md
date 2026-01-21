# How to Tune Loki Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Query Performance, Optimization, Caching, Query Frontend, Tuning

Description: A comprehensive guide to tuning Grafana Loki query performance, covering query frontend configuration, caching strategies, query optimization techniques, and performance troubleshooting.

---

Query performance is critical for a good Loki experience. Slow queries frustrate users and can indicate inefficient resource usage. This guide covers techniques for optimizing Loki query performance.

## Prerequisites

Before starting, ensure you have:

- Loki deployed with query frontend
- Prometheus monitoring Loki metrics
- Understanding of your query patterns
- Access to modify Loki configuration

## Understanding Query Performance

### Query Path

```
Grafana -> Query Frontend -> Query Scheduler -> Querier -> Object Storage
                |                                  |
            Split/Cache                        Fetch/Filter
```

### Key Metrics

```promql
# Query latency
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))

# Query throughput
sum(rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*"}[5m]))

# Queue time
histogram_quantile(0.99, sum(rate(loki_query_scheduler_queue_duration_seconds_bucket[5m])) by (le))
```

## Query Frontend Configuration

### Basic Configuration

```yaml
query_frontend:
  max_outstanding_per_tenant: 2048
  compress_responses: true
  log_queries_longer_than: 10s

query_range:
  parallelise_shardable_queries: true
  split_queries_by_interval: 30m
  align_queries_with_step: true
  max_retries: 5
  cache_results: true
```

### Query Splitting

```yaml
query_range:
  # Split queries into smaller time ranges
  split_queries_by_interval: 15m

  # For very large queries
  # split_queries_by_interval: 5m

frontend:
  # Maximum query length before splitting
  max_query_length: 12h
```

### Query Parallelization

```yaml
query_range:
  parallelise_shardable_queries: true

limits_config:
  max_query_parallelism: 32

querier:
  max_concurrent: 20
```

## Caching Configuration

### Results Cache

```yaml
query_range:
  cache_results: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 1024
        ttl: 1h

# Or with Memcached
query_range:
  cache_results: true
  results_cache:
    cache:
      memcached_client:
        host: memcached.loki.svc
        service: memcache
        timeout: 500ms
        max_idle_conns: 100
```

### Chunk Cache

```yaml
chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 2048
      ttl: 24h

# Or with Memcached
chunk_store_config:
  chunk_cache_config:
    memcached:
      batch_size: 256
      parallelism: 10
    memcached_client:
      host: memcached-chunks.loki.svc
      service: memcache
```

### Index Cache

```yaml
storage_config:
  index_queries_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 512
      ttl: 24h
```

### Cache Sizing

```yaml
# For 1TB daily ingestion
chunk_cache: 4GB
results_cache: 1GB
index_cache: 512MB

# For 10TB daily ingestion
chunk_cache: 16GB
results_cache: 4GB
index_cache: 2GB
```

## Memcached Deployment

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: memcached
  namespace: loki
spec:
  serviceName: memcached
  replicas: 3
  template:
    spec:
      containers:
        - name: memcached
          image: memcached:1.6
          args:
            - -m 8192      # 8GB memory
            - -I 5m        # 5MB max item size
            - -c 16384     # Max connections
            - -t 4         # Threads
          ports:
            - containerPort: 11211
          resources:
            requests:
              cpu: 1000m
              memory: 8Gi
            limits:
              memory: 9Gi
```

## Query Optimization

### Efficient LogQL

```logql
# Good - specific stream selector
{job="nginx", env="production"} |= "error"

# Bad - broad selector
{job=~".*"} |= "error"
```

### Filter Before Parse

```logql
# Good - filter first
{job="app"} |= "error" | json

# Less efficient - parse everything
{job="app"} | json | level = "error"
```

### Use Label Matchers

```logql
# Good - use indexed labels
{job="app", level="error"}

# Less efficient - filter in pipeline
{job="app"} | level = "error"
```

### Limit Time Range

```logql
# Query smaller time windows
# In Grafana, use shorter time ranges

# Use range queries efficiently
sum(rate({job="app"} |= "error" [5m]))
```

## Querier Configuration

### Concurrency Settings

```yaml
querier:
  max_concurrent: 20
  query_ingesters_within: 3h

limits_config:
  max_query_parallelism: 32
  max_query_series: 5000
  max_entries_limit_per_query: 10000
  max_query_length: 721h  # 30 days
```

### Memory Management

```yaml
querier:
  # Limit memory per query
  max_concurrent: 10  # Reduce if OOM

limits_config:
  # Limit result size
  max_entries_limit_per_query: 5000

server:
  grpc_server_max_recv_msg_size: 104857600  # 100MB
```

## Query Scheduler

### Configuration

```yaml
query_scheduler:
  max_outstanding_requests_per_tenant: 2048
  grpc_client_config:
    max_send_msg_size: 104857600

frontend_worker:
  scheduler_address: loki-query-scheduler:9095
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-query-scheduler
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: scheduler
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
```

## Performance Monitoring

### Key Metrics Dashboard

```promql
# P99 query latency
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))

# Cache hit rate
sum(rate(loki_cache_hits_total[5m])) / sum(rate(loki_cache_request_total[5m]))

# Query queue depth
loki_query_scheduler_queue_length

# Querier resource usage
sum by (pod) (container_memory_usage_bytes{container="querier"})
```

### Alerts

```yaml
groups:
  - name: loki-query-performance
    rules:
      - alert: LokiSlowQueries
        expr: |
          histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le)) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 query latency over 30s"

      - alert: LokiQueryQueueHigh
        expr: loki_query_scheduler_queue_length > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Query queue backing up"

      - alert: LokiLowCacheHitRate
        expr: |
          sum(rate(loki_cache_hits_total[5m])) / sum(rate(loki_cache_request_total[5m])) < 0.5
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate below 50%"
```

## Troubleshooting Slow Queries

### Identify Slow Queries

```yaml
query_frontend:
  log_queries_longer_than: 10s
```

```bash
# Check logs for slow queries
kubectl logs -n loki loki-query-frontend | grep "slow query"
```

### Query Profiling

```bash
# Get query stats
curl -G "http://loki:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="app"}' \
  -H "X-Query-Tags: explain=true"
```

### Common Issues

#### 1. Large Result Sets

```yaml
limits_config:
  max_entries_limit_per_query: 5000  # Reduce if needed
```

#### 2. Wide Time Ranges

```yaml
query_range:
  split_queries_by_interval: 15m  # Split into smaller chunks
```

#### 3. High Cardinality Labels

```logql
# Avoid high-cardinality in selectors
# Bad: {request_id="abc123"}
# Good: {job="app"} |= "request_id=abc123"
```

#### 4. Missing Indexes

```yaml
# Ensure TSDB is configured
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
```

## Complete Optimized Configuration

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  grpc_server_max_recv_msg_size: 104857600
  grpc_server_max_send_msg_size: 104857600

query_frontend:
  max_outstanding_per_tenant: 4096
  compress_responses: true
  log_queries_longer_than: 10s
  scheduler_address: loki-query-scheduler:9095

query_scheduler:
  max_outstanding_requests_per_tenant: 4096

query_range:
  parallelise_shardable_queries: true
  split_queries_by_interval: 30m
  align_queries_with_step: true
  max_retries: 5
  cache_results: true
  results_cache:
    cache:
      memcached_client:
        host: memcached.loki.svc
        service: memcache
        timeout: 500ms

querier:
  max_concurrent: 20
  query_ingesters_within: 3h

chunk_store_config:
  chunk_cache_config:
    memcached:
      batch_size: 256
      parallelism: 10
    memcached_client:
      host: memcached-chunks.loki.svc
      service: memcache

storage_config:
  index_queries_cache_config:
    memcached:
      batch_size: 256
      parallelism: 10
    memcached_client:
      host: memcached-index.loki.svc
      service: memcache

limits_config:
  max_query_parallelism: 32
  max_query_series: 5000
  max_entries_limit_per_query: 10000
  max_query_length: 721h
```

## Best Practices

### Query Writing

1. Use specific stream selectors
2. Filter before parsing
3. Limit time ranges
4. Use line filters before regex

### Infrastructure

1. Deploy query frontend and scheduler
2. Enable and size caching appropriately
3. Monitor query performance
4. Scale queriers based on load

### Configuration

1. Split queries by interval
2. Enable parallel queries
3. Set appropriate limits
4. Log slow queries

## Conclusion

Query performance optimization requires attention to both configuration and query patterns. Key takeaways:

- Use query frontend with splitting and caching
- Deploy Memcached for large-scale caching
- Write efficient LogQL queries
- Monitor query performance metrics
- Set appropriate limits
- Scale queriers based on load

With proper tuning, Loki can provide sub-second query responses even for large datasets.
