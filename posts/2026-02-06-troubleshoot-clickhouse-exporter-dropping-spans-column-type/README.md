# How to Troubleshoot ClickHouse Exporter Dropping Spans Due to Column Type Mismatch After Schema Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, ClickHouse, Schema Migration, Troubleshooting

Description: Fix the OpenTelemetry Collector ClickHouse exporter dropping spans after a schema migration causes column type mismatches.

You upgrade the OpenTelemetry Collector or the ClickHouse exporter, and suddenly spans start getting dropped. The Collector logs show errors like:

```
code: 53, message: Type mismatch in IN or VALUES section.
Expected: UInt8. Got: String
```

Or:

```
code: 117, message: Unknown column 'SpanAttributes' in table 'otel.otel_traces'
```

After a schema migration (either from a Collector upgrade or a manual table change), the exporter tries to insert data using a schema that does not match the actual table structure.

## Why Schema Mismatches Happen

The ClickHouse exporter creates tables automatically if they do not exist. Different exporter versions may use different table schemas:

- Column names change (e.g., `SpanAttributes` becomes `SpanAttributes.keys` and `SpanAttributes.values`)
- Column types change (e.g., `UInt8` for status code vs `String`)
- New columns are added that old tables do not have
- Nested column structures change (Maps vs Arrays)

When you upgrade the exporter, it expects the new schema, but the existing table has the old schema.

## Diagnosing the Problem

### Step 1: Check the Collector Logs

```bash
kubectl logs <collector-pod> | grep -i "clickhouse\|error\|failed"
```

Look for ClickHouse error codes:
- Code 53: Type mismatch
- Code 117: Unknown column
- Code 16: No such column

### Step 2: Compare Expected vs Actual Schema

Check what the exporter expects:

```bash
# Check the exporter's documentation or source code for the expected schema
# Or temporarily let the exporter create a new table in a test database
```

Check the actual table schema:

```sql
-- Connect to ClickHouse and check the table structure
DESCRIBE TABLE otel.otel_traces;
```

### Step 3: Identify the Differences

```sql
-- Check column types
SELECT name, type
FROM system.columns
WHERE database = 'otel' AND table = 'otel_traces'
ORDER BY position;
```

Compare this with the expected schema from the new exporter version.

## Fix 1: Migrate the Table Schema

Add missing columns or change types using ALTER TABLE:

```sql
-- Add missing columns
ALTER TABLE otel.otel_traces
    ADD COLUMN IF NOT EXISTS `StatusMessage` String DEFAULT '' AFTER `StatusCode`;

-- Change column type
ALTER TABLE otel.otel_traces
    MODIFY COLUMN `StatusCode` String;

-- Add a new Map column
ALTER TABLE otel.otel_traces
    ADD COLUMN IF NOT EXISTS `ResourceAttributes` Map(String, String)
    DEFAULT map() AFTER `ServiceName`;
```

## Fix 2: Recreate the Table

If there are too many changes, it might be easier to recreate the table. Back up the data first:

```sql
-- Create a backup table
CREATE TABLE otel.otel_traces_backup AS otel.otel_traces;

-- Insert existing data into backup
INSERT INTO otel.otel_traces_backup
SELECT * FROM otel.otel_traces;

-- Drop the original table
DROP TABLE otel.otel_traces;

-- Let the exporter recreate the table with the new schema
-- (restart the Collector)
```

After the Collector creates the new table, you can migrate historical data if the schemas are compatible:

```sql
-- Insert old data into new table (adjust column mapping as needed)
INSERT INTO otel.otel_traces (
    Timestamp, TraceId, SpanId, ParentSpanId,
    TraceState, SpanName, SpanKind, ServiceName,
    StatusCode, StatusMessage, Duration
)
SELECT
    Timestamp, TraceId, SpanId, ParentSpanId,
    TraceState, SpanName, SpanKind, ServiceName,
    toString(StatusCode), StatusMessage, Duration
FROM otel.otel_traces_backup;
```

## Fix 3: Use the create_schema Option

The ClickHouse exporter has configuration options for schema management:

```yaml
exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: otel
    traces_table_name: otel_traces
    logs_table_name: otel_logs
    create_schema: true    # let the exporter manage the schema
    ttl: 72h               # data retention
    timeout: 10s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
```

With `create_schema: true`, the exporter will attempt to create or update the table schema. However, this might not handle all migration cases, especially type changes.

## Fix 4: Pin the Exporter Version

If you cannot migrate the schema immediately, pin the exporter to the version that matches your table schema:

```yaml
# Use a specific Collector version that matches your ClickHouse schema
image: otel/opentelemetry-collector-contrib:0.120.0  # the version before the schema change
```

This is a temporary fix. Plan a maintenance window to migrate the schema and then upgrade the Collector.

## Prevention: Use Explicit Table Names

Use version-specific table names so upgrades do not conflict:

```yaml
exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: otel
    traces_table_name: otel_traces_v2    # version the table name
    logs_table_name: otel_logs_v2
```

When you upgrade, change to `otel_traces_v3`. Old data remains accessible in the old table.

## Monitoring for Dropped Spans

Check the Collector's export metrics:

```
# Successful exports
otelcol_exporter_sent_spans{exporter="clickhouse"}

# Failed exports
otelcol_exporter_send_failed_spans{exporter="clickhouse"}
```

Set an alert on failed exports:

```yaml
- alert: ClickHouseExportFailures
  expr: rate(otelcol_exporter_send_failed_spans{exporter="clickhouse"}[5m]) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "ClickHouse exporter is failing to export spans"
```

## Checking ClickHouse Server Errors

ClickHouse also logs rejected inserts:

```sql
-- Check the query log for errors
SELECT
    event_time,
    query,
    exception,
    exception_code
FROM system.query_log
WHERE exception != ''
    AND query LIKE '%otel_traces%'
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

ClickHouse exporter schema mismatches happen when the exporter version changes the expected table structure. Diagnose by comparing the expected schema (from the exporter) with the actual table schema (from ClickHouse). Fix by migrating columns with ALTER TABLE, recreating the table, or temporarily pinning the exporter version. Version your table names to prevent future conflicts during upgrades.
