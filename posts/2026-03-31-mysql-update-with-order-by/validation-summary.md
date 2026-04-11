# Validation Summary: How to Use UPDATE with ORDER BY in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0, 8.4)
- SQL UPDATE statement with ORDER BY and LIMIT clauses
- EXPLAIN for UPDATE query analysis

## Sources Consulted
- MySQL 8.0 UPDATE Statement Reference: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.4 UPDATE Statement Reference: https://dev.mysql.com/doc/refman/8.4/en/update.html
- MySQL 8.0 EXPLAIN Statement Reference: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.4 User-Defined Variables: https://dev.mysql.com/doc/refman/8.4/en/user-variables.html

## Issues Found
1. **Inaccurate absolute claim about ORDER BY requiring LIMIT**: The post stated "`ORDER BY` in `UPDATE` is only meaningful when paired with `LIMIT`" but then contradicted this in its own "Using ORDER BY Without LIMIT" section, which demonstrates ORDER BY being meaningful for user variable assignments and trigger order. The MySQL documentation also confirms ORDER BY without LIMIT is useful (e.g., avoiding duplicate-key errors on unique indexes). Fixed by changing "is only meaningful" to "primarily matters" and adding a brief note about processing sequence effects.

## Review Notes
- The `:=` user variable assignment syntax used in the "Using ORDER BY Without LIMIT" example (`SET sequence_number = (@seq := @seq + 1)`) is deprecated in MySQL 8.0+ for use inside statements other than SET. The feature still works but generates a deprecation warning and may be removed in a future MySQL release. Readers targeting MySQL 8.0+ should be aware of this.
- `EXPLAIN UPDATE` requires MySQL 5.7+. The post does not specify a minimum version, which is fine since MySQL 5.7 reached end-of-life in October 2023.
- The multi-table UPDATE restriction (no ORDER BY or LIMIT) is correctly documented, and the subquery workaround using a derived table to avoid the "can't specify target table" error is a well-known valid pattern.
- All SQL syntax examples are correct and would execute successfully on MySQL 8.0 and 8.4.
