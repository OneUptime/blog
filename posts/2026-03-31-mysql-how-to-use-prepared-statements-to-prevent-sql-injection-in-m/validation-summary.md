# Validation Summary: How to Use Prepared Statements to Prevent SQL Injection in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (server-side prepared statements via PREPARE/EXECUTE)
- PHP PDO (parameterized queries with named placeholders)
- Python mysql-connector-python (prepared cursor with %s placeholders)
- Node.js mysql2 (connection.execute with ? placeholders)
- Java JDBC (PreparedStatement with positional parameters)
- MySQL performance_schema (prepared_statements_instances table)

## Sources Consulted
- MySQL 8.0 Reference Manual — PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — prepared_statements_instances Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-prepared-statements-instances-table.html
- PHP Manual — PDO::prepare: https://www.php.net/manual/en/pdo.prepare.php
- PHP Manual — PDO::ATTR_EMULATE_PREPARES: https://www.php.net/manual/en/pdo.setattribute.php
- mysql-connector-python Documentation: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursorprepared.html
- mysql2 npm Documentation: https://github.com/sidorares/node-mysql2#using-prepared-statements
- Java JDBC PreparedStatement: https://docs.oracle.com/javase/tutorial/jdbc/basics/prepared.html

## Issues Found
1. **Incorrect column name in performance_schema query**: The query in the "Checking Prepared Statement Usage" section used `EXECUTION_COUNT` as the ORDER BY column. The correct column name in `performance_schema.prepared_statements_instances` is `COUNT_EXECUTE`. Fixed `EXECUTION_COUNT` to `COUNT_EXECUTE`.

## Review Notes
- The SQL injection explanation and examples are accurate and clearly demonstrate the vulnerability.
- All language-specific code examples (PHP PDO, Python, Node.js, Java JDBC) use correct syntax and current APIs.
- The advice about `PDO::ATTR_EMULATE_PREPARES = false` is sound — emulated prepares can still be vulnerable in edge cases involving multi-byte character sets.
- The distinction between `connection.execute()` (prepared) and `connection.query()` (not prepared) in mysql2 is accurate and important.
- The whitelist approach for dynamic identifiers is a correct best practice.
- The Python mysql-connector-python example correctly uses `cursor(prepared=True)` to enable server-side prepared statements.
