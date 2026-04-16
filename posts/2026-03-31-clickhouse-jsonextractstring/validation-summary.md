# Validation Summary: How to Use JSONExtractString() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- JSON
- ClickHouse JSON functions (JSONExtractString)
- MergeTree table engine

## Sources Consulted
- Official ClickHouse JSON functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse documentation for JSONExtractString return semantics

## Issues Found
1. **Incorrect array indexing claim (0-based vs 1-based).** The post stated "Integer literals for array indices (0-based): `0`, `1`, `2`". ClickHouse JSON functions use 1-based indexing for positive integers (and negative integers count from the end, e.g., `-1` for the last element). Changed to: "Integer literals for array indices (1-based, with negative integers counting from the end): `1`, `2`, `-1`".

2. **Incorrect array example output.** The "Extract from an Array Element" example used `'tags', 1` and claimed the result was `clickhouse` (the second element). With 1-based indexing, index `1` returns `analytics` (the first element). Changed the index from `1` to `2` so the output (`clickhouse` as `second_tag`) matches the actual ClickHouse behavior.

## Review Notes
- The claim that `JSONExtractString` returns an empty string when the path is missing or the value is not a string is correct per the official documentation.
- The `CREATE TABLE` / `INSERT` / `SELECT` example using a `String` payload column with `MergeTree()` engine is syntactically correct and will execute as shown.
- The post does not mention the newer native `JSON` data type (stable as of ClickHouse 24.10) or `JSONExtract(json, path, type)` typed variant, but the post's scope is intentionally narrow to the `JSONExtractString` function on `String` columns, which remains a fully supported and common pattern. No changes needed.
- The summary's recommendation to materialize frequently extracted fields into dedicated columns for production workloads is sound general advice.
