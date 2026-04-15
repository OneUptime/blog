# Validation Summary: How to Use system.events in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables: `system.events`, `system.asynchronous_metrics`)
- SQL (ClickHouse dialect)
- Prometheus (metric scraping and naming conventions)
- Mermaid (diagram)

## Sources Consulted
- ClickHouse official documentation on system.events: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse official documentation on Prometheus endpoint: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- ClickHouse Prometheus metric naming conventions (ClickHouseProfileEvents_ prefix)
- ClickHouse official documentation on system.asynchronous_metrics: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics

## Issues Found

1. **Prometheus grep pattern was incorrect (line 148):** The blog used `grep "clickhouse_events"` but ClickHouse's built-in Prometheus endpoint exports system.events counters with the prefix `ClickHouseProfileEvents_` (PascalCase), not `clickhouse_events`. Changed to `grep "ClickHouseProfileEvents"`.

2. **Disk Read/Write Counters query mixed byte and time metrics (lines 129-141):** The query included `DiskReadElapsedMicroseconds` alongside byte-count events (`ReadBufferFromFileDescriptorReadBytes`, `WriteBufferFromFileDescriptorWriteBytes`) but applied `formatReadableSize()` (which formats values as byte sizes) and labeled the rate column `bytes_per_second`. Since `DiskReadElapsedMicroseconds` is a cumulative time metric in microseconds, formatting it as bytes and labeling the rate as bytes/second was misleading. Removed `DiskReadElapsedMicroseconds` from this query.

3. **Operator precedence ambiguity in delta comment (line 91):** The comment `Delta = snapshot2 - snapshot1 / 60` could be misread as `snapshot2 - (snapshot1 / 60)` due to standard arithmetic precedence. Added parentheses: `(snapshot2 - snapshot1) / 60`.

## Review Notes
- The SQL queries are all syntactically correct for ClickHouse's SQL dialect.
- The event names listed in the Key Events table (`Query`, `SelectQuery`, `InsertQuery`, `FailedQuery`, `SelectedRows`, `InsertedRows`, `MergedRows`, `NetworkSendBytes`, etc.) are all real ClickHouse profile events.
- The `system.events` table schema (columns: `event`, `value`, `description`) is correctly described.
- The `Uptime` metric from `system.asynchronous_metrics` is a valid metric for calculating rates.
- The Prometheus port 9363 is a commonly used port for ClickHouse's Prometheus endpoint, though it requires explicit configuration.
- The custom Prometheus SQL query that builds metric names with `concat('clickhouse_events_', ...)` is fine since it's creating user-defined names for a custom scraper, not claiming to match ClickHouse's built-in naming.
