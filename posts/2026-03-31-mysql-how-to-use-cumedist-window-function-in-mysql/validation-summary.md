# Validation Summary: How to Use CUME_DIST() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ window functions)
- SQL Window Functions (CUME_DIST, PERCENT_RANK)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html#function_cume-dist
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- SQL Standard (ISO/IEC 9075) definition of CUME_DIST

## Issues Found

### 1. Incorrect CUME_DIST values for Frank and Grace (Critical)
- **What was wrong:** The sample output showed `0.7143` (5/7) for both Frank and Grace (sales_amount = 6000). The correct value is `0.8571` (6/7), because there are 6 rows with values <= 6000 (Bob, Dave, Eve, Alice, Frank, Grace) out of 7 total rows.
- **What was changed:** Corrected both values from `0.7143` to `0.8571`.
- **Why:** The formula CUME_DIST = (rows with value <= current) / (total rows) gives 6/7 = 0.857142..., not 5/7. The original values appear to have been computed as if there were only 5 rows at or below 6000, likely miscounting the tied rows.

### 2. Misleading inline comment in sample output (Minor)
- **What was wrong:** The output table contained `(wait - same as Frank)` next to Grace's row, which looked like part of MySQL output but was actually an editorial comment.
- **What was changed:** Removed the inline comment. The paragraph below the output already explains that tied values share the same CUME_DIST value.
- **Why:** Inline comments inside a code block formatted as query output are misleading and unprofessional.

### 3. Incorrect description of table contents (Minor)
- **What was wrong:** The text said "Given a `sales` table with employee scores" but the table contains `sales_amount`, not scores.
- **What was changed:** Changed "employee scores" to "employee sales data".
- **Why:** The description should match the actual column names in the table.

## Review Notes
- The CUME_DIST() function requires MySQL 8.0+. The post does not mention this version requirement. Future improvement could add a note about minimum MySQL version.
- The scoring model example calls `CUME_DIST() OVER (ORDER BY sales_amount)` multiple times in the CASE expression. While syntactically valid, wrapping the query in a subquery and referencing the computed column would be more efficient and readable. This is a style preference, not an error.
- The CUME_DIST vs PERCENT_RANK comparison table is accurate and useful.
- All SQL syntax is correct and follows MySQL 8.0 conventions.
