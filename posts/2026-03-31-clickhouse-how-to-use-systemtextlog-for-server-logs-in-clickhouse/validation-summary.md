# Validation Summary: How to Use system.text_log for Server Logs in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (system tables, server logging)
- ClickHouse SQL (functions: `today()`, `now()`, `toStartOfHour()`, `substring()`, `ILIKE`, `INTERVAL`)
- ClickHouse server configuration (`config.xml`, `<text_log>` section)
- MergeTree table engine (TTL, partitioning)

## Sources Consulted
- ClickHouse docs — system.text_log table reference: https://clickhouse.com/docs/operations/system-tables/text_log
- ClickHouse docs — server configuration parameters (text_log section): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse docs — system.query_log table reference

## Issues Found
- **`event_time` description was inaccurate.** The original post described the `event_time` column as a "timestamp with microseconds". According to the official `system.text_log` schema, `event_time` is a `DateTime` (second precision) column, while microsecond precision is exposed via a separate `event_time_microseconds` column (`DateTime64(6)`). Fixed the description and added a separate bullet for `event_time_microseconds` so readers who need sub-second precision point at the correct column.

## Review Notes
- The config snippet uses top-level `<partition_by>`, `<ttl>`, and `<storage_policy>` sub-tags, which are valid per the ClickHouse docs — they must only be used when `<engine>` is *not* specified. The post doesn't include `<engine>`, so the usage is correct. The official ClickHouse example uses the `<engine>...</engine>` form instead, but both are acceptable.
- The config-level `<level>` value `information` is lowercase, which matches ClickHouse's expected casing for server log level config values.
- All eight log levels listed (`Fatal`, `Critical`, `Error`, `Warning`, `Notice`, `Information`, `Debug`, `Trace`) are correct and match the documented levels stored in the `level` column.
- `ALTER TABLE system.text_log MODIFY TTL ...` is supported because the underlying table is MergeTree — acceptable, though configuring via `config.xml` is the more common/stable approach as the post already recommends.
- Columns referenced in queries (`event_date`, `event_time`, `level`, `logger_name`, `message`, `query_id`) all exist in the current schema. The schema also has additional columns (`hostname`, `thread_name`, `revision`, `source_file`, `source_line`, `message_format_string`, `value1`..`value10`) that are not covered here, which is fine for an introductory guide.
