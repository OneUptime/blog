# Validation Summary: How to Use EXPLAIN ANALYZE in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.18+
- EXPLAIN ANALYZE
- Query optimization and execution plans
- ANALYZE TABLE

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN ANALYZE: https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
- MySQL 8.0.18 Release Notes (introduction of EXPLAIN ANALYZE): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-18.html

## Issues Found
1. **"Estimated vs actual execution costs" claim was incorrect.** EXPLAIN ANALYZE reports estimated cost but does NOT report actual cost. It reports actual time and actual rows. Removed "Estimated vs actual execution costs" from the introductory bullet list and consolidated with the time bullet point.

2. **`EXPLAIN ANALYZE FORMAT=JSON` example was incorrect.** EXPLAIN ANALYZE only supports FORMAT=TREE (the default). Attempting to use FORMAT=JSON or FORMAT=TRADITIONAL produces an error. Changed the example to use FORMAT=TREE and added a note clarifying that JSON and TRADITIONAL formats are not supported.

3. **"high actual time relative to estimated time" reference was incorrect.** There is no "estimated time" in EXPLAIN ANALYZE output — there is estimated cost and actual time. Changed the guidance to look for high actual time values and gaps between estimated and actual row counts instead.

4. **Tip 3 incorrectly compared `cost=` to `actual time=`.** Cost is an abstract optimizer unit while actual time is in milliseconds — they are not directly comparable. The real indicator of stale statistics is the gap between estimated and actual row counts. Rewrote the tip to reference estimated vs actual rows instead.

## Review Notes
- The post correctly notes that EXPLAIN ANALYZE was introduced in MySQL 8.0.18.
- The DML tip (wrapping EXPLAIN ANALYZE UPDATE in a transaction + ROLLBACK) is correct and good advice, since EXPLAIN ANALYZE does execute the statement.
- The sample EXPLAIN ANALYZE output trees are realistic and well-structured.
- The `actual time=start..end` description as "start and end time" is acceptable shorthand; more precisely, it is "time to first row..time to last row" but the current wording is close enough for a tutorial.
