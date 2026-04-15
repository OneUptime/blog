# How to Parse and Analyze Log Lines in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Log Analysis, Regex, extractURLParameter, Text Parsing

Description: Learn how to parse structured and unstructured log lines in ClickHouse using regex extraction, JSON parsing, and URL functions for real-time log analytics.

---

## Log Parsing in ClickHouse

ClickHouse stores raw log lines efficiently and provides rich parsing functions. Parsing at query time offers flexibility - you can extract new fields without schema migrations - while materialized views let you pre-parse common fields for performance.

## Nginx Access Log Parsing

Parse standard nginx combined log format with regex:

```sql
SELECT
    extract(log_line, '(\\d+\\.\\d+\\.\\d+\\.\\d+)') AS ip,
    extract(log_line, '"([A-Z]+ [^ ]+)') AS method_path,
    toInt32OrNull(extract(log_line, '" (\\d{3}) ')) AS status_code,
    toInt64OrNull(extract(log_line, '\\d{3} (\\d+)')) AS response_bytes
FROM access_logs
WHERE event_time >= today() - 1
LIMIT 10;
```

## JSON Log Parsing

Parse JSON-formatted application logs:

```sql
SELECT
    event_time,
    JSONExtractString(log_body, 'level') AS log_level,
    JSONExtractString(log_body, 'message') AS message,
    JSONExtractString(log_body, 'service') AS service,
    JSONExtractFloat(log_body, 'duration_ms') AS duration_ms
FROM application_logs
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND JSONExtractString(log_body, 'level') = 'ERROR';
```

## URL Parameter Extraction

Parse query parameters from request URLs:

```sql
SELECT
    request_url,
    extractURLParameter(request_url, 'utm_source') AS utm_source,
    extractURLParameter(request_url, 'page') AS page,
    extractURLParameter(request_url, 'q') AS search_query
FROM access_logs
WHERE request_url LIKE '%?%'
  AND event_time >= today() - 1;
```

## Regex-Based Field Extraction

Extract multiple fields from semi-structured logs:

```sql
SELECT
    event_time,
    regexpExtract(log_line, 'user_id=([0-9]+)', 1) AS user_id,
    regexpExtract(log_line, 'action=([a-z_]+)', 1) AS action,
    regexpExtract(log_line, 'duration=([0-9.]+)ms', 1)::Float64 AS duration_ms
FROM app_logs
WHERE log_line LIKE '%user_id=%'
  AND event_time >= today() - 1;
```

## Materialized View for Pre-Parsed Fields

Pre-parse common fields at insert time:

```sql
CREATE MATERIALIZED VIEW parsed_logs_mv
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (service, log_level, event_time)
AS
SELECT
    event_time,
    JSONExtractString(log_body, 'service') AS service,
    JSONExtractString(log_body, 'level') AS log_level,
    JSONExtractString(log_body, 'message') AS message,
    JSONExtractFloat(log_body, 'duration_ms') AS duration_ms
FROM raw_logs;
```

## Error Pattern Analysis

Find the most common error messages:

```sql
SELECT
    replaceRegexpAll(message, '(id|token|uuid)=[0-9a-f-]+', '\\1=<redacted>') AS message_pattern,
    count() AS occurrences,
    max(event_time) AS last_seen
FROM parsed_logs_mv
WHERE log_level = 'ERROR'
  AND event_time >= today() - 1
GROUP BY message_pattern
ORDER BY occurrences DESC
LIMIT 20;
```

## Summary

ClickHouse parses log lines using `extract`, `regexpExtract`, `JSONExtract*` functions, and `extractURLParameter`. Materialized views pre-parse common fields for fast repeated queries. Normalizing dynamic values (IDs, tokens) in message patterns groups errors effectively without bloating cardinality.
