# Validation Summary: How to Implement Write-Behind Cache with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- Redis (with AOF persistence)
- Python 3
- redis-py (Redis Python client)
- mysql-connector-python

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0.20 Release Notes (VALUES() deprecation): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Redis persistence documentation (AOF): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
1. **Deprecated `VALUES()` in `ON DUPLICATE KEY UPDATE`**: The SQL query used `VALUES(name)`, `VALUES(price)`, and `VALUES(stock)` in the `ON DUPLICATE KEY UPDATE` clause. This syntax has been deprecated since MySQL 8.0.20 (released April 2020). Updated to the modern row alias syntax using `AS new` with `new.name`, `new.price`, `new.stock`, which has been available since MySQL 8.0.19.

## Review Notes
- The redis-py `zrangebyscore` method is deprecated in redis-py 4.x+ in favor of `zrange` with `byscore=True`. It still works but may be removed in a future redis-py release. Not changed since it remains functional and is widely understood.
- The daemon thread approach (`daemon=True`) means pending writes in the queue will be lost if the main process exits. This is a design trade-off consistent with the post's acknowledgment that write-behind accepts some data loss risk.
- No explicit handling for partial batch failures — if one product in a batch causes a MySQL error, the entire `db.commit()` fails and all items remain in the pending queue for retry. This is actually reasonable retry behavior, though the post doesn't discuss it.
- The code uses a single shared `db` connection object across threads without connection pooling or thread-safety mechanisms. For production use, a connection pool would be recommended, but this is acceptable for a tutorial.
