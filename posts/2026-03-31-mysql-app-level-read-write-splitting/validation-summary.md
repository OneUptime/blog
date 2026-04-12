# Validation Summary: How to Implement Application-Level Read-Write Splitting for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0.22+ syntax for replica status commands)
- Python
- mysql-connector-python (`mysql.connector.pooling.MySQLConnectionPool`)
- MySQL Replication (primary/replica topology)

## Sources Consulted
- mysql-connector-python official documentation: https://dev.mysql.com/doc/connector-python/en/connector-python-connection-pooling.html
- MySQL `SHOW REPLICA STATUS` documentation: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- Python `threading.local` documentation: https://docs.python.org/3/library/threading.html#thread-local-data

## Issues Found

1. **Incorrect comment: "Round-robin" for `random.choice`** — The `get_read_conn` method comment said "Round-robin across replicas" but the code uses `random.choice()`, which is random selection, not round-robin. Fixed the comment to say "Random selection across replicas."

2. **`Seconds_Behind_Source` can be `None`** — In `check_replica_lag`, the code used `status.get("Seconds_Behind_Source", 0)`. When replication is broken or the SQL thread is stopped, MySQL reports `Seconds_Behind_Source` as `NULL` (Python `None`). Since the key is still present in the dictionary, `.get()` returns `None` rather than the default `0`, violating the `-> int` return type. Fixed by explicitly checking for `None` and returning `999` (the same fallback used when no status row exists).

## Review Notes
- The post uses `SHOW REPLICA STATUS` and `Seconds_Behind_Source`, which are the modern names introduced in MySQL 8.0.22. Older MySQL versions use `SHOW SLAVE STATUS` and `Seconds_Behind_Master`. This is correct for current MySQL but worth noting for readers on older versions.
- The `random.choice` approach provides random load distribution but not true round-robin. For strict round-robin, an incrementing counter (e.g., with `itertools.cycle`) would be needed. The current approach is fine for most use cases.
- Connection pool `close()` in mysql-connector-python returns the connection to the pool rather than truly closing it, which is the correct behavior for pooled connections.
