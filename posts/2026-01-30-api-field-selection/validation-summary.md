# Validation Summary: How to Implement API Field Selection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- REST API design
- Sparse fieldsets and field selection
- Node.js
- Express
- node-postgres
- PostgreSQL
- Python
- FastAPI
- HTTP caching
- JSON:API

## Sources Consulted
- Express 5.x API Reference: https://expressjs.com/en/5x/api/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- FastAPI query parameters documentation: https://fastapi.tiangolo.com/tutorial/query-params/
- FastAPI query parameter validation documentation: https://fastapi.tiangolo.com/tutorial/query-params-str-validations/
- FastAPI request parameter reference: https://fastapi.tiangolo.com/reference/parameters/
- JSON:API sparse fieldsets specification: https://jsonapi.org/format/#fetching-sparse-fieldsets
- node-postgres query documentation: https://node-postgres.com/features/queries
- PostgreSQL ORDER BY documentation: https://www.postgresql.org/docs/current/queries-order.html
- RFC 9111 HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- MDN Vary header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary

## Issues Found
- The field selection pattern table incorrectly attributed dot-path nested field selection to JSON:API. JSON:API sparse fieldsets use `fields[TYPE]` parameters, so the table now labels dot paths as a custom REST pattern and bracket notation as JSON:API sparse fieldsets.
- The Express middleware returned `invalid_fields` and `allowed_fields` directly under `error`, while the test examples and later error response section expected those fields under `error.details`. The middleware error response was updated to match the documented test shape.
- The FastAPI example imported unused Pydantic and `functools` symbols and described itself as using Pydantic validation even though it did not define Pydantic models. The unused imports were removed and the wording was changed to FastAPI query parameter validation.
- The FastAPI `Query` example used the deprecated scalar `example` parameter. It was updated to `examples`, which matches the current FastAPI parameter reference for OpenAPI 3.1.
- The caching example suggested adding `Vary: X-Fields` for field selection generally, but `Vary` applies to request headers, not URL query parameters. The code comment and helper name were updated to clarify that `Vary` is appropriate only when field selection is controlled by a request header; `?fields=` variants are distinguished by the request URI/cache key.

## Review Notes
The JavaScript and Python fenced code blocks were extracted and checked with `node --check` and `python3 -m py_compile`; all passed after the edits. The performance numbers appear to be illustrative benchmark-style values rather than universal claims, so they were left unchanged.
