# Validation Summary: How to Implement Partial Updates with PATCH in REST APIs

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HTTP PATCH, PUT, ETags, conditional requests, and status codes
- JSON Patch (RFC 6902)
- JSON Merge Patch (RFC 7396)
- Express.js
- `fast-json-patch`
- Zod
- Mongoose / MongoDB update operators
- PostgreSQL / node-postgres parameterized queries
- FastAPI
- Pydantic v2
- Go and Gin

## Sources Consulted
- RFC 5789 — PATCH Method for HTTP: https://www.rfc-editor.org/rfc/rfc5789
- RFC 6902 — JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902
- RFC 7396 — JSON Merge Patch: https://www.rfc-editor.org/rfc/rfc7396
- RFC 6585 — 428 Precondition Required: https://www.rfc-editor.org/rfc/rfc6585
- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- Express 5.x API Reference: https://expressjs.com/en/api/
- `fast-json-patch` package documentation: https://www.npmjs.com/package/fast-json-patch
- Zod documentation: https://zod.dev/
- Mongoose validation documentation: https://mongoosejs.com/docs/validation.html
- MongoDB `$set` and `$unset` update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/set/ and https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- node-postgres query documentation: https://node-postgres.com/features/queries
- FastAPI partial update documentation: https://fastapi.tiangolo.com/tutorial/body-updates/
- Pydantic v2 model configuration documentation: https://docs.pydantic.dev/latest/api/config/
- Gin package documentation: https://pkg.go.dev/github.com/gin-gonic/gin

## Issues Found
- Express examples compared `req.headers['content-type']` directly to media type strings. This rejects valid requests whose `Content-Type` includes parameters. Updated the examples to use Express `req.is(...)`.
- Zod error handling used `error.errors`, which is not current in Zod v4. Updated it to `error.issues`.
- The JSON Patch optimistic locking comment said the patch itself ensures an atomic check-and-update. Updated the wording to clarify that persistence still needs an atomic database version check.
- The `Last-Modified` example used `Mon, 27 Jan 2026`, but January 27, 2026 is a Tuesday. Corrected it to `Tue, 27 Jan 2026 10:30:00 GMT`.
- The SQL partial update example interpolated dynamic table and field names directly into SQL. Updated it to use a fixed table and an allowlist for updatable fields while keeping values parameterized.
- The SQL partial update usage destructured a possible `null` result when there were no changes. Added a guard for the no-op case.
- The MongoDB partial update example said to use `$unset` for null values but only put nulls into `$set`. Updated the helper to generate separate `$set` and `$unset` update documents.
- The Mongoose examples used `findByIdAndUpdate` after validation but did not enable Mongoose update validators. Added `{ runValidators: true }` to the relevant examples.
- The FastAPI/Pydantic example used Pydantic v1-style `class Config` and `patch.dict(exclude_unset=True)`. Updated it to Pydantic v2 `ConfigDict(extra="forbid")` and `model_dump(exclude_unset=True)`.

## Review Notes
- The JSON Patch helper remains intentionally simplified and the post correctly recommends using a production library such as `fast-json-patch`.
- The Go example is illustrative and uses pointers to distinguish omitted fields from zero values, which is correct. It does not distinguish omitted fields from explicit JSON null values.
