# Validation Summary: How to Scale MySQL with Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (mysql-connector-python)
- Redis (redis-py)
- Python 3

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- mysql-connector-python official documentation: https://dev.mysql.com/doc/connector-python/en/
- Redis CLI INFO command documentation: https://redis.io/commands/info/
- MySQL SHOW STATUS documentation: https://dev.mysql.com/doc/refman/8.0/en/show-status.html
- MySQL INSERT ... ON DUPLICATE KEY UPDATE documentation: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
No technical issues found.

## Review Notes
- The `ON DUPLICATE KEY UPDATE data = VALUES(data)` syntax in the write-through caching example uses the `VALUES()` function, which was deprecated in MySQL 8.0.20 (April 2020) in favor of row alias syntax (e.g., `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE data = new.data`). The deprecated syntax still works in all current MySQL versions and is widely used, so this is not an error, but authors may want to update it in the future if MySQL removes `VALUES()` support.
- The cache-aside example does not cache negative lookups (when a product is not found). This is a valid design choice but could lead to repeated DB queries for non-existent IDs under high traffic. This is a design consideration, not a correctness issue.
