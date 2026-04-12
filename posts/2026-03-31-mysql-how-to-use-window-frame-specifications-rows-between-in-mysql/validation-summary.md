# Validation Summary: How to Use Window Frame Specifications (ROWS BETWEEN) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (window functions)
- SQL window frame specifications (ROWS BETWEEN)
- RANGE BETWEEN (comparison)

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Concepts — https://dev.mysql.com/doc/refman/8.0/en/window-functions-concepts.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html
- MySQL 8.0 Reference Manual: Window Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html

## Issues Found
No technical issues found.

## Review Notes
- Window functions require MySQL 8.0 or later. The post does not explicitly state this version requirement. A future update could mention this for readers on older MySQL versions.
- The anomaly detection example uses a window function inside a CASE expression, which is valid but may be computed twice by the query engine. A future improvement could wrap the query in a CTE or subquery to reference the computed column, but this is a performance consideration, not a correctness issue.
- All five frame boundary types, common patterns, and the ROWS vs RANGE distinction are accurately explained and demonstrated.
