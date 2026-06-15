# Validation Summary: How to Prevent Duplicate Requests in Python

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Python
- FastAPI
- Starlette request handling
- Redis and redis-py asyncio
- PostgreSQL
- asyncpg
- HTTP idempotency semantics
- httpx

## Sources Consulted
- FastAPI lifespan events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI application reference for deprecated `on_event`: https://fastapi.tiangolo.com/reference/fastapi/
- Starlette request body APIs: https://starlette.dev/requests/
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- redis-py command documentation for `setex`: https://redis.readthedocs.io/en/stable/commands.html
- PostgreSQL `INSERT ... ON CONFLICT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `CREATE TABLE` / unique constraint documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- asyncpg API reference: https://magicstack.github.io/asyncpg/current/api/index.html
- RFC 9110 HTTP idempotent methods: https://www.rfc-editor.org/rfc/rfc9110.html
- Stripe idempotent request guidance for unique keys: https://docs.stripe.com/api/idempotent_requests

## Issues Found
- The FastAPI examples used `@app.on_event("startup")`, which FastAPI now marks as deprecated in favor of lifespan handlers. Updated both FastAPI snippets to use `lifespan=...` with `asynccontextmanager` and to close the Redis client.
- The Redis store used `setex()`. redis-py documents `SETEX` as deprecated in favor of `SET` with the `EX` parameter. Updated the code to use `redis.set(..., ex=self.ttl)`.
- The idempotency middleware read the request body before passing the request to the endpoint. In ASGI apps, consuming the body in middleware can leave no body for downstream handlers unless it is replayed. Updated the example to reconstruct the `Request` with a receive callable containing the cached body.
- The database idempotency example caught `asyncpg.UniqueViolationError` inside an active transaction and then queried again in that transaction. PostgreSQL aborts a transaction after an error, so the follow-up query would fail. Replaced the flow with `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` and then a select for the existing row when needed.
- The payment example returned the inserted row before the status update, so it could return `pending` even after `_process_payment()` changed the row to `completed`. Updated `_process_payment()` to use `UPDATE ... RETURNING *` and return the updated payment.
- The PostgreSQL schema declared the same `idempotency_key` uniqueness twice: once inline and once as a named table constraint. Removed the duplicate inline `UNIQUE` and kept the named constraint.
- The client example generated a deterministic idempotency key from amount, currency, and recipient. That would incorrectly deduplicate separate intentional payments with identical fields. Updated the example to generate a UUID key per logical operation and reuse that key only for retries of that operation.

## Review Notes
The Redis distributed lock example is suitable as a compact tutorial example, but production systems should document their failure model carefully, including Redis availability, lock renewal failure, process pauses, and whether a database uniqueness constraint remains the final source of truth. External links in the post returned HTTP 200 during validation.
