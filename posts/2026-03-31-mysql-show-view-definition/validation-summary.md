# Validation Summary: How to Show the Definition of a View in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW CREATE VIEW, information_schema.VIEWS)
- mysqldump CLI tool
- SQL DDL (CREATE OR REPLACE VIEW)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE VIEW Statement — https://dev.mysql.com/doc/refman/8.0/en/show-create-view.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA VIEWS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: Updatable and Insertable Views — https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html

## Issues Found

### Issue 1: Incorrect description of SHOW CREATE VIEW output
- **What was wrong:** The post stated that the `Create View` column contains `CREATE OR REPLACE VIEW ... AS SELECT ...`. In reality, `SHOW CREATE VIEW` outputs a `CREATE VIEW` statement (without `OR REPLACE`) that includes `ALGORITHM`, `DEFINER`, and `SQL SECURITY` clauses.
- **What was changed:** Updated the description to accurately reflect that the output contains the full `CREATE VIEW` statement including `ALGORITHM`, `DEFINER`, and `SQL SECURITY` clauses.

### Issue 2: Non-existent columns in information_schema.VIEWS query
- **What was wrong:** The "Checking View Metadata" section queried `CREATED` and `LAST_ALTERED` columns from `information_schema.VIEWS`. These columns do not exist in the VIEWS table (they exist in `information_schema.ROUTINES` for stored procedures/functions, but not for views). The query would fail with an "Unknown column" error.
- **What was changed:** Replaced `CREATED` and `LAST_ALTERED` with `CHECK_OPTION`, `SECURITY_TYPE`, and `DEFINER` — columns that actually exist in `information_schema.VIEWS`. Updated the description from "auditing when views were last modified" to "auditing view security settings and character set configuration," since MySQL views do not store creation or modification timestamps in the information_schema.

## Review Notes
- The `mysqldump` command for exporting only views (`grep -A 999 'CREATE.*VIEW'`) is technically functional but fragile — it could miss views whose definitions exceed 999 lines or capture unrelated content. This is acceptable for a quick tip but users should be aware it's not production-grade.
- The note about `VIEW_DEFINITION` potentially differing from the original statement is accurate and a valuable caveat.
- All `information_schema.VIEWS` column names used elsewhere in the post (TABLE_NAME, VIEW_DEFINITION, IS_UPDATABLE, SECURITY_TYPE, DEFINER, CHARACTER_SET_CLIENT, COLLATION_CONNECTION) are correct.
