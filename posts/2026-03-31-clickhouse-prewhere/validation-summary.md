# Validation Summary: How to Use PREWHERE in ClickHouse for Faster Filtering

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL (ClickHouse dialect)
- PREWHERE clause
- Query optimization and EXPLAIN plans

## Sources Consulted
- ClickHouse official documentation on PREWHERE: https://clickhouse.com/docs/en/sql-reference/statements/select/prewhere
- ClickHouse documentation on MergeTree settings (`optimize_move_to_prewhere`): https://clickhouse.com/docs/en/operations/settings/settings#optimize_move_to_prewhere
- ClickHouse documentation on EXPLAIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse documentation on MergeTree engine family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family

## Issues Found

### Issue 1: Incorrect selectivity terminology in introduction
- **What was wrong:** The intro paragraph stated "low-selectivity filters" when describing conditions that benefit from PREWHERE. In standard database terminology, "low selectivity" means many rows match (filter eliminates little data), which is the opposite of what benefits PREWHERE. The post itself correctly stated "highly selective" in the later "When PREWHERE Provides the Most Benefit" section, creating an internal contradiction.
- **What was changed:** Changed "low-selectivity filters" to "highly selective filters" in the intro paragraph.
- **Why:** PREWHERE benefits most when the filter discards the majority of granules, which is high selectivity.

### Issue 2: Incorrect restriction about PREWHERE columns in SELECT
- **What was wrong:** The "Restrictions on PREWHERE" section claimed that columns used in PREWHERE must not appear in the SELECT list unless they are also repeated in WHERE. This is incorrect. ClickHouse properly retains column data for rows that pass the PREWHERE filter, so those columns are available in SELECT output. If this restriction existed, the automatic `optimize_move_to_prewhere` optimization would break many queries where WHERE conditions reference columns also in SELECT.
- **What was changed:** Rewrote the Restrictions section to list the actual restrictions: PREWHERE is only supported by MergeTree family tables, and ALIAS columns cannot be used. Added a correct example showing that a column in both PREWHERE and SELECT works fine.
- **Why:** The original advice could mislead users into writing unnecessary redundant WHERE clauses or avoiding PREWHERE when it would be beneficial.

### Issue 3: Incorrect data type in code comment
- **What was wrong:** A code comment described `status = 'error'` as filtering on a "cheap UInt8 column," but UInt8 holds numeric values (0–255) and cannot be compared to a string literal like `'error'`.
- **What was changed:** Changed the comment from "UInt8" to "Enum8," which is stored as a single byte internally but supports string-based comparisons.
- **Why:** Enum8 is the correct ClickHouse type for a compact column that holds string-like status values.

## Review Notes
- The post correctly notes that `optimize_move_to_prewhere` is enabled by default, making manual PREWHERE rarely necessary. This is an important practical point.
- The EXPLAIN example is useful but could mention `EXPLAIN PLAN` or `EXPLAIN PIPELINE` for more detailed output in future revisions.
- The examples use hypothetical tables without CREATE TABLE statements, which is appropriate for a focused optimization guide.
