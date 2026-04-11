# Validation Summary: How to Migrate from Oracle to MySQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Oracle Database (SQL*Plus, DBMS_METADATA, PL/SQL, sequences, SYSDATE, NVL, DECODE)
- MySQL (AUTO_INCREMENT, NOW(), IFNULL, CASE, LOAD DATA INFILE, stored procedures)
- MySQL Workbench Migration Wizard

## Sources Consulted
- MySQL 8.0 Reference Manual — AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — LOAD DATA INFILE: https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- Oracle SQL*Plus documentation — SET commands (COLSEP, PAGESIZE, TRIMSPOOL, SPOOL): https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/
- Oracle DBMS_METADATA.GET_DDL documentation: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_METADATA.html
- MariaDB CREATE SEQUENCE (confirming this is MariaDB-only, not MySQL): https://mariadb.com/kb/en/create-sequence/

## Issues Found
1. **Incorrect claim that MySQL has sequences**: The comparison table stated the MySQL equivalent of Oracle's `SEQUENCE` is "AUTO_INCREMENT or sequences (MySQL 8.0+)". MySQL does not have a native `CREATE SEQUENCE` statement — that is a MariaDB 10.3+ feature. Fixed to just "AUTO_INCREMENT".

2. **Description mentioned "AWS tools" not covered in the post**: The description referenced "open-source and AWS tools" but the post does not discuss any AWS services (such as AWS DMS or AWS SCT). Fixed to "open-source tools" to match the actual content.

3. **SQL*Plus spool export missing TRIMSPOOL setting**: The SQL*Plus CSV export script was missing `SET TRIMSPOOL ON`. Without this, SQL*Plus pads each line with trailing spaces up to the LINESIZE width, which would corrupt data when imported into MySQL via LOAD DATA INFILE. Added `SET TRIMSPOOL ON` to the spool script.

## Review Notes
- The SQL*Plus spool approach for CSV export is basic and does not handle values containing commas or newlines. For production migrations with complex data, a dedicated ETL tool or Oracle's Data Pump with a conversion step would be more robust. This is acceptable for a tutorial but readers should be cautioned for large-scale migrations.
- The post correctly omits `COMMIT` from the MySQL stored procedure (MySQL autocommits by default), but does not explain this difference from the Oracle version which includes it. This could be a useful addition for readers unfamiliar with MySQL's transaction behavior.
- `SET PAGESIZE 0` in SQL*Plus suppresses column headers, but some older SQL*Plus versions may behave differently. Adding explicit `SET HEADING OFF` would be more portable, though the current approach works in modern versions.
