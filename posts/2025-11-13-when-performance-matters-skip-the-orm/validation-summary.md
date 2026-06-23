# Validation Summary: When Performance Matters, Skip the ORM

## Status
validated

## Post Type
Opinion / engineering guidance piece with a code example (treated as a code blog because it includes a working Node.js code snippet and concrete technical recommendations).

## Technologies Covered
- Object-Relational Mappers (ORMs) in general
- PostgreSQL (`EXPLAIN ANALYZE`, query planner, parameterized queries)
- Node.js with the `pg` (node-postgres) library
- Query builders / SQL tooling: Knex, sqlx-ts, pgtyped
- Runtime validation libraries: `zod`, `io-ts`
- Observability concepts: tracing, `db.statement`, P50/P95/P99 latency, SLOs

## Sources Consulted
- node-postgres (`pg`) docs — Pool and queries (config-object form `query({ text, values })`): https://node-postgres.com/apis/pool and https://node-postgres.com/features/queries
- PostgreSQL docs — EXPLAIN / EXPLAIN ANALYZE: https://www.postgresql.org/docs/current/sql-explain.html
- sqlx-ts (Node.js compile-time SQL validation & type generation): https://github.com/JasonShin/sqlx-ts
- pgtyped: https://github.com/adelsz/pgtyped
- Knex.js: https://knexjs.org/
- zod: https://zod.dev/ and io-ts: https://github.com/gcanti/io-ts

## Issues Found
No technical issues found.

- The Node.js `pg` example is syntactically and semantically correct: `new Pool()`, parameterized placeholders (`$1`, `$2`), and the `pool.query({ text, values })` config-object form are all valid, current node-postgres usage. Destructuring `{ rows }` from the result is correct.
- "SQLX" in the query-builder list is accurate — `sqlx-ts` is a real Node.js compile-time SQL validation / type-generation tool, consistent with the Node context. Knex and pgtyped are also valid Node tooling.
- `EXPLAIN ANALYZE` is a real PostgreSQL feature and the described use (verifying row counts, buffers, and joins) is accurate.
- The conceptual claims (N+1 queries, hydration/serialization overhead, implicit-join plans, parameterized statements preventing injection) are all technically sound.

## Review Notes
- Minor caveat (not an error): in PostgreSQL versions before 18, buffer statistics from `EXPLAIN ANALYZE` require the `BUFFERS` option (`EXPLAIN (ANALYZE, BUFFERS)`); from PostgreSQL 18 onward `BUFFERS` is enabled by default with `ANALYZE`. The post's phrasing is fine as general guidance.
- The "`INDEX` hints" point is framed generically. Core PostgreSQL does not support index hints the way MySQL/Oracle do, but the broader claim that ORMs limit access to planner-level controls is still valid. No change needed since the post is not version- or engine-specific here.
- The post is primarily prescriptive/opinion; most content is judgment-based recommendations rather than verifiable facts, and the single code example is correct.
