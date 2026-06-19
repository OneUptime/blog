# Validation Summary: How to Fix 'Claims Missing' JWT Errors

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- JSON Web Tokens (JWT)
- JWT claims and registered claim names
- PyJWT
- Python datetime handling
- Flask request middleware and decorators
- Base64url decoding

## Sources Consulted
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- IANA JSON Web Token Claims registry: https://www.iana.org/assignments/jwt/jwt.xhtml
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/

## Issues Found
- The complete debugging script computed the allowed PyJWT verification algorithm from the token header. PyJWT warns not to derive `algorithms` from attacker-controlled token data, so the script now accepts an `expected_algorithm` argument and passes that fixed value to `jwt.decode`.
- Several datetime examples used naive UTC datetimes via `datetime.utcnow()` or rendered NumericDate values with local-time `datetime.fromtimestamp()`. Updated the examples to use timezone-aware UTC datetimes with `datetime.now(timezone.utc)` and `datetime.fromtimestamp(..., tz=timezone.utc)`.
- The custom claim validator snippet used `jwt.decode` without importing `jwt`. Added the missing import and removed an unused `Callable` import.
- The Flask decorator snippet used `request`, `current_app`, and `jwt` without importing them. Added the missing imports.
- The "wrong validation" example accessed `payload['user_id']` while the corrected version required and accessed `sub`. Updated the wrong example to use `payload['sub']` so the example demonstrates the same missing-claim failure.

## Review Notes
All Python code blocks parse successfully after the fixes. The examples remain illustrative and still assume application-specific placeholders such as `JWTValidator`, `get_all_users`, and Flask app configuration exist in the surrounding application.
