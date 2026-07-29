# Validation Summary: Database Connection, Login, Command, Socket, and Pool Timeouts Explained

## Status
validated

## Post Type
Technical guide / Reference

## Technologies Covered
- Java Database Connectivity (JDBC)
- PostgreSQL and libpq
- PostgreSQL JDBC Driver (pgJDBC)
- HikariCP connection pooling
- SQL statement, lock, session, connection, and network timeouts

## Sources Consulted
- [PostgreSQL libpq connection parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS) - connection string syntax, `connect_timeout` units, unlimited values, and per-host/address behavior.
- [PostgreSQL 18 libpq connection implementation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/interfaces/libpq/fe-connect.c) - confirmation that `connect_timeout` drives the libpq connection state machine rather than only the TCP socket-connect call.
- [PostgreSQL client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html#RUNTIME-CONFIG-CLIENT-STATEMENT) - `statement_timeout`, `lock_timeout`, and `idle_in_transaction_session_timeout` behavior.
- [PostgreSQL `SET` command](https://www.postgresql.org/docs/current/sql-set.html) - `SET LOCAL` transaction scope and its lack of effect outside a transaction block.
- [JDBC `DriverManager.setLoginTimeout`](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/DriverManager.html#setLoginTimeout(int)) - login-timeout units, scope, and zero-value behavior.
- [JDBC `DataSource.setLoginTimeout`](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/javax/sql/DataSource.html#setLoginTimeout(int)) - data-source login-timeout semantics.
- [JDBC `Statement.setQueryTimeout`](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Statement.html#setQueryTimeout(int)) - required execute-method coverage, optional `ResultSet` coverage, timeout exception, and cancellation semantics.
- [JDBC `Connection.setNetworkTimeout`](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Connection.html#setNetworkTimeout(java.util.concurrent.Executor,int)) - network-timeout units, request scope, connection closure, resource release, and interaction with query timeout.
- [pgJDBC connection parameters](https://jdbc.postgresql.org/documentation/use/#connection-parameters) - current `loginTimeout`, `connectTimeout`, `socketTimeout`, and query-timeout meanings.
- [HikariCP configuration](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby) - `connectionTimeout`, `maximumPoolSize`, millisecond units, 250 ms minimum, and acquisition failure behavior.

## Issues Found
1. **libpq `connect_timeout` scope was described too narrowly.** The post introduced it as a physical-connection timeout, which could be read as covering only the TCP handshake. libpq applies the timer across its connection state machine for each host or address. The explanation now distinguishes socket-only connect timers from broader connection-attempt timers and describes libpq accurately.
2. **JDBC query-timeout coverage was incomplete.** JDBC requires `Statement.setQueryTimeout()` to cover `execute`, `executeQuery`, and `executeUpdate`, but applying it to later `ResultSet` operations is driver-specific. Added this qualification so the example does not imply that row consumption is universally covered.
3. **The PostgreSQL `SET LOCAL` example lacked an explicit transaction.** PostgreSQL warns and gives `SET LOCAL` no effect outside a transaction block. Added `BEGIN` and `COMMIT`, and replaced the protocol-level `$1` marker with an illustrative SQL literal so the snippet is executable as SQL.

## Review Notes
- The HikariCP example uses current, non-deprecated APIs. Its `connectionTimeout` value is correctly expressed in milliseconds, and 250 ms is the documented minimum.
- The JDBC login, query, and network timeout APIs are current in Java SE 17. The post correctly treats their exact driver behavior as implementation-specific.
- The network-timeout ordering and failure-disposition explanation matches JDBC: a network timeout marks the connection closed and releases its resources, while an earlier successful query cancellation can leave the statement and connection usable.
- PostgreSQL measures `statement_timeout` at the server and keeps `lock_timeout` and `idle_in_transaction_session_timeout` as separate controls, as the post states.
- A strict end-to-end deadline should not assume that a client connect timeout can interrupt every synchronous operation, such as all DNS resolver behavior; the post correctly keeps the outer caller deadline authoritative.
