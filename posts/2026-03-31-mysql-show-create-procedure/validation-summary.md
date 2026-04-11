# Validation Summary: How to Use SHOW CREATE PROCEDURE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- Stored Procedures (CREATE PROCEDURE, SHOW CREATE PROCEDURE)
- mysqldump CLI tool
- information_schema.ROUTINES

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/show-create-procedure.html
- MySQL 8.0 Reference Manual: CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: ALTER PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/alter-procedure.html
- MySQL 8.0 Reference Manual: SHOW PROCEDURE STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-procedure-status.html
- MySQL 8.0 Reference Manual: information_schema ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
No technical issues found.

## Review Notes
- The sample output uses `utf8mb4_0900_ai_ci` collation, which is specific to MySQL 8.0+. The post does not explicitly state a version, but all syntax and output are consistent with MySQL 8.0.
- The statement that `ALTER PROCEDURE` cannot change the procedure body is correct — it only modifies characteristics like COMMENT, SQL SECURITY, and LANGUAGE. The drop-and-recreate approach shown is the standard practice.
- The Required Privileges section shows valid grants for working with procedures but does not specifically mention what privilege is needed to run `SHOW CREATE PROCEDURE` itself (requires being the definer, or having SELECT on `mysql.routines`, or having an appropriate routine-level privilege). This is a minor omission but not an error.
