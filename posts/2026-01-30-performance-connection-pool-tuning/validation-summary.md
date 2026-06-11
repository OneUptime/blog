# Validation Summary: How to Create Connection Pool Tuning

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- PostgreSQL (connection model, sizing formula)
- MySQL (thread-per-connection model)
- Node.js with `pg` (node-postgres) and `pg.Pool`
- Java with HikariCP
- Python with `psycopg2` and `ThreadedConnectionPool`
- Go with `pgx/v5` and `pgxpool`
- `prom-client` for Prometheus metrics in Node.js
- Prometheus alerting rules (YAML)

## Sources Consulted
- node-postgres Pool API: https://node-postgres.com/apis/pool
- node-postgres Client API: https://node-postgres.com/apis/client
- HikariCP project (configuration knobs): https://github.com/brettwooldridge/HikariCP
- PostgreSQL wiki — Number Of Database Connections: https://wiki.postgresql.org/wiki/Number_Of_Database_Connections
- psycopg2 pool documentation: https://www.psycopg.org/docs/pool.html
- pgx/v5 pgxpool docs: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- pgx/v5 ConnConfig docs: https://pkg.go.dev/github.com/jackc/pgx/v5#ConnConfig
- prom-client (Node.js): https://github.com/siimon/prom-client

## Issues Found
No technical issues found.

Each code example, API call, configuration option, and field name was verified against the upstream documentation:

- `pg.Pool` options used (`max`, `min`, `connectionTimeoutMillis`, `idleTimeoutMillis`, `statement_timeout`) are all valid; `statement_timeout` is a Client-level option that the Pool forwards.
- `pg.Pool` monitoring properties (`totalCount`, `idleCount`, `waitingCount`) are correctly named.
- `client.release(true)` correctly destroys the connection rather than returning it to the pool.
- All HikariCP setters used (`setJdbcUrl`, `setMaximumPoolSize`, `setMinimumIdle`, `setConnectionTimeout`, `setIdleTimeout`, `setMaxLifetime`, `setConnectionTestQuery`, `setPoolName`) exist on `HikariConfig`.
- The PostgreSQL sizing formula `((core_count * 2) + effective_spindle_count)` matches the PostgreSQL wiki.
- `psycopg2.pool.ThreadedConnectionPool(minconn, maxconn, ...)` accepts kwargs forwarded to `psycopg2.connect()` including `connect_timeout` and `options`.
- All `pgxpool.Config` fields used (`MaxConns`, `MinConns`, `MaxConnIdleTime`, `MaxConnLifetime`, `MaxConnLifetimeJitter`, `HealthCheckPeriod`) exist; `ConnConfig.ConnectTimeout` is reachable via field promotion from the embedded `pgconn.Config`.

## Review Notes
- Section 2 (HikariCP example): the inline comment says `(8 * 2) + 1 = 17` but the example sets `setMaximumPoolSize(15)`. The numbers are intentionally trimmed to illustrate the "adjust downward for CPU-heavy" guidance from Section 2's table, so this is presentational rather than wrong — but a future revision could clarify the rationale in a one-line comment to avoid reader confusion.
- HikariCP's own documentation notes that `setConnectionTestQuery` should be avoided when the JDBC driver supports JDBC4 `isValid()` (which the PostgreSQL JDBC driver does). The post's use is harmless but not the modern best practice; not corrected because the post's "Validation Strategies" framing is generic and the example still works.
- The PostgreSQL wiki frames the `(cores*2)+spindles` formula in terms of "active concurrent connections doing work", not necessarily max pool size; the post's phrasing is a reasonable simplification consistent with typical industry guidance, and the surrounding "Adjusting for Your Workload" table communicates that the formula is a starting point.
- The post uses `psycopg2` rather than the newer `psycopg` (psycopg 3). `psycopg2` is still fully supported and widely deployed, so this is a stylistic choice, not an error.
