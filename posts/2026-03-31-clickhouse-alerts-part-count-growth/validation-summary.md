# Validation Summary: How to Set Up ClickHouse Alerts for Part Count Growth

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse (MergeTree engine, system tables)
- SQL (ClickHouse dialect)
- Prometheus (alerting rules)
- Bash / clickhouse-client CLI

## Sources Consulted
- ClickHouse MergeTree settings source: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Storages/MergeTree/MergeTreeSettings.cpp
- ClickHouse server settings source: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/ServerSettings.cpp
- ClickHouse MergeTree settings docs: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse system tables docs (system.parts, system.merges, system.server_settings)

## Issues Found
1. **Outdated default values for `parts_to_delay_insert` and `parts_to_throw_insert`.** The post stated defaults of 150 and 300, but ClickHouse increased these defaults to 1000 and 3000 (around version 23.6). Verified directly from `src/Storages/MergeTree/MergeTreeSettings.cpp` in the upstream master branch. Updated the thresholds in the "Understanding Part Count Thresholds" section and the illustrative example sentence ("up to 300 parts per partition" → "up to 3000 parts per partition").

2. **Incorrect use of `SET background_pool_size = 8`.** `background_pool_size` is a server-level setting (declared in `src/Core/ServerSettings.cpp`, default 16), not a session/query setting — it cannot be changed with `SET` at query time and must be configured in `config.xml` (restart or `SYSTEM RELOAD CONFIG`). Replaced with a query against `system.server_settings` to inspect the current value and a note that it is server-level.

## Review Notes
- The chosen SQL alert thresholds (100 warning / 200 critical) are conservative relative to the current engine defaults (1000/3000). They are still reasonable as early-warning thresholds for operators who want proactive visibility before ClickHouse begins delaying inserts, so they were left unchanged.
- The Prometheus metric name `ClickHousePartsActive` is used illustratively; ClickHouse's built-in Prometheus endpoint typically exposes part counts as `ClickHouseAsyncMetrics_NumberOfActiveParts` (or similar, depending on exporter). Readers should adjust the metric name to match whatever exporter they use. Not modified because the rest of the rule shape is correct and generically applicable.
- The SQL queries against `system.parts` (columns `database`, `table`, `partition`, `rows`, `bytes_on_disk`, `active`) and `system.merges` (columns `database`, `table`, `progress`, `elapsed`) are all valid. `formatReadableSize`, `multiIf`, and `LowCardinality(String)` are all valid ClickHouse functions/types.
- The CREATE TABLE DDL with `TTL check_time + INTERVAL 7 DAY` is syntactically correct.
- Batch-size recommendation (≥10,000 rows) aligns with standard ClickHouse guidance.
