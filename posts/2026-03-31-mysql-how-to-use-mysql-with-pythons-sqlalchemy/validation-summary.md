# Validation Summary: How to Use MySQL with Python's SQLAlchemy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Python
- SQLAlchemy (2.0+ style with DeclarativeBase)
- PyMySQL driver
- mysqlclient driver

## Sources Consulted
- SQLAlchemy 2.0 documentation — Engine and Connection use: https://docs.sqlalchemy.org/en/20/core/connections.html
- SQLAlchemy 2.0 migration guide — `execute()` requires `text()` for string SQL: https://docs.sqlalchemy.org/en/20/changelog/migration_20.html
- SQLAlchemy ORM DeclarativeBase reference: https://docs.sqlalchemy.org/en/20/orm/mapping_api.html#sqlalchemy.orm.DeclarativeBase
- SQLAlchemy Engine Configuration (pooling parameters): https://docs.sqlalchemy.org/en/20/core/engines.html
- PyMySQL dialect documentation: https://docs.sqlalchemy.org/en/20/dialects/mysql.html#module-sqlalchemy.dialects.mysql.pymysql
- mysqlclient dialect documentation: https://docs.sqlalchemy.org/en/20/dialects/mysql.html#module-sqlalchemy.dialects.mysql.mysqldb

## Issues Found
1. **Raw string passed to `Connection.execute()` in "Connecting to MySQL" section**: The code used `conn.execute("SELECT VERSION()")` which is not valid in SQLAlchemy 2.0+. In version 2.0, all textual SQL must be wrapped in `text()`. Changed to `conn.execute(text("SELECT VERSION()"))` and added `text` to the import on that line (`from sqlalchemy import create_engine, text`). This is required because the post targets SQLAlchemy 2.0+ (evidenced by use of `DeclarativeBase`).

## Review Notes
- `datetime.utcnow` used as the default for `created_at` is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`. The code still functions correctly but may trigger a `DeprecationWarning`. An alternative would be using SQLAlchemy's `func.now()` for server-side defaults. Not changed since it remains functional.
- The post correctly demonstrates both ORM and Core patterns, uses modern 2.0-style `select()` statements, and shows proper parameterized queries with `text()` and named placeholders.
- Connection pooling configuration section correctly documents `pool_size`, `max_overflow`, `pool_recycle`, and `pool_pre_ping` parameters.
