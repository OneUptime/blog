# Validation Summary: How to Check If a View is Updatable in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- information_schema.VIEWS table
- SQL (DDL and DML)
- MySQL view updatability rules

## Sources Consulted
- MySQL 8.0 Reference Manual — Updatable and Insertable Views: https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA VIEWS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-views-table.html
- MySQL 8.0 Server Error Reference (Error 1288 / ER_NON_UPDATABLE_TABLE)

## Issues Found

1. **Internal inconsistency in sample output (CHECK_OPTION value):** The sample query output showed `active_employees` with `CHECK_OPTION = CASCADED`, but the CREATE VIEW example for `active_employees` later in the post does not include `WITH CHECK OPTION`. Changed the sample output to show `NONE` for consistency.

2. **Incorrect terminology for join view updatability:** The post stated "MySQL marks join views as `YES` only when one side is key-preserved." The term "key-preserved" is Oracle database terminology, not MySQL. MySQL determines join view updatability based on whether at least one component of the join is updatable (uses the MERGE algorithm rather than a temporary table). Reworded to use MySQL-accurate language.

## Review Notes
- The list of conditions that make a view non-updatable is correct but not exhaustive. MySQL docs also list: `ALGORITHM = TEMPTABLE`, window functions, views referencing only literal values, and subqueries in the WHERE clause that reference a table in the FROM clause. The blog's use of "etc." and "certain joins (in some configurations)" partially covers this, and a tutorial-level post does not need to enumerate every edge case.
- All SQL syntax is correct and would execute as shown on MySQL 8.0+.
- Error code 1288 (HY000) with the ER_NON_UPDATABLE_TABLE message is verified correct.
- The information_schema.VIEWS column names (TABLE_NAME, IS_UPDATABLE, CHECK_OPTION, VIEW_DEFINITION, TABLE_SCHEMA) are all correct.
