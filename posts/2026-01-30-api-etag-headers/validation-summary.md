# Validation Summary: How to Implement API ETag Headers

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- HTTP conditional requests, ETag, If-None-Match, If-Match, Last-Modified, 304, 412, and 428 responses
- Node.js and Express.js
- Python, FastAPI, Pydantic, and Starlette responses
- Django and Django REST Framework
- Go net/http and Chi router
- Jest, Supertest, and Pytest testing patterns

## Sources Consulted
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Express API reference: https://expressjs.com/en/api/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Python json documentation: https://docs.python.org/3/library/json.html
- Python email.utils HTTP-date parsing documentation: https://docs.python.org/3/library/email.utils.html
- FastAPI jsonable_encoder documentation: https://fastapi.tiangolo.com/tutorial/encoder/
- Pydantic BaseModel model_dump documentation: https://docs.pydantic.dev/latest/api/base_model/
- Starlette Response documentation: https://www.starlette.io/responses/
- Django conditional view processing documentation: https://docs.djangoproject.com/en/5.2/topics/conditional-view-processing/
- Go encoding/json documentation: https://pkg.go.dev/encoding/json
- Go net/http documentation: https://pkg.go.dev/net/http

## Issues Found
- Corrected the server CPU savings table. The original wording implied ETags always reduce server work to a hash comparison, but naive content-hash implementations may still serialize or hash data unless ETags are stored separately.
- Clarified that strong ETags should be generated from the exact response representation, or from a canonical serialization used consistently for that representation.
- Fixed incorrect Node.js and Python example hash outputs so the comments match the shown product object and hash functions.
- Removed an unused Python `Union` import from the standalone Python example.
- Updated conditional GET examples to use weak ETag comparison for `If-None-Match`, as required by RFC 9110, instead of exact string matching only.
- Updated `If-Match` examples to use strong comparison and reject weak ETags for write preconditions. Also added handling for multiple ETags and the wildcard form.
- Updated the FastAPI example to remove unused imports, use `jsonable_encoder`, use `model_dump()` for current Pydantic style, and parse/format HTTP dates with standard library helpers instead of a single fixed `strptime` pattern.
- Corrected the Django section wording: ETag and conditional processing decorators are provided by Django and can be applied to DRF views, rather than being DRF-specific.
- Removed unused Django imports and changed DRF view lookups to use `get_object_or_404` where a missing product should return 404.
- Updated the Go example to parse conditional ETag header lists consistently, use weak comparison for `If-None-Match`, and strong comparison for `If-Match`.
- Updated later "correct" JavaScript snippets so they also use weak comparison for `If-None-Match`.

## Review Notes
The snippets still use placeholder database objects such as `db`, `Product`, and `ProductSerializer`; those are expected for a blog tutorial and were not treated as defects. The hash examples are suitable for application-level JSON APIs, but production systems with content negotiation, compression-specific validators, or framework-generated ETags should ensure their validator strategy matches the actual selected representation.
