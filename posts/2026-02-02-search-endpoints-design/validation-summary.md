# Validation Summary: How to Design Search Endpoints

## Status
validated

## Post Type
Guide / Tutorial — covers REST API search endpoint design patterns with code examples.

## Technologies Covered
- REST API design
- Express.js (Node.js)
- Knex.js query builder
- Elasticsearch (queries, aggregations, facets)
- PostgreSQL (full-text search with `to_tsvector`, GIN indexes, partial indexes)
- ioredis (Redis client)
- express-rate-limit middleware
- OpenAPI 3.x specification
- Mermaid diagrams
- ISO 8601 date format

## Sources Consulted
- Express.js routing docs: https://expressjs.com/en/guide/routing.html
- express-rate-limit (v7) docs: https://express-rate-limit.mintlify.app/ (the `max`/`windowMs`/`message` options shown are valid)
- Knex.js query builder docs: https://knexjs.org/guide/query-builder.html (chained `where`/`orWhere` with callback builders, `orderBy`, `limit`, `offset`, column aliasing via "col as alias")
- Elasticsearch query DSL docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
- Elasticsearch aggregations (terms, range, stats): https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html
- Elasticsearch search response format: `hits.total.value` (post-7.0 behavior) is correct
- PostgreSQL full-text search: https://www.postgresql.org/docs/current/textsearch.html (GIN index on `to_tsvector('english', col)`)
- ioredis README: https://github.com/redis/ioredis (`setex(key, ttl, value)` is correct)
- OpenAPI 3.0 specification: https://spec.openapis.org/oas/v3.0.3
- RFC 3986 (URI syntax) — query parameter conventions
- ISO 8601 date format

## Issues Found
- **Misleading comment in cursor pagination example** (around lines 430–437): The original comment read "Primary sort: items with greater sort value" but the code uses `where('created_at', '<', decodedCursor.created_at)` with descending order — so the next page contains items with a *smaller* `created_at`, not greater. Updated the comment to "next items come after cursor in desc order" and changed the tiebreaker comment to "same sort value but smaller ID" for clarity. The code itself is correct keyset pagination.

No other technical issues were found. All code examples compile and use current, non-deprecated APIs.

## Review Notes
- The `parseSort` function only handles a single `field:direction` token, even though the docs above it show multi-field syntax like `sort=category:asc,price:desc`. To support that, the implementation would need to split the parameter on commas first. This is consistent with what's documented in the sort section's own implementation (it only handles single sort), so not technically wrong — but readers should be aware.
- The "Multi-Value Filters" section documents both comma-separated and repeated-parameter styles, but the `parseSearchParams` code only handles the comma-separated form (`query.brand.split(',')`). With repeated `?brand=apple&brand=samsung`, Express by default returns an array, which would make `.split` throw. This is a known nuance, not a bug in the article — consistent with the comma-separated example.
- The Elasticsearch aggregations example assumes the default dynamic mapping where text fields get a `.keyword` sub-field. This is correct for ES 7.x+ defaults; users with custom mappings would need to adjust.
- The `express-rate-limit` package renamed `max` to `limit` in v7 (both still work as of current versions). The code as written remains valid.
- Input sanitization in `sanitizeSearchQuery` only strips `<>` — adequate for the simple XSS reflection case shown but not a full XSS defense. Output escaping at render time is the proper layer for that, which is implied by the "validate input" framing.
