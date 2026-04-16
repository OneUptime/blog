# Validation Summary: How to Use -ForEach Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL aggregate function combinators)
- ClickHouse `-ForEach` combinator
- ClickHouse array functions (`arrayMap`, `range`, `length`)
- ClickHouse date/time functions (`today()`, `now()`, `INTERVAL`)
- MergeTree table engine

## Sources Consulted
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse array functions documentation: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Incorrect description of behavior with mismatched-length arrays.** The original text claimed "If arrays differ in length, the result is undefined or truncated." Per the official ClickHouse docs example (inputs `[1,2]`, `[3,4,5]`, `[6,7]` produce `[10,13,5]`), the result actually extends to the length of the longest input array, with missing positions in shorter arrays simply skipped. Updated the bullet to reflect this documented behavior.

2. **Overly narrow claim that `-ForEach` is restricted to numeric aggregate functions.** The original text said "Supported on most numeric aggregate functions: `sum`, `avg`, `min`, `max`, `count`." The combinator is general — it works with any aggregate function, including non-numeric ones like `groupArray` and `uniq`. Reworded the bullet to clarify this and expanded the example list.

## Review Notes
- The CREATE TABLE / INSERT / SELECT examples are syntactically correct and would execute as described on a current ClickHouse server.
- `quantilesForEach` is a valid combinator stack and would return an array of arrays (each inner array containing the requested quantiles for that position). The post hedges this with "if supported," which is acceptable.
- The "Comparing Two Time Windows" section names the result `this_week_avg` while the WHERE clause selects the trailing 7 days — this is a naming/precision nitpick rather than a technical error, so left unchanged.
- The post does not specify a minimum ClickHouse version. The `-ForEach` combinator and all functions used have been stable for many years, so this is not a concern.
