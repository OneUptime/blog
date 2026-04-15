# Validation Summary: How to Set Up Scheduled Data Exports from ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (clickhouse-client, S3 table function, materialized views, SummingMergeTree)
- Bash / Cron
- Apache Airflow
- AWS S3

## Sources Consulted
- ClickHouse CREATE VIEW documentation (REFRESH clause): https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse Refreshable Materialized Views: https://clickhouse.com/docs/materialized-view/refreshable-materialized-view
- ClickHouse v24.5 Changelog: https://clickhouse.com/docs/changelogs/24.5
- ClickHouse s3() table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse CSVWithNames format: https://clickhouse.com/docs/interfaces/formats/CSVWithNames
- GitHub Issue #88185 - Native Task Scheduling in ClickHouse (open proposal, not implemented): https://github.com/clickhouse/clickhouse/issues/88185
- Apache Airflow DAG documentation (schedule parameter): https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- Astronomer Airflow 2.4 release notes (schedule_interval deprecation): https://www.astronomer.io/blog/apache-airflow-2-4-everything-you-need-to-know/

## Issues Found

1. **Fabricated `CREATE SCHEDULE` SQL statement (Critical):** Option 2 claimed "ClickHouse 24.5+ supports `CREATE SCHEDULE`" with a full SQL example. This feature does not exist in any version of ClickHouse. No `CREATE SCHEDULE` statement exists in the ClickHouse source code, documentation, or changelogs. GitHub Issue #88185 proposes native task scheduling but it remains an open, unimplemented proposal. **Fix:** Rewrote Option 2 to use Refreshable Materialized Views (`CREATE MATERIALIZED VIEW ... REFRESH EVERY`), which is the actual built-in scheduling mechanism in ClickHouse.

2. **Invalid s3() URL expression syntax (Critical):** The original Option 2 used `{toDate(now()-1)}` in the s3() URL path, implying ClickHouse evaluates SQL expressions inside curly braces in URL strings. This is incorrect — curly braces in s3() URLs are interpreted as glob patterns (e.g., `{abc,def}` for alternatives, `{N..M}` for numeric ranges), not as SQL expression templates. **Fix:** Replaced with the Refreshable MV approach which uses a static S3 path (with a note about using cron/Airflow for date-partitioned paths).

3. **SummingMergeTree with plain uniq() causes overcounting (Major):** Option 3 stored the result of `uniq(user_id)` as a plain `UInt32` in a SummingMergeTree table. When SummingMergeTree merges parts, it sums numeric columns. Summing distinct-count values from different parts produces overcounted results (overlapping users are double-counted). **Fix:** Changed `unique_users` column type to `AggregateFunction(uniq, UInt64)` and the materialized view to use `uniqState(user_id)`. SummingMergeTree correctly handles AggregateFunction columns by merging their internal states (HyperLogLog sketches for uniq), preserving correctness.

4. **Deprecated Airflow `schedule_interval` parameter (Minor):** The Airflow DAG used `schedule_interval='@daily'`, which was deprecated in Airflow 2.4 (September 2022) in favor of the `schedule` parameter. **Fix:** Changed to `schedule='@daily'`.

5. **Unused `timedelta` import (Minor):** The Airflow example imported `timedelta` from `datetime` but never used it. **Fix:** Removed the unused import.

## Review Notes
- The cron script uses `date -d yesterday`, which is GNU coreutils syntax (Linux). This will not work on macOS/BSD, which uses `date -v-1d` instead. Since the context is clearly a server-side cron job, this is acceptable but worth noting.
- Option 3's heading says "Background Refresh" but describes a standard insert-triggered materialized view, not a refreshable one. The heading could be slightly misleading, but since it accurately describes "continuously updated" behavior (triggered by inserts), the distinction is clear enough in context.
- When querying `events_daily_summary` after the Option 3 fix, users need to use `uniqMerge(unique_users)` instead of reading the column directly. The post does not show query examples, so this is not an error but a gap readers should be aware of.
- The Refreshable Materialized View in Option 2 writes to a fixed S3 path that gets replaced on each refresh. For historical/date-partitioned exports, an external scheduler (cron, Airflow) is still needed. This limitation is noted in the post.
