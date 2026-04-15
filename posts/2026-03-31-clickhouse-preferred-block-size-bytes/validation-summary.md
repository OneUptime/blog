# Validation Summary: How to Set preferred_block_size_bytes in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, query settings, system tables)
- SQL (ClickHouse dialect)
- ClickHouse XML configuration (users.xml profiles)

## Sources Consulted
- ClickHouse source code: `src/Core/Settings.cpp` — setting declaration with default value of 1000000
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeReadTask.h` — `BlockSizeParams` struct confirming default
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeReadTask.cpp` — `std::min(max_block_size_rows, recommended_rows)` logic
- ClickHouse source code: `src/Storages/MergeTree/MergeTreeBlockReadUtils.h` — `MergeTreeBlockSizePredictor::estimateNumRows` implementation
- ClickHouse documentation on settings profiles (users.xml configuration)
- ClickHouse documentation on `system.settings` and `system.query_log` tables

## Issues Found
No technical issues found.

## Review Notes
- The formula `block_rows = min(max_block_size, preferred_block_size_bytes / avg_bytes_per_row)` is a simplification of the actual implementation. The real `estimateNumRows` method subtracts already-accumulated block bytes before dividing by the per-row estimate, and uses an exponentially-weighted moving average rather than a simple static average. This simplification is appropriate for a blog post and correctly conveys the conceptual behavior.
- The setting only affects reads from MergeTree-family engines, which the post correctly states. Other table engines are not affected.
- All SQL functions used (`count()`, `today()`, `toStartOfHour()`, `avg()`, `formatReadableSize()`) and system table columns (`system.settings.value`, `system.settings.description`, `system.query_log.query_id`, etc.) are valid ClickHouse identifiers.
- The users.xml profile configuration format is correct for ClickHouse's XML-based settings system.
