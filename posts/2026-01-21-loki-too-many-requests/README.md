# How to Debug Loki "Too Many Outstanding Requests"

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Troubleshooting, Rate Limiting, Performance, Scaling, LogQL

Description: A comprehensive guide to diagnosing and resolving Loki "too many outstanding requests" errors, covering rate limiting configuration, query optimization, scaling strategies, and monitoring approaches.

---

The "too many outstanding requests" error in Grafana Loki indicates that the system is overwhelmed with concurrent queries or that rate limits have been exceeded. This error can affect both query and ingestion paths, impacting dashboard loading and log shipping. This guide helps you diagnose the root cause and implement effective solutions.

## Understanding the Error

### Error Messages

You may encounter these related errors:

```
too many outstanding requests
max queriers per tenant reached
query rejected: too many outstanding requests for tenant
per-tenant request rate limit exceeded
```

### Root Causes

1. **High query concurrency**: Too many simultaneous queries
2. **Expensive queries**: Queries scanning large time ranges or data volumes
3. **Insufficient resources**: Querier or query-frontend under-provisioned
4. **Rate limit misconfiguration**: Limits set too low for workload
5. **Client retry storms**: Clients aggressively retrying failed requests

## Diagnostic Steps

### Check Current Metrics

```bash
# Query outstanding requests metric
curl -s http://loki:3100/metrics | grep -E "loki_query_frontend_outstanding_requests|loki_request_duration"

# Check rate limiting metrics
curl -s http://loki:3100/metrics | grep -E "loki_discarded|loki_ingester_streams_created_total"

# View querier status
curl -s http://loki:3100/ring | jq
```

### Key Metrics to Monitor

```promql
# Outstanding requests per tenant
loki_query_frontend_outstanding_per_tenant

# Queue length
loki_query_scheduler_queue_length

# Request rate
rate(loki_request_duration_seconds_count[5m])

# Rejected requests
rate(loki_discarded_samples_total[5m])

# Query latency
histogram_quantile(0.99, rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m]))
```

### Check Loki Logs

```bash
# Look for rate limiting messages
docker logs loki 2>&1 | grep -i "too many\|rate limit\|outstanding"

# Check for slow queries
docker logs loki 2>&1 | grep -i "slow query\|timeout"
```

## Configuration Solutions

### Increase Request Limits

```yaml
# loki-config.yaml
limits_config:
  # Maximum outstanding requests per tenant
  max_outstanding_per_tenant: 2048  # Default: 100

  # Maximum concurrent queries per tenant
  max_query_parallelism: 32  # Default: 14

  # Query timeout
  query_timeout: 5m

  # Maximum query length
  max_query_length: 721h  # 30 days

  # Split queries by interval
  split_queries_by_interval: 1h

server:
  # HTTP server max concurrent requests
  grpc_server_max_concurrent_streams: 1000

query_scheduler:
  # Maximum outstanding requests globally
  max_outstanding_requests_per_tenant: 2048

frontend:
  # Maximum outstanding requests per tenant in frontend
  max_outstanding_per_tenant: 2048

  # Maximum queriers per tenant
  max_queriers_per_tenant: 0  # 0 = no limit

  # Compress responses
  compress_responses: true

  # Query result cache
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500

querier:
  # Maximum concurrent queries
  max_concurrent: 20
```

### Configure Query Frontend for Parallelism

```yaml
# loki-config.yaml
query_range:
  # Enable query parallelization
  parallelise_shardable_queries: true

  # Split queries by time interval
  split_queries_by_interval: 1h

  # Maximum retries
  max_retries: 5

  # Result cache
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 1000
        ttl: 1h
```

### Per-Tenant Overrides

```yaml
# loki-config.yaml
overrides:
  # Higher limits for specific tenants
  high-volume-tenant:
    max_outstanding_per_tenant: 4096
    max_query_parallelism: 64
    ingestion_rate_mb: 100
    ingestion_burst_size_mb: 200

  # Lower limits for less critical tenants
  low-priority-tenant:
    max_outstanding_per_tenant: 256
    max_query_parallelism: 8
    ingestion_rate_mb: 10
```

## Scaling Solutions

### Scale Query Components

```yaml
# docker-compose.yaml for distributed Loki
version: "3.8"

services:
  query-frontend:
    image: grafana/loki:2.9.4
    command: -config.file=/etc/loki/config.yaml -target=query-frontend
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: '2'

  querier:
    image: grafana/loki:2.9.4
    command: -config.file=/etc/loki/config.yaml -target=querier
    deploy:
      replicas: 4  # Scale up queriers
      resources:
        limits:
          memory: 4G
          cpus: '4'

  query-scheduler:
    image: grafana/loki:2.9.4
    command: -config.file=/etc/loki/config.yaml -target=query-scheduler
    deploy:
      replicas: 2
```

### Kubernetes HPA for Queriers

```yaml
# querier-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loki-querier-hpa
  namespace: loki
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loki-querier
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: loki_query_frontend_outstanding_per_tenant
        target:
          type: AverageValue
          averageValue: "50"
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Query Optimization

### Optimize LogQL Queries

```logql
# Bad: Scans entire time range
{job="application"}

# Better: Add time filtering and limit
{job="application"} | json | level="error" | limit 1000

# Bad: High cardinality label selector
{job=~".*"}

# Better: Specific label selector
{job="api-server", namespace="production"}

# Bad: Complex regex on all logs
{job="application"} |~ "(?i).*error.*timeout.*database.*"

# Better: Structured filtering
{job="application"} | json | level="error" | error_type="timeout" | service="database"
```

### Use Shorter Time Ranges

```logql
# Instead of querying 30 days
{job="application"} [30d]

# Query smaller windows and aggregate
sum by (service) (
  count_over_time({job="application"} | json | level="error" [1h])
)
```

### Leverage Caching

```yaml
# Configure aggressive caching
query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 2000
        ttl: 24h

  cache_results: true
  max_retries: 5
```

## Client-Side Solutions

### Implement Request Queuing

```python
# Python client with request queuing
import time
from threading import Semaphore
import requests

class LokiClient:
    def __init__(self, url, max_concurrent=10):
        self.url = url
        self.semaphore = Semaphore(max_concurrent)
        self.retry_delay = 1

    def query(self, query, start, end, retries=3):
        with self.semaphore:
            for attempt in range(retries):
                try:
                    response = requests.get(
                        f"{self.url}/loki/api/v1/query_range",
                        params={
                            "query": query,
                            "start": start,
                            "end": end
                        },
                        timeout=60
                    )
                    if response.status_code == 429:
                        # Rate limited - exponential backoff
                        time.sleep(self.retry_delay * (2 ** attempt))
                        continue
                    response.raise_for_status()
                    return response.json()
                except requests.exceptions.RequestException as e:
                    if attempt == retries - 1:
                        raise
                    time.sleep(self.retry_delay * (2 ** attempt))

# Usage
client = LokiClient("http://loki:3100", max_concurrent=5)
result = client.query('{job="app"}', "2024-01-01T00:00:00Z", "2024-01-01T01:00:00Z")
```

### Grafana Dashboard Optimization

```json
{
  "dashboard": {
    "refresh": "30s",
    "panels": [
      {
        "title": "Logs",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=\"application\"} | json | level=\"error\"",
            "maxLines": 100,
            "refId": "A"
          }
        ],
        "options": {
          "dedupStrategy": "signature",
          "showLabels": false
        },
        "maxDataPoints": 100
      }
    ]
  }
}
```

## Rate Limiting Configuration

### Ingestion Rate Limits

```yaml
limits_config:
  # Per-tenant ingestion limits
  ingestion_rate_mb: 20
  ingestion_burst_size_mb: 30

  # Per-stream limits
  per_stream_rate_limit: 5MB
  per_stream_rate_limit_burst: 15MB

  # Max streams per user
  max_streams_per_user: 10000
  max_global_streams_per_user: 50000
```

### Query Rate Limits

```yaml
limits_config:
  # Query limits
  max_entries_limit_per_query: 5000
  max_chunks_per_query: 2000000
  max_query_series: 500
  max_query_lookback: 0  # 0 = unlimited
```

## Monitoring and Alerting

### Prometheus Alerts

```yaml
groups:
  - name: loki-request-limits
    rules:
      - alert: LokiHighOutstandingRequests
        expr: |
          sum by (tenant) (loki_query_frontend_outstanding_per_tenant) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High outstanding requests for tenant {{ $labels.tenant }}"
          description: "Outstanding requests: {{ $value }}"

      - alert: LokiRequestsRejected
        expr: |
          rate(loki_discarded_samples_total[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Loki is rejecting requests"
          description: "Rejection rate: {{ $value }}/s"

      - alert: LokiQueryLatencyHigh
        expr: |
          histogram_quantile(0.99,
            rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])
          ) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki query latency is high"
          description: "P99 latency: {{ $value }}s"
```

### Grafana Dashboard for Monitoring

```json
{
  "dashboard": {
    "title": "Loki Request Monitoring",
    "panels": [
      {
        "title": "Outstanding Requests per Tenant",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum by (tenant) (loki_query_frontend_outstanding_per_tenant)",
            "legendFormat": "{{ tenant }}"
          }
        ]
      },
      {
        "title": "Rejected Requests",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(loki_discarded_samples_total[5m])",
            "legendFormat": "Rejections/s"
          }
        ]
      },
      {
        "title": "Query Latency (P99)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(loki_request_duration_seconds_bucket{route=~\"/loki/api/v1/query.*\"}[5m]))",
            "legendFormat": "P99 Latency"
          }
        ]
      }
    ]
  }
}
```

## Quick Fixes Checklist

1. **Immediate Relief**:
   ```yaml
   limits_config:
     max_outstanding_per_tenant: 4096
   ```

2. **Reduce Query Load**:
   - Increase dashboard refresh intervals
   - Limit query time ranges
   - Add query result caching

3. **Scale Resources**:
   - Add more querier replicas
   - Increase CPU/memory for query-frontend

4. **Optimize Queries**:
   - Use specific label selectors
   - Limit returned lines
   - Avoid regex when possible

## Conclusion

The "too many outstanding requests" error indicates Loki is overloaded with queries relative to its capacity. By properly configuring rate limits, scaling query components, optimizing queries, and implementing client-side queuing, you can eliminate these errors and ensure reliable log access.

Key takeaways:
- Increase `max_outstanding_per_tenant` for immediate relief
- Scale querier replicas for sustained high query load
- Optimize LogQL queries to reduce resource consumption
- Configure caching to reduce repeated query load
- Implement client-side rate limiting and retries
- Monitor outstanding requests and query latency proactively
- Use per-tenant overrides for different workload requirements
