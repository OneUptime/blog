# Validation Summary: API Security Best Practices for Production Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OWASP API Security Top 10 2023
- FastAPI
- PyJWT and JWT/JWKS validation
- Pydantic v2
- Redis Lua scripting and token bucket rate limiting
- HTTP security headers
- Starlette/FastAPI CORS middleware
- structlog audit logging

## Sources Consulted
- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x10-api-security-risks/
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- PyJWT usage examples: https://pyjwt.readthedocs.io/en/latest/usage.html
- FastAPI security reference: https://fastapi.tiangolo.com/reference/security/
- Pydantic fields API: https://docs.pydantic.dev/latest/api/fields/
- Pydantic validators documentation: https://docs.pydantic.dev/latest/concepts/validators/
- Redis EVAL command: https://redis.io/docs/latest/commands/eval/
- Redis HSET command: https://redis.io/docs/latest/commands/hset/
- Starlette middleware and CORS documentation: https://www.starlette.io/middleware/
- MDN Strict-Transport-Security reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
- structlog API reference: https://www.structlog.org/en/stable/api.html
- RFC 7519 JSON Web Token: https://www.rfc-editor.org/rfc/rfc7519
- RFC 8725 JSON Web Token Best Current Practices: https://www.rfc-editor.org/rfc/rfc8725

## Issues Found
- The OWASP API Security Top 10 diagram had incorrect 2023 entries for API6, API7, and API8, and abbreviated two authorization item names. Updated the diagram to match the official OWASP API Security Top 10 2023 list.
- The Pydantic example said input had been "validated and sanitized." Pydantic validates and coerces data, but validation is not the same as sanitization. Updated the comment to say the input has been validated.
- The architecture diagram labeled the validation output as "Sanitized Input." Updated it to "Validated Input" for the same reason.
- The Redis Lua script used `HMSET`, which Redis marks as deprecated in favor of `HSET` for setting multiple hash fields. Replaced `HMSET` with `HSET`.
- The Redis rate limiter created an unused pipeline variable even though the Lua script is executed directly and atomically. Removed the unused variable.
- The audit logging example used `request.state.request_id` directly, which raises an error if no request ID middleware populated that state value. Changed it to `getattr(request.state, "request_id", None)`.
- The audit logging route declared `request: Request = None`, even though the function depends on a real request object. Reordered the FastAPI route parameters so `request: Request` is injected normally, and added the missing FastAPI imports used in that snippet.

## Review Notes
- The JWT example correctly constrains accepted algorithms and validates issuer, audience, expiration, and required claims. In a production implementation, teams should also plan JWKS cache refresh behavior for key rotation and use timeouts/status checks when fetching JWKS.
- The CORS example correctly avoids wildcard origins with credentials and explicitly lists origins, methods, and headers.
- The security headers are reasonable for API responses. HSTS only has browser effect when delivered over HTTPS.
