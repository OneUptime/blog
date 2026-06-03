# How to Set Up Thanos Query Frontend for Caching Kubernetes Metric Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Thanos, Query Frontend, Caching, Performance, Kubernetes

Description: Learn how to deploy Thanos Query Frontend with Memcached to cache Kubernetes metric queries and dramatically improve dashboard load times and reduce backend load.

---

Thanos Query Frontend sits between Grafana and Thanos Querier, caching query results and splitting large queries into parallel smaller queries. This reduces load on Prometheus and object storage while significantly improving dashboard performance for repeated queries.

This guide covers deploying and configuring Query Frontend for production use.

## Understanding Query Frontend Benefits

Query Frontend provides three key features:

1. **Result caching**: Stores query results in Memcached for instant retrieval
2. **Query splitting**: Breaks large time range queries into parallel sub-queries
3. **Parallelism limits and retries**: Controls query fan-out and retries failed downstream requests

For dashboards that query the same metrics repeatedly, caching provides massive speedups. The first load might take 5 seconds, subsequent loads return in 50ms.

## Deploying Memcached for Query Results

Deploy Memcached as the cache backend:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: memcached
  namespace: monitoring
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
        image: memcached:1.6-alpine
        args:
          - -m 2048  # 2GB memory per instance
          - -I 5m    # Max item size 5MB
          - -c 1024  # Max connections
          - -v       # Verbose logging
        ports:
        - containerPort: 11211
          name: memcached
        resources:
          requests:
            memory: 2Gi
            cpu: 500m
          limits:
            memory: 2.5Gi
            cpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: memcached
  namespace: monitoring
spec:
  clusterIP: None
  selector:
    app: memcached
  ports:
  - port: 11211
    name: memcached
```

Use StatefulSet for stable network identities that Query Frontend can address.

## Deploying Thanos Query Frontend

Deploy Query Frontend with cache configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query-frontend
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query-frontend
  template:
    metadata:
      labels:
        app: thanos-query-frontend
    spec:
      containers:
      - name: query-frontend
        image: quay.io/thanos/thanos:v0.32.0
        args:
          - query-frontend
          - --http-address=0.0.0.0:10902
          - --query-frontend.downstream-url=http://thanos-querier:10902
          # Query splitting configuration
          - --query-range.split-interval=24h
          - --query-range.max-retries-per-request=5
          - --query-range.max-query-parallelism=32
          # Result caching with Memcached
          - --query-range.response-cache-config-file=/etc/thanos/cache-config.yml
          # Query stats logging
          - --query-frontend.log-queries-longer-than=10s
        ports:
        - containerPort: 10902
          name: http
        volumeMounts:
        - name: cache-config
          mountPath: /etc/thanos
        resources:
          requests:
            memory: 512Mi
            cpu: 500m
          limits:
            memory: 1Gi
            cpu: 1
      volumes:
      - name: cache-config
        configMap:
          name: thanos-query-frontend-cache
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-query-frontend-cache
  namespace: monitoring
data:
  cache-config.yml: |
    type: MEMCACHED
    config:
      addresses:
        - dnssrv+_memcached._tcp.memcached.monitoring.svc.cluster.local
      timeout: 500ms
      max_idle_connections: 100
      max_async_concurrency: 20
      max_async_buffer_size: 10000
      max_get_multi_concurrency: 100
      max_get_multi_batch_size: 0
---
apiVersion: v1
kind: Service
metadata:
  name: thanos-query-frontend
  namespace: monitoring
spec:
  selector:
    app: thanos-query-frontend
  ports:
  - port: 10902
    name: http
```

The `--query-range.split-interval=24h` setting splits large queries into 24-hour chunks that execute in parallel.

## Configuring Grafana to Use Query Frontend

Update Grafana datasource to point at Query Frontend instead of Querier:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  thanos.yaml: |
    apiVersion: 1
    datasources:
    - name: Thanos
      type: prometheus
      access: proxy
      url: http://thanos-query-frontend.monitoring.svc.cluster.local:10902
      isDefault: true
      jsonData:
        timeInterval: 30s
        queryTimeout: 300s
```

Grafana queries now go through Query Frontend. Range queries benefit from the cache and splitting configured above.

## Configuring Index Cache for Store Gateway

Store Gateway can also use Memcached for index caching:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-store-gateway-cache
  namespace: monitoring
data:
  index-cache.yml: |
    type: MEMCACHED
    config:
      addresses:
        - dnssrv+_memcached._tcp.memcached.monitoring.svc.cluster.local
      timeout: 500ms
      max_idle_connections: 100
```

Update Store Gateway deployment:

```yaml
args:
  - store
  - --data-dir=/data
  - --objstore.config-file=/etc/thanos/objstore.yml
  - --index-cache.config-file=/etc/thanos/index-cache.yml
  - --chunk-pool-size=2GB
```

## Optimizing Cache TTL

Configure cache time-to-live and freshness based on data needs:

```yaml
query-frontend:
  args:
    # Do not cache query_range responses that include the most recent minute
    - --query-range.response-cache-max-freshness=1m
  cache-config.yml: |
    type: MEMCACHED
    config:
      addresses:
        - dnssrv+_memcached._tcp.memcached.monitoring.svc.cluster.local
      expiration: 24h
```

Recent data changes frequently, so avoid caching the freshest responses. Historical data is immutable, so a longer Memcached expiration can be useful.

## Query Splitting Configuration

Tune query splitting for your workload:

```yaml
args:
  # Split queries into 12-hour intervals
  - --query-range.split-interval=12h
  # Align splits to reduce cache misses
  - --query-range.align-range-with-step
  # Maximum parallelism
  - --query-range.max-query-parallelism=32
```

Smaller split intervals increase parallelism but create more sub-queries. Find the balance for your cluster size.

## Monitoring Query Frontend Performance

Track cache effectiveness:

```promql
# Cache hit rate

sum(rate(cortex_cache_hits_total{name="memcache",tripperware="query_range"}[5m])) /
sum(rate(cortex_cache_fetched_keys_total{name="memcache",tripperware="query_range"}[5m]))

# Cache miss rate
1 - (
  sum(rate(cortex_cache_hits_total{name="memcache",tripperware="query_range"}[5m])) /
  sum(rate(cortex_cache_fetched_keys_total{name="memcache",tripperware="query_range"}[5m]))
)

# Split query rate
sum(rate(thanos_frontend_split_queries_total{tripperware="query_range"}[5m]))

# Retry rate
sum(rate(cortex_query_frontend_retries_count{tripperware="query_range"}[5m]))
```

## Creating Dashboards for Cache Metrics

Build a Grafana dashboard to monitor Query Frontend:

```json
{
  "dashboard": {
    "title": "Thanos Query Frontend",
    "panels": [
      {
        "title": "Cache Hit Rate",
        "targets": [{
          "expr": "sum(rate(cortex_cache_hits_total{name=\"memcache\",tripperware=\"query_range\"}[5m])) / sum(rate(cortex_cache_fetched_keys_total{name=\"memcache\",tripperware=\"query_range\"}[5m]))"
        }],
        "type": "graph"
      },
      {
        "title": "Query Volume",
        "targets": [{
          "expr": "sum(rate(thanos_query_frontend_queries_total{op=\"query_range\"}[5m]))"
        }],
        "type": "graph"
      },
      {
        "title": "Memcached Keys Fetched",
        "targets": [{
          "expr": "sum(rate(cortex_cache_fetched_keys_total{name=\"memcache\",tripperware=\"query_range\"}[5m]))"
        }],
        "type": "graph"
      }
    ]
  }
}
```

## Alerting on Cache Issues

Create alerts for cache problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: thanos-query-frontend-alerts
  namespace: monitoring
spec:
  groups:
  - name: query_frontend
    rules:
    - alert: LowCacheHitRate
      expr: |
        (
          sum(rate(cortex_cache_hits_total{name="memcache",tripperware="query_range"}[10m])) /
          sum(rate(cortex_cache_fetched_keys_total{name="memcache",tripperware="query_range"}[10m]))
        ) < 0.3
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Query Frontend cache hit rate below 30%"
        description: "Only {{ $value | humanizePercentage }} of queries hitting cache"

    - alert: MemcachedDown
      expr: |
        up{job="memcached"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Memcached instance down"

    - alert: HighRetryRate
      expr: |
        sum(rate(cortex_query_frontend_retries_count{tripperware="query_range"}[5m])) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High query retry rate through frontend"
        description: "Query Frontend is retrying {{ $value }} downstream requests per second"

    - alert: CacheWriteBacklog
      expr: |
        cortex_cache_background_queue_length{name="memcache",tripperware="query_range"} > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Large cache write backlog"
```

## Scaling Memcached

Scale Memcached for better cache hit rates:

```yaml
spec:
  replicas: 5  # More replicas = more cache space

  containers:
  - name: memcached
    args:
      - -m 4096  # 4GB per instance
```

Total cache: 5 replicas × 4GB = 20GB cache space.

## Using Multiple Cache Layers

Configure separate caches for range queries and label or series requests:

```yaml
args:
  - --query-range.response-cache-config-file=/etc/thanos/range-cache.yml
  - --labels.response-cache-config-file=/etc/thanos/labels-cache.yml
```

## Debugging Cache Misses

Investigate why queries aren't hitting cache:

```bash
# Check Memcached stats
kubectl exec -n monitoring memcached-0 -- sh -c 'printf "stats\r\n" | nc localhost 11211'

# View Query Frontend logs
kubectl logs -n monitoring deployment/thanos-query-frontend | grep -i cache

# Check for values too large for Memcached
sum(rate(cortex_memcache_client_set_skip_total[5m]))
```

## Performance Benchmarks

Possible improvements with Query Frontend:

- **First query**: 5-10 seconds (cache miss)
- **Cached query**: 50-200ms (cache hit)
- **95th percentile improvement**: Much faster for repeated dashboards
- **Backend load reduction**: Fewer repeated range queries to Querier

Thanos Query Frontend with Memcached transforms dashboard performance, especially for dashboards that refresh frequently or are viewed by many users simultaneously.
