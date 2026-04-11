# Validation Summary: How to Use MySQL TIMESTAMPDIFF and TIMESTAMPADD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (TIMESTAMPDIFF, TIMESTAMPADD, DATEDIFF, DATE_ADD functions)
- SQL (DDL, DML, SELECT queries, UPDATE statements)

## Sources Consulted
- MySQL 8.0 Reference Manual — Date and Time Functions: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — TIMESTAMPADD: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampadd
- MySQL 8.0 Reference Manual — DATEDIFF: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_datediff

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and uses current, non-deprecated MySQL functions.
- The supported unit list (MICROSECOND through YEAR including QUARTER) is accurate for both TIMESTAMPDIFF and TIMESTAMPADD.
- The output table was manually verified against the sample data: all day, month, and hour calculations are correct (accounting for month lengths and non-leap year 2025).
- The DATEDIFF vs TIMESTAMPDIFF comparison correctly demonstrates that DATEDIFF only considers the date portion (returning 1 calendar day) while TIMESTAMPDIFF returns the actual elapsed time (2 hours).
- The DATEDIFF argument order `DATEDIFF(expr1, expr2)` returning `expr1 - expr2` is used correctly in the example.
- The best practice about avoiding TIMESTAMPDIFF in WHERE clauses on indexed columns is sound advice — wrapping an indexed column in a function call prevents the optimizer from using the index (non-sargable predicate). The suggested BETWEEN rewrite is a valid sargable alternative.
- Queries using NOW() produce time-dependent results and have no expected output shown, which is appropriate.
