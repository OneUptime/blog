# Validation Summary: How to Create or Replace a View in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CREATE OR REPLACE VIEW, DDL)
- information_schema.VIEWS
- View algorithms (TEMPTABLE, MERGE)
- SQL SECURITY and DEFINER options

## Sources Consulted
- MySQL 8.0 CREATE VIEW documentation: https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Atomic DDL documentation: https://dev.mysql.com/doc/refman/8.0/en/atomic-ddl.html
- MySQL 8.0 View Processing Algorithms: https://dev.mysql.com/doc/refman/8.0/en/view-algorithms.html
- MySQL 8.0 INFORMATION_SCHEMA VIEWS table: https://dev.mysql.com/doc/refman/8.4/en/information-schema-views-table.html
- MySQL 8.0 Updatable and Insertable Views: https://dev.mysql.com/doc/refman/8.4/en/view-updatability.html
- MySQL 8.0 SHOW CREATE VIEW: https://dev.mysql.com/doc/refman/8.4/en/show-create-view.html

## Issues Found

1. **"Equivalent to" DROP+CREATE claim was inaccurate**: The post stated CREATE OR REPLACE VIEW is "equivalent to" DROP VIEW IF EXISTS followed by CREATE VIEW. This is misleading because: (a) privileges on the view are preserved with CREATE OR REPLACE but lost with DROP+CREATE, and (b) the two-statement approach has a window where the view does not exist. Changed "equivalent to" to "similar in effect to" and added a note about privilege preservation.

2. **Column restriction presented as MySQL-enforced constraint**: The post stated the new definition "cannot change the column names or reduce the number of columns" as if MySQL enforces this at DDL time. MySQL does not enforce this restriction — it will accept the replacement. Errors only surface at query time when dependent views are accessed. Reworded to clarify this is a runtime risk, not a DDL-time constraint.

3. **"Preserves continuity for concurrent queries" was misleading**: The summary claimed CREATE OR REPLACE VIEW "preserves continuity for concurrent queries," implying seamless, non-blocking access. In reality, concurrent queries block on metadata locks during the DDL operation — they don't fail, but they don't continue seamlessly either. Reworded to accurately describe the blocking behavior and its advantage over DROP+CREATE.

## Review Notes
- The ALGORITHM = TEMPTABLE explanation is correct but could be more precise: MySQL automatically uses TEMPTABLE for views with GROUP BY, DISTINCT, aggregation, etc. The explicit specification is primarily useful for earlier release of locks on underlying tables. This framing difference was not corrected as it is not technically wrong, just incomplete.
- TEMPTABLE views are not updatable (cannot INSERT/UPDATE/DELETE through them). The post does not mention this, but since the post's scope is view creation/replacement rather than DML through views, this omission was not added.
- The `\G` terminator in `SHOW CREATE VIEW product_summary\G` is specific to the mysql command-line client, not standard SQL. This is standard practice in MySQL tutorials and was left as-is.
