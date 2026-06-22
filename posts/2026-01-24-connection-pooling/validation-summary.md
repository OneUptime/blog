# Validation Summary: How to Handle Connection Pooling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- node-postgres / pg Pool
- MySQL
- mysql2
- Node.js HTTP and HTTPS agents
- Node.js fetch / Undici
- Redis
- ioredis
- Prometheus prom-client
- PgBouncer

## Sources Consulted
- node-postgres Pool API: https://node-postgres.com/apis/pool
- node-postgres pooling guide: https://node-postgres.com/features/pooling
- Node.js fetch globals documentation: https://nodejs.org/api/globals.html
- Node.js HTTP Agent documentation: https://nodejs.org/api/http.html
- Node.js HTTPS Agent documentation: https://nodejs.org/api/https.html
- Undici Agent documentation: https://github.com/nodejs/undici/blob/main/docs/docs/api/Agent.md
- mysql2 documentation: https://sidorares.github.io/node-mysql2/docs
- MySQL server status variables: https://dev.mysql.com/doc/en/server-status-variables.html
- MySQL system variables and SET syntax: https://dev.mysql.com/doc/refman/en/using-system-variables.html
- PostgreSQL connection settings: https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL ALTER SYSTEM: https://www.postgresql.org/docs/current/sql-altersystem.html
- ioredis documentation: https://github.com/redis/ioredis
- ioredis CommonRedisOptions API: https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html
- PgBouncer usage documentation: https://www.pgbouncer.org/usage.html
- prom-client documentation: https://github.com/siimon/prom-client

## Issues Found
- The PostgreSQL pool sizing example used `process.env.CPU_CORES` directly in arithmetic. JavaScript would coerce numeric strings, but the example is clearer and safer with `Number(process.env.CPU_CORES)`.
- The PostgreSQL `min` pool option was described as maintaining minimum connections. node-postgres creates clients lazily and `min` controls idle eviction once clients exist, so the comment was corrected.
- The `db.js` query wrapper exported `new Database(pool)` without importing `pool`. Added `const { pool } = require('./pg-pool');`.
- The MySQL `multipleStatements: false` comment claimed it prevents SQL injection. It only reduces stacked-statement risk; parameterized queries are still required, so the comment was corrected.
- The Node.js `fetch` example used the `agent` option. Node.js built-in fetch uses an Undici-compatible `dispatcher`, so the example now creates Undici agents and passes `dispatcher`.
- The Redis example described `maxRetriesPerRequest` as a connection pool setting. ioredis documents it as retry behavior for queued commands during reconnect, so the comment was corrected.
- The Redis Cluster example described `natMap` as pool settings. ioredis documents it as NAT mapping, so the comment was corrected.
- The MySQL monitoring example treated `Threads_cached` as idle pool connections. MySQL documents it as a server status variable, not a mysql2 pool idle count, so the example now reports server-wide connected threads without claiming idle pool metrics.
- The `allowExitOnIdle` comment said it validates connections before use. node-postgres documents it as allowing the Node.js event loop to exit when clients are idle, so the comment was corrected.
- The PostgreSQL `max_connections` SQL comment said the default is 100 and omitted restart behavior. PostgreSQL documents the default as typically 100 and `max_connections` as startup-only, so the comment now reflects that.

## Review Notes
The pool size numbers are reasonable starting points, but production sizing should still be validated with workload-specific load testing, database capacity, and total connection counts across all application instances.
