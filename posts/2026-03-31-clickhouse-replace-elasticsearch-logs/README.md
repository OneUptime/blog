# How to Replace Elasticsearch with ClickHouse for Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Elasticsearch, Log Analytics, Migration, Observability

Description: Replace Elasticsearch with ClickHouse for log analytics to cut storage costs by 5-10x and achieve faster aggregation queries on high-volume log data.

---

## Why Replace Elasticsearch

Elasticsearch is designed for full-text search with an inverted index. For log analytics, most queries are time-range filters with aggregations - a pattern where ClickHouse's columnar storage and vectorized execution dramatically outperforms Elasticsearch.

Key drivers for switching:
- Storage: ClickHouse compresses logs 5-10x better than Elasticsearch
- Query speed: aggregation queries are typically 10-50x faster
- Cost: fewer nodes needed for the same data volume
- Operations: single binary, no JVM tuning, no shard management

## Schema Design for Logs

Map Elasticsearch index fields to a ClickHouse table:

```sql
CREATE TABLE logs (
    timestamp    DateTime64(3) CODEC(Delta, ZSTD(3)),
    level        LowCardinality(String),
    service      LowCardinality(String),
    hostname     LowCardinality(String),
    trace_id     String CODEC(ZSTD(1)),
    message      String CODEC(ZSTD(3)),
    attributes   Map(String, String) CODEC(ZSTD(3))
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service, level, timestamp)
TTL toDate(timestamp) + INTERVAL 30 DAY DELETE
SETTINGS index_granularity = 8192;
```

## Migrating Historical Logs

Export from Elasticsearch and import into ClickHouse:

```bash
# Export using elasticdump
elasticdump \
  --input=http://es:9200/logs-2026.03 \
  --output=logs_2026_03.ndjson \
  --type=data

# Transform and load
python3 transform_es_to_ch.py logs_2026_03.ndjson | \
  clickhouse-client --query "INSERT INTO logs FORMAT JSONEachRow"
```

## Updating Log Shippers

Replace the Elasticsearch output in your log shipper. For Fluent Bit:

```text
[OUTPUT]
    Name        http
    Match       *
    Host        ch.internal
    Port        8123
    URI         /?query=INSERT%20INTO%20logs%20FORMAT%20JSONEachRow
    Format      json_lines
    Header      X-ClickHouse-User api_writer
    Retry_Limit 3
```

For Vector:

```text
[sinks.clickhouse]
type = "clickhouse"
inputs = ["parse_logs"]
endpoint = "http://ch.internal:8123"
database = "default"
table = "logs"
```

## Common Log Queries

Time-range filter with text search:

```sql
SELECT timestamp, service, level, message
FROM logs
WHERE service = 'api-gateway'
  AND level IN ('ERROR', 'WARN')
  AND timestamp >= now() - INTERVAL 1 HOUR
  AND message LIKE '%timeout%'
ORDER BY timestamp DESC
LIMIT 200;
```

Error rate by service:

```sql
SELECT
    service,
    countIf(level = 'ERROR') AS errors,
    count() AS total,
    round(countIf(level = 'ERROR') / count() * 100, 2) AS error_pct
FROM logs
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY service
ORDER BY error_pct DESC;
```

## What Elasticsearch Does Better

ClickHouse does not replace Elasticsearch for use cases that require:
- Full-text relevance scoring
- Fuzzy search
- Complex nested JSON search with dynamic schema

For structured log analytics, ClickHouse wins. For free-text document search, Elasticsearch is still the better choice.

## Summary

Replacing Elasticsearch with ClickHouse for log analytics delivers significant storage savings and faster aggregation queries. The migration involves redesigning the log schema for columnar storage, updating shippers, and translating KQL queries to SQL.
