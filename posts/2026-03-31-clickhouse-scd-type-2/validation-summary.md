# Validation Summary: How to Handle Slowly Changing Dimensions Type 2 in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, ALTER TABLE UPDATE mutations, LowCardinality type, DateTime type)
- SQL (DDL, DML, JOINs with temporal predicates)
- dbt (snapshot feature with timestamp strategy)

## Sources Consulted
- ClickHouse DateTime documentation: https://clickhouse.com/docs/en/sql-reference/data-types/datetime
- ClickHouse ALTER UPDATE documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- dbt snapshot configuration documentation: https://docs.getdbt.com/docs/build/snapshots

## Issues Found

### 1. DateTime overflow with year 9999 sentinel (Critical)
- **What was wrong:** The post used `toDateTime('9999-12-31 23:59:59')` as the far-future sentinel value for `valid_to`. ClickHouse `DateTime` is a 32-bit unsigned integer storing seconds since Unix epoch, with a maximum representable date of 2106-02-07 06:28:15. Year 9999 overflows this range and would cause errors or silent truncation.
- **What was changed:** Replaced all occurrences of `'9999-12-31 23:59:59'` with `'2105-12-31 23:59:59'`, a safe far-future sentinel within the DateTime range. This affects the DEFAULT in the table definition, the initial INSERT, and the new-version INSERT.
- **Why:** The code as written would fail at runtime. `2105-12-31 23:59:59` is a commonly used ClickHouse SCD2 sentinel that fits within the 32-bit DateTime range.

### 2. Misleading "single transaction" claim (High)
- **What was wrong:** The post stated "Do this in a single transaction using ClickHouse's mutation + insert pattern." ClickHouse `ALTER TABLE ... UPDATE` mutations are asynchronous background operations. They cannot be combined with INSERTs in a transaction. The post itself acknowledged this in the note below the code, creating a contradiction.
- **What was changed:** Removed the "single transaction" language from the introductory sentence. Expanded the note to explicitly warn that the INSERT may execute before the mutation completes, creating a window where both rows have `is_current = 1`, and suggested checking `system.mutations` for completion.
- **Why:** The original wording could lead readers to believe they have transactional guarantees that ClickHouse does not provide, resulting in data inconsistency bugs.

### 3. Deprecated dbt snapshot config keys (Medium)
- **What was wrong:** The dbt snapshot config used `target_database` and `target_schema`, which were deprecated in dbt Core v1.9+.
- **What was changed:** Replaced `target_database` with `database` and `target_schema` with `schema`.
- **Why:** The deprecated keys may produce warnings or stop working in future dbt versions. The replacement keys are the current standard.

## Review Notes
- The `ALTER TABLE ... UPDATE` approach works for low-volume SCD2 updates but does not scale well for bulk dimension loads. The post correctly notes to use a staging + swap approach for high-throughput pipelines.
- If the blog ever targets DateTime64 (which supports up to 2299-12-31), the sentinel value could be increased, but for standard DateTime the chosen value is appropriate.
- The dbt snapshot example uses `strategy='timestamp'` which requires an `updated_at` column in the source table. This is correct but readers should be aware the source must have this column populated.
- ClickHouse experimental transaction support (BEGIN/COMMIT/ROLLBACK) exists but does not cover mutations, only INSERTs on non-replicated MergeTree tables in Atomic databases.
