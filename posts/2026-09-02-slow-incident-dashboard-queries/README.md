# Why Are OpenSearch Dashboard Queries Slow During Incidents? Diagnosing Shards, Mappings, and Expensive Aggregations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Performance, Observability, Troubleshooting, Monitoring

Description: Isolate slow incident dashboards by capturing their searches, measuring queue and shard fan-out, and correcting mappings and costly aggregations.

---

Incident traffic changes both sides of an OpenSearch dashboard: ingestion surges create segments and mapping pressure while many responders run broad, auto-refreshing aggregations. The dashboard is often the first symptom, not the root cause.

Diagnose one slow panel and one request before tuning the whole cluster.

## Capture the actual search

Use the panel's inspection capability or browser network tools to capture the `_msearch` request, data source, index expression, time range, and response timing. Reproduce the individual search in Dev Tools with the same user when possible.

Record:

- target indexes and total shards;
- `took`, timeout, and partial shard failures;
- query and aggregation tree;
- requested date range and refresh interval;
- response size and number of buckets.

Client-perceived latency can exceed OpenSearch `took` because `took` excludes request and response transmission over the client network. The top-level search `took` does include coordinating-to-data-node communication, time queued in the search thread pool, fetch work, and the search itself. By contrast, the Profile breakdown excludes network latency, fetch time, queue time, and coordinating-node idle time.

## Check saturation before rewriting queries

```http
GET _cat/thread_pool/search?v&h=node_name,name,active,queue,rejected,completed

GET _nodes/stats/indices,jvm,breaker,fs/search?human=true

GET _cat/shards/logs-*?v&h=index,shard,prirep,state,docs,store,node&s=store:desc

GET _cluster/health?level=shards
```

Search rejections or a growing queue indicate capacity contention. High JVM pressure, circuit-breaker trips, disk latency, shard relocation, and unassigned shards change the remedy. Increasing the search thread pool blindly can increase contention and heap use rather than improve throughput.

During an incident, reduce dashboard auto-refresh and narrow the time range before making durable cluster changes.

## Measure shard fan-out

A search runs against a copy of every matching shard. Patterns that span thousands of tiny daily indexes create coordination overhead even when each shard holds little data.

```http
GET _resolve/index/logs-*
GET _search_shards/logs-*
```

Repair the lifecycle instead of hiding the symptom:

- use specific index patterns by environment/service;
- roll over by size and age;
- consolidate persistently tiny shards in future indexes;
- use stable aliases/data streams for the intended retention window;
- avoid panels that query cold history by default.

`max_concurrent_shard_requests` can cap per-request concurrency, and `action.search.shard_count.limit` can reject dangerously broad searches, but both are guardrails rather than a fix for oversharding.

## Verify mappings used by filters and aggregations

```http
POST logs-*/_field_caps?fields=@timestamp,service.name,message,trace_id,duration_ms
```

Look for type conflicts across rollover generations. Filters and aggregations should use fit-for-purpose fields:

- `date` for the time picker and date histogram;
- `keyword` for exact filters and terms aggregations;
- numeric types for latency and size metrics;
- `text` for full-text search, usually with a keyword multi-field where exact grouping is needed.

Do not enable `fielddata` on a text field as a quick dashboard fix. It loads analyzed tokens into heap and can be extremely expensive. Add a keyword field in a corrected template and reindex the data needed by the panel.

High-cardinality terms such as request ID, trace ID, session ID, or raw URL can create many buckets and global ordinals. Avoid grouping by them on an overview dashboard. Use them for targeted lookup after narrowing the incident.

## Profile one representative request

Add `"profile": true` to the isolated search:

```http
GET logs-prod-*/_search
{
  "profile": true,
  "size": 0,
  "query": {
    "range": {"@timestamp": {"gte": "now-15m"}}
  },
  "aggs": {
    "errors_by_service": {
      "terms": {"field": "service.name", "size": 20}
    }
  }
}
```

The Profile API adds overhead; use it for a bounded diagnostic, not continuously in production. It reports query and aggregation component timings per shard but not network, queue, or fetch latency.

Also enable shard slow logs with a deliberate threshold for a limited period. Slow logs execute per shard, so correlate their timestamps and request source with the dashboard request rather than summing them as end-to-end latency.

## Remove expensive query patterns

OpenSearch classifies wildcard, regular-expression, fuzzy, prefix, and some range/query-string operations as potentially expensive. Common dashboard problems include:

- a leading wildcard over `message`;
- a very large terms aggregation size;
- deeply nested aggregations multiplied across panels;
- scripted/runtime calculations repeated on every refresh;
- missing `size: 0` on aggregation-only panels;
- an interval so small that a long range exceeds useful bucket counts.

Use exact filters, precomputed normalized fields, sensible top-N limits, and coarser date histograms. OpenSearch's `search.max_buckets` is a safety ceiling, not a target.

## Validate under incident-shaped load

Replay the corrected request against a production-sized test dataset, then test the entire dashboard with concurrent viewers and normal ingestion. Compare p50/p95 panel latency, search queue/rejections, heap, shard fan-out, and response size. A single fast Dev Tools query does not prove that twelve auto-refreshing panels are safe.

## Official References

- [OpenSearch Profile API](https://docs.opensearch.org/latest/api-reference/search-apis/profile/)
- [OpenSearch expensive queries](https://docs.opensearch.org/latest/query-dsl/)
- [OpenSearch search shard routing and limits](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)
- [OpenSearch field data mapping](https://docs.opensearch.org/latest/mappings/mapping-parameters/field-data/)
- [OpenSearch Dashboards search settings](https://docs.opensearch.org/latest/dashboards/management/advanced-settings/)
