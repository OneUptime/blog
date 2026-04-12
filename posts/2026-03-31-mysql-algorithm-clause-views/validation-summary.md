# Validation Summary: How to Handle the ALGORITHM Clause in MySQL Views

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (view algorithms: MERGE, TEMPTABLE, UNDEFINED)
- SQL (CREATE VIEW, ALTER VIEW, EXPLAIN, SHOW CREATE VIEW, information_schema)

## Sources Consulted
- MySQL 8.0 Reference Manual — View Processing Algorithms: https://dev.mysql.com/doc/refman/8.0/en/view-algorithms.html
- MySQL 8.0 Reference Manual — CREATE VIEW Statement: https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Reference Manual — ALTER VIEW Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-view.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA VIEWS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html

## Issues Found

1. **Incomplete list of constructs that prevent MERGE**: The original post listed 5 constructs (GROUP BY, DISTINCT, aggregate functions, UNION/UNION ALL, subqueries in SELECT list). The MySQL documentation lists additional constructs: `HAVING`, `LIMIT`, and window functions. Added these to the list.

2. **Incorrect claim about information_schema.VIEWS**: The post stated "The stored definition includes the ALGORITHM clause" when querying `information_schema.VIEWS.VIEW_DEFINITION`. This is incorrect — `VIEW_DEFINITION` contains only the bare SELECT statement and does not include the ALGORITHM, DEFINER, or SQL SECURITY clauses. Replaced with `SHOW CREATE VIEW`, which does show the full definition including the ALGORITHM clause.

3. **Misleading EXPLAIN interpretation**: The post claimed that "Using temporary" in EXPLAIN's Extra column indicates TEMPTABLE is in use. "Using temporary" indicates MySQL is using a temporary table for query processing (e.g., for GROUP BY or ORDER BY), but this is not specific to the TEMPTABLE view algorithm. Corrected to explain that MERGE views show the base table directly in EXPLAIN, while TEMPTABLE views appear as derived tables (`<derivedN>`).

4. **Incorrect claim about silent fallback**: The post said MySQL "silently uses TEMPTABLE" when MERGE is requested but cannot be used. Per the documentation, MySQL actually issues a warning and sets the algorithm to UNDEFINED, which then falls back to TEMPTABLE. Corrected the wording.

## Review Notes
- The post does not mention that TEMPTABLE views are never updatable (INSERT/UPDATE/DELETE), which is one reason MySQL prefers MERGE. This is a useful detail but not an error.
- The list of constructs preventing MERGE is still not fully exhaustive (omits user variable assignments and literal-only references with no underlying table), but these are rare edge cases. The most common and important ones are now covered.
- The `derived_merge` optimizer switch can also affect whether MERGE is used for UNDEFINED views, but this is an advanced topic beyond the scope of this introductory post.
