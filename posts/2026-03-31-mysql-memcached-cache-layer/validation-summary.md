# Validation Summary: How to Use Memcached as a Cache Layer for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Memcached (in-memory key-value cache)
- MySQL (relational database)
- Python (application language)
- pymemcache (Python Memcached client library)
- mysql-connector-python (Python MySQL driver)

## Sources Consulted
- pymemcache official documentation and source code (https://github.com/pinterest/pymemcache) — verified `Client.__init__` default `default_noreply=True`, `add()` return behavior with noreply on/off, `set()`/`get()`/`delete()` API signatures, and `expire` parameter naming.
- mysql-connector-python documentation (https://dev.mysql.com/doc/connector-python/en/) — verified `cursor(dictionary=True)`, parameterized query syntax, `fetchone()`/`fetchall()`, `rowcount` attribute behavior.
- Memcached protocol and `memcstat` CLI tool documentation — verified `memcstat --servers` usage and stat key names (`cmd_get`, `get_hits`, `get_misses`).
- Ubuntu/Debian package repositories — verified `memcached` and `libmemcached-tools` package names.

## Issues Found
1. **Broken cache stampede lock due to pymemcache `noreply` default** (line 130): The `mc.add(lock_key, '1', expire=5)` call used for the stampede lock relied on the return value to determine if the lock was acquired. However, pymemcache's `Client` defaults to `default_noreply=True`, which causes `add()` to always return `True` without waiting for the server's STORED/NOT_STORED response. This means every concurrent caller would believe it acquired the lock, completely defeating the stampede prevention. **Fixed** by adding `noreply=False`: `mc.add(lock_key, '1', expire=5, noreply=False)`.

## Review Notes
- The `fetch_from_mysql()` function referenced in the stampede prevention section is not defined in the post. It is implied as a helper, but readers may find it clearer if it were defined or if the inline MySQL query pattern from the earlier section were reused. This is a stylistic observation, not a technical error.
- The recursive retry in `get_product_safe()` could theoretically cause a stack overflow under extreme contention, but for a tutorial demonstrating the concept this is acceptable.
- All pymemcache API usage (`Client`, `get`, `set`, `delete`, `add`, `expire` parameter) is correct and current.
- The cache-aside pattern, key design conventions, invalidation strategy, and hit rate formula are all accurate.
