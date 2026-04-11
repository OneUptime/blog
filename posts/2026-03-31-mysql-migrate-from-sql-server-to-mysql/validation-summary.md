# Validation Summary: How to Migrate from SQL Server to MySQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Microsoft SQL Server (T-SQL)
- MySQL
- MySQL Workbench Migration Wizard (corrected from SSMA)
- bcp (Bulk Copy Program)
- LOAD DATA INFILE

## Sources Consulted
- [SSMA for MySQL overview — Microsoft Learn](https://learn.microsoft.com/en-us/sql/ssma/mysql/sql-server-migration-assistant-for-mysql-mysqltosql) — confirmed SSMA migrates FROM MySQL TO SQL Server, not the reverse
- [SSMA overview — Microsoft Learn](https://learn.microsoft.com/en-us/sql/ssma/sql-server-migration-assistant) — confirmed all SSMA variants migrate TO SQL Server only
- [MySQL Workbench Migration Wizard](https://www.mysql.com/products/workbench/migrate/) — correct tool for SQL Server to MySQL migration
- [MySQL Workbench Migration from MS SQL Server guide](https://dev.mysql.com/blog-archive/migrating-from-ms-sql-server-to-mysql-using-workbench-migration-wizard/)
- [GETDATE (Transact-SQL) — Microsoft Learn](https://learn.microsoft.com/en-us/sql/t-sql/functions/getdate-transact-sql)
- [DATEADD (Transact-SQL) — Microsoft Learn](https://learn.microsoft.com/en-us/sql/t-sql/functions/dateadd-transact-sql)
- [DATEDIFF (Transact-SQL) — Microsoft Learn](https://learn.microsoft.com/en-us/sql/t-sql/functions/datediff-transact-sql)
- [MySQL 8.4 Date and Time Functions](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html) — confirmed DATEDIFF is days-only, TIMESTAMPDIFF for other units
- [bcp Utility — Microsoft Learn](https://learn.microsoft.com/en-us/sql/tools/bcp-utility)
- [sys.partitions — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-partitions-transact-sql)

## Issues Found

### 1. SSMA migration direction is wrong (major)
- **What was wrong:** The post recommended using Microsoft's SQL Server Migration Assistant (SSMA) for MySQL to migrate from SQL Server to MySQL. SSMA for MySQL actually migrates in the opposite direction — from MySQL to SQL Server. All SSMA variants are designed to bring databases INTO SQL Server, not away from it.
- **What was changed:** Replaced all references to SSMA with MySQL Workbench Migration Wizard, which is the correct free tool for migrating from SQL Server to MySQL. Updated the step-by-step instructions to reflect the MySQL Workbench workflow. Updated the Tags and Description metadata accordingly.
- **Why:** This was a fundamental factual error that would cause readers to download the wrong tool entirely.

### 2. `NOW()` used in SQL Server context (minor)
- **What was wrong:** Line in the T-SQL function conversion table showed `DATEADD(day, 7, NOW())` as SQL Server syntax, but `NOW()` is not a valid SQL Server function.
- **What was changed:** Corrected to `DATEADD(day, 7, GETDATE())`. `GETDATE()` is the correct SQL Server function for the current date/time.
- **Why:** `NOW()` is a MySQL function; the SQL Server side of the conversion mapping must use valid T-SQL.

### 3. MySQL DATEDIFF is days-only (clarification)
- **What was wrong:** The DATEDIFF conversion noted "reversed order" but did not mention that MySQL's `DATEDIFF()` only returns differences in days, unlike SQL Server's `DATEDIFF()` which supports any datepart.
- **What was changed:** Updated the comment to say "days only, reversed arg order" and added a note showing `TIMESTAMPDIFF()` as the MySQL equivalent for non-day dateparts.
- **Why:** A reader migrating `DATEDIFF(month, ...)` or `DATEDIFF(hour, ...)` would get incorrect results using MySQL's `DATEDIFF()`.

## Review Notes
- The `information_schema.TABLE_ROWS` value in the MySQL validation query (Step 6) is an estimate for InnoDB tables, not an exact count. The same is true for `sys.partitions.rows` in SQL Server. The section title mentions "checksums" but no checksum technique is demonstrated. These are not errors per se, but readers should be aware that both counts are approximate.
- The MONEY to DECIMAL(19,4) conversion is correct and a well-known best practice.
- All bcp flags and LOAD DATA INFILE syntax were verified as correct.
- The stored procedure conversion example is accurate and demonstrates the key differences (DELIMITER, IN parameter keyword, no SET NOCOUNT ON).
