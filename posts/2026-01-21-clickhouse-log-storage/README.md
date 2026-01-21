# How to Store and Query Logs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Logging, Log Management, Observability, Database, Analytics, ELK Alternative, Time-Series

Description: A comprehensive guide to using ClickHouse as a log storage backend, covering schema design, log ingestion pipelines, LogQL-style queries, and cost-effective log retention strategies.

---

ClickHouse can store and query logs at a fraction of the cost of Elasticsearch while providing faster query performance. This guide covers how to design log tables, ingest logs from various sources, and run efficient log queries.

## Log Table Schema Design

### Basic Log Schema

```sql
CREATE TABLE logs
(
    -- Timestamp and identification
    timestamp DateTime64(3),
    trace_id String,
    span_id String,

    -- Log metadata
    level LowCardinality(String),
    service LowCardinality(String),
    host LowCardinality(String),
    environment LowCardinality(String),

    -- Log content
    message String,
    attributes Map(String, String),

    -- Indexing helpers
    log_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, level, timestamp)
TTL log_date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;
```

### Optimized Schema with Indexes

```sql
CREATE TABLE logs
(
    timestamp DateTime64(3),
    trace_id String,
    span_id String,

    level LowCardinality(String),
    service LowCardinality(String),
    host LowCardinality(String),
    environment LowCardinality(String),

    message String,
    attributes Map(String, String),

    log_date Date DEFAULT toDate(timestamp),

    -- Skip indexes for common search patterns
    INDEX idx_trace_id trace_id TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_message message TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4,
    INDEX idx_level level TYPE set(100) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp)
TTL log_date + INTERVAL 30 DAY;
```

### JSON Logs Schema

```sql
-- For semi-structured JSON logs
CREATE TABLE json_logs
(
    timestamp DateTime64(3),
    raw_json String,

    -- Extracted fields for indexing
    level LowCardinality(String) DEFAULT JSONExtractString(raw_json, 'level'),
    service LowCardinality(String) DEFAULT JSONExtractString(raw_json, 'service'),
    message String DEFAULT JSONExtractString(raw_json, 'message'),
    trace_id String DEFAULT JSONExtractString(raw_json, 'trace_id'),

    log_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp)
TTL log_date + INTERVAL 30 DAY;
```

## Log Ingestion

### Vector Configuration

```toml
# vector.toml
[sources.docker_logs]
type = "docker_logs"
include_containers = ["*"]

[transforms.parse_logs]
type = "remap"
inputs = ["docker_logs"]
source = '''
  .timestamp = del(.timestamp)
  .service = del(.container_name)
  .host = del(.host)
  .message = del(.message)

  # Parse JSON if present
  parsed, err = parse_json(.message)
  if err == null {
    .level = parsed.level ?? "info"
    .trace_id = parsed.trace_id ?? ""
    .attributes = parsed
    del(.attributes.message)
    del(.attributes.level)
    del(.attributes.trace_id)
  } else {
    .level = "info"
    .trace_id = ""
    .attributes = {}
  }
'''

[sinks.clickhouse]
type = "clickhouse"
inputs = ["parse_logs"]
endpoint = "http://clickhouse:8123"
database = "logs"
table = "logs"
skip_unknown_fields = true

[sinks.clickhouse.encoding]
timestamp_format = "rfc3339"
```

### Fluent Bit Configuration

```ini
# fluent-bit.conf
[SERVICE]
    Flush        1
    Log_Level    info

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Mem_Buf_Limit     50MB

[FILTER]
    Name         parser
    Match        *
    Key_Name     log
    Parser       json
    Reserve_Data True

[OUTPUT]
    Name         http
    Match        *
    Host         clickhouse
    Port         8123
    URI          /?query=INSERT%20INTO%20logs%20FORMAT%20JSONEachRow
    Format       json_lines
    json_date_key timestamp
    json_date_format epoch
```

### Promtail to ClickHouse

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://clickhouse:8123/?query=INSERT%20INTO%20logs%20FORMAT%20JSONEachRow

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: msg
            trace_id: trace_id
      - labels:
          level:
      - output:
          source: message
```

### Direct HTTP Insert

```python
import requests
import json
from datetime import datetime

def send_logs(logs):
    """Send logs to ClickHouse via HTTP interface."""
    data = '\n'.join(json.dumps({
        'timestamp': log.get('timestamp', datetime.utcnow().isoformat()),
        'level': log.get('level', 'info'),
        'service': log.get('service', 'unknown'),
        'host': log.get('host', 'unknown'),
        'message': log.get('message', ''),
        'trace_id': log.get('trace_id', ''),
        'attributes': log.get('attributes', {})
    }) for log in logs)

    response = requests.post(
        'http://clickhouse:8123/',
        params={'query': 'INSERT INTO logs FORMAT JSONEachRow'},
        data=data,
        headers={'Content-Type': 'application/json'}
    )

    return response.status_code == 200
```

## Log Query Patterns

### Basic Log Search

```sql
-- Search by service and time range
SELECT timestamp, level, message
FROM logs
WHERE service = 'api-gateway'
  AND timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 100;

-- Search by log level
SELECT timestamp, service, message
FROM logs
WHERE level = 'error'
  AND timestamp >= now() - INTERVAL 24 HOUR
ORDER BY timestamp DESC
LIMIT 1000;
```

### Full-Text Search

```sql
-- Search message content
SELECT timestamp, service, level, message
FROM logs
WHERE message LIKE '%connection refused%'
  AND timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC;

-- Multiple terms (AND)
SELECT timestamp, service, message
FROM logs
WHERE hasAll(splitByWhitespace(lower(message)), ['error', 'database'])
  AND timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC;

-- Regular expression search
SELECT timestamp, service, message
FROM logs
WHERE match(message, 'timeout.*\d+ms')
  AND timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC;
```

### Trace-Based Queries

```sql
-- Get all logs for a trace
SELECT timestamp, service, level, message
FROM logs
WHERE trace_id = 'abc-123-def-456'
ORDER BY timestamp;

-- Get error context (logs before and after error)
WITH error_time AS (
    SELECT timestamp
    FROM logs
    WHERE trace_id = 'abc-123-def-456'
      AND level = 'error'
    LIMIT 1
)
SELECT timestamp, service, level, message
FROM logs
WHERE trace_id = 'abc-123-def-456'
  AND timestamp BETWEEN
      (SELECT timestamp - INTERVAL 5 SECOND FROM error_time)
      AND
      (SELECT timestamp + INTERVAL 5 SECOND FROM error_time)
ORDER BY timestamp;
```

### Aggregation Queries

```sql
-- Error count by service
SELECT
    service,
    count() AS error_count
FROM logs
WHERE level = 'error'
  AND timestamp >= now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY error_count DESC;

-- Log volume by level over time
SELECT
    toStartOfMinute(timestamp) AS minute,
    level,
    count() AS count
FROM logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY minute, level
ORDER BY minute;

-- Top error messages
SELECT
    message,
    count() AS occurrences
FROM logs
WHERE level = 'error'
  AND timestamp >= now() - INTERVAL 24 HOUR
GROUP BY message
ORDER BY occurrences DESC
LIMIT 20;
```

### Pattern Detection

```sql
-- Find repeated error patterns
SELECT
    replaceRegexpAll(message, '\d+', 'N') AS pattern,
    count() AS occurrences,
    min(timestamp) AS first_seen,
    max(timestamp) AS last_seen
FROM logs
WHERE level = 'error'
  AND timestamp >= now() - INTERVAL 24 HOUR
GROUP BY pattern
HAVING occurrences > 10
ORDER BY occurrences DESC;

-- Detect anomalies in log volume
WITH hourly_counts AS (
    SELECT
        toStartOfHour(timestamp) AS hour,
        count() AS cnt
    FROM logs
    WHERE timestamp >= now() - INTERVAL 7 DAY
    GROUP BY hour
)
SELECT
    hour,
    cnt,
    avg(cnt) OVER (ORDER BY hour ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING) AS avg_24h,
    cnt / avg_24h AS ratio
FROM hourly_counts
WHERE cnt > avg_24h * 2
ORDER BY hour DESC;
```

## Log Retention and Tiering

### TTL-Based Retention

```sql
-- Different retention for different log levels
CREATE TABLE logs_tiered
(
    timestamp DateTime64(3),
    level LowCardinality(String),
    service LowCardinality(String),
    message String,
    log_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp)
TTL
    log_date + INTERVAL 7 DAY DELETE WHERE level = 'debug',
    log_date + INTERVAL 30 DAY DELETE WHERE level = 'info',
    log_date + INTERVAL 90 DAY DELETE WHERE level IN ('warn', 'warning'),
    log_date + INTERVAL 365 DAY DELETE WHERE level = 'error';
```

### Cold Storage Tiering

```sql
-- Move old logs to cold storage
CREATE TABLE logs
(
    timestamp DateTime64(3),
    level LowCardinality(String),
    service LowCardinality(String),
    message String,
    log_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp)
TTL
    log_date + INTERVAL 7 DAY TO DISK 'warm',
    log_date + INTERVAL 30 DAY TO DISK 'cold',
    log_date + INTERVAL 90 DAY DELETE;
```

### Archive to S3

```sql
-- Create S3-backed table for archives
CREATE TABLE logs_archive
(
    timestamp DateTime64(3),
    level LowCardinality(String),
    service LowCardinality(String),
    message String,
    log_date Date
)
ENGINE = S3('https://s3.amazonaws.com/logs-archive/', 'access_key', 'secret_key', 'Parquet')
PARTITION BY toYYYYMM(log_date);

-- Archive old logs
INSERT INTO logs_archive
SELECT timestamp, level, service, message, log_date
FROM logs
WHERE log_date < today() - 90;
```

## Monitoring and Alerting

### Log-Based Alerts

```sql
-- Create view for error rate monitoring
CREATE VIEW error_rate_1h AS
SELECT
    service,
    countIf(level = 'error') AS errors,
    count() AS total,
    errors / total * 100 AS error_rate
FROM logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY service;

-- Alert query
SELECT service, error_rate
FROM error_rate_1h
WHERE error_rate > 5;  -- Alert if error rate > 5%
```

### Log Ingestion Monitoring

```sql
-- Monitor log ingestion rate
SELECT
    toStartOfMinute(timestamp) AS minute,
    count() AS logs_per_minute
FROM logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;

-- Check for gaps in logs
SELECT
    service,
    max(timestamp) AS last_log,
    dateDiff('minute', max(timestamp), now()) AS minutes_since_last
FROM logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY service
HAVING minutes_since_last > 5;
```

## Performance Optimization

### Query Optimization

```sql
-- Use PREWHERE for time filters
SELECT timestamp, service, message
FROM logs
PREWHERE timestamp >= now() - INTERVAL 1 HOUR
WHERE level = 'error'
ORDER BY timestamp DESC
LIMIT 100;

-- Limit result set for log browsing
SELECT timestamp, service, level, message
FROM logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 1000
SETTINGS max_threads = 4;
```

### Compression Settings

```sql
-- Optimize for log storage
CREATE TABLE logs_compressed
(
    timestamp DateTime64(3) CODEC(Delta, ZSTD(3)),
    level LowCardinality(String) CODEC(ZSTD(3)),
    service LowCardinality(String) CODEC(ZSTD(3)),
    message String CODEC(ZSTD(3)),
    trace_id String CODEC(ZSTD(3)),
    log_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp);
```

### Sampling for High-Volume Logs

```sql
-- Store sampled debug logs
CREATE MATERIALIZED VIEW logs_sampled
ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (service, timestamp)
AS SELECT *
FROM logs
WHERE level != 'debug' OR rand() % 10 = 0;  -- Keep 10% of debug logs
```

## Integration with Grafana

### Log Panel Query

```sql
-- Grafana log panel query
SELECT
    timestamp AS time,
    level,
    service,
    message AS content
FROM logs
WHERE $__timeFilter(timestamp)
  AND service IN ($service)
ORDER BY timestamp DESC
LIMIT 1000
```

### Variables

```sql
-- Service variable
SELECT DISTINCT service FROM logs
WHERE timestamp >= now() - INTERVAL 7 DAY
ORDER BY service

-- Level variable
SELECT DISTINCT level FROM logs
WHERE timestamp >= now() - INTERVAL 1 DAY
ORDER BY level
```

---

ClickHouse provides a cost-effective and fast alternative to Elasticsearch for log storage. Design your schema with appropriate ordering and skip indexes, use async inserts for high throughput, and leverage TTL for automatic data lifecycle management. Start with the basic schema and add optimizations as your log volume grows.
