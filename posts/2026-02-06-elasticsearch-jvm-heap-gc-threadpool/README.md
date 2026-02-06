# How to Monitor Elasticsearch JVM Heap Usage, GC Pause Time, and Thread Pool Utilization with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, JVM, Garbage Collection

Description: Monitor Elasticsearch JVM heap usage, garbage collection pause times, and thread pool utilization using the OpenTelemetry Collector for JVM health visibility.

Elasticsearch runs on the JVM, and JVM health directly impacts cluster performance. High heap usage triggers frequent garbage collection, which causes pauses that affect query and indexing latency. Thread pool saturation leads to request rejections. Monitoring these JVM-level metrics with the OpenTelemetry Collector helps you right-size your heap and detect resource issues before they cause outages.

## Collector Configuration

```yaml
receivers:
  elasticsearch:
    endpoint: https://elasticsearch:9200
    username: monitoring_user
    password: "${ES_PASSWORD}"
    collection_interval: 15s
    tls:
      insecure_skip_verify: true
    nodes: ["_all"]
    metrics:
      # JVM Heap metrics
      elasticsearch.node.jvm.memory.heap.used:
        enabled: true
      elasticsearch.node.jvm.memory.heap.max:
        enabled: true
      elasticsearch.node.jvm.memory.heap.utilization:
        enabled: true
      elasticsearch.node.jvm.memory.nonheap.used:
        enabled: true
      # GC metrics
      elasticsearch.node.jvm.gc.collections.count:
        enabled: true
      elasticsearch.node.jvm.gc.collections.elapsed:
        enabled: true
      # Thread pool metrics
      elasticsearch.node.thread_pool.threads:
        enabled: true
      elasticsearch.node.thread_pool.tasks.completed:
        enabled: true
      elasticsearch.node.thread_pool.tasks.queued:
        enabled: true
      elasticsearch.node.thread_pool.tasks.rejected:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: elasticsearch
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [elasticsearch]
      processors: [resource, batch]
      exporters: [otlp]
```

## JVM Heap Metrics

### Heap Usage

```
elasticsearch.node.jvm.memory.heap.used         - Current heap usage in bytes
elasticsearch.node.jvm.memory.heap.max           - Maximum heap size
elasticsearch.node.jvm.memory.heap.utilization   - Heap usage as a ratio (0-1)
```

Elasticsearch best practice is to set the heap to no more than 50% of available memory and never exceed 30.5 GB (to stay within the JVM compressed oops threshold). Monitor heap utilization:

```
heap_percent = (heap.used / heap.max) * 100
```

When heap utilization consistently stays above 75%, the JVM spends more time in garbage collection. Above 85% is a warning sign. Above 95% is critical.

### Non-Heap Memory

```
elasticsearch.node.jvm.memory.nonheap.used - Non-heap memory (metaspace, code cache)
```

Non-heap memory holds class metadata and JIT-compiled code. It usually stays stable but can grow with dynamic script compilation.

## Garbage Collection Metrics

Elasticsearch uses two GC pools: young generation (minor GC) and old generation (major GC).

```
elasticsearch.node.jvm.gc.collections.count{gc="young"}   - Young gen GC count
elasticsearch.node.jvm.gc.collections.elapsed{gc="young"} - Young gen GC time
elasticsearch.node.jvm.gc.collections.count{gc="old"}     - Old gen GC count
elasticsearch.node.jvm.gc.collections.elapsed{gc="old"}   - Old gen GC time
```

### Calculating GC Overhead

```
gc_overhead = rate(gc.collections.elapsed[5m]) / 5m * 100
```

If GC overhead exceeds 5%, the JVM is spending too much time collecting garbage. Above 10% is problematic.

### GC Pause Duration

```
avg_gc_pause = gc.collections.elapsed / gc.collections.count
```

Old generation GC pauses are the most impactful. A single old gen pause can last several seconds, causing all queries and indexing operations on that node to stall.

## Thread Pool Metrics

Elasticsearch uses dedicated thread pools for different operation types:

```
# Thread pool types
search     - Search queries
write      - Indexing, bulk, delete, update
get        - Get by ID
analyze    - Text analysis
management - Cluster management
snapshot   - Snapshot operations
```

### Key Thread Pool Metrics

```
elasticsearch.node.thread_pool.threads{state="active"}    - Active threads
elasticsearch.node.thread_pool.tasks.queued                - Queued tasks
elasticsearch.node.thread_pool.tasks.rejected              - Rejected tasks
elasticsearch.node.thread_pool.tasks.completed             - Completed tasks
```

### Queue and Rejection Monitoring

```
# Tasks waiting in queue
search_queue = thread_pool.tasks.queued{pool="search"}
write_queue  = thread_pool.tasks.queued{pool="write"}

# Tasks rejected (queue full)
search_rejected = rate(thread_pool.tasks.rejected{pool="search"}[5m])
write_rejected  = rate(thread_pool.tasks.rejected{pool="write"}[5m])
```

Any rejections mean Elasticsearch cannot keep up with the request rate. This is a clear signal to scale the cluster or reduce load.

## Alert Conditions

```yaml
# High heap usage
- alert: ElasticsearchHighHeap
  condition: elasticsearch.node.jvm.memory.heap.utilization > 0.85
  for: 10m
  severity: warning
  message: "Heap usage at {{ value }}% on node {{ node }}"

# High GC overhead
- alert: ElasticsearchHighGCOverhead
  condition: gc_overhead > 10
  for: 5m
  severity: critical
  message: "GC overhead at {{ value }}% on node {{ node }}"

# Long old gen GC pauses
- alert: ElasticsearchLongGCPause
  condition: avg_old_gc_pause > 5000ms
  severity: critical
  message: "Old gen GC pauses averaging {{ value }}ms"

# Thread pool rejections
- alert: ElasticsearchWriteRejections
  condition: rate(thread_pool.tasks.rejected{pool="write"}[5m]) > 0
  severity: critical
  message: "Write operations being rejected on node {{ node }}"

# Search queue building up
- alert: ElasticsearchSearchQueueHigh
  condition: thread_pool.tasks.queued{pool="search"} > 100
  for: 5m
  severity: warning
```

## Tuning Recommendations Based on Metrics

If you see high heap usage:
- Check for large aggregations or field data cache
- Reduce `indices.fielddata.cache.size`
- Add more nodes to distribute the load

If you see frequent old gen GC:
- Reduce heap usage by optimizing queries
- Check for too many open indices
- Consider using frozen indices for old data

If you see thread pool rejections:
- Increase the thread pool queue size (temporary fix)
- Add more nodes (permanent fix)
- Optimize slow queries that hold threads

## Summary

JVM health is fundamental to Elasticsearch performance. Monitor heap utilization to prevent OOM conditions, track GC pause duration and overhead to detect collection pressure, and watch thread pool queues and rejections to spot saturation. The OpenTelemetry Collector's Elasticsearch receiver captures all these metrics from the cluster API, giving you JVM visibility without installing agents on Elasticsearch nodes.
