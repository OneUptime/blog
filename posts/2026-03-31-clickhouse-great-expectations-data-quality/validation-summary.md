# Validation Summary: How to Use ClickHouse with Great Expectations for Data Quality

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Great Expectations (GX) 0.18 (V0 fluent API)
- clickhouse-sqlalchemy
- Python
- AWS S3 (for publishing Data Docs)

## Sources Consulted
- Great Expectations official docs: https://docs.greatexpectations.io/docs/
- GX V0 to V1 migration guide: https://docs.greatexpectations.io/docs/reference/learn/migration_guide/
- GX SQL data source docs: https://docs.greatexpectations.io/docs/core/connect_to_data/sql_data/
- clickhouse-sqlalchemy PyPI page
- Great Expectations Expectation Gallery (ExpectColumnPairValuesToBeInSet, ExpectColumnMaxToBeBetween, UnexpectedRowsExpectation)

## Issues Found
1. **Unpinned install pulled incompatible major version.** `pip install great-expectations` now installs GX 1.x, which dropped `context.sources.add_sql`, `context.add_expectation_suite`, and the Validator-based fluent workflow in favor of `context.data_sources`, `context.suites.add(...)`, Batch Definitions, and standalone `gx.expectations.*` classes. The rest of the post uses the V0 fluent API, so the install command would produce a context that doesn't match the sample code. Pinned to `'great-expectations<1.0'` so the code in the post actually runs.
2. **`context.get_batch()` returns a `Batch`, not a `Validator`.** `Batch` objects do not have `expect_*` methods; calling `batch.expect_table_row_count_to_be_between(...)` raises `AttributeError`. Replaced with `context.get_validator(...)` and renamed the local variable from `batch` to `validator`, which is the correct V0 fluent pattern for attaching expectations. Also replaced the trailing `context.save_expectation_suite(suite)` with `validator.save_expectation_suite(discard_failed_expectations=False)`, which is the idiomatic way to persist expectations added via the validator.
3. **Misleading reference to `expect_column_pair_values_to_be_in_set` for a custom SQL check.** That expectation compares pairs of values from two columns against a set of valid (A, B) tuples — it does not run custom SQL and is not applicable to a "no future `created_at` timestamps" rule on a single column. Rewrote the sentence to point to `expect_column_max_to_be_between` (with `max_value=datetime.utcnow()`), which is the built-in way to express this bound, and kept the "custom query expectation class" alternative for the SQL-first approach.

## Review Notes
- GX 0.18 is marked "no longer actively maintained" in the official docs. A follow-up rewrite of this post targeting GX 1.x (using `context.data_sources.add_sql`, `context.suites.add(gx.ExpectationSuite(...))`, Batch Definitions, and `gx.expectations.ExpectColumn*` classes) would be worth doing before the pinned 0.x versions drift further out of the ecosystem.
- `clickhouse+native://` on port 9000 is the correct SQLAlchemy URL for the native TCP protocol via `clickhouse-sqlalchemy`; `clickhouse+http://` on 8123 is the alternative. Connection string in the post is accurate.
- The CLI commands (`great_expectations init`, `great_expectations datasource new`, `great_expectations docs build`) are valid in the 0.x line but were removed/reworked in 1.x — consistent with the V0 pin.
- The SQL snippet (`SELECT count() FROM orders WHERE created_at > now()`) is valid ClickHouse syntax; `count()` and `now()` are both supported.
