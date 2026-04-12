# Validation Summary: How to Aggregate Relational Data into JSON in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions: JSON_ARRAYAGG, JSON_OBJECTAGG, JSON_OBJECT, JSON_ARRAY)
- SQL (GROUP BY, LEFT JOIN, subqueries, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_ARRAYAGG() — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-arrayagg
- MySQL 8.0 Reference Manual: JSON_OBJECTAGG() — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-objectagg
- MySQL 8.0 Reference Manual: JSON_OBJECT() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object
- MySQL 8.0 Reference Manual: JSON_ARRAY() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-array
- MySQL Bug #113921 (feature request for ORDER BY inside JSON_ARRAYAGG)

## Issues Found

### 1. ORDER BY inside JSON_ARRAYAGG() is not valid MySQL syntax
- **What was wrong:** Three queries used `JSON_ARRAYAGG(expr ORDER BY expr)` syntax (in "JSON_ARRAYAGG() - Rows to Array", "Building Arrays of Objects", and "Handling One-to-Many" sections). This syntax is supported by MariaDB but not by MySQL. MySQL's `JSON_ARRAYAGG()` accepts only `JSON_ARRAYAGG(col_or_expr) [over_clause]` — there is no ORDER BY clause inside the function. Running these queries in MySQL would produce a syntax error.
- **What was changed:** Removed ORDER BY from all three JSON_ARRAYAGG() calls. Added a note explaining that JSON_ARRAYAGG() does not support ORDER BY (unlike GROUP_CONCAT()) and that a subquery should be used for deterministic ordering.
- **Why:** The MySQL documentation explicitly states the order of elements is undefined, and there is an open MySQL bug request (#113921) for this feature, confirming it does not exist.

### 2. COALESCE does not catch [null] from LEFT JOIN aggregation
- **What was wrong:** The "Handling One-to-Many" section claimed that departments with no employees return `NULL` and that `COALESCE` can substitute an empty array. In reality, with a LEFT JOIN + GROUP BY, the left table row still exists with NULL values for the right table columns. JSON_ARRAYAGG aggregates that NULL value into `[null]` (a JSON array containing a null element), which is a valid JSON value — not SQL NULL. Therefore COALESCE would not trigger.
- **What was changed:** Replaced the COALESCE approach with `IF(COUNT(e.id) = 0, JSON_ARRAY(), JSON_ARRAYAGG(e.name))`, which correctly detects when there are no matching child rows. Updated the explanation to describe the actual `[null]` behavior and why COALESCE fails.
- **Why:** This is a common pitfall. The distinction between SQL NULL and a JSON array containing a null element is critical for correctness.

### 3. Performance tip referenced non-existent feature
- **What was wrong:** The performance considerations section said "Use ORDER BY inside JSON_ARRAYAGG() only when element order matters," referencing a feature that does not exist in MySQL.
- **What was changed:** Replaced with accurate guidance: "JSON_ARRAYAGG() does not guarantee element order. If deterministic ordering is required, sort rows in a subquery or CTE before aggregation."
- **Why:** Consistency with the fixes above and accurate representation of MySQL's capabilities.

## Review Notes
- The JSON_OBJECTAGG(), JSON_OBJECT(), and JSON_ARRAY() usage throughout the post is correct.
- The sample schema, INSERT statements, and overall query structure are valid.
- The "Full Nested Document" example using a subquery with JSON_OBJECTAGG wrapping JSON_ARRAYAGG is a correct and useful pattern.
- The result shown for JSON_OBJECTAGG ("salary_map") only shows the Engineering department result — this is technically not wrong since the query returns one row per department, but readers might expect both rows to be shown.
