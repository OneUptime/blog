# Validation Summary: Redis vs Apache Ignite for In-Memory Computing

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Redis (in-memory data store)
- Apache Ignite (in-memory computing platform)
- Python redis-py client library
- Apache Ignite JDBC thin client
- Apache Ignite transactions API
- Apache Ignite compute grid API

## Sources Consulted
- Redis documentation on transactions (MULTI/EXEC, WATCH): https://redis.io/docs/interact/transactions/
- redis-py API reference for `zadd`, `zrevrange`, `setex`, `incr`
- Apache Ignite Javadoc for `Ignition` class: https://ignite.apache.org/releases/latest/javadoc/org/apache/ignite/Ignition.html
- Apache Ignite Javadoc for `Ignite` interface: https://ignite.apache.org/releases/latest/javadoc/org/apache/ignite/Ignite.html
- Apache Ignite Javadoc for `IgniteCompute.affinityCall`: https://ignite.apache.org/releases/latest/javadoc/org/apache/ignite/IgniteCompute.html
- Apache Ignite Javadoc for `IgniteCache.localPeek`: https://ignite.apache.org/releases/latest/javadoc/org/apache/ignite/IgniteCache.html
- Apache Ignite collocated computations documentation: https://ignite.apache.org/docs/latest/distributed-computing/collocated-computations

## Issues Found

1. **Missing `import json` in Python code**: The Redis Python example used `json.loads()` and `json.dumps()` but did not include `import json`. Added the missing import.

2. **Incorrect characterization of Redis MULTI/EXEC**: The post stated "MULTI/EXEC is optimistic, not true ACID." This conflates two distinct mechanisms. MULTI/EXEC by itself provides atomic command batching (it always executes unconditionally). It is the WATCH command that introduces optimistic locking (aborting the transaction if watched keys change). Fixed to: "MULTI/EXEC provides atomic command batching but not full ACID with rollback support."

3. **Wrong class name `Ignite.localIgnite()`**: In the compute grid example, the code used `Ignite.localIgnite()` to get the local Ignite instance inside a closure. The `localIgnite()` static method is on the `Ignition` utility class (`org.apache.ignite.Ignition`), not on the `Ignite` interface (`org.apache.ignite.Ignite`). Fixed to `Ignition.localIgnite()`.

## Review Notes
- The `zrevrange` method used in the Python example was deprecated in redis-py 4.6+ in favor of `zrange` with `desc=True`. The underlying Redis command `ZREVRANGE` was also deprecated in Redis 7.0. The code still works but may trigger deprecation warnings with newer client versions. Not fixed since no version is specified and the method remains functional.
- The comparison table claims Ignite supports "Full ANSI SQL" -- Ignite supports a substantial subset of ANSI SQL-99 but has some limitations (e.g., no stored procedures, limited subquery support in certain contexts). This is acceptable for a high-level comparison table.
- The Ignite compute grid lambda example may need to implement `Serializable` in production code since `IgniteCallable` extends `Serializable`. This is a common Ignite gotcha but acceptable for a conceptual example.
