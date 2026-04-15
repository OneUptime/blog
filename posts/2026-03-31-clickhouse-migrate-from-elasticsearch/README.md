# How to Migrate from Elasticsearch to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Elasticsearch, Migration, Database, Search, Analytics, Log

Description: Migrate log and analytics data from Elasticsearch to ClickHouse by exporting via scroll API, mapping field types, and recreating aggregation and filtering queries in SQL.

---

Elasticsearch was designed for full-text search and log storage, but its aggregation performance at billion-document scale often requires large cluster deployments. ClickHouse handles the same analytical workloads with far less infrastructure while providing SQL syntax and faster aggregation queries. This guide covers migrating from Elasticsearch to ClickHouse.

## When to Consider Migrating

ClickHouse is a better fit than Elasticsearch when:

- Your primary workload is `aggs` (aggregations), not full-text search
- You are running Kibana dashboards that are slow to load
- Disk costs are high due to Elasticsearch's replication overhead
- You want standard SQL instead of the Elasticsearch Query DSL
- You need joins between log data and reference tables

Keep Elasticsearch when full-text search with relevance scoring is your core use case.

## Understanding the Data Model Differences

Elasticsearch stores JSON documents in inverted indexes. ClickHouse stores columns in compressed files. The key differences:

| Feature | Elasticsearch | ClickHouse |
|---------|--------------|------------|
| Query language | DSL / SQL (limited) | Full SQL |
| Data model | Documents | Rows and columns |
| Full-text search | Native, excellent | Limited (token bloom filters) |
| Aggregation speed | Good | Excellent |
| Storage efficiency | Low (inverted index overhead) | High (columnar + compression) |
| Schema | Dynamic / schemaless | Typed, defined upfront |

## Field Type Mapping

| Elasticsearch | ClickHouse |
|--------------|------------|
| keyword | LowCardinality(String) |
| text | String |
| long | Int64 |
| integer | Int32 |
| short | Int16 |
| byte | Int8 |
| float | Float32 |
| double | Float64 |
| boolean | Bool |
| date | DateTime or DateTime64(3) |
| ip | IPv4 or IPv6 |
| nested | Array or separate table |
| object | String (JSON) or flattened columns |
| geo_point | Tuple(Float64, Float64) |

## Step 1: Understand Your Elasticsearch Index

Inspect the index mapping to understand field types:

```bash
curl -X GET "http://localhost:9200/logs/_mapping?pretty"
```

Example output:

```json
{
  "logs": {
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level":      { "type": "keyword" },
        "service":    { "type": "keyword" },
        "message":    { "type": "text" },
        "host":       { "type": "keyword" },
        "duration_ms": { "type": "long" },
        "status_code": { "type": "integer" },
        "user_id":    { "type": "long" }
      }
    }
  }
}
```

## Step 2: Design the ClickHouse Schema

```sql
CREATE TABLE logs
(
    ts           DateTime64(3),
    level        LowCardinality(String),
    service      LowCardinality(String),
    message      String,
    host         LowCardinality(String),
    duration_ms  UInt32,
    status_code  UInt16,
    user_id      UInt64          DEFAULT 0,
    INDEX idx_level   (level)   TYPE bloom_filter GRANULARITY 4,
    INDEX idx_service (service) TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (service, level, ts)
TTL ts + INTERVAL 90 DAY;
```

## Step 3: Export from Elasticsearch Using Scroll API

For large indexes, use the scroll API to paginate through all documents:

```python
# export_elasticsearch.py
import json
from elasticsearch import Elasticsearch

es     = Elasticsearch("http://localhost:9200")
index  = "logs"
output = open("/tmp/logs.ndjson", "w")

result = es.search(
    index=index,
    body={"query": {"match_all": {}}},
    size=5000,
    scroll="5m",
)

scroll_id  = result["_scroll_id"]
hits       = result["hits"]["hits"]
total      = result["hits"]["total"]["value"]
exported   = 0

while hits:
    for hit in hits:
        src = hit["_source"]
        output.write(json.dumps(src) + "\n")
    exported += len(hits)
    print(f"Exported {exported}/{total}", end="\r")

    result    = es.scroll(scroll_id=scroll_id, scroll="5m")
    scroll_id = result["_scroll_id"]
    hits      = result["hits"]["hits"]

output.close()
es.clear_scroll(scroll_id=scroll_id)
print(f"\nExport complete: {exported} documents")
```

Run the export:

```bash
pip install elasticsearch
python export_elasticsearch.py
```

## Step 4: Transform and Load into ClickHouse

Create a transformation script that converts the NDJSON export to ClickHouse's format:

```python
# transform_and_load.py
import json
import subprocess

def transform(doc: dict) -> dict:
    return {
        "ts":          doc.get("@timestamp", "")[:23].replace("T", " ").replace("Z", ""),
        "level":       doc.get("level", "info"),
        "service":     doc.get("service", "unknown"),
        "message":     doc.get("message", ""),
        "host":        doc.get("host", ""),
        "duration_ms": int(doc.get("duration_ms", 0)),
        "status_code": int(doc.get("status_code", 0)),
        "user_id":     int(doc.get("user_id", 0)),
    }

batch = []
columns = ["ts", "level", "service", "message", "host", "duration_ms", "status_code", "user_id"]

with open("/tmp/logs.ndjson") as f:
    for line in f:
        doc = json.loads(line.strip())
        row = transform(doc)
        batch.append("\t".join(str(row[c]) for c in columns))

        if len(batch) >= 50_000:
            data = "\n".join(batch)
            proc = subprocess.run(
                ["clickhouse-client", "--database", "analytics",
                 "--query", "INSERT INTO logs FORMAT TSV"],
                input=data.encode(),
                capture_output=True,
            )
            if proc.returncode != 0:
                print("Insert error:", proc.stderr.decode())
            batch.clear()

# Final batch
if batch:
    data = "\n".join(batch)
    subprocess.run(
        ["clickhouse-client", "--database", "analytics",
         "--query", "INSERT INTO logs FORMAT TSV"],
        input=data.encode(),
    )

print("Load complete")
```

## Step 5: Direct Load via ClickHouse SQL

For smaller indexes, you can load data directly using the `url()` table function to query the Elasticsearch HTTP API. This approach is limited to the number of documents returned in a single search request (controlled by the `size` parameter). For full index migration with millions of documents, use the Python scroll-based approach from Steps 3 and 4.

```sql
INSERT INTO logs
SELECT
    parseDateTime64BestEffort(JSONExtractString(src, '@timestamp'), 3) AS ts,
    JSONExtractString(src, 'level')       AS level,
    JSONExtractString(src, 'service')     AS service,
    JSONExtractString(src, 'message')     AS message,
    JSONExtractString(src, 'host')        AS host,
    JSONExtractUInt(src, 'duration_ms')   AS duration_ms,
    JSONExtractUInt(src, 'status_code')   AS status_code,
    JSONExtractUInt(src, 'user_id')       AS user_id
FROM
(
    SELECT JSONExtractRaw(hit, '_source') AS src
    FROM
    (
        SELECT arrayJoin(
            JSONExtractArrayRaw(
                JSONExtractRaw(response, 'hits', 'hits')
            )
        ) AS hit
        FROM url(
            'http://localhost:9200/logs/_search?size=10000',
            'JSONAsString',
            'response String'
        )
    )
);
```

## Step 6: Rewrite Elasticsearch Queries as SQL

Most Elasticsearch aggregations translate directly to SQL:

```json
// Elasticsearch: terms aggregation
{
  "aggs": {
    "by_service": {
      "terms": { "field": "service", "size": 10 },
      "aggs": {
        "avg_duration": { "avg": { "field": "duration_ms" } }
      }
    }
  }
}
```

```sql
-- ClickHouse equivalent
SELECT
    service,
    count()           AS doc_count,
    avg(duration_ms)  AS avg_duration
FROM logs
GROUP BY service
ORDER BY doc_count DESC
LIMIT 10;
```

```json
// Elasticsearch: date histogram
{
  "aggs": {
    "per_hour": {
      "date_histogram": { "field": "@timestamp", "calendar_interval": "hour" },
      "aggs": {
        "error_rate": {
          "filter": { "term": { "level": "error" } }
        }
      }
    }
  }
}
```

```sql
-- ClickHouse equivalent
SELECT
    toStartOfHour(ts)            AS hour,
    count()                      AS total,
    countIf(level = 'error')     AS errors,
    round(100 * countIf(level = 'error') / count(), 2) AS error_rate_pct
FROM logs
GROUP BY hour
ORDER BY hour;
```

```json
// Elasticsearch: percentiles
{
  "aggs": {
    "latency_percentiles": {
      "percentiles": {
        "field": "duration_ms",
        "percents": [50, 95, 99]
      }
    }
  }
}
```

```sql
-- ClickHouse equivalent
SELECT
    quantile(0.50)(duration_ms) AS p50,
    quantile(0.95)(duration_ms) AS p95,
    quantile(0.99)(duration_ms) AS p99
FROM logs
WHERE ts >= now() - INTERVAL 1 HOUR;
```

## Handling Full-Text Search

ClickHouse does not have native full-text search. For keyword-in-message searches:

```sql
-- Fast for prefix matching
SELECT * FROM logs WHERE message LIKE 'Error connecting%' LIMIT 100;

-- Substring search (slower but works)
SELECT * FROM logs WHERE message LIKE '%OutOfMemoryError%' LIMIT 100;

-- Token matching (matches whole words; add a tokenbf_v1 index on message to accelerate)
SELECT * FROM logs WHERE hasToken(message, 'OutOfMemoryError') LIMIT 100;
```

For heavy full-text search, keep an Elasticsearch index for search and sync a subset of fields to ClickHouse for analytics.

## Continuous Sync with Logstash or Fluent Bit

Send logs to both Elasticsearch and ClickHouse simultaneously:

```text
# Fluent Bit configuration
[OUTPUT]
    Name            http
    Host            clickhouse.internal
    Port            8123
    URI             /?database=analytics&query=INSERT+INTO+logs+FORMAT+JSONEachRow
    Format          json_lines
    Json_date_key   ts
    Json_date_format iso8601
```

## Summary

Migrating from Elasticsearch to ClickHouse requires exporting documents via the scroll API, mapping field types to ClickHouse columns, and rewriting aggregation DSL as SQL. The migration delivers significant gains for dashboard-style analytical queries while using less disk space. Retain Elasticsearch for use cases that require full-text relevance scoring, and route all aggregation queries to ClickHouse.
