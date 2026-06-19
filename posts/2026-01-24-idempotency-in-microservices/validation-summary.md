# Validation Summary: How to Handle Idempotency in Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Idempotency keys
- Go
- Redis and go-redis
- PostgreSQL
- Python
- asyncpg
- aiokafka / Apache Kafka
- TypeScript
- Express
- ioredis
- HTTP API design

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- go-redis package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- PostgreSQL unique indexes documentation: https://www.postgresql.org/docs/current/indexes-unique.html
- PostgreSQL partial indexes documentation: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL error codes documentation: https://www.postgresql.org/docs/current/errcodes-appendix.html
- PostgreSQL UUID functions documentation: https://www.postgresql.org/docs/current/functions-uuid.html
- asyncpg usage and type conversion documentation: https://magicstack.github.io/asyncpg/current/usage.html
- aiokafka manual commit documentation: https://aiokafka.readthedocs.io/en/stable/examples/manual_commit.html
- Express response API documentation: https://expressjs.com/en/5x/api/response/
- ioredis official documentation: https://github.com/redis/ioredis

## Issues Found
- The first Go middleware example imported `crypto/sha256` and `encoding/hex` without using them, and assigned the `locked` return value without using it. Removed the unused imports and replaced the unused local with `_` so the example compiles.
- The Go Redis example described storing the result and deleting the lock atomically but used a plain pipeline. Changed it to `TxPipeline()` to match the transaction semantics described in the post.
- The Redis lock examples had a small race where a result could be stored after the first cache lookup but before lock acquisition. Added a result re-check after acquiring the lock in both Go and TypeScript examples.
- The database Go example detected PostgreSQL unique violations by comparing error strings. Replaced this with `errors.As` against `*pq.Error` and SQLSTATE `23505`, which PostgreSQL documents as the stable unique-violation code.
- The Python event processor claimed "exactly once" behavior for database-backed deduplication and the aiokafka manual commit comment. Updated the wording to idempotent processing and manual commit after processing, consistent with aiokafka's at-least-once manual commit documentation.
- The Python example returned asyncpg `jsonb` values as dictionaries, but asyncpg decodes `json/jsonb` to strings by default. Added JSON decoding for cached results.
- The Python event processor could treat a concurrently inserted but unfinished event record as a processed duplicate. Added an in-progress check that raises instead of returning a missing result.
- The TypeScript request header accessor cast a possibly array or undefined header value directly to `string | null`. Updated it to return only actual string header values.
- The TypeScript Redis result storage used a plain pipeline despite the best-practice guidance to store results atomically. Changed it to `multi()`.

## Review Notes
The examples are suitable as illustrative patterns. In a production payment system, the external payment provider should also receive an idempotency key or operation identifier, and reconciliation should handle crashes between recording a pending payment and updating the final payment status.
