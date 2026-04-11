# Validation Summary: How to Use MySQL Workbench Performance Reports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (performance_schema, sys schema)
- MySQL Workbench (Performance Reports, Visual EXPLAIN)
- InnoDB

## Sources Consulted
- MySQL 8.0 Reference Manual — performance_schema.events_statements_summary_by_digest table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL 8.0 Reference Manual — Performance Schema timer units (picoseconds): https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual — sys.ps_truncate_all_tables() procedure: https://dev.mysql.com/doc/refman/8.0/en/sys-ps-truncate-all-tables.html
- MySQL 8.0 Reference Manual — TRUNCATE TABLE on performance_schema tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-summary-tables.html
- MySQL Workbench documentation — Visual EXPLAIN and Performance Reports: https://dev.mysql.com/doc/workbench/en/wb-performance.html

## Issues Found
1. **Incorrect menu path for accessing Performance Reports**: The post stated Performance Reports could be accessed via "Server > Performance Reports" in the menu bar. This is not a standard menu path in MySQL Workbench — Performance Reports are accessed through the Navigator sidebar under the Performance heading. Fixed by replacing the menu path with a description of the correct sidebar location.

2. **Conflated EXPLAIN FORMAT=TREE with Visual EXPLAIN**: The post instructed users to run `EXPLAIN FORMAT=TREE` and claimed it "shows the full execution plan graphically." `EXPLAIN FORMAT=TREE` produces text-based output, not a graphical display. Visual EXPLAIN in MySQL Workbench is a separate UI feature accessed via the "Execute (Explain)" toolbar button or the "Execution Plan" tab in the results panel. Fixed by removing the `FORMAT=TREE` clause and describing the correct Workbench UI workflow for Visual EXPLAIN.

## Review Notes
- All SQL queries against `performance_schema.events_statements_summary_by_digest` use valid column names and correct syntax.
- The timer conversion factor (dividing picoseconds by 10^12 to get seconds) is correct.
- The `sys.ps_truncate_all_tables(FALSE)` procedure call and direct `TRUNCATE TABLE` on performance_schema summary tables are both valid approaches.
- The post presents the SQL queries as approximations of what Workbench runs internally. In practice, Workbench may use `sys` schema views (e.g., `sys.statement_analysis`) rather than direct `performance_schema` queries, but the queries shown are functionally equivalent and valid.
- The report names listed (e.g., "Top 10 Statements by Total Time") are representative of Workbench's Performance Reports but may not match exact report titles in all Workbench versions.
