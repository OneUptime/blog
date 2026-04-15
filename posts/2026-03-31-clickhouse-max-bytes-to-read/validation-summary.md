# Validation Summary: How to Set max_bytes_to_read in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (query settings, user profiles, distributed queries)
- SQL (ClickHouse SQL dialect)
- XML configuration for ClickHouse server

## Sources Consulted
- ClickHouse official documentation for `max_bytes_to_read`: https://clickhouse.com/docs/en/operations/settings/query-complexity#max-bytes-to-read
- ClickHouse source code `src/Common/ErrorCodes.cpp` for error code definitions (TOO_MANY_BYTES = 307, TIMEOUT_EXCEEDED = 159)
- ClickHouse source code `src/Common/SizeLimits.cpp` for error message format
- ClickHouse official documentation for `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation for `read_overflow_mode`: https://clickhouse.com/docs/en/operations/settings/query-complexity#read-overflow-mode
- ClickHouse official documentation for `max_bytes_to_read_leaf`: https://clickhouse.com/docs/en/operations/settings/query-complexity#max-bytes-to-read-leaf

## Issues Found

1. **Wrong error code (line 37)**: The post stated error code `159` for exceeding `max_bytes_to_read`. Error code 159 is `TIMEOUT_EXCEEDED` in ClickHouse. The correct error code is `307` (`TOO_MANY_BYTES`). Fixed to use error code 307 with the correct error message format (`Limit for rows or bytes to read exceeded, max bytes: ..., current bytes: ...`).

2. **Monitoring query alias shadows column name (lines 129-130)**: The query used `formatReadableSize(read_bytes) AS read_bytes`, which shadows the original `read_bytes` column. The subsequent `ORDER BY read_bytes DESC` would then sort by the formatted string (lexicographic order) instead of the numeric byte value, producing incorrect results (e.g., "9.31 GiB" would sort above "10.00 GiB"). Fixed by renaming aliases to `readable_bytes` and `readable_result_bytes` so `ORDER BY read_bytes` correctly references the original numeric column.

3. **Table headers mismatched with content (lines 142-148)**: The "Typical Byte Limit Guidelines" table had "Profile" as the first column header, but the column contained human-readable byte limits (e.g., "500 GB"), not profile names. The second column "max_bytes_to_read" contained numeric byte values but the first row had "Unlimited" text. Fixed by renaming the first column to "Limit" and reorganizing the first row so "Unlimited" is in the Limit column and `0` is in the max_bytes_to_read column, matching the data semantics.

## Review Notes
- The `ALTER PROFILE ... SETTINGS` syntax used in the post is valid; ClickHouse accepts `ALTER PROFILE` as shorthand for `ALTER SETTINGS PROFILE`, and `SETTINGS key = value` works without requiring `MODIFY SETTINGS`.
- The mermaid flowchart showing the check happening after decompression but before WHERE filtering is directionally correct but simplified. In practice, ClickHouse checks limits periodically during reads (after processing data parts), not as a single discrete gate.
- All byte value conversions in the post are correct (verified: 50 GB = 53,687,091,200; 100 GB = 107,374,182,400; 200 GB = 214,748,364,800; 10 GB = 10,737,418,240; 1 GB = 1,073,741,824; 500 GB = 536,870,912,000).
- The core technical claims about `max_bytes_to_read` counting uncompressed bytes, default value of 0 meaning unlimited, and `read_overflow_mode` options (`throw`/`break`) are all accurate per official documentation.
