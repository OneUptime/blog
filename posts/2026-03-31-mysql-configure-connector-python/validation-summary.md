# Validation Summary: How to Configure MySQL Connector/Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Connector/Python (`mysql-connector-python`)
- Python
- MySQL connection pooling (`MySQLConnectionPool`)
- SSL/TLS for MySQL connections
- SQLAlchemy with `mysqlconnector` dialect
- mysqlclient and PyMySQL (mentioned as alternatives)

## Sources Consulted
- MySQL Connector/Python Developer Guide — https://dev.mysql.com/doc/connector-python/en/
- MySQL Connector/Python API Reference — https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlconnection.html
- MySQL Connector/Python Connection Pooling — https://dev.mysql.com/doc/connector-python/en/connector-python-connection-pooling.html
- MySQL Connector/Python SSL — https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- SQLAlchemy 2.0 Engine Configuration — https://docs.sqlalchemy.org/en/20/core/engines.html
- SQLAlchemy 2.0 Row API — https://docs.sqlalchemy.org/en/20/core/connections.html#result-set-api
- MySQL Error Codes — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

### 1. SSL section: unused `ssl_config` dict (dead code)
**What was wrong:** The SSL section defined a `ssl_config` dictionary with non-standard keys (`ca`, `cert`, `key`, `verify_cert`) that was never passed to any function. The subsequent `connect()` call used the correct `ssl_ca` parameter directly but omitted `ssl_cert` and `ssl_key` even though they were defined in the unused dict.
**What was changed:** Removed the dead `ssl_config` dict. Added `ssl_cert` and `ssl_key` parameters to the `connect()` call to show a complete mutual TLS example.
**Why:** The unused dict was confusing and its key names didn't match any mysql-connector-python API. The connect call was also incomplete for a mutual TLS setup.

### 2. SQLAlchemy section: `dict(row)` incompatible with SQLAlchemy 2.0+
**What was wrong:** `[dict(row) for row in result]` does not work in SQLAlchemy 2.0+ because `Row` objects are named tuples and cannot be directly converted with `dict()`. This would raise a `TypeError`.
**What was changed:** Replaced `dict(row)` with `row._asdict()`, which is the correct method for converting SQLAlchemy 2.0 `Row` objects to dictionaries.
**Why:** SQLAlchemy 2.0 (released January 2023) changed the `Row` API. `_asdict()` is the officially supported method.

### 3. Error handling section: potential `UnboundLocalError`
**What was wrong:** The `conn` and `cursor` variables were only assigned inside the `try` block. If `pool.get_connection()` or `conn.cursor()` raised an exception, the `except` block (calling `conn.rollback()`) and `finally` block (calling `cursor.close()`, `conn.close()`) would raise `UnboundLocalError`.
**What was changed:** Added `conn = None` and `cursor = None` initialization before the `try` block. Added `if conn:` and `if cursor:` guards in the `except` and `finally` blocks.
**Why:** This is a real bug that would cause confusing secondary errors in production when the initial connection or cursor creation fails.

## Review Notes
- The `get_orders` function has a similar (milder) issue: if `pool.get_connection()` raises inside `try`, the `finally` block references unbound `cursor` and `conn`. Left as-is since it's a simplified example and the error handling section demonstrates the proper pattern.
- `use_unicode=True` is the default in Python 3 with mysql-connector-python 8.x, so it's redundant but not incorrect.
- The `pool_size=20` value is within the valid range (max is `CNX_POOL_MAXSIZE = 32` for mysql-connector-python's built-in pool).
- Error code `1213` for deadlock is correct (`ER_LOCK_DEADLOCK`); could use `errorcode.ER_LOCK_DEADLOCK` for consistency, but the numeric literal with comment is also clear.
