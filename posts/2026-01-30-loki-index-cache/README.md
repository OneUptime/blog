# How to Build Loki Index Cache

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Loki, Observability, Caching, Performance

Description: Configure Loki index caching to accelerate log queries with in-memory and external cache backends.

---

Loki stores logs in object storage but queries them by scanning index files that map labels to chunk locations. Without caching, every query hits storage, making repeated or overlapping queries expensive. With TSDB, Loki keeps downloaded index files in a local cache directory. Legacy BoltDB index lookup caching can also use in-memory or external cache backends.

## Why Index Caching Matters

When you run a LogQL query, Loki:

1. Parses label matchers
2. Looks up matching series in the index
3. Fetches chunk references
4. Downloads and decompresses chunks

Steps 2 and 3 are the bottleneck for large tenants. Index files live in object storage (S3, GCS, MinIO), and each lookup can incur network latency. A local index-file cache reduces repeated trips for the same index ranges.

## Index Lookup Flow

```mermaid
sequenceDiagram
    participant Client
    participant Querier
    participant IndexCache
    participant ObjectStorage

    Client->>Querier: LogQL Query
    Querier->>IndexCache: Check for cached index entries
    alt Cache Hit
        IndexCache-->>Querier: Return cached entries
    else Cache Miss
        Querier->>ObjectStorage: Fetch index files
        ObjectStorage-->>Querier: Return index data
        Querier->>IndexCache: Store entries in cache
    end
    Querier->>ObjectStorage: Fetch log chunks
    ObjectStorage-->>Querier: Return chunks
    Querier-->>Client: Query results
```

## Cache Backend Options

For current TSDB deployments, Loki's index cache is the local shipper cache configured with `cache_location` and `cache_ttl`. The older index lookup cache is primarily for legacy BoltDB index storage and supports three cache backends:

| Backend | Latency | Capacity | Complexity | Best For |
| --- | --- | --- | --- | --- |
| **In-memory (embedded)** | Sub-millisecond | Limited by pod RAM | None | Single-node or small clusters |
| **Memcached** | ~1ms network | Scales horizontally | Moderate | Production clusters, shared cache |
| **Redis** | ~1ms network | Scales with clustering | Moderate | Teams already running Redis |

## TSDB Index Cache Configuration

The simplest option uses a local cache directory inside each querier or read pod. No external dependency is required, but the cache is lost on restart unless the directory is backed by persistent storage and it is not shared across pods unless you use the index gateway.

```yaml
# loki-config.yaml

# Local TSDB index-file cache
# Suitable for development or single-node deployments

storage_config:
  # TSDB index store configuration
  tsdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/index_cache
    # Downloaded index files are removed from the cache after this TTL
    cache_ttl: 24h

query_range:
  # Enable result caching for repeated queries
  cache_results: true
  results_cache:
    cache:
      # Embedded in-memory cache
      embedded_cache:
        enabled: true
        # Maximum memory for cached results (adjust based on pod limits)
        max_size_mb: 512
        # How long entries stay valid
        ttl: 1h

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 1024
      ttl: 1h

# Legacy BoltDB index lookup cache only. TSDB uses the local index file cache above.
# index_queries_cache_config:
#   embedded_cache:
#     enabled: true
#     max_size_mb: 256
```

### Memory Sizing Guidelines

- **Small clusters (under 100 GB/day):** persistent disk for `/loki/index_cache`, 512 MB for chunk cache
- **Medium clusters (100 GB to 1 TB/day):** larger persistent disk for `/loki/index_cache`, 2 GB chunk cache
- **Large clusters (over 1 TB/day):** Use persistent index cache storage or an index gateway, plus external chunk/results caches

## Memcached Configuration

For production deployments, Memcached provides a shared cache layer for chunk and results caching. The legacy BoltDB index lookup cache can also use Memcached, but TSDB index files are cached on local disk or served through the index gateway.

### Deploy Memcached

```yaml
# memcached-deployment.yaml
# Dedicated Memcached cluster for Loki's legacy BoltDB index lookup cache

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki-memcached-index
  namespace: loki
spec:
  serviceName: loki-memcached-index
  replicas: 3
  selector:
    matchLabels:
      app: loki-memcached-index
  template:
    metadata:
      labels:
        app: loki-memcached-index
    spec:
      containers:
        - name: memcached
          image: memcached:1.6-alpine
          args:
            # Max memory per instance
            - "-m"
            - "2048"
            # Max connections
            - "-c"
            - "4096"
            # Verbose logging for debugging
            - "-v"
          ports:
            - containerPort: 11211
          resources:
            requests:
              memory: "2560Mi"
              cpu: "500m"
            limits:
              memory: "2560Mi"
              cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: loki-memcached-index
  namespace: loki
spec:
  clusterIP: None
  ports:
    - port: 11211
      name: memcached
  selector:
    app: loki-memcached-index
```

### Configure Loki to Use Memcached

```yaml
# loki-config.yaml
# Production configuration with Memcached backend

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/index_cache
    # How long downloaded index files stay in the local cache
    cache_ttl: 24h

    # Index gateway caching
    index_gateway_client:
      server_address: loki-index-gateway:9095

# Memcached for index queries
# Legacy BoltDB index lookup cache only. Omit this for TSDB.
index_queries_cache_config:
  memcached:
    batch_size: 256
    parallelism: 10
  memcached_client:
    # Memcached service addresses
    addresses: dns+loki-memcached-index.loki.svc.cluster.local:11211
    # Connection timeout
    timeout: 500ms
    # Max idle connections per server
    max_idle_conns: 100
    # Update interval for DNS resolution
    update_interval: 1m
    # Enable consistent hashing for even distribution
    consistent_hash: true

# Separate cache for chunk data
chunk_store_config:
  chunk_cache_config:
    memcached_client:
      addresses: dns+loki-memcached-chunks.loki.svc.cluster.local:11211
      timeout: 500ms
      max_idle_conns: 100
      consistent_hash: true

# Results cache for query responses
query_range:
  cache_results: true
  results_cache:
    cache:
      memcached_client:
        addresses: dns+loki-memcached-results.loki.svc.cluster.local:11211
        timeout: 500ms
        max_idle_conns: 50
```

## Redis Configuration

If your infrastructure already runs Redis, use it for the legacy BoltDB index lookup cache or for chunk caching instead of adding Memcached.

```yaml
# loki-config.yaml
# Redis backend for index caching

# Legacy BoltDB index lookup cache only. Omit this for TSDB.
index_queries_cache_config:
  redis:
    # Redis endpoint
    endpoint: loki-redis.loki.svc.cluster.local:6379
    # Connection timeout
    timeout: 500ms
    # Database number (0-15)
    db: 0
    # Optional: authentication
    # password: ${REDIS_PASSWORD}
    # Pool size per endpoint
    pool_size: 100
    # TTL for cached entries
    expiration: 24h

chunk_store_config:
  chunk_cache_config:
    redis:
      endpoint: loki-redis.loki.svc.cluster.local:6379
      timeout: 500ms
      db: 1
      pool_size: 100
      expiration: 1h
```

## Cache Warming Strategies

Cold caches hurt query latency after deployments or restarts. Warm them proactively.

### Strategy 1: Background Query Warmup

Run common queries in the background after Loki starts.

```yaml
# warmup-cronjob.yaml
# Periodic job to warm Loki index cache with common queries

apiVersion: batch/v1
kind: CronJob
metadata:
  name: loki-cache-warmer
  namespace: loki
spec:
  # Run every 6 hours
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: warmer
              image: grafana/logcli:latest
              env:
                - name: LOKI_ADDR
                  value: "http://loki-gateway.loki.svc.cluster.local:80"
              command:
                - /bin/sh
                - -c
                - |
                  # Warm cache for common label queries
                  # These queries populate the index cache without returning large result sets

                  echo "Warming cache for namespace labels..."
                  logcli series '{namespace=~".+"}' --since=24h

                  echo "Warming cache for app labels..."
                  logcli series '{app=~".+"}' --since=24h

                  echo "Warming cache for container labels..."
                  logcli series '{container=~".+"}' --since=24h

                  echo "Cache warmup complete"
              resources:
                requests:
                  memory: "128Mi"
                  cpu: "100m"
          restartPolicy: OnFailure
```

### Strategy 2: Startup Probe with Warmup

Delay traffic until cache is partially warm.

```yaml
# loki-querier-deployment.yaml (partial)
# Querier with cache warmup before accepting traffic

spec:
  containers:
    - name: querier
      image: grafana/loki:3.7.2
      # Custom entrypoint that warms cache before starting
      command:
        - /bin/sh
        - -c
        - |
          # Start Loki in background
          /usr/bin/loki -config.file=/etc/loki/config.yaml &
          LOKI_PID=$!

          # Wait for Loki to be ready
          until curl -s http://localhost:3100/ready; do
            sleep 1
          done

          # Run warmup queries against localhost
          curl -s "http://localhost:3100/loki/api/v1/series" \
            --data-urlencode 'match[]={namespace=~".+"}' \
            --data-urlencode 'start='$(date -d '24 hours ago' +%s)

          # Bring Loki to foreground
          wait $LOKI_PID
      startupProbe:
        httpGet:
          path: /ready
          port: 3100
        # Allow up to 5 minutes for warmup
        failureThreshold: 30
        periodSeconds: 10
```

## Cache Architecture for Large Deployments

```mermaid
flowchart TB
    subgraph Clients
        G[Grafana]
        L[LogCLI]
        A[API Clients]
    end

    subgraph "Query Path"
        QF[Query Frontend]
        Q1[Querier 1]
        Q2[Querier 2]
        Q3[Querier 3]
    end

    subgraph "Cache Layer"
        RC[Results Cache<br/>Memcached]
        IC[TSDB Index Cache<br/>Local disk or PV]
        CC[Chunk Cache<br/>Memcached]
    end

    subgraph "Storage"
        IG[Index Gateway]
        S3[Object Storage<br/>S3/GCS/MinIO]
    end

    G --> QF
    L --> QF
    A --> QF

    QF --> RC
    QF --> Q1
    QF --> Q2
    QF --> Q3

    Q1 --> IC
    Q2 --> IC
    Q3 --> IC

    Q1 --> CC
    Q2 --> CC
    Q3 --> CC

    Q1 --> IG
    Q2 --> IG
    Q3 --> IG
    IG --> S3
    CC --> S3
```

## Memory vs Performance Tradeoffs

### High Memory, Fast Queries

Allocate generous cache sizes when query latency is critical.

```yaml
# High-performance configuration
# Use when: Dashboard refresh times matter, users run ad-hoc queries frequently

# Legacy BoltDB index lookup cache only. TSDB uses the local index file cache.
index_queries_cache_config:
  memcached:
    # Larger batch sizes reduce round trips
    batch_size: 4096
    # More parallel requests
    parallelism: 100
  memcached_client:
    addresses: dns+loki-memcached-index:11211

# Deploy Memcached with more memory
# 3 replicas x 4GB = 12GB total cache capacity
```

**Pros:**
- Sub-100ms query latency for cached ranges
- Smoother dashboard experience
- Handles query bursts without degradation

**Cons:**
- Higher infrastructure cost
- Memcached pods consume significant cluster resources
- Cache invalidation takes longer

### Low Memory, Acceptable Latency

Minimize cache footprint when cost matters more than speed.

```yaml
# Cost-optimized configuration
# Use when: Batch processing, async alerting, budget constraints

# Legacy BoltDB index lookup cache only. TSDB uses the local index file cache.
index_queries_cache_config:
  embedded_cache:
    enabled: true
    # Smaller cache, faster eviction
    max_size_mb: 128

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 256
      ttl: 15m
```

**Pros:**
- Lower memory footprint
- Simpler operations (no external cache)
- Faster cache warmup after restart

**Cons:**
- Higher query latency (200ms to 2s typical)
- More object storage requests (higher egress costs)
- Cache thrashing under load

### Sizing Formula

Estimate cache size from observed index cache usage and query patterns:

```text
TSDB Index Cache Disk = observed /loki/index_cache size for the query lookback window x growth headroom
Chunk Cache Size = unique chunks expected to be reused during the TTL x average compressed chunk size
```

**Example calculation:**

- `/loki/index_cache` uses 20 GB after a representative 24-hour query workload
- 50% growth headroom
- 10,000 reusable chunks, 256 KB average compressed chunk size

```text
TSDB Index Cache Disk = 20 GB x 1.5 = 30 GB
Chunk Cache = 10,000 x 256 KB = 2.56 GB
```

## Monitoring Cache Performance

Track cache hit rates to validate configuration.

```yaml
# prometheus-rules.yaml
# Alerting rules for Loki cache health

groups:
  - name: loki-cache
    rules:
      # Alert when index cache hit rate drops below 80%
      - alert: LokiIndexCacheHitRateLow
        expr: |
          (
            sum(rate(loki_cache_hits{name="store.index-cache-read"}[5m]))
            /
            sum(rate(loki_cache_fetched_keys{name="store.index-cache-read"}[5m]))
          ) < 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Loki index cache hit rate below 80%"
          description: "Consider increasing cache size or TTL"

      # Alert when chunk cache is overwhelmed
      - alert: LokiChunkCacheEvictionHigh
        expr: |
          sum(rate(loki_embeddedcache_evicted_total{cache="store.chunks-cache"}[5m])) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High chunk cache eviction rate"
          description: "Cache is too small for workload"
```

### Key Metrics to Watch

| Metric | Target | Action if Missed |
| --- | --- | --- |
| `loki_cache_hits / loki_cache_fetched_keys` | > 0.8 | Increase cache size or TTL |
| `loki_embeddedcache_evicted_total` | < 100/s | Increase embedded cache memory |
| `loki_memcache_request_duration_seconds` | < 10ms p99 | Check network, add replicas |

## Complete Production Configuration

```yaml
# loki-config.yaml
# Production-ready configuration with tiered caching

auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095

common:
  path_prefix: /loki
  storage:
    s3:
      endpoint: s3.amazonaws.com
      bucketnames: loki-chunks
      region: us-east-1
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}

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
    active_index_directory: /loki/index
    cache_location: /loki/index_cache
    cache_ttl: 24h

# Three-tier caching strategy
# Tier 1: Results cache - caches full query responses
query_range:
  align_queries_with_step: true
  cache_results: true
  results_cache:
    cache:
      memcached_client:
        addresses: dns+loki-memcached-results.loki.svc.cluster.local:11211
        timeout: 500ms
        max_idle_conns: 50
        consistent_hash: true

# Tier 2: TSDB index file cache - stores downloaded index files locally at /loki/index_cache.
# Use persistent storage for this directory or configure an index gateway in distributed deployments.

# Tier 3: Chunk cache - caches fetched log chunks
chunk_store_config:
  chunk_cache_config:
    memcached_client:
      addresses: dns+loki-memcached-chunks.loki.svc.cluster.local:11211
      timeout: 500ms
      max_idle_conns: 100
      consistent_hash: true

limits_config:
  # Per-tenant limits
  max_cache_freshness_per_query: 10m
  # Split large queries for better cache utilization
  split_queries_by_interval: 30m

frontend:
  # Cache query results at the frontend level
  max_outstanding_per_tenant: 4096
  compress_responses: true
```

## Troubleshooting

### Cache Miss Rate Too High

1. Check TTL settings - if logs are queried hours after ingestion, TTL might expire entries too soon
2. Verify Memcached memory - run `echo stats | nc memcached-host 11211` and check `evictions`
3. Ensure consistent hashing is enabled so keys remain stable when clients discover multiple Memcached servers

### High Latency Despite Caching

1. Check network between queriers and Memcached - should be under 1ms
2. Look for connection pool exhaustion in `loki_memcache_request_duration_seconds`
3. Verify batch sizes are large enough to reduce round trips

### Cache Warming Takes Too Long

1. Run warmup queries with narrower time ranges
2. Parallelize warmup across multiple label sets
3. Use index gateway to centralize and share index cache

Index caching transforms Loki from "eventually consistent logs" to "interactive log exploration." Start with the TSDB local index cache and embedded chunk/results caches during development, graduate chunk and results caching to Memcached for production, and monitor hit rates religiously. The difference between a 5-second query and a 50-millisecond query is often just a few gigabytes of well-placed cache memory or disk.
