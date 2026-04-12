# Validation Summary: How to Use ANY_VALUE() Function in MySQL with ONLY_FULL_GROUP_BY

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7.5+ / 8.0
- SQL `ONLY_FULL_GROUP_BY` mode
- `ANY_VALUE()` function
- `GROUP BY` with functional dependencies
- Window functions (`ROW_NUMBER()`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Miscellaneous Functions (ANY_VALUE): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_any-value
- MySQL 8.0 Reference Manual — GROUP BY Functional Dependence: https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html
- MySQL 8.0 Reference Manual — SQL Mode (ONLY_FULL_GROUP_BY): https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_only_full_group_by

## Issues Found

1. **ANY_VALUE() incorrectly called an aggregate function**: The post described ANY_VALUE() as "a special aggregate function." MySQL documentation explicitly states: "ANY_VALUE() is not an aggregate function, unlike functions such as SUM() or COUNT(). It simply acts to suppress the test for nondeterminism." Fixed to "a miscellaneous function (not an aggregate function)."

2. **Incorrect claim that MySQL may not detect PK functional dependency**: The Functional Dependency Example stated "MySQL may not detect this functional dependency" when grouping by a primary key. This is wrong — MySQL 5.7.5+ recognizes that all columns of a table are functionally dependent on its primary key (or UNIQUE NOT NULL columns) and allows them in SELECT without ANY_VALUE() or aggregation. The example was rewritten to show that PK dependency is automatically detected, and a corrected example was provided showing when ANY_VALUE() is actually needed (application-logic dependencies without key constraints).

3. **Misleading "more correct alternative"**: The original post suggested adding functionally dependent columns to GROUP BY as "a more correct alternative" when grouping by PK. This is unnecessary and potentially harmful to performance — MySQL already allows those columns when the PK is in GROUP BY. Replaced with an example demonstrating the actual use case for ANY_VALUE().

## Review Notes
- The HAVING clause example (`HAVING MAX(order_date) = ANY_VALUE(order_date)`) is correctly flagged as "not reliable" — this is a good teaching pattern.
- The window function alternative using ROW_NUMBER() is correct and well-presented.
- The advice against disabling ONLY_FULL_GROUP_BY globally is sound.
- MySQL also detects functional dependencies across joins by following equality conditions in WHERE/ON clauses transitively, which is worth noting in a future update but does not constitute an error in the current post.
