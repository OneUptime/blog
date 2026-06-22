# Validation Summary: How to Fix 'SQL Injection' Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQL injection prevention
- OWASP Top 10
- Python DB-API / psycopg2
- SQLAlchemy Core and ORM
- Node.js with node-postgres, mysql2, Prisma, and Knex.js
- Java JDBC, JPA / Hibernate, and Spring Data JPA
- Go database/sql, sqlx, and GORM
- MySQL privileges
- PostgreSQL PL/pgSQL functions

## Sources Consulted
- OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP Top 10:2025: https://owasp.org/Top10/2025/
- OWASP A03:2021 Injection: https://owasp.org/Top10/2021/A03_2021-Injection/
- psycopg2 parameter usage documentation: https://www.psycopg.org/docs/usage.html
- SQLAlchemy Unified Tutorial and bind parameter documentation: https://docs.sqlalchemy.org/tutorial/ and https://docs.sqlalchemy.org/en/latest/core/sqlelement.html
- node-postgres parameterized query documentation: https://node-postgres.com/features/queries
- mysql2 prepared statement documentation: https://sidorares.github.io/node-mysql2/docs
- Prisma Client API reference: https://www.prisma.io/docs/orm/reference/prisma-client-reference
- Knex query builder documentation: https://knexjs.org/guide/query-builder.html
- Oracle JDBC PreparedStatement documentation: https://docs.oracle.com/javase/8/docs/api/java/sql/PreparedStatement.html
- Jakarta Persistence Query documentation: https://jakarta.ee/specifications/persistence/2.2/apidocs/javax/persistence/query
- Spring Data JPA query method documentation: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- Go database/sql documentation: https://pkg.go.dev/database/sql
- Go database querying guide: https://go.dev/doc/database/querying
- sqlx named parameter documentation: https://jmoiron.github.io/sqlx/
- GORM security documentation: https://gorm.io/docs/security.html
- MySQL TRUNCATE TABLE documentation: https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html
- PostgreSQL CREATE FUNCTION documentation: https://www.postgresql.org/docs/current/sql-createfunction.html

## Issues Found
- The vulnerable Python example said the injected query "returns all users," but the code calls `fetchone()`. Changed the comment to clarify that the query matches all users while `fetchone()` returns the first matching row.
- The MySQL least-privilege example listed `TRUNCATE` as though it were a grantable privilege. MySQL requires the `DROP` privilege for `TRUNCATE TABLE`, so the note now avoids `TRUNCATE` in the pseudo-GRANT line and explains the `DROP` relationship.
- The PostgreSQL stored-routine example used `CREATE FUNCTION` while the code comment called it a stored procedure. Changed the comment to "PostgreSQL function" and tightened the parameter-safety comment to apply specifically to the static query shown.

## Review Notes
The main security guidance is technically correct: parameterized queries or prepared statements are the primary SQL injection defense, allow-list validation is appropriate for dynamic identifiers that cannot be bound as values, and least-privilege database accounts reduce blast radius. ORM and query-builder examples are safe as written for normal value binding, but raw SQL escape hatches in those libraries still require parameter binding and identifier allow-lists.
