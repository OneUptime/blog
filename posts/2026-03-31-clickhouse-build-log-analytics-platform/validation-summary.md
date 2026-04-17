# Validation Summary: How to Build a Log Analytics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, skipping indexes, TTL, system.parts)
- Vector (vector.dev) — file source, remap transform, VRL, ClickHouse sink
- Fluent Bit (mentioned)
- ClickHouse HTTP interface (curl, JSONEachRow format)
- Grafana / PagerDuty (mentioned in architecture diagram only)

## Sources Consulted
- ClickHouse TTL and MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse skipping index types (`tokenbf_v1`, `bloom_filter`): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#available-types-of-indices
- ClickHouse date/time functions (`toStartOfFiveMinutes`, `toStartOfHour`, `hasToken`, `countIf`, `formatReadableSize`): https://clickhouse.com/docs/en/sql-reference/functions/
- ClickHouse HTTP interface (JSONEachRow): https://clickhouse.com/docs/en/interfaces/http
- Vector ClickHouse sink reference: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- Vector file source reference: https://vector.dev/docs/reference/configuration/sources/file/
- VRL function reference: https://vector.dev/docs/reference/vrl/functions/

## Issues Found
1. **`encoding.codec = "json"` in the Vector ClickHouse sink config was invalid.** The Vector ClickHouse sink does not use `encoding.codec` to select the serialization format. The correct option is the top-level `format` field, with valid enum values such as `json_each_row` (default). Replaced the line with `format = "json_each_row"`.
2. **`to_date!` is not a valid VRL function.** The VRL function reference has no `to_date` / `to_date!` function; timestamp-to-date conversion would use `format_timestamp!(ts, format: "%Y-%m-%d")` (ClickHouse `Date` columns accept the `YYYY-MM-DD` string form). Since the `logs` table already declares `date Date DEFAULT toDate(timestamp)`, explicitly setting `.date` in the shipper is redundant — ClickHouse will populate the column from the inserted `timestamp`. Removed the `.date = to_date!(.timestamp)` line.

## Review Notes
- The `tokenbf_v1(32768, 3, 0)` and `bloom_filter(0.01)` skipping-index syntax is correct. Note that ClickHouse has added newer experimental full-text index types (e.g., `full_text` / inverted indexes) in recent versions; `tokenbf_v1` remains stable and appropriate for the post's scope.
- The multi-condition `MODIFY TTL ... DELETE WHERE ...` comma-separated syntax is valid per ClickHouse TTL docs.
- `hasToken()` tokenizes on non-alphanumeric characters, so it won't match substrings; this is consistent with how the `tokenbf_v1` index works, so the search examples are internally consistent.
- `parse_timestamp!(.timestamp, format: "%+")` is valid — chrono's `%+` specifier matches ISO 8601 / RFC 3339 strings.
- `read_from = "beginning"`, `batch.max_bytes`, and `batch.timeout_secs` for the Vector config are all valid options.
- The `length(message)` ClickHouse call returns bytes for `String` columns (not Unicode characters); this is fine for the data-volume estimation in the post but worth noting for multi-byte content.
