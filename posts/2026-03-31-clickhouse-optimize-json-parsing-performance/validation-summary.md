# Validation Summary: How to Optimize JSON Parsing Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Performance Optimization Guide

## Technologies Covered
- ClickHouse (MergeTree engine, JSON functions, materialized columns, JSON data type)
- SQL (DDL, DML, system tables)
- JSONExtract function family (JSONExtractUInt, JSONExtractInt, JSONExtractFloat, JSONExtractBool, JSONExtractString, JSONExtractArrayRaw)
- ClickHouse native JSON type (experimental in 24.8, GA in 25.3)

## Sources Consulted
- ClickHouse JSON Functions documentation: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse JSON Data Type documentation: https://clickhouse.com/docs/sql-reference/data-types/newjson
- ClickHouse ALTER TABLE / Column Manipulations: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- Altinity KB: JSONExtract to parse many attributes at a time: https://kb.altinity.com/altinity-kb-queries-and-syntax/jsonextract-to-parse-many-attributes-at-a-time/
- Altinity KB: Floats vs Decimals: https://kb.altinity.com/altinity-kb-schema-design/floats-vs-decimals/
- ClickHouse GitHub Issue #69082 (Float precision with JSONExtract): https://github.com/ClickHouse/ClickHouse/issues/69082

## Issues Found

### 1. JSONExtractFloat used for Decimal(18, 2) column (Strategy 1)
- **What was wrong:** The blog used `JSONExtractFloat(payload, 'amount')` to insert into a `Decimal(18, 2)` column. `JSONExtractFloat` returns `Float64`, which cannot represent many decimal values exactly (e.g., 99.99 becomes 99.98999...). This causes precision loss when inserted into a Decimal column.
- **What was changed:** Replaced `JSONExtractFloat(payload, 'amount')` with `toDecimal64(JSONExtractString(payload, 'amount'), 2)` to extract as string first and cast to Decimal, avoiding the Float64 intermediate representation.
- **Why:** Financial and precision-sensitive values must not pass through IEEE 754 floating point. This is a known ClickHouse issue (GitHub #69082).

### 2. Incorrect version claim for JSON type (Strategy 4)
- **What was wrong:** The blog stated "ClickHouse 24+ introduces a native JSON type." The JSON type was introduced experimentally in ClickHouse 24.8 and only became production-ready in version 25.3. Recommending it as available in "24+" without mentioning its experimental status was misleading.
- **What was changed:** Updated the heading to "ClickHouse 25.3+" and added a note that the type was experimental in 24.8 and became production-ready in 25.3. Updated the summary section accordingly.
- **Why:** Using an experimental feature in production can lead to data loss or breaking changes on upgrade. Readers need to know the correct minimum version for production use.

### 3. Unsubstantiated performance claim for typed functions (Strategy 2)
- **What was wrong:** The blog labeled `JSONExtract(payload, 'amount', 'Float64')` as "Slow" and `JSONExtractFloat(payload, 'amount')` as "Fast." There is no evidence in ClickHouse documentation or benchmarks that typed functions are materially faster than the generic `JSONExtract` with a type parameter. Both use the same underlying simdjson parser.
- **What was changed:** Softened the language from "Slow/Fast" to a recommendation for clarity and type safety. Removed the misleading performance framing while keeping the valid recommendation to prefer typed functions.
- **Why:** Making unsubstantiated performance claims can mislead readers into thinking a minor API choice matters more than the real optimizations (pre-parsing, tuple extraction, materialized columns).

## Review Notes
- The `ProfileEvents['FunctionExecute']` metric in the "Measuring JSON Parse Cost" section is valid but counts function calls at the block level, not per row. This is a minor nuance that does not require correction but readers should be aware it represents block-level granularity.
- Strategy 5 (materialized columns) correctly describes the syntax, but does not mention that materialized columns added via ALTER TABLE only apply to new inserts. Existing rows require `ALTER TABLE t MATERIALIZE COLUMN col` to backfill. This is a minor omission that doesn't affect correctness of the examples shown.
- The Tuple extraction in Strategy 3 uses positional access (`t.1`, `t.2`, `t.3`). Named access via `tupleElement(t, 'user_id')` is also available and more readable, but the positional approach shown is correct.
