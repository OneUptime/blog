# How to Troubleshoot Loki Query Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Troubleshooting, Query Performance, Timeout, LogQL, Optimization

Description: A comprehensive guide to diagnosing and resolving Loki query timeout issues, covering query optimization, configuration tuning, resource scaling, and caching strategies for faster log queries.

---

Query timeouts in Grafana Loki occur when queries take longer than the configured timeout period to complete. This can be frustrating when trying to search logs or load dashboards. This guide helps you understand why timeouts happen and provides practical solutions to resolve them.

## Understanding Query Timeouts

### Error Messages

```
context deadline exceeded
query timeout reached
rpc error: code = DeadlineExceeded
Error: Query timeout
```

### Common Causes

1. **Large time ranges**: Querying months of data
2. **High cardinality queries**: Scanning many streams
3. **Complex regex patterns**: CPU-intensive pattern matching
4. **Missing indexes**: Full scans instead of indexed lookups
5. **Resource constraints**: Insufficient CPU/memory for queriers
6. **Network issues**: Slow storage backend access
7. **Inefficient LogQL**: Non-optimized query patterns

## Diagnostic Steps

### Check Query Metrics

```bash
# Query duration metrics
curl -s http://loki:3100/metrics | grep "loki_request_duration"

# Query frontend queue length
curl -s http://loki:3100/metrics | grep "loki_query_frontend"

# Querier busy time
curl -s http://loki:3100/metrics | grep "loki_querier"
```

### Prometheus Queries for Diagnosis

```promql
# P99 query latency
histogram_quantile(0.99,
  rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])
)

# Slow queries (>30s)
sum(rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*"}[5m]))
* on() group_left
histogram_quantile(0.95, rate(loki_request_duration_seconds_bucket[5m])) > 30

# Query frontend queue time
histogram_quantile(0.99,
  rate(loki_query_frontend_queue_duration_seconds_bucket[5m])
)
```

### Check Loki Logs

```bash
# Find timeout errors
docker logs loki 2>&1 | grep -i "timeout\|deadline\|exceeded"

# Find slow queries
docker logs loki 2>&1 | grep -i "slow query"
```

## Configuration Solutions

### Increase Query Timeout

```yaml
# loki-config.yaml
limits_config:
  # Maximum query execution time
  query_timeout: 5m  # Default: 1m

  # Maximum time for a single query to be processed
  max_query_length: 721h  # 30 days

server:
  # HTTP server timeout
  http_server_read_timeout: 5m
  http_server_write_timeout: 5m

  # gRPC timeout
  grpc_server_max_recv_msg_size: 104857600  # 100MB
  grpc_server_max_send_msg_size: 104857600

querier:
  # Query timeout for querier
  query_timeout: 5m

  # Engine timeout
  engine:
    timeout: 5m

frontend:
  # Frontend timeout
  downstream_url: http://querier:3100
```

### Configure Query Splitting

```yaml
# loki-config.yaml
query_range:
  # Split queries into smaller intervals
  split_queries_by_interval: 1h

  # Maximum retries for split queries
  max_retries: 5

  # Enable parallelization
  parallelise_shardable_queries: true

  # Cache configuration
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 1000
        ttl: 24h
```

### Query Frontend Configuration

```yaml
# loki-config.yaml
frontend:
  # Maximum outstanding requests
  max_outstanding_per_tenant: 2048

  # Compress responses
  compress_responses: true

  # Log queries
  log_queries_longer_than: 10s

query_scheduler:
  # Maximum outstanding requests
  max_outstanding_requests_per_tenant: 2048

  # Use scheduler for query distribution
  use_scheduler_ring: true
```

## Query Optimization

### Optimize Label Selectors

```logql
# Slow: Full scan
{job=~".*"}

# Fast: Specific label selector
{job="api-server", namespace="production"}

# Slow: Regex on high-cardinality label
{pod=~"api-.*"}

# Fast: Exact match when possible
{pod="api-server-7b9c4d5f8-abc12"}
```

### Use Filters Early

```logql
# Slow: Parse then filter
{job="app"} | json | level="error"

# Fast: Filter before parsing
{job="app"} |= "error" | json | level="error"

# Slow: Multiple regex filters
{job="app"} |~ "error" |~ "timeout" |~ "database"

# Fast: Combined filter
{job="app"} |~ "error.*(timeout|database)"
```

### Limit Results

```logql
# Add explicit limits
{job="app"} | json | level="error" | limit 1000

# Use line_format to reduce data transfer
{job="app"} | json | line_format "{{.timestamp}}: {{.message}}"
```

### Reduce Time Ranges

```logql
# Instead of querying 30 days
{job="app"} [30d]

# Query shorter periods
{job="app"} [1h]

# For aggregations, use appropriate windows
sum by (service) (rate({job="app"} |= "error" [5m]))
```

### Avoid Expensive Operations

```logql
# Expensive: Complex regex
{job="app"} |~ "(?i).*error.*(?:timeout|connection).*(?:database|redis).*"

# Better: Structured filtering
{job="app"} | json | level="error" | error_type=~"timeout|connection" | service=~"database|redis"

# Expensive: Unwrap on every line
{job="app"} | json | unwrap duration [5m]

# Better: Filter first
{job="app"} | json | level="error" | unwrap duration [5m]
```

## Caching Strategies

### Enable Query Result Caching

```yaml
# loki-config.yaml
query_range:
  cache_results: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 2000
        ttl: 24h

  # Cache only queries longer than threshold
  cache_results_for_unaligned_queries: true
```

### External Cache (Redis/Memcached)

```yaml
# loki-config.yaml
query_range:
  results_cache:
    cache:
      redis:
        endpoint: redis:6379
        timeout: 500ms
        expiration: 24h
        db: 0
        pool_size: 100

# Or Memcached
query_range:
  results_cache:
    cache:
      memcached:
        addresses: "memcached:11211"
        timeout: 500ms
        max_idle_conns: 100
```

### Index Cache

```yaml
# loki-config.yaml
storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    cache_ttl: 24h

  index_cache_validity: 5m

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 500
```

## Scaling Solutions

### Add More Queriers

```yaml
# docker-compose.yaml
services:
  querier:
    image: grafana/loki:2.9.4
    command: -config.file=/etc/loki/config.yaml -target=querier
    deploy:
      replicas: 4
      resources:
        limits:
          memory: 8G
          cpus: '4'
```

### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loki-querier
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loki-querier
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Resource Allocation

```yaml
# Kubernetes deployment
resources:
  requests:
    memory: "4Gi"
    cpu: "2"
  limits:
    memory: "8Gi"
    cpu: "4"
```

## Storage Optimization

### Fast Storage Backend

```yaml
# loki-config.yaml
storage_config:
  # Use SSD-backed storage
  filesystem:
    directory: /loki/chunks

  # Or fast object storage
  aws:
    s3: s3://bucket-name
    region: us-east-1
    sse_encryption: true
```

### Index Optimization

```yaml
# loki-config.yaml
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

# Enable bloom filters for faster filtering
compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m

bloom_gateway:
  enabled: true
  ring:
    kvstore:
      store: memberlist
```

## Client-Side Solutions

### Grafana Query Optimization

```json
{
  "dashboard": {
    "panels": [
      {
        "title": "Logs",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=\"app\"} |= \"error\"",
            "maxLines": 100
          }
        ],
        "options": {
          "dedupStrategy": "signature"
        },
        "maxDataPoints": 100
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Progressive Loading

```javascript
// JavaScript client with progressive loading
async function queryLogs(query, start, end) {
  const interval = 3600000; // 1 hour in ms
  let results = [];

  for (let t = start; t < end; t += interval) {
    const response = await fetch(
      `${LOKI_URL}/loki/api/v1/query_range?` +
      `query=${encodeURIComponent(query)}&` +
      `start=${t}&end=${Math.min(t + interval, end)}&limit=100`
    );

    if (response.ok) {
      const data = await response.json();
      results = results.concat(data.data.result);
    }
  }

  return results;
}
```

## Monitoring and Alerting

### Prometheus Alerts

```yaml
groups:
  - name: loki-query-performance
    rules:
      - alert: LokiSlowQueries
        expr: |
          histogram_quantile(0.99,
            rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])
          ) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki P99 query latency is high"
          description: "P99 latency: {{ $value }}s"

      - alert: LokiQueryTimeouts
        expr: |
          rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*",status_code="504"}[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Loki queries are timing out"
```

### Query Performance Dashboard

```json
{
  "dashboard": {
    "title": "Loki Query Performance",
    "panels": [
      {
        "title": "Query Latency Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(loki_request_duration_seconds_bucket{route=~\"/loki/api/v1/query.*\"}[5m])"
          }
        ]
      },
      {
        "title": "Slow Queries (>10s)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(loki_request_duration_seconds_count{route=~\"/loki/api/v1/query.*\"}[5m]) * histogram_quantile(0.99, rate(loki_request_duration_seconds_bucket[5m])) > 10"
          }
        ]
      }
    ]
  }
}
```

## Best Practices Summary

1. **Increase Timeouts**: Set appropriate timeout values for your workload
2. **Enable Query Splitting**: Split large queries into smaller intervals
3. **Use Caching**: Enable result and index caching
4. **Optimize Queries**: Use specific selectors and filter early
5. **Scale Queriers**: Add more querier replicas for parallel processing
6. **Fast Storage**: Use SSD or fast object storage
7. **Monitor Performance**: Track query latency and timeout rates

## Quick Reference

### Configuration for Long Queries

```yaml
limits_config:
  query_timeout: 10m
  max_query_length: 744h

query_range:
  split_queries_by_interval: 1h
  parallelise_shardable_queries: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 2000
```

## Conclusion

Query timeouts in Loki are typically caused by inefficient queries, insufficient resources, or missing optimizations. By properly configuring timeouts, enabling query splitting and caching, optimizing your LogQL queries, and scaling query components, you can significantly reduce or eliminate timeout issues.

Key takeaways:
- Increase query_timeout for legitimate long queries
- Enable query splitting and parallelization
- Use result caching to avoid repeated work
- Optimize LogQL queries with specific selectors
- Scale querier replicas for high query loads
- Monitor query performance proactively
