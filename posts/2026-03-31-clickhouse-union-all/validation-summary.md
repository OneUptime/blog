# Validation Summary: How to Use UNION ALL in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (UNION ALL, UNION DISTINCT, CTEs, subqueries)

## Sources Consulted
- ClickHouse UNION clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/union

## Issues Found

### 1. ORDER BY / LIMIT scope with UNION ALL (multiple examples affected)
**What was wrong:** The post placed `ORDER BY` and `LIMIT` directly after the last SELECT in UNION ALL chains and stated they "apply to the combined result." According to ClickHouse documentation, ORDER BY and LIMIT after a UNION chain are applied to the last individual query, not to the final combined result. To sort or limit the full result, the entire UNION must be wrapped in a subquery.

**What was changed:** Wrapped all UNION ALL queries that use ORDER BY or LIMIT in an outer `SELECT * FROM (...)` subquery so the clauses correctly apply to the combined result. Affected sections: "Chaining Multiple UNION ALL Queries", "Practical Example: Multi-Period Comparison", and "Adding ORDER BY and LIMIT to UNION Queries". Updated the explanatory text and summary to reflect the correct behavior.

### 2. Bare UNION default behavior
**What was wrong:** The post stated that `UNION DISTINCT` "(or just `UNION`)" removes duplicates, implying bare `UNION` always behaves like `UNION DISTINCT`. In ClickHouse, the behavior of bare `UNION` depends on the `union_default_mode` setting and is not guaranteed to be `UNION DISTINCT`.

**What was changed:** Removed the parenthetical "(or just `UNION`)" claim and added a note that bare `UNION` depends on the `union_default_mode` setting, advising readers to always specify `ALL` or `DISTINCT` explicitly.

## Review Notes
- The post's general guidance (prefer UNION ALL over UNION DISTINCT for performance, ensure column count/type alignment, use explicit casts) is sound.
- The CTE and subquery examples were already correct since they did not use ORDER BY on the outer UNION.
- Readers working with older ClickHouse versions should be aware that `union_default_mode` defaults may vary by version.
