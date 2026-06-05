# How to Monitor Elasticsearch JVM Heap Usage, GC Pause Time,

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
      jvm.memory.heap.used:
        enabled: true
      jvm.memory.heap.max:
        enabled: true
      jvm.memory.heap.utilization:
        enabled: true
      jvm.memory.nonheap.used:
        enabled: true
      # GC metrics
      jvm.gc.collections.count:
        enabled: true
      jvm.gc.collections.elapsed:
        enabled: true
      # Thread pool metrics
      elasticsearch.node.thread_pool.threads:
        enabled: true
      elasticsearch.node.thread_pool.tasks.queued:
        enabled: true
      elasticsearch.node.thread_pool.tasks.finished:
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

```text
jvm.memory.heap.used         - Current heap usage in bytes
jvm.memory.heap.max          - Maximum heap size
jvm.memory.heap.utilization  - Heap usage as a ratio (0-1)
```

Elasticsearch best practice is to set the heap to no more than 50% of available memory and keep it below the JVM compressed oops threshold. The exact threshold varies; 26 GB is safe on most systems and it can be as large as 30 GB on some systems. Monitor heap utilization:

```text
heap_percent = (heap.used / heap.max) * 100
```

When heap utilization consistently stays above 75%, the JVM spends more time in garbage collection. Above 85% is a warning sign. Above 95% is critical.

### Non-Heap Memory

```text
jvm.memory.nonheap.used - Non-heap memory (metaspace, code cache)
```

Non-heap memory holds class metadata and JIT-compiled code. It usually stays stable but can grow with dynamic script compilation.

## Garbage Collection Metrics

Elasticsearch reports JVM garbage collection by collector name, typically young generation and old generation collectors.

```text
jvm.gc.collections.count{name="young"}   - Young gen GC count
jvm.gc.collections.elapsed{name="young"} - Young gen GC time in milliseconds
jvm.gc.collections.count{name="old"}     - Old gen GC count
jvm.gc.collections.elapsed{name="old"}   - Old gen GC time in milliseconds
```

### Calculating GC Overhead

```text
gc_overhead = increase(jvm.gc.collections.elapsed[5m]) / (5 * 60 * 1000) * 100
```

If GC overhead exceeds 5%, the JVM is spending too much time collecting garbage. Above 10% is problematic.

### GC Pause Duration

```text
avg_gc_pause = increase(jvm.gc.collections.elapsed[5m]) / increase(jvm.gc.collections.count[5m])
```

Old generation GC pauses are the most impactful. A single old gen pause can last several seconds, causing all queries and indexing operations on that node to stall.

## Thread Pool Metrics

Elasticsearch uses dedicated thread pools for different operation types:

```text
# Thread pool types

search     - Search queries
write      - Indexing, bulk, delete, update
get        - Get by ID
analyze    - Text analysis
management - Cluster management
snapshot   - Snapshot operations
```

### Key Thread Pool Metrics

```text
elasticsearch.node.thread_pool.threads{state="active"}                    - Active threads
elasticsearch.node.thread_pool.tasks.queued                               - Queued tasks
elasticsearch.node.thread_pool.tasks.finished{state="rejected"}           - Rejected tasks
elasticsearch.node.thread_pool.tasks.finished{state="completed"}          - Completed tasks
```

### Queue and Rejection Monitoring

```text
# Tasks waiting in queue
search_queue = elasticsearch.node.thread_pool.tasks.queued{thread_pool_name="search"}
write_queue  = elasticsearch.node.thread_pool.tasks.queued{thread_pool_name="write"}

# Tasks rejected (queue full)
search_rejected = rate(elasticsearch.node.thread_pool.tasks.finished{thread_pool_name="search", state="rejected"}[5m])
write_rejected  = rate(elasticsearch.node.thread_pool.tasks.finished{thread_pool_name="write", state="rejected"}[5m])
```

Any rejections mean Elasticsearch cannot keep up with the request rate. This is a clear signal to scale the cluster or reduce load.

## Alert Conditions

```yaml
# High heap usage
- alert: ElasticsearchHighHeap
  condition: jvm.memory.heap.utilization > 0.85
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
  condition: rate(elasticsearch.node.thread_pool.tasks.finished{thread_pool_name="write", state="rejected"}[5m]) > 0
  severity: critical
  message: "Write operations being rejected on node {{ node }}"

# Search queue building up
- alert: ElasticsearchSearchQueueHigh
  condition: elasticsearch.node.thread_pool.tasks.queued{thread_pool_name="search"} > 100
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
- Consider using the frozen data tier or searchable snapshots for old data

If you see thread pool rejections:
- Increase the thread pool queue size (temporary fix)
- Add more nodes (permanent fix)
- Optimize slow queries that hold threads

## Summary

JVM health is fundamental to Elasticsearch performance. Monitor heap utilization to prevent OOM conditions, track GC pause duration and overhead to detect collection pressure, and watch thread pool queues and rejections to spot saturation. The OpenTelemetry Collector's Elasticsearch receiver captures all these metrics from the cluster API, giving you JVM visibility without installing agents on Elasticsearch nodes.
