# How to Use Object JSON Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, JSON, Object

Description: Learn how ClickHouse's Object('json') type works for semi-structured data, path access, its limitations, and migration to the new JSON type.

---

ClickHouse's `Object('json')` type - commonly written as `JSON` - allows storing semi-structured JSON data in a column where the schema is not fixed at table creation time. Internally, ClickHouse extracts each JSON path into its own sub-column and stores values in a columnar format, preserving the performance benefits of columnar storage even for schema-flexible data. This post covers how to use it, its access patterns, its limitations, and how it compares to the newer `JSON` type introduced in later versions.

## Enabling the Object JSON Type

`Object('json')` was experimental in earlier ClickHouse versions and required a setting to enable:

```sql
SET allow_experimental_object_type = 1;
```

For ClickHouse 24.x and later, a new dedicated `JSON` type is available as a replacement. This post focuses on `Object('json')` as found in ClickHouse 22.x-23.x deployments.

## Creating a Table with Object JSON

```sql
SET allow_experimental_object_type = 1;

CREATE TABLE application_logs
(
    log_time    DateTime,
    service     String,
    level       String,
    payload     JSON     -- Object('json') syntax
)
ENGINE = MergeTree()
ORDER BY (service, log_time);
```

## Inserting JSON Data

You insert JSON as a string - ClickHouse parses and stores it automatically:

```sql
INSERT INTO application_logs FORMAT JSONEachRow
{"log_time": "2026-03-31 10:00:00", "service": "api-gateway", "level": "ERROR", "payload": {"status_code": 500, "path": "/v1/users", "error": "upstream timeout", "duration_ms": 3050}}
{"log_time": "2026-03-31 10:01:00", "service": "api-gateway", "level": "INFO",  "payload": {"status_code": 200, "path": "/v1/health", "duration_ms": 12}}
{"log_time": "2026-03-31 10:02:00", "service": "auth-service", "level": "WARN", "payload": {"user_id": 9821, "event": "failed_login", "attempts": 3, "ip": "10.0.0.5"}}
```

## Accessing JSON Paths

Use dot notation to access nested fields. ClickHouse materializes these as virtual sub-columns:

```sql
SELECT
    log_time,
    service,
    payload.status_code,
    payload.path,
    payload.duration_ms,
    payload.error
FROM application_logs
WHERE level = 'ERROR';
```

Accessing deeply nested paths:

```sql
-- Insert nested JSON
INSERT INTO application_logs FORMAT JSONEachRow
{"log_time": "2026-03-31 10:03:00", "service": "payment", "level": "INFO", "payload": {"transaction": {"id": "txn_abc123", "amount": 99.99, "currency": "USD", "metadata": {"region": "us-east", "retry": false}}}}

SELECT
    payload.transaction.id,
    payload.transaction.amount,
    payload.transaction.metadata.region
FROM application_logs
WHERE service = 'payment';
```

## Type Inference

ClickHouse infers the type of each JSON path from the data. Consistent types are stored as their inferred type; mixed types fall back to `String`:

```sql
-- Inspect inferred sub-column types
SELECT
    name,
    type
FROM system.columns
WHERE table = 'application_logs'
  AND database = currentDatabase();
```

The `payload` column will show sub-columns like `payload.status_code UInt64`, `payload.path String`, etc.

## Filtering and Aggregation on JSON Paths

JSON path sub-columns behave like regular columns in `WHERE`, `GROUP BY`, and aggregate functions:

```sql
SELECT
    service,
    avg(payload.duration_ms)                     AS avg_duration_ms,
    max(payload.duration_ms)                     AS max_duration_ms,
    countIf(payload.status_code >= 400)          AS error_count,
    countIf(payload.status_code >= 500)          AS server_error_count
FROM application_logs
WHERE log_time >= now() - INTERVAL 1 HOUR
  AND payload.status_code != 0
GROUP BY service
ORDER BY avg_duration_ms DESC;
```

## Handling Missing Paths

When a path does not exist in a particular row's JSON, the value is the default for the inferred type (usually `0` for numbers or `''` for strings). Since sub-columns are non-Nullable, `isNotNull` will always return true. Use `nullIf` to distinguish missing from zero:

```sql
SELECT
    log_time,
    service,
    payload.error,
    payload.user_id,
    -- Check if error field is genuinely present
    nullIf(payload.error, '') AS error_if_present
FROM application_logs
ORDER BY log_time;
```

## Limitations of Object('json')

The `Object('json')` type has several important limitations:

- **Experimental status**: Not recommended for production without thorough testing.
- **Schema changes**: Adding new JSON keys after table creation works, but removing keys requires a full table recreation.
- **Type conflicts**: If the same path appears with different types across inserts, it falls back to `String`, which may not be what you want.
- **No schema enforcement**: Any JSON shape is accepted, making data quality enforcement difficult.
- **Replication**: Known issues with distributed tables and replication in some versions.
- **ALTER TABLE**: Limited support for altering JSON columns.

```sql
-- Type conflict example - mixing number and string for same path
INSERT INTO application_logs FORMAT JSONEachRow
{"log_time": "2026-03-31 10:04:00", "service": "debug", "level": "INFO", "payload": {"code": 200}}
{"log_time": "2026-03-31 10:05:00", "service": "debug", "level": "INFO", "payload": {"code": "OK"}}
-- After the second insert, payload.code may be stored as String
```

## Migration to the New JSON Type

ClickHouse 24.x introduced a new `JSON` type that replaces `Object('json')` with better performance and stronger type inference. It was experimental in 24.x and became production-ready in version 25.3. Migration involves recreating the table:

```sql
-- New JSON type (ClickHouse 24.x+)
SET enable_json_type = 1;

CREATE TABLE application_logs_v2
(
    log_time    DateTime,
    service     String,
    level       String,
    payload     JSON
)
ENGINE = MergeTree()
ORDER BY (service, log_time);

-- Migrate data
INSERT INTO application_logs_v2
SELECT log_time, service, level, CAST(payload, 'String')
FROM application_logs;
```

The new `JSON` type supports explicit path type hints, better handling of type conflicts, and is enabled without experimental flags in recent versions.

## Summary

ClickHouse's `Object('json')` type enables semi-structured JSON storage with columnar efficiency by extracting each JSON path into a sub-column at write time. It supports dot-notation path access in queries and works with standard aggregate functions, but carries limitations around type conflicts, experimental status, and schema evolution. For new deployments on ClickHouse 25.3 or later, prefer the newer `JSON` type which addresses most of these shortcomings.
