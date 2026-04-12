# Validation Summary: How to Use FLUSH Statement in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (8.0 and 8.4)
- MySQL FLUSH statement and its administrative options
- MySQL binary logging and replication
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.4 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.4/en/flush.html

## Issues Found

1. **FLUSH STATUS comment was misleading** — The code comment said "Flush status variables to zero," implying all status variables are reset to zero. In reality, `FLUSH STATUS` adds the current thread's session status variable values to the global values and resets the session values to zero; some global variables may also be reset. Changed the comment to "Reset session status variables and fold them into global values."

2. **FLUSH TABLES description was inaccurate** — The post said `FLUSH TABLES` "waits for all currently running queries to complete." The official docs say it "closes all open tables, forces all tables in use to be closed, and flushes the prepared statement cache." Updated to match the documented behavior.

3. **FLUSH HOSTS deprecation not mentioned** — The post discussed `FLUSH HOSTS` without noting that it is deprecated as of MySQL 8.0.23 and removed in MySQL 8.4. Added a deprecation note and clarified that the `TRUNCATE TABLE performance_schema.host_cache` alternative is the preferred approach.

## Review Notes
- The post correctly notes that `FLUSH QUERY CACHE` was removed in MySQL 8.0. The entire query cache feature was removed, not just this command.
- The RELOAD privilege claim is a valid simplification. In practice, MySQL 8.0+ introduced more granular dynamic privileges (e.g., FLUSH_TABLES, FLUSH_STATUS, FLUSH_OPTIMIZER_COSTS) that can be used as alternatives to RELOAD for specific operations, and FLUSH TABLES WITH READ LOCK additionally requires LOCK TABLES privilege. For a general reference post, the RELOAD simplification is acceptable.
- The post does not mention `FLUSH ENGINE LOGS` which is also a valid flush option, but the post does not claim to be an exhaustive list.
- The caveat that `FLUSH TABLES WITH READ LOCK` does not prevent inserts into log tables is not mentioned but is an edge case unlikely to affect most readers.
