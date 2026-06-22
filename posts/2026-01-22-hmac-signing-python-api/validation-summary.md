# Validation Summary: How to Secure APIs with HMAC Signing in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- HMAC / HMAC-SHA256
- FastAPI
- Starlette request handling and middleware
- Python requests
- JSON request signing
- Replay attack prevention with timestamps and nonces

## Sources Consulted
- Python `hmac` documentation: https://docs.python.org/3/library/hmac.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- RFC 2104, HMAC: Keyed-Hashing for Message Authentication: https://datatracker.ietf.org/doc/html/rfc2104
- NIST FIPS 198-1, The Keyed-Hash Message Authentication Code: https://csrc.nist.gov/pubs/fips/198-1/final
- FastAPI security utilities / `APIKeyHeader` reference: https://fastapi.tiangolo.com/reference/security/
- FastAPI request documentation note pointing to Starlette requests: https://fastapi.tiangolo.com/advanced/using-request-directly/
- Starlette request body documentation: https://starlette.dev/requests/
- Starlette middleware documentation: https://starlette.dev/middleware/
- Requests API documentation: https://requests.readthedocs.io/en/latest/api/
- Python `urllib.parse.urlencode` documentation: https://docs.python.org/3/library/urllib.parse.html

## Issues Found
- The examples used `datetime.utcnow()`, which is deprecated as of Python 3.12 and returns naive datetime objects. Replaced it with `datetime.now(timezone.utc)` and generated explicit UTC ISO timestamps.
- The server timestamp verification stripped timezone information with `replace(tzinfo=None)`, which can validate offset timestamps against the wrong instant. Updated the code to require timezone-aware timestamps and compare them directly against an aware UTC `now`.
- The client built the signed query string manually with `f"{k}={v}"`, which can diverge from the URL encoding performed by `requests`. Updated it to use `urllib.parse.urlencode()` and pass sorted request parameters so the signed query string matches the transmitted query string.
- The main FastAPI verification path stored the nonce before verifying the signature. Moved nonce insertion after the constant-time signature comparison so invalid signatures do not consume nonce values.
- The middleware example did not sort query parameters before signing, unlike the complete client/server examples. Updated it to sort query components and uppercase the HTTP method for canonicalization consistency.

## Review Notes
All Python code blocks were syntax-checked with `ast.parse`. FastAPI was not installed in the local environment, so runtime integration tests were not executed. The in-memory nonce cache is suitable for an example, but a production deployment with multiple workers or replicas should use a shared store such as Redis or a database with expiration.
