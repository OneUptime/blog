# Validation Summary: How to Use the USING Clause in MySQL Joins

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JOIN syntax, USING clause)
- SQL (standard SQL join semantics)

## Sources Consulted
- MySQL 8.0 Reference Manual -- 15.2.13.2 JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 5.7 Reference Manual -- 13.2.9.2 JOIN Clause: https://dev.mysql.com/doc/refman/5.7/en/join.html
- MySQL 8.4 Reference Manual -- 15.2.13.2 JOIN Clause: https://dev.mysql.com/doc/refman/8.4/en/join.html
- MySQL 8.0.16 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html

## Issues Found

1. **Incorrect claim about "strict SQL mode" and table-qualified USING columns (line 115):**
   - **What was wrong:** The post stated "Using a table qualifier on a `USING` column raises an error in strict SQL mode." This is incorrect. MySQL actually allows qualifying USING columns with table names as a non-standard extension to the SQL standard. The restriction exists in the SQL standard itself, not in any MySQL SQL mode.
   - **What was changed:** Replaced the claim with an accurate explanation: the SQL standard forbids qualifying USING columns, MySQL allows it as an extension, but other databases may reject it. Updated the code comment accordingly.
   - **Why:** The original text conflated the SQL standard restriction with MySQL's strict SQL mode, which are unrelated concepts. This could mislead readers into thinking the behavior depends on a MySQL mode setting.

2. **Misleading self-join entry in compatibility table (line 133):**
   - **What was wrong:** The table stated "Self-join on same table | No - use ON with aliases", implying USING cannot be used with self-joins. USING is syntactically valid for self-joins (e.g., `FROM t a JOIN t b USING (col)`). The real issue is that most self-join use cases involve different column names, which is already covered by the "Column names differ" row.
   - **What was changed:** Changed the entry to "Self-join where join columns have different names | No - use ON with aliases" to accurately describe when ON is required.
   - **Why:** The blanket claim that USING doesn't work with self-joins is technically incorrect and could confuse readers who have a valid self-join use case where both sides share the same column name.

## Review Notes
- All SQL code examples are syntactically correct and use valid MySQL syntax.
- The explanation of duplicate column elimination with USING (coalesced column appearing first in SELECT * output) is accurate per MySQL documentation.
- The multi-column USING syntax example is correct.
- The LEFT JOIN with USING example is correct.
- The overall structure and advice of the post is sound -- USING is indeed a useful shorthand for equi-joins on same-named columns.
