# Validation Summary: How to Query INFORMATION_SCHEMA.VIEWS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.VIEWS
- SQL (DDL and DML concepts related to views)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA VIEWS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html)
- MySQL 8.0 Reference Manual: CREATE VIEW Statement (https://dev.mysql.com/doc/refman/8.0/en/create-view.html)
- MySQL 8.0 Reference Manual: Updatable and Insertable Views (https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html)

## Issues Found
1. **Incorrect DEFINER quoting in generated CREATE VIEW statements**: The "Generating CREATE OR REPLACE VIEW Statements" section wrapped the entire `DEFINER` value (e.g., `root@localhost`) in a single pair of backticks, producing `` DEFINER=`root@localhost` ``. MySQL requires the user and host parts to be quoted separately as `` DEFINER=`root`@`localhost` ``. Fixed by using `SUBSTRING_INDEX(DEFINER, '@', 1)` and `SUBSTRING_INDEX(DEFINER, '@', -1)` to split the value and wrap each part in backticks individually.

## Review Notes
- The list of conditions that make a view non-updatable (aggregates, DISTINCT, GROUP BY, subqueries) is accurate but not exhaustive. MySQL also considers UNION, HAVING, certain joins, and other factors. This is acceptable for a blog post as it covers the most common cases.
- The `VIEW_DEFINITION LIKE '%orders%'` approach for finding views that reference a table works but has a caveat: MySQL normalizes view definitions internally, so the stored text may differ from the original CREATE VIEW statement. The approach is still practical and commonly used.
- Users need the `SHOW VIEW` privilege on a view to see its `VIEW_DEFINITION`; without it the column returns NULL. The post does not mention this, which could be noted in a future update.
