# Validation Summary: How to Implement Connection Pooling in Node.js for PostgreSQL/MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- PostgreSQL via `pg` (node-postgres) and `pg-pool`
- MySQL via `mysql2/promise`
- Prometheus metrics via `prom-client`
- Connection pooling patterns (sizing, health checks, read/write splitting, per-tenant pools, backpressure, graceful shutdown)

## Sources Consulted
- node-postgres Pool API: https://node-postgres.com/apis/pool
- node-postgres Client API (config options, `query_timeout`): https://node-postgres.com/apis/client
- node-postgres `min` option support (added in pg@8.16.0), GitHub issue #3009: https://github.com/brianc/node-postgres/issues/3009
- pg-pool README: https://github.com/brianc/node-postgres/blob/master/packages/pg-pool/README.md
- mysql2 documentation (pool options, `enableKeepAlive`, `keepAliveInitialDelay`, prepared statements via `execute`): https://sidorares.github.io/node-mysql2/docs

## Issues Found
- **Inaccurate comment on `query_timeout` (PostgreSQL health-checks section).** The code comment stated `query_timeout` would "Validate connections before use - prevents using stale connections." This is incorrect: `query_timeout` is a per-query execution timeout (milliseconds before a query call times out), confirmed against the node-postgres Client docs. It does not validate connections or detect stale ones. Fixed the comment to accurately describe it as aborting long-running queries so a stuck query does not hold a connection. No code change was needed since the option itself is valid and correctly used.

## Review Notes
- The `min` pool option used in the PostgreSQL example is valid, but only for **pg@8.16.0 and newer** (support for `min` was added in that release). On older `pg` versions the option is silently ignored. The post does not pin a version; readers on older `pg` should be aware.
- The `maxUses: 7500` comment ("Close connection after 7500 queries") is a slight simplification — `maxUses` counts the number of times a connection is checked out of the pool, not literal query count. For the `pool.query()` usage shown (one checkout per query) the two are effectively equivalent, so the simplification is acceptable and was left unchanged.
- The MySQL section correctly notes that `acquireTimeout` is not supported by `mysql2` (it was a `mysqljs/mysql` option) and steers readers to `queueLimit` / `connectTimeout` instead — accurate.
- The pool-sizing formula `(core_count * 2) + effective_spindle_count` matches the long-standing PostgreSQL wiki guidance, and the code's `(dbCpuCount * 2) + 1` correctly matches the SSD case (`effective_spindle_count = 1`) described in the comment.
- All other code (transactions with `BEGIN`/`COMMIT`/`ROLLBACK` and `finally`-block release, `pool.totalCount`/`idleCount`/`waitingCount` pool stats, mysql2 `getConnection`/`beginTransaction`/`commit`/`rollback`/`release`, read/write splitting, per-tenant pools, backpressure queue, and SIGTERM/SIGINT graceful shutdown) is syntactically correct and uses current, non-deprecated APIs.
