# Validation Summary: How to Find Database Sizes Using INFORMATION_SCHEMA in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (INFORMATION_SCHEMA.TABLES)
- Bash shell scripting
- MySQL CLI (`mysql` command)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: ROUND() function — https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual: NULLIF() function — https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_nullif
- MySQL 8.0 Reference Manual: SELECT syntax (HAVING clause alias support) — https://dev.mysql.com/doc/refman/8.0/en/select.html

## Issues Found
No technical issues found.

## Review Notes
- The sizes reported by INFORMATION_SCHEMA.TABLES are estimates for InnoDB tables, not exact byte counts. The post does not claim they are exact, so this is not an error, but readers working with InnoDB should be aware of this caveat.
- The GB conversion uses 1024^3 (1,073,741,824), which yields gibibytes (GiB) rather than SI gigabytes (10^9). This is standard practice in database administration contexts and is not incorrect.
- The "Show Sizes in GB" query does not filter out system schemas, unlike most other queries in the post. This appears intentional to show all databases, but readers should note the inconsistency if they want user-databases-only results.
