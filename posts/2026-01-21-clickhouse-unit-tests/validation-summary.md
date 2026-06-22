# Validation Summary: How to Write Unit Tests for ClickHouse Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Connect Python client
- pytest
- SQL unit testing
- Materialized views
- MergeTree, AggregatingMergeTree, and ReplacingMergeTree engines
- GitHub Actions CI

## Sources Consulted
- ClickHouse Connect Python integration: https://clickhouse.com/docs/integrations/python
- ClickHouse Connect advanced querying: https://clickhouse.com/docs/integrations/language-clients/python/advanced-querying
- ClickHouse Decimal data type: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse AggregateFunction data type: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse AggregatingMergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse ReplacingMergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse OPTIMIZE statement: https://clickhouse.com/docs/sql-reference/statements/optimize
- ClickHouse count aggregate function: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse uniq aggregate function: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- GitHub Actions Node 20 deprecation notice: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- actions/setup-python README: https://github.com/actions/setup-python
- actions/checkout releases: https://github.com/actions/checkout/releases

## Issues Found
- The materialized-view test snippet used `@pytest.fixture` without importing `pytest` in that file. Added `import pytest`.
- The materialized-view target table used `SummingMergeTree` with a plain `UInt64` `unique_users` column populated by `uniq(user_id)`. That can over-count unique users across multiple inserted blocks for the same `(hour, event_type)` key. Changed the target to `AggregatingMergeTree` with `AggregateFunction` columns and changed the view/query to use `countState`/`countMerge` and `uniqExactState`/`uniqExactMerge`.
- The materialized-view query did not group by `event_type` even though the rollup key includes it. Updated the query to select, group, and order by both `hour` and `event_type`, and adjusted assertion indexes accordingly.
- The GitHub Actions workflow used older `actions/checkout@v3` and `actions/setup-python@v4` examples. Updated them to `actions/checkout@v6` and `actions/setup-python@v6`, which align with current Node 24-compatible action guidance.

## Review Notes
- The `ReplacingMergeTree` deduplication example is acceptable for a small unit test after `OPTIMIZE TABLE ... FINAL`, but ClickHouse documentation cautions that background deduplication is eventual and `OPTIMIZE FINAL` is expensive on large production tables.
- The guide uses `uniqExact` in the corrected materialized-view test to make the unit-test expectation deterministic.
