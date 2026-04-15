# Validation Summary: How to Use retention() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate functions (`retention()`, `sum()`, `round()`)
- Date functions (`toMonday()`)
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Parametric Aggregate Functions: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions#retention
- ClickHouse official documentation — Array Functions: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse official documentation — Date Functions (`toMonday`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions#tomonday

## Issues Found

### 1. Incorrect syntax showing parametric `(date_or_timestamp)` argument
**What was wrong:** The Syntax section showed `retention(cond1, cond2, cond3, ...)(date_or_timestamp)` and described a `date_or_timestamp` parameter as "unused for ordering but required as the first argument in some signatures." This is fabricated — `retention()` takes only condition arguments directly (up to 32), with no parametric argument despite being categorized under "Parametric Aggregate Functions" in the docs.

**What was changed:** Corrected the syntax to `retention(cond1, cond2, cond3, ...)` and removed the `date_or_timestamp` bullet point. Added a note that up to 32 conditions are supported.

### 2. Summary repeated incorrect syntax
**What was wrong:** The Summary section used `retention(cond1, cond2, ...)(date)`, repeating the same fabricated parametric argument.

**What was changed:** Corrected to `retention(cond1, cond2, ...)`.

### 3. CTE alternative query was incomplete/broken
**What was wrong:** The CTE query in the "Note on Self-Reference" section referenced `r[1]`, `r[2]`, `r[3]` in the outer SELECT but never defined `r` — there was no `retention()` call anywhere in the query. The query would fail with an unknown column error.

**What was changed:** Restructured the CTE query to properly call `retention()` inside a subquery grouped by `user_id` and `cohort_date`, with the outer query aggregating by `cohort_date`.

## Review Notes
- The "Rolling Cohort Retention Table" query that uses `min(activity_date)` inside `retention()` arguments (mixing two aggregate functions) may not work in all ClickHouse versions since nesting aggregates is generally not supported. The post already acknowledges this with the "Note on Self-Reference" section and provides a CTE alternative, which is now corrected.
- All expected output values were manually verified against the sample data and are correct.
- The `toMonday()` usage in the WAU pattern section is correct — `2024-01-01` is indeed a Monday.
- ClickHouse arrays are 1-indexed; all array access patterns (`r[1]`, `r[2]`, `r[3]`) are correct.
