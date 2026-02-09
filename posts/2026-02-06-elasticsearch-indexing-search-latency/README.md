# How to Track Elasticsearch Indexing Rate, Search Latency, and Merge Throughput with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, Indexing, Search Performance

Description: Track Elasticsearch indexing rate, search latency, and segment merge throughput using the OpenTelemetry Collector Elasticsearch receiver for performance tuning.

Elasticsearch performance depends on three core operations: indexing documents, searching them, and merging segments. Tracking these metrics helps you identify bottlenecks, tune your cluster, and prevent performance degradation. The OpenTelemetry Collector's Elasticsearch receiver captures all these metrics from the cluster API.

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
      # Indexing metrics
      elasticsearch.node.operations.completed:
        enabled: true
      elasticsearch.node.operations.time:
        enabled: true
      elasticsearch.indexing.index.total:
        enabled: true
      elasticsearch.indexing.index.time:
        enabled: true
      # Search metrics
      elasticsearch.node.operations.completed:
        enabled: true
      elasticsearch.indices.search.query.total:
        enabled: true
      elasticsearch.indices.search.query.time:
        enabled: true
      elasticsearch.indices.search.fetch.total:
        enabled: true
      # Merge metrics
      elasticsearch.indices.merges.total:
        enabled: true
      elasticsearch.indices.merges.total_time:
        enabled: true
      elasticsearch.indices.merges.total_docs:
        enabled: true
      elasticsearch.indices.merges.total_size:
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

The indexing rate tells you how many documents per second Elasticsearch is ingesting:

```
elasticsearch.node.operations.completed{operation="index"} - Total indexed documents
elasticsearch.node.operations.time{operation="index"}      - Time spent indexing
```

Calculate the rate:
```
indexing_rate = rate(elasticsearch.node.operations.completed{operation="index"}[5m])
```

A healthy indexing rate depends on your hardware and document size. Watch for sudden drops which may indicate resource constraints.

### Indexing Latency

```
avg_indexing_latency = elasticsearch.node.operations.time{operation="index"} / elasticsearch.node.operations.completed{operation="index"}
```

If average indexing latency increases, possible causes include:
- Disk I/O saturation
- Too many concurrent merges
- Complex index mappings with many fields
- Slow ingest pipelines

### Bulk Indexing

```
elasticsearch.indices.indexing.index_total    - Documents indexed (per index)
elasticsearch.indices.indexing.index_time_ms  - Time spent in indexing
```

## Understanding Search Metrics

### Query Latency

Search operations have two phases: query (finding matching documents) and fetch (retrieving document content):

```
elasticsearch.indices.search.query.total   - Total search queries
elasticsearch.indices.search.query.time    - Total query time
elasticsearch.indices.search.fetch.total   - Total fetch operations
elasticsearch.indices.search.fetch.time    - Total fetch time
```

Calculate average search latency:
```
avg_query_latency = search.query.time / search.query.total
avg_fetch_latency = search.fetch.time / search.fetch.total
total_search_latency = avg_query_latency + avg_fetch_latency
```

### Search Rate

```
search_rate = rate(elasticsearch.indices.search.query.total[5m])
```

Track this alongside query latency. If search rate increases and latency stays flat, your cluster is handling the load well. If latency increases with rate, you may need to scale.

### Scroll and Suggest

```
elasticsearch.indices.search.scroll.total    - Scroll queries
elasticsearch.indices.search.scroll.time     - Scroll query time
elasticsearch.indices.search.suggest.total   - Suggest queries
```

## Understanding Merge Metrics

Elasticsearch uses Lucene under the hood, which periodically merges small segments into larger ones. This is essential for search performance but consumes I/O:

```
elasticsearch.indices.merges.total           - Total merge operations
elasticsearch.indices.merges.total_time      - Time spent merging
elasticsearch.indices.merges.total_docs      - Documents merged
elasticsearch.indices.merges.total_size      - Bytes merged
elasticsearch.indices.merges.current         - Currently active merges
elasticsearch.indices.merges.current_docs    - Documents in active merges
```

### Merge Throughput

```
merge_throughput = rate(elasticsearch.indices.merges.total_size[5m])
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
  condition: elasticsearch.indices.merges.current > 5
  for: 10m
  severity: warning
  message: "Too many concurrent merges. I/O may be saturated."

# Indexing rejection
- alert: ElasticsearchIndexingRejected
  condition: rate(elasticsearch.node.operations.completed{operation="index_failed"}[5m]) > 0
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

Indexing rate, search latency, and merge throughput are the three pillars of Elasticsearch performance monitoring. The OpenTelemetry Collector's Elasticsearch receiver captures all three from the cluster API. Track indexing rate and latency to ensure data ingestion keeps up, monitor search query and fetch times to maintain query performance, and watch merge throughput and concurrent merge count to detect I/O saturation. Set alerts on each metric to catch performance degradation early.
