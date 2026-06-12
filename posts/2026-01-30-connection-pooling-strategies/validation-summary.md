# Validation Summary: How to Build Connection Pooling Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- Database connection pooling
- Node.js
- node-postgres (`pg`)
- prom-client
- Java JDBC
- HikariCP
- pgJDBC
- Node.js HTTP server shutdown

## Sources Consulted
- node-postgres Pool API: https://node-postgres.com/apis/pool
- HikariCP README configuration reference: https://github.com/brettwooldridge/HikariCP
- HikariCP pool sizing wiki: https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
- PostgreSQL wiki, Number Of Database Connections: https://wiki.postgresql.org/wiki/Number_Of_Database_Connections
- PostgreSQL frontend/backend protocol message flow: https://www.postgresql.org/docs/current/protocol-flow.html
- pgJDBC connection parameters: https://jdbc.postgresql.org/documentation/use/
- pgJDBC server-prepared statements documentation: https://jdbc.postgresql.org/documentation/server-prepare/
- Node.js HTTP `server.close()` documentation: https://nodejs.org/api/http.html
- prom-client README: https://github.com/siimon/prom-client

## Issues Found
- The post described pooled connection setup time as exactly `0ms`. Changed it to "Near 0ms setup cost (reused)" because reused connections avoid new connection establishment but still have acquisition and runtime overhead.
- The post said every pool implementation shares the listed parameters. Changed this to "Most" because exact pool options vary across implementations.
- The Node.js `pg` example said `min: 2` keeps two connections warm. Changed the comment to say it keeps up to two idle connections once created, matching node-postgres behavior: `min` prevents eviction below the minimum but does not eagerly create clients.
- The HikariCP Java snippet used `Connection` and `SQLException` without imports. Added the missing `java.sql.Connection` and `java.sql.SQLException` imports.
- The HikariCP PostgreSQL example set `connectionTestQuery("SELECT 1")`. Removed it because HikariCP recommends not setting `connectionTestQuery` for JDBC4-capable drivers, using `Connection.isValid()` instead.
- The HikariCP PostgreSQL example used MySQL Connector/J prepared-statement cache properties (`cachePrepStmts`, `prepStmtCacheSize`, `prepStmtCacheSqlLimit`). Replaced them with pgJDBC properties (`preparedStatementCacheQueries`, `preparedStatementCacheSizeMiB`) and a valid pgJDBC batch-insert optimization (`reWriteBatchedInserts`).
- The graceful shutdown sample called `server.close()` without waiting for completion and used a fixed sleep before closing the pool. Changed it to await the `server.close()` callback before calling `pool.end()`, matching Node.js HTTP server shutdown behavior.

## Review Notes
- The HikariCP pool sizing formula and the warning against oversizing pools are directionally correct, but the formula is a starting point for active database connections and should still be validated with workload-specific load testing.
- The health-check examples are technically valid, but validating before every checkout can add overhead in high-throughput applications; pool and driver validation settings are usually preferable unless the application has a specific failure mode to handle.
