# Validation Summary: How to Add JWT Authentication to Flask

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Flask
- Flask-JWT-Extended (4.x)
- JSON Web Tokens (JWT)
- curl (for testing)

## Sources Consulted
- Flask-JWT-Extended official documentation: https://flask-jwt-extended.readthedocs.io/
- Flask-JWT-Extended API reference: https://flask-jwt-extended.readthedocs.io/en/stable/api.html
- Flask-JWT-Extended configuration options: https://flask-jwt-extended.readthedocs.io/en/stable/options.html
- Flask-JWT-Extended blocklist guide: https://flask-jwt-extended.readthedocs.io/en/stable/blocklist_and_token_revoking.html
- Flask-JWT-Extended changelog (4.0 release notes for `additional_claims`)
- RFC 7519 (JWT specification)
- Flask documentation: https://flask.palletsprojects.com/

## Issues Found
No technical issues found.

Verified items:
- `pip install flask flask-jwt-extended` — correct package name on PyPI.
- All imports from `flask_jwt_extended` (`JWTManager`, `create_access_token`, `create_refresh_token`, `jwt_required`, `get_jwt_identity`, `get_jwt`, `verify_jwt_in_request`) exist and have correct signatures in v4.x.
- Default values in the configuration table are correct: `JWT_ACCESS_TOKEN_EXPIRES` defaults to 15 minutes, `JWT_REFRESH_TOKEN_EXPIRES` defaults to 30 days, `JWT_TOKEN_LOCATION` defaults to `['headers']`, `JWT_HEADER_NAME` is `Authorization`, `JWT_HEADER_TYPE` is `Bearer`.
- `create_access_token(identity=..., additional_claims={...})` — `additional_claims` parameter was introduced in Flask-JWT-Extended 4.0 and is the current recommended way to add claims.
- `@jwt_required(refresh=True)` — correct syntax for refresh-only endpoints.
- Blocklist callback `@jwt.token_in_blocklist_loader` with `(jwt_header, jwt_payload)` signature — correct for 4.x.
- `jwt_payload['jti']` — correct standard JWT claim for the unique token ID.
- Error handler callbacks (`expired_token_loader`, `invalid_token_loader`, `unauthorized_loader`, `revoked_token_loader`) — all callback names and signatures match the current API.
- Role-based access control pattern with `verify_jwt_in_request()` and `get_jwt()` inside a custom decorator — correct and matches the documented pattern.
- JWT structure description (header.payload.signature) — accurate per RFC 7519.

## Review Notes
- The post includes `from datetime import datetime` in the blocklist code snippet but never uses it. This is harmless dead code, not a technical error, so it was left unchanged.
- The "Complete Example" section only shows the `if __name__ == '__main__':` block rather than a fully assembled application; readers must mentally assemble snippets from earlier sections. This is a stylistic choice rather than a technical inaccuracy.
- The example correctly warns readers about plain-text password comparison and recommends bcrypt/argon2 in the best practices section, which appropriately covers the security caveats of the simplified `users_db` example.
- In Flask-JWT-Extended 4.x, when using JSON serializer (the default), the `identity` value must be JSON-serializable. Strings (as used here with `email`) work fine; this is noted only as a forward caveat for readers passing complex identity objects.
- No deprecation warnings — all APIs used in the post are current as of Flask-JWT-Extended 4.x.
