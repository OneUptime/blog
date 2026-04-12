# Validation Summary: How to Rewrite Subqueries to CTEs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Common Table Expressions (CTEs)
- SQL subqueries and derived tables
- EXPLAIN FORMAT=JSON

## Sources Consulted
- [MySQL 8.0 Reference Manual: WITH (Common Table Expressions)](https://dev.mysql.com/doc/refman/8.0/en/with.html)
- [MySQL 8.0 Reference Manual: EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- [MySQL 8.0 Reference Manual: Optimizing Derived Tables, View References, and CTEs](https://dev.mysql.com/doc/refman/8.0/en/derived-table-optimization.html)
- [Percona Blog: EXPLAIN FORMAT=JSON materialized_from_subquery details](https://www.percona.com/blog/explain-formatjson-provides-us-all-details-about-subqueries-attached_subqueries-nested_loop-materialized_from_subquery-optimized_away_subqueries/)

## Issues Found
1. **Incorrect EXPLAIN FORMAT=JSON field name (line 168)**: The post stated to look for `"materialized": true` in the JSON output to check if a CTE was materialized. This field does not exist in MySQL's EXPLAIN FORMAT=JSON output. The correct indicator is the `"materialized_from_subquery"` object, which is a nested structure containing `using_temporary_table` and `query_block`. Fixed to reference the correct field name and added a note about how merged (inlined) CTEs appear in the plan.

## Review Notes
- All SQL examples are syntactically correct and semantically equivalent between the subquery and CTE versions.
- The claim that CTEs were introduced in MySQL 8.0 is accurate.
- The performance section correctly states that non-recursive CTEs are not materialized by default and can be inlined by the optimizer via the derived_merge optimization. One nuance not mentioned is that CTEs referenced multiple times are always materialized, but this omission does not constitute an error.
- The "computed once, referenced twice" comment in the CTE reuse section is slightly imprecise — the CTE is referenced once in the FROM clause via a cross join, with the column value used twice in the WHERE clause — but the concept demonstrated (avoiding duplicated subqueries) is valid.
- The `to2` alias used in the debugging section avoids the reserved word `TO`, which is correct practice.
