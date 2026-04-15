# Validation Summary: How to Use Regular Expressions for Data Extraction in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- RE2 regular expression library
- ClickHouse string/regex functions: `extract`, `extractAll`, `replaceRegexpOne`, `replaceRegexpAll`, `splitByRegexp`, `match`

## Sources Consulted
- ClickHouse official docs — Functions for Searching in Strings: https://clickhouse.com/docs/sql-reference/functions/string-search-functions
- ClickHouse official docs — Functions for Replacing in Strings: https://clickhouse.com/docs/sql-reference/functions/string-replace-functions
- ClickHouse official docs — Functions for Splitting and Merging Strings: https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions
- ClickHouse official docs — ALTER TABLE column manipulations: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse official docs — SELECT syntax and alias scoping: https://clickhouse.com/docs/sql-reference/syntax

## Issues Found
- **`extractAll` description was incomplete**: The original text stated it "returns an array of all non-overlapping matches" without mentioning capture-group behavior. Per the official docs, when the pattern contains a capturing group, `extractAll` returns the captured substrings rather than the full matches. Added a clarifying sentence to the description. The code example itself (which uses no capture group) was correct and unchanged.

## Review Notes
- The `extract` description ("returns the first capturing group") is accurate for patterns with a capture group. When there is no capture group, `extract` returns the entire match instead. The blog's example uses a capture group so this is correct in context, but readers should be aware of the fallback behavior.
- The claim that ClickHouse regex functions are "backed by the RE2 library" is correct for all functions discussed in this post. However, ClickHouse also has `multiMatch*` functions that use the Hyperscan library — this post does not cover those, so the statement is accurate in scope.
- The query referencing a SELECT alias (`ip_addresses`) in the WHERE clause is valid in ClickHouse due to its non-standard alias scoping rules (aliases are globally visible within a query). This is not portable to other SQL databases.
- The `ALTER TABLE ... ADD COLUMN ... MATERIALIZED` syntax is correct. Worth noting that this only applies to newly inserted rows; existing rows would need `ALTER TABLE ... MATERIALIZE COLUMN` to backfill.
- The "RE2 regex compilation happens once per query" claim is essentially correct for constant pattern arguments, which is the standard usage shown in the post.
