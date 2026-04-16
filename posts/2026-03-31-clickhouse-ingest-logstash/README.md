# How to Ingest Data from Logstash into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Logstash, Log Ingestion, HTTP Output, Analytics

Description: Learn how to configure Logstash to forward processed log data into ClickHouse using the HTTP output plugin with batching and JSON formatting.

---

Logstash can send processed events to ClickHouse using its HTTP output plugin. While there is no dedicated ClickHouse plugin, the HTTP output targets ClickHouse's native HTTP interface directly.

## Target Table

```sql
CREATE TABLE logs (
    ts DateTime,
    level LowCardinality(String),
    service String,
    host String,
    message String,
    fields String  -- JSON for extra fields
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (service, ts)
TTL ts + INTERVAL 90 DAY;
```

## Logstash Pipeline Configuration

```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
  mutate {
    rename => { "@timestamp" => "ts" }
    add_field => { "fields" => "%{[fields]}" }
  }
}

output {
  http {
    url => "http://clickhouse:8123/?query=INSERT+INTO+logs+FORMAT+JSONEachRow"
    http_method => "post"
    content_type => "application/json"
    format => "json"
    http_compression => true

    headers => {
      "X-ClickHouse-User" => "default"
      "X-ClickHouse-Key" => "${CLICKHOUSE_PASSWORD}"
    }
  }
}
```

## Handling Field Mapping

Logstash events use `@timestamp`. Rename it before sending:

```ruby
filter {
  mutate {
    rename => { "@timestamp" => "ts" }
    convert => { "ts" => "string" }
    gsub => ["ts", "T", " ", "ts", "Z", ""]
  }
}
```

## Testing the Pipeline

Start Logstash with the config:

```bash
bin/logstash -f /etc/logstash/conf.d/clickhouse.conf
```

Then ship a test event from a Beats producer (e.g. Filebeat) pointed at port 5044 and verify in ClickHouse:

```sql
SELECT service, level, count()
FROM logs
WHERE ts >= now() - INTERVAL 10 MINUTE
GROUP BY service, level;
```

## Performance Tips

- Enable `async_insert=1` (and `wait_for_async_insert=0`) in the ClickHouse URL to let the server buffer inserts and reduce part creation
- Raise `pipeline.workers` in `logstash.yml` to parallelise HTTP requests, since the `http` output sends one event per request with `format => json`
- Use a Buffer table to absorb bursts

## Summary

Logstash forwards events to ClickHouse via the HTTP output plugin targeting the ClickHouse HTTP interface. Pair `format => json` with ClickHouse's `async_insert=1` URL parameter to get server-side batching. Rename Logstash's `@timestamp` to match the ClickHouse column name before sending.
