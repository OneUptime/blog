# How to Migrate from Elasticsearch to ClickHouse for Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Elasticsearch, Migration, Log Analytics, Observability, Search

Description: Replace Elasticsearch with ClickHouse for log analytics to reduce storage costs and improve aggregation query performance on high-volume log data.

---

Elasticsearch is widely used for log analytics, but its inverted index structure optimizes for full-text search rather than aggregations. ClickHouse's columnar storage handles aggregation queries over log data much faster and at a fraction of the storage cost.

## When ClickHouse Beats Elasticsearch for Logs

- GROUP BY aggregations (ClickHouse is 10-100x faster)
- Storage efficiency (ClickHouse uses 3-5x less disk space)
- Long-term retention analytics
- Time-series dashboards with many data points

Elasticsearch remains better for:
- Full-text search with relevance scoring
- Complex nested document queries

## Step 1 - Export Data from Elasticsearch

Use Elasticsearch's Scroll API or `elasticsearch-dump`:

```bash
npm install -g elasticdump

elasticdump \
  --input=http://localhost:9200/logs-2024-01 \
  --output=/tmp/logs-2024-01.jsonl \
  --type=data \
  --limit=10000
```

For large indices, use Logstash:

```text
input {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "logs-*"
    query => '{"query": {"range": {"@timestamp": {"gte": "2024-01-01"}}}}'
    scroll => "5m"
    size => 5000
  }
}
output {
  file {
    path => "/tmp/logs_export.jsonl"
    codec => "json_lines"
  }
}
```

## Step 2 - Create the ClickHouse Logs Table

```sql
CREATE TABLE logs.application_logs
(
    timestamp       DateTime,
    level           LowCardinality(String),
    service         LowCardinality(String),
    message         String,
    trace_id        String,
    span_id         String,
    user_id         String,
    status_code     UInt16 DEFAULT 0,
    duration_ms     UInt32 DEFAULT 0,
    extra           String DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, service, level)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

## Step 3 - Load Exported Logs

```bash
clickhouse-client \
  --query "INSERT INTO logs.application_logs FORMAT JSONEachRow" \
  < /tmp/logs-2024-01.jsonl
```

Or via S3:

```sql
INSERT INTO logs.application_logs
SELECT
    parseDateTimeBestEffort(`@timestamp`) AS timestamp,
    level,
    service,
    message,
    coalesce(trace_id, '') AS trace_id,
    coalesce(span_id, '') AS span_id,
    coalesce(user_id, '') AS user_id,
    coalesce(status_code, 0) AS status_code,
    coalesce(duration_ms, 0) AS duration_ms
FROM s3('s3://bucket/es-export/*.jsonl', 'KEY', 'SECRET', 'JSONEachRow');
```

## Step 4 - Querying Logs in ClickHouse

```sql
-- Error rate by service over time
SELECT
    toStartOfMinute(timestamp) AS minute,
    service,
    countIf(level = 'ERROR') AS errors,
    count() AS total,
    errors / total AS error_rate
FROM logs.application_logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY minute, service
ORDER BY minute, error_rate DESC;
```

```sql
-- Full-text search equivalent (not as fast as ES but workable)
SELECT timestamp, service, message
FROM logs.application_logs
WHERE message LIKE '%connection refused%'
  AND timestamp >= today()
ORDER BY timestamp DESC
LIMIT 100;
```

## Step 5 - Set Up Ongoing Ingestion

Replace Logstash/Beats with Vector or Fluent Bit for direct ClickHouse ingestion:

```toml
[sinks.clickhouse]
type = "clickhouse"
inputs = ["my_source_id"]
endpoint = "http://localhost:8123"
database = "logs"
table = "application_logs"
compression = "gzip"
```

## Summary

ClickHouse dramatically reduces storage and infrastructure costs for log analytics while improving aggregation performance. The migration involves exporting Elasticsearch documents, loading them into a well-partitioned ClickHouse table, and routing new log data directly to ClickHouse via Vector or Fluent Bit.
