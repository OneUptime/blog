# Validation Summary: How to Use mapApply() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- `mapApply()` higher-order map function
- Lambda functions in ClickHouse SQL
- Map data type and related functions (`mapFilter`, `mapKeys`, `mapValues`)

## Sources Consulted
- ClickHouse official documentation — Map functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse test suite (`tests/queries/0_stateless/02169_map_functions.sql`) for `mapApply` behavior verification

## Issues Found

### 1. Lambda return type — all code examples returned scalar instead of required tuple (CRITICAL)
**What was wrong:** Every `mapApply()` lambda in the post returned a scalar expression (e.g., `(k, v) -> v * 2`). ClickHouse requires `mapApply()` lambdas to return a **2-element tuple** `(new_key, new_value)`. Returning a scalar causes a runtime error (`BAD_ARGUMENTS`).

**What was changed:** All lambda expressions were updated to return tuples. For example:
- `(k, v) -> v * 2` → `(k, v) -> (k, v * 2)`
- `(k, v) -> upper(v)` → `(k, v) -> (k, upper(v))`
- `(k, v) -> round(v, 2)` → `(k, v) -> (k, round(v, 2))`
- `(k, v) -> least(v, 1.0)` → `(k, v) -> (k, least(v, 1.0))`
- CASE expressions were wrapped in tuples: `(k, CASE ... END)`

**Why:** The official documentation and ClickHouse test suite both confirm the lambda must return exactly a 2-element tuple. A 1-element tuple, 3-element tuple, or scalar all produce errors.

### 2. Incorrect claim that keys are never modified by mapApply() (MAJOR)
**What was wrong:** The post stated in three places that "keys are preserved as-is; only values are transformed" and "keys are never modified by mapApply()". This is factually incorrect — because the lambda returns a `(new_key, new_value)` tuple, `mapApply()` **can** transform both keys and values.

**What was changed:**
- Function signature section: Rewritten to explain the tuple return type and that both keys and values can be transformed.
- Intro paragraph: Changed "transforming all values in a map uniformly" to "transforming keys and values in a map".
- Summary section: Replaced the false claim with accurate documentation of the tuple return requirement.

**Why:** The ClickHouse test suite includes a test case `mapApply((x, y) -> ('x', 'y'), map(1, 0, 2, 0))` that explicitly demonstrates key transformation, proving the original claim was wrong.

## Review Notes
- The `mapFilter()` lambda in the chaining example correctly uses a scalar boolean return (`(k, v) -> v >= 80.0`), which is the correct syntax for `mapFilter` (as opposed to `mapApply` which requires a tuple). No change was needed there.
- The table schema, INSERT statements, and MergeTree engine configuration are all correct.
- The conceptual explanations of normalization, percentage conversion, and value capping are sound — only the SQL syntax was wrong.
