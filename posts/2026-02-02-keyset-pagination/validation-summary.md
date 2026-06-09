# Validation Summary: How to Implement Keyset Pagination for Large Datasets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQL (PostgreSQL primarily, MySQL by tag)
- PostgreSQL row/tuple comparison and B-tree indexes (including `INCLUDE` clause, `CREATE INDEX CONCURRENTLY`)
- Node.js / Express with `node-postgres` (`pg`) driver
- Python / FastAPI with SQLAlchemy ORM
- Pydantic models
- Go (net/http) with `jackc/pgx/v5` and `pgxpool`
- HMAC-SHA256 cursor signing (Python `hmac`, `hashlib`)
- Base64 URL-safe cursor encoding
- Mermaid diagrams (`flowchart`, `xychart-beta`)

## Sources Consulted
- PostgreSQL documentation on row constructors and comparisons: https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-ROW-CONSTRUCTORS
- PostgreSQL `CREATE INDEX` (including `INCLUDE` clause, available since v11): https://www.postgresql.org/docs/current/sql-createindex.html
- SQLAlchemy ORM ordering with `desc()` and `nulls_last()`: https://docs.sqlalchemy.org/en/20/core/sqlelement.html#sqlalchemy.sql.expression.nulls_last
- FastAPI Query parameter docs: https://fastapi.tiangolo.com/tutorial/query-params-str-validations/
- node-postgres parameterized queries (`$1, $2`): https://node-postgres.com/features/queries#parameterized-query
- jackc/pgx v5 documentation: https://pkg.go.dev/github.com/jackc/pgx/v5
- Go 1.21 release notes (built-in `min`/`max`): https://go.dev/doc/go1.21
- Python `statistics.quantiles` docs: https://docs.python.org/3/library/statistics.html#statistics.quantiles
- Python `base64.urlsafe_b64encode` docs: https://docs.python.org/3/library/base64.html
- Markus Winand's seek/keyset pagination reference: https://use-the-index-luke.com/no-offset
- Mermaid `xychart-beta` documentation: https://mermaid.js.org/syntax/xyChart.html

## Issues Found
No technical issues found.

The post is technically accurate throughout. Verified specifically:
- The tuple comparison `(created_at, id) < ($1, $2)` is correct SQL standard syntax supported by PostgreSQL with index seek behavior.
- The expanded equivalent `WHERE created_at < $1 OR (created_at = $1 AND id < $2)` is logically identical.
- The PostgreSQL `INCLUDE` clause for covering indexes (`CREATE INDEX ... INCLUDE (...)`) is valid since v11.
- The SQLAlchemy `desc(Column).nulls_last()` chain is valid since SQLAlchemy 1.4 (and continues to work in 2.0).
- The NULL handling filter correctly returns all rows that come after a non-null cursor in `NULLS LAST` ordering. Although the filter includes "all NULL rows" on every page beyond the first non-null cursor, the `ORDER BY ... DESC NULLS LAST` + `LIMIT` guarantees they only appear after the non-null tail is exhausted, so behavior is correct.
- The bidirectional pagination implementation correctly reverses both the comparison operators (`<` -> `>`) and sort direction (`DESC` -> `ASC`), and reverses the result list to restore display order.
- The Go `pgx/v5/pgxpool` import path is the current canonical location.
- `statistics.quantiles(times, n=20)[18]` correctly returns the 95th percentile (the 19th of 20 cut points sits at the 95% boundary).
- Go's built-in `min(parsed, 100)` is available since Go 1.21 — reasonable to assume for new code in 2026.
- HMAC truncation to 16 hex chars (64 bits) is a defensible tradeoff for cursor tampering protection (not for primary cryptographic security).

## Review Notes
- The post is tagged with both PostgreSQL and MySQL, but every concrete SQL example uses PostgreSQL-specific features: `$N` placeholders, `EXPLAIN ANALYZE`, `CREATE INDEX ... INCLUDE (...)`, and `CREATE INDEX CONCURRENTLY`. MySQL supports row-value tuple comparison but does not support the `INCLUDE` clause (you'd just add the columns directly to the composite index), uses `?` placeholders, and reports plan output with different terminology (`type=ref/range` rather than `Index Scan`/`Seq Scan`). Not technically wrong, but a MySQL-only reader will need to translate. Out of scope for a correctness review.
- The Go SQL `WHERE ($1::timestamp IS NULL OR $2::bigint IS NULL) OR (created_at, id) < ($1, $2)` returns all rows from the start if only one of the two cursor parameters is supplied. The Python FastAPI handler validates that both are present together (returning 400); the Go handler does not. Behaviorally acceptable (treats partial cursor as "no cursor") but a future improvement would be to enforce the same all-or-nothing validation server-side.
- The Express handler uses `parseInt(req.query.after_id)` and `parseInt(req.query.limit)` without an explicit radix. This is safe under ES5+ (non-`0x` strings are always parsed as base 10) but most linters flag it. Pure style, not a bug.
- The benchmark script uses Python f-string interpolation to inject `offset` into SQL (`LIMIT 20 OFFSET {offset}`). This is fine for a benchmark script (offsets are controlled by the caller), but would be a SQL injection vector if the same pattern were copied into request-handling code. Worth a parenthetical caveat in a future revision.
- `datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))` is the right defensive pattern for Python < 3.11; from 3.11 onward, `fromisoformat` parses `Z` natively, so the replace becomes a no-op but remains harmless.
