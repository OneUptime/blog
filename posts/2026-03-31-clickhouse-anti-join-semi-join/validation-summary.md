# Validation Summary: How to Use ANTI JOIN and SEMI JOIN in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (JOIN strictness: SEMI, ANTI)
- ClickHouse date/time functions (`today()`, `toStartOfMonth()`, `INTERVAL`)
- Common Table Expressions (CTEs / `WITH` clause)

## Sources Consulted
- ClickHouse official JOIN documentation: https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse documentation on supported join types and strictness (SEMI, ANTI, ASOF, ANY, ALL)
- ClickHouse date function docs for `today()`, `toStartOfMonth()`, and `INTERVAL` arithmetic

## Issues Found
No technical issues found.

- ClickHouse does support `LEFT SEMI JOIN`, `RIGHT SEMI JOIN`, `LEFT ANTI JOIN`, and `RIGHT ANTI JOIN` as documented.
- The described semantics are correct: SEMI JOIN keeps rows with matches, ANTI JOIN keeps rows without matches, neither produces a cartesian product from right-side duplicates.
- All SQL syntax in code examples is valid ClickHouse SQL.
- `today() - 90` (integer subtraction giving days) and `today() - INTERVAL 1 MONTH` are both valid ClickHouse date arithmetic forms.
- `toStartOfMonth()` is a valid ClickHouse function.
- The CTE (`WITH ... AS (...)`) syntax used in the churn detection example is supported in ClickHouse.
- The claim that `LEFT ANTI JOIN` avoids the NULL pitfall of `NOT IN` is correct — `NOT IN` with a NULL-containing subquery returns no/incorrect rows due to three-valued logic, while ANTI JOIN's equality predicate simply fails to match NULLs and includes left-side rows accordingly.

## Review Notes
- The statement "Only columns from the left/right table appear in the result" describes the typical/intended use of SEMI and ANTI JOINs. In practice, ClickHouse may allow referencing the other side's columns in the SELECT list (returning an arbitrary matched value), but the examples in the post only reference the correct side, so the guidance holds.
- The performance note "stops checking the right table once the first match is found for SEMI JOIN" is a conceptual description of short-circuit behavior; ClickHouse's actual hash-based implementation builds a membership structure rather than literally scanning until first match, but the net effect (no cartesian duplicates, faster than full joins) is accurate.
- The intro to "Combining ANTI JOIN with Additional Filters" says the `ON` condition can be extended with `WHERE` clauses; the example actually uses a `WHERE` on the outer query and filters inside a subquery, which is a slightly loose description but functionally correct.
