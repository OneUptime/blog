# Validation Summary: How to Use StripeLog Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- StripeLog table engine (Log family)
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse official documentation — StripeLog engine: https://clickhouse.com/docs/en/engines/table-engines/log-family/stripelog
- ClickHouse official documentation — Log family overview: https://clickhouse.com/docs/en/engines/table-engines/log-family
- ClickHouse official documentation — TinyLog engine: https://clickhouse.com/docs/en/engines/table-engines/log-family/tinylog
- ClickHouse official documentation — Log engine: https://clickhouse.com/docs/en/engines/table-engines/log-family/log

## Issues Found

1. **Incorrect marks file description in intro (line 11):** The post stated StripeLog uses "an offsets file per column." In reality, StripeLog uses a single shared `index.mrk` marks file that records offsets for each column of each inserted data block. Fixed the description to accurately reflect the single shared marks file.

2. **Wrong marks file name in storage structure (lines 44-49):** The post listed `__marks.mrk` as the marks file. The correct file name for StripeLog is `index.mrk`. The `__marks.mrk` name belongs to the **Log** engine, not StripeLog. Fixed to `index.mrk`.

3. **Nonexistent `sizes.json` in storage structure:** The post listed `sizes.json` as part of the storage structure. The official ClickHouse documentation for StripeLog lists only two files: `data.bin` and `index.mrk`. There is no `sizes.json`. Removed the nonexistent file.

4. **Reference to nonexistent column `duration` (line 59):** The example query `SELECT avg(duration) FROM session_log;` referenced a `duration` column that does not exist in the `session_log` table definition (which has columns: `ts`, `session_id`, `user_id`, `action`). Replaced with a query using actual columns from the table.

## Review Notes
- The claim "Cannot ALTER TABLE to add columns or change types" in the Limitations section is not explicitly stated in the official docs (which only explicitly mention ALTER UPDATE and ALTER DELETE being unsupported). However, this is generally understood behavior for Log family engines and was left as-is.
- The comparison table correctly distinguishes between TinyLog (no concurrent reads), StripeLog (concurrent reads, striped storage), and Log (concurrent reads, column-file storage).
- All SQL syntax in the examples is valid ClickHouse SQL.
