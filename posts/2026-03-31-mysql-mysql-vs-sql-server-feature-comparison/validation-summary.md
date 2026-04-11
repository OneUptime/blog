# Validation Summary: MySQL vs SQL Server: Feature Comparison

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- MySQL (Community and Enterprise editions)
- Microsoft SQL Server (Express, Developer, Standard, Enterprise editions)
- T-SQL (Transact-SQL)
- Docker (for SQL Server container example)
- SQL (ANSI standard, MySQL dialect, T-SQL dialect)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT syntax and LIMIT clause: https://dev.mysql.com/doc/refman/8.0/en/select.html
- SQL Server documentation — TOP and OFFSET-FETCH: https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql
- SQL Server on Linux documentation: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-overview
- SQL Server Docker quickstart: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- SQL Server CONCAT function documentation: https://learn.microsoft.com/en-us/sql/t-sql/functions/concat-transact-sql
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- SQL Server licensing overview: https://www.microsoft.com/en-us/sql-server/sql-server-2022-comparison

## Issues Found
- **OFFSET/FETCH syntax claimed as supported by both databases**: The post stated that `OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY` is "ANSI standard, supported by both" MySQL and SQL Server. This is incorrect — MySQL does not support the ANSI SQL:2008 `OFFSET ... ROWS FETCH NEXT ... ROWS ONLY` syntax. MySQL uses `LIMIT ... OFFSET ...` instead. Fixed the comment to clarify this is a SQL Server 2012+ feature using the ANSI SQL:2008 syntax, removing the incorrect claim that MySQL supports it.

## Review Notes
- The Docker command uses `SA_PASSWORD`, which still works but Microsoft now recommends the newer `MSSQL_SA_PASSWORD` environment variable. Both are accepted; this is not an error but worth noting for future updates.
- Galera is listed alongside official MySQL HA features (replication, Group Replication, InnoDB Cluster), but Galera Cluster is a third-party solution (Codership). It is widely associated with the MySQL ecosystem, so the mention is reasonable, though it could be clarified as third-party in a future update.
- PIVOT and UNPIVOT are described under "Window Functions and Analytics" — they are technically relational operators, not window functions. The section heading uses "Analytics" broadly enough to cover this, so it's not strictly incorrect but could be clearer.
