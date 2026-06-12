# Validation Summary: How to Implement Filtering and Sorting in REST APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- REST API query parameter design
- Node.js and Express routing
- node-postgres parameterized queries
- PostgreSQL filtering, sorting, indexes, and `ILIKE`
- FastAPI query parameter validation
- encode/databases raw SQL queries and row access
- MongoDB-style sort objects
- Redis caching with ioredis
- OpenAPI query parameter documentation
- Jest and Supertest API tests

## Sources Consulted
- Express 4.x API reference: https://expressjs.com/en/4x/api/
- node-postgres Queries documentation: https://node-postgres.com/features/queries
- FastAPI Request Parameters reference: https://fastapi.tiangolo.com/reference/parameters/
- encode/databases Database Queries documentation: https://www.encode.io/databases/database_queries/
- PostgreSQL Pattern Matching documentation: https://www.postgresql.org/docs/current/functions-matching.html
- PostgreSQL Indexes documentation: https://www.postgresql.org/docs/current/indexes.html
- MongoDB `cursor.sort()` documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- Redis `SETEX` command documentation: https://redis.io/docs/latest/commands/setex/
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Swagger/OpenAPI Describing Parameters guide: https://swagger.io/docs/specification/v3_0/describing-parameters/

## Issues Found
- The JavaScript filter parser split every query key on the first underscore-like operator pattern, so snake_case fields such as `created_at` and `stock_quantity` could not be filtered correctly. The parser now detects only known operator suffixes such as `_gte`, `_lte`, and `_contains`, preserving snake_case field names.
- The FastAPI example created a `databases.Database` instance but never connected or disconnected it. Added a FastAPI lifespan handler that calls `database.connect()` and `database.disconnect()`, matching the `databases` documentation.
- The FastAPI example used positional calls for `fetch_val` and `fetch_all` and converted rows with `dict(row)`. Updated the calls to documented `query=` and `values=` keyword usage and changed row conversion to `dict(row._mapping)`, as recommended by the `databases` documentation for SQLAlchemy 1.4-compatible rows.
- The OR-filter example used `or[0][category]` twice, which would collapse into the same group/key in common query parsers. Changed the example to `or[0][category]=electronics&or[1][category]=clothing`.
- The Redis cache example used `SETEX`, which Redis documents as deprecated since 2.6.12. Replaced it with `SET key value EX seconds`.
- The error response examples were labeled as JavaScript even though the block contains JSON-like response bodies. Changed the fence to `jsonc` so the comments and JSON examples are represented accurately.

## Review Notes
The examples use raw SQL string construction for dynamic identifiers only after checking field names against whitelists. This is consistent with node-postgres guidance that parameter placeholders cannot be used for identifiers, but future production code could centralize column-name mapping for additional defense in depth. The snippets were syntax-checked after edits, but they were not executed against a live PostgreSQL, Redis, MongoDB, or Express/FastAPI application because the repository contains the blog post rather than a complete runnable project.
