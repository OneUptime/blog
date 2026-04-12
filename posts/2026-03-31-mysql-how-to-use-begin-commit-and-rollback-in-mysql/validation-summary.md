# Validation Summary: How to Use BEGIN, COMMIT, and ROLLBACK in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL transaction control statements (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)
- CHECK constraints (MySQL 8.0.16+)
- Python mysql-connector-python library

## Sources Consulted
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT — https://dev.mysql.com/doc/refman/8.0/en/savepoint.html
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MariaDB: System Variable Differences Between MariaDB and MySQL — https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/system-variable-differences-between-mariadb-and-mysql/system-variable-differences-between-mariadb-11.8-and-mysql-8.0
- mysql-connector-python documentation — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
- **`@@in_transaction` does not exist in MySQL**: The "Verifying Transaction State" section used `SELECT @@in_transaction;` to check whether a session is inside a transaction. This system variable is MariaDB-specific (introduced in MariaDB 10.3) and does not exist in MySQL. Running it on MySQL produces an "Unknown system variable" error. Replaced with a query against `information_schema.innodb_trx` using `CONNECTION_ID()` to check for an active transaction on the current connection.

## Review Notes
- The CHECK constraint (`CHECK (balance >= 0)`) used in the sample schema is only enforced in MySQL 8.0.16 and later. Earlier versions parse but silently ignore CHECK constraints. The post does not specify a minimum MySQL version, which could confuse readers on older installations.
- The Python example correctly uses parameterized queries with `%s` placeholders, which is good practice for preventing SQL injection.
- The explanation of implicit commit behavior when issuing `BEGIN` inside an active transaction is accurate and an important gotcha worth highlighting.
