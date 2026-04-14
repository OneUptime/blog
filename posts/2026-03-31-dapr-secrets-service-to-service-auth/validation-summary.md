# Validation Summary: How to Use Dapr Secrets Management for Service-to-Service Auth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Secrets Management API (HTTP API v1.0)
- Dapr mutual TLS (mTLS) / Sentry
- HashiCorp Vault (KV v2)
- Go (crypto/hmac, net/http)
- Python (httpx, PyJWT)
- Node.js (@dapr/dapr JavaScript SDK)
- HMAC-SHA256 request signing
- JWT (HS256) service-to-service tokens

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr JavaScript SDK (`@dapr/dapr`) — `DaprClient`, `HttpMethod`, `invoker.invoke()`, and `secret.get()` API signatures verified against other validated posts in this repository
- HashiCorp Vault KV v2 CLI reference: https://developer.hashicorp.com/vault/docs/commands/kv/put
- Python `datetime.utcnow()` deprecation (Python 3.12): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- PyJWT documentation: https://pyjwt.readthedocs.io/en/latest/usage.html
- Go standard library: crypto/hmac, encoding/base64, encoding/hex

## Issues Found

1. **Python: `datetime.utcnow()` deprecated since Python 3.12**
   - **What was wrong:** The Python code used `datetime.utcnow()` for the `iat` and `exp` JWT claims. This method was deprecated in Python 3.12 (October 2023) and emits a `DeprecationWarning`.
   - **What was changed:** Added `timezone` to the import (`from datetime import datetime, timedelta, timezone`) and replaced `datetime.utcnow()` with `datetime.now(timezone.utc)`.
   - **Why:** `datetime.utcnow()` returns a naive datetime without timezone info, which is error-prone. `datetime.now(timezone.utc)` returns a timezone-aware datetime and is the recommended replacement. PyJWT handles timezone-aware datetimes correctly.

2. **JavaScript: `HttpMethod` used but not imported**
   - **What was wrong:** The code used `HttpMethod.POST` in the `client.invoker.invoke()` call, but `HttpMethod` was not included in the `require('@dapr/dapr')` destructuring. This would cause a `ReferenceError` at runtime.
   - **What was changed:** Updated the import from `const { DaprClient } = require('@dapr/dapr')` to `const { DaprClient, HttpMethod } = require('@dapr/dapr')`.
   - **Why:** `HttpMethod` is a separate named export from the `@dapr/dapr` package and must be explicitly imported.

## Review Notes
- The Go code omits JSON parsing of the Dapr secrets response (noted with "omitted for brevity" comment). This is acceptable for a tutorial but readers should be aware they need to implement JSON unmarshaling to extract the `hmac-signing-key` field from the response map.
- The Dapr Secrets API URL format (`/v1.0/secrets/<store-name>/<key>`) and default port (3500) are correct throughout all examples.
- The Vault `kv put` command syntax is correct for KV v2 secrets engine.
- The HMAC-SHA256 signing implementation in Go is correct and follows standard library conventions.
- The overall architecture advice (layering application-level auth on top of Dapr mTLS) is sound and aligns with Dapr security best practices.
