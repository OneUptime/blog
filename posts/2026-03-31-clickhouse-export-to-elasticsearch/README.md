# How to Export ClickHouse Data to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Elasticsearch, Data Export, ETL, Integration

Description: Learn how to export data from ClickHouse to Elasticsearch using HTTP URLs, the elasticsearch engine table, and bulk indexing scripts.

---

## Why Export ClickHouse Data to Elasticsearch

ClickHouse excels at analytical queries over large datasets, while Elasticsearch is optimized for full-text search, document retrieval, and rich query DSL. You may need to export data from ClickHouse to Elasticsearch when your search tier needs fresh analytical data, or when you want to combine OLAP results with Elasticsearch dashboards.

## Method 1 - Using the HTTP Table Engine

ClickHouse can write directly to an Elasticsearch index via its HTTP endpoint. You can use the `url` table function or a remote table engine pointing at Elasticsearch's bulk API.

```sql
INSERT INTO FUNCTION url(
  'http://elasticsearch:9200/myindex/_bulk',
  'JSONEachRow'
)
SELECT
  toString(user_id) AS _id,
  event_type,
  toUnixTimestamp(event_time) AS timestamp,
  properties
FROM events
WHERE event_date = today()
```

Note: Elasticsearch's `_bulk` API requires the NDJSON format with action lines. For complex payloads, a thin script is more reliable.

## Method 2 - Python Script with Bulk Indexing

A Python script gives you full control over field mapping, index lifecycle policies, and error handling.

```python
import clickhouse_connect
from elasticsearch import Elasticsearch, helpers

ch = clickhouse_connect.get_client(host='clickhouse', port=8123)
es = Elasticsearch('http://elasticsearch:9200')

result = ch.query(
    'SELECT user_id, event_type, event_time, properties '
    'FROM events WHERE event_date = today()'
)

def generate_docs(rows):
    for row in rows:
        yield {
            '_index': 'events',
            '_id': str(row[0]),
            '_source': {
                'user_id': row[0],
                'event_type': row[1],
                'event_time': row[2].isoformat(),
                'properties': row[3],
            }
        }

helpers.bulk(es, generate_docs(result.result_rows))
print('Indexing complete')
```

## Method 3 - Using Logstash with ClickHouse JDBC Input

Logstash can pull from ClickHouse using the JDBC input plugin and push to Elasticsearch.

```text
input {
  jdbc {
    jdbc_driver_library => "/opt/logstash/drivers/clickhouse-jdbc.jar"
    jdbc_driver_class => "com.clickhouse.jdbc.ClickHouseDriver"
    jdbc_connection_string => "jdbc:clickhouse://clickhouse:8123/default"
    jdbc_user => "default"
    schedule => "*/5 * * * *"
    statement => "SELECT user_id, event_type, event_time FROM events WHERE event_date = today()"
  }
}
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "events-%{+YYYY.MM.dd}"
  }
}
```

## Handling Schema Differences

ClickHouse uses strongly typed columns; Elasticsearch uses dynamic mappings by default. Always define explicit index mappings before bulk loading to avoid field type conflicts.

```bash
curl -X PUT "http://elasticsearch:9200/events" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "user_id": { "type": "keyword" },
      "event_type": { "type": "keyword" },
      "event_time": { "type": "date" }
    }
  }
}'
```

## Summary

You can export ClickHouse data to Elasticsearch using the HTTP table engine for simple cases, a Python bulk-indexing script for production workloads, or Logstash for scheduled incremental sync. Always define Elasticsearch mappings upfront to prevent type coercion issues.
