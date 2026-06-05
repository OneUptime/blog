# How to Track Elasticsearch Indexing Rate, Search Latency, and Merge Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, Indexing, Search Performance

Description: Track Elasticsearch indexing rate, search latency, and segment merge throughput using the OpenTelemetry Collector Elasticsearch receiver for performance tuning.

Elasticsearch performance depends on three core operations: indexing documents, searching them, and merging segments. Tracking these metrics helps you identify bottlenecks, tune your cluster, and prevent performance degradation. The OpenTelemetry Collector's Elasticsearch receiver captures these metrics from Elasticsearch node stats, cluster health, and index stats APIs.

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
      # Index, search, and merge operation metrics
      elasticsearch.node.operations.completed:
        enabled: true
      elasticsearch.node.operations.time:
        enabled: true
      elasticsearch.index.operations.completed:
        enabled: true
      elasticsearch.index.operations.time:
        enabled: true
      # Merge metrics
      elasticsearch.index.operations.merge.current:
        enabled: true
      elasticsearch.index.operations.merge.docs_count:
        enabled: true
      elasticsearch.index.operations.merge.size:
        enabled: true
      # Rejection metrics
      elasticsearch.indexing_pressure.memory.total.primary_rejections:
        enabled: true
      elasticsearch.indexing_pressure.memory.total.replica_rejections:
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

## Understanding Indexing Metrics

### Indexing Rate

The indexing rate tells you how many index operations per second Elasticsearch is ingesting:

```text
elasticsearch.node.operations.completed{operation="index"} - Completed index operations
elasticsearch.node.operations.time{operation="index"}      - Time spent indexing in milliseconds
```

Calculate the rate:
```text
indexing_rate = rate(elasticsearch.node.operations.completed{operation="index"}[5m])
```

A healthy indexing rate depends on your hardware and document size. Watch for sudden drops which may indicate resource constraints.

### Indexing Latency

```text
avg_indexing_latency = elasticsearch.node.operations.time{operation="index"} / elasticsearch.node.operations.completed{operation="index"}
```
This gives a cumulative average since the node started. For recent latency, divide the rates over the same window:
```text
avg_indexing_latency = rate(elasticsearch.node.operations.time{operation="index"}[5m]) / rate(elasticsearch.node.operations.completed{operation="index"}[5m])
```

If average indexing latency increases, possible causes include:
- Disk I/O saturation
- Too many concurrent merges
- Complex index mappings with many fields
- Slow ingest pipelines

### Per-Index Indexing

```text
elasticsearch.index.operations.completed{operation="index"} - Completed index operations (per index)
elasticsearch.index.operations.time{operation="index"}      - Time spent indexing in milliseconds (per index)
```

## Understanding Search Metrics

### Query Latency

Search operations have two phases: query (finding matching documents) and fetch (retrieving document content):

```text
elasticsearch.index.operations.completed{operation="query"} - Total search queries
elasticsearch.index.operations.time{operation="query"}      - Total query time in milliseconds
elasticsearch.index.operations.completed{operation="fetch"} - Total fetch operations
elasticsearch.index.operations.time{operation="fetch"}      - Total fetch time in milliseconds
```

Calculate average search latency:
```text
avg_query_latency = rate(elasticsearch.index.operations.time{operation="query"}[5m]) / rate(elasticsearch.index.operations.completed{operation="query"}[5m])
avg_fetch_latency = rate(elasticsearch.index.operations.time{operation="fetch"}[5m]) / rate(elasticsearch.index.operations.completed{operation="fetch"}[5m])
total_search_latency = avg_query_latency + avg_fetch_latency
```

### Search Rate

```text
search_rate = rate(elasticsearch.index.operations.completed{operation="query"}[5m])
```

Track this alongside query latency. If search rate increases and latency stays flat, your cluster is handling the load well. If latency increases with rate, you may need to scale.

### Scroll and Suggest

```text
elasticsearch.index.operations.completed{operation="scroll"}  - Scroll queries
elasticsearch.index.operations.time{operation="scroll"}       - Scroll query time
elasticsearch.index.operations.completed{operation="suggest"} - Suggest queries
```

## Understanding Merge Metrics

Elasticsearch uses Lucene under the hood, which periodically merges small segments into larger ones. This is essential for search performance but consumes I/O:

```text
elasticsearch.index.operations.completed{operation="merge"} - Total merge operations
elasticsearch.index.operations.time{operation="merge"}      - Time spent merging in milliseconds
elasticsearch.index.operations.merge.docs_count             - Documents merged
elasticsearch.index.operations.merge.size                   - Bytes merged
elasticsearch.index.operations.merge.current                - Currently active merges
```

### Merge Throughput

```text
merge_throughput = rate(elasticsearch.index.operations.merge.size[5m])
```

High merge throughput means Elasticsearch is doing a lot of background I/O. If merges cannot keep up with indexing, segment count grows and search performance degrades.

## Alert Conditions

```yaml
# Indexing latency spike

- alert: ElasticsearchSlowIndexing
  condition: avg_indexing_latency > 100ms
  for: 5m
  severity: warning

# Search latency spike
- alert: ElasticsearchSlowSearch
  condition: avg_query_latency > 500ms
  for: 5m
  severity: warning

# Merge falling behind
- alert: ElasticsearchMergeBacklog
  condition: elasticsearch.index.operations.merge.current > 5
  for: 10m
  severity: warning
  message: "Too many concurrent merges. I/O may be saturated."

# Indexing rejection
- alert: ElasticsearchIndexingRejected
  condition: rate(elasticsearch.indexing_pressure.memory.total.primary_rejections[5m]) + rate(elasticsearch.indexing_pressure.memory.total.replica_rejections[5m]) > 0
  severity: critical
```

## Per-Index Monitoring

The Elasticsearch receiver can collect per-index metrics. This helps identify which index is causing problems:

```yaml
receivers:
  elasticsearch:
    endpoint: https://elasticsearch:9200
    username: monitoring_user
    password: "${ES_PASSWORD}"
    collection_interval: 15s
    # Collect index-level metrics
    indices: ["_all"]
```

Per-index metrics let you find the index with the highest indexing rate, slowest search latency, or most merge activity.

## Summary

Indexing rate, search latency, and merge throughput are the three pillars of Elasticsearch performance monitoring. The OpenTelemetry Collector's Elasticsearch receiver captures all three from Elasticsearch node stats, cluster health, and index stats APIs. Track indexing rate and latency to ensure data ingestion keeps up, monitor search query and fetch times to maintain query performance, and watch merge throughput and concurrent merge count to detect I/O saturation. Set alerts on each metric to catch performance degradation early.
