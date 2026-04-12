# Validation Summary: How to Use Column Aliases with AS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SELECT statements, column aliases, AS keyword)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — Problems with Column Aliases: https://dev.mysql.com/doc/refman/8.0/en/problems-with-alias.html
- MySQL 8.0 Reference Manual — GROUP BY Handling: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found
1. **Summary section incorrectly stated aliases cannot be used in HAVING.** The original text read: "Aliases can be used in `ORDER BY` and `GROUP BY` clauses, but not in `WHERE` or `HAVING` (except in MySQL's GROUP BY extension)." This is incorrect — MySQL extends standard SQL to allow SELECT aliases in the `HAVING` clause. The parenthetical about "MySQL's GROUP BY extension" was also confusing and inaccurate in this context. Fixed to: "Aliases can be used in `ORDER BY`, `GROUP BY`, and `HAVING` clauses, but not in `WHERE`."

## Review Notes
- All SQL code examples are syntactically correct and demonstrate valid MySQL usage.
- The explanation of alias availability in WHERE (not allowed) vs ORDER BY/GROUP BY (allowed) is accurate and well-illustrated with workarounds.
- The note that MySQL allows aliases in GROUP BY as an extension to standard SQL is correct and useful.
- The post could benefit from a section showing aliases in HAVING (since it's mentioned in the summary), but this is not a correctness issue.
