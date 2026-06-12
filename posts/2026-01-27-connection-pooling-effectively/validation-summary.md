# Validation Summary: How to Use Connection Pooling Effectively

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Connection pooling
- PostgreSQL
- HikariCP
- pgBouncer
- node-postgres
- SQLAlchemy
- Python requests / urllib3
- Axios
- Node.js HTTP and HTTPS agents
- Go net/http
- Micrometer

## Sources Consulted
- HikariCP README and configuration documentation: https://github.com/brettwooldridge/HikariCP
- HikariCP pool sizing guidance: https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing
- PostgreSQL wiki on database connection counts: https://wiki.postgresql.org/wiki/Number_Of_Database_Connections
- PostgreSQL JDBC prepared statement cache documentation: https://jdbc.postgresql.org/documentation/server-prepare/
- pgBouncer configuration documentation: https://www.pgbouncer.org/config.html
- pgBouncer usage documentation: https://www.pgbouncer.org/usage.html
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- SQLAlchemy pooling documentation: https://docs.sqlalchemy.org/en/latest/core/pooling.html
- SQLAlchemy engine configuration documentation: https://docs.sqlalchemy.org/en/latest/core/engines.html
- Requests advanced usage documentation: https://requests.readthedocs.io/en/master/user/advanced/
- Requests HTTPAdapter API documentation: https://requests.readthedocs.io/en/latest/api/
- Node.js HTTP Agent documentation: https://nodejs.org/api/http.html
- Go net/http package documentation: https://pkg.go.dev/net/http
- Micrometer registry documentation: https://docs.micrometer.io/micrometer/reference/concepts/registry.html

## Issues Found
- The HikariCP example used MySQL Connector/J prepared statement cache properties (`cachePrepStmts`, `prepStmtCacheSize`, `prepStmtCacheSqlLimit`) while the JDBC URL was PostgreSQL. Changed these to pgJDBC's `preparedStatementCacheQueries` and `preparedStatementCacheSizeMiB` properties.
- The Python requests example set `session.timeout`, but Requests does not use a session-level `timeout` attribute for requests. Replaced this with a small `TimeoutSession` subclass that applies a default timeout through `request()`.
- The Node.js HTTP agent example used `freeSocketTimeout`, which is not a documented core `http.Agent` / `https.Agent` option. Removed it and kept documented agent options.
- The SQLAlchemy connection leak examples used raw SQL strings with positional `%s` parameters through `Connection.execute()`, which is not valid SQLAlchemy 2.x style. Updated the examples to use `sqlalchemy.text()` with named parameters.
- Several comments were technically imprecise: `requests` `pool_connections` is the number of host pools to cache, node-postgres `connect` logs new physical clients rather than validating checkout, and the node-postgres `error` event reports idle-client errors rather than pool exhaustion. Updated the comments.

## Review Notes
- The post's pool sizing formulas are useful rules of thumb, not universal guarantees. The PostgreSQL/HikariCP formula applies to active database connections and should be measured against workload and database capacity.
- pgBouncer transaction pooling is correctly presented as offering strong reuse, but applications that depend on session state, session-level prepared statements, temporary tables, or similar features need extra care.
- The monitoring thresholds are reasonable illustrative starting points, but production alert thresholds should be calibrated from real workload baselines.
