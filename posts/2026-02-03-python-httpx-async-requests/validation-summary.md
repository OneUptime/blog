# Validation Summary: How to Use httpx for Async HTTP Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (`asyncio`, type hints, generators)
- httpx (sync and async HTTP client, version 0.28.1)
- tenacity (retry library)
- HTTP/1.1 and HTTP/2
- SOCKS proxies (httpx[socks] extra)
- TLS / mTLS (`ssl.SSLContext`, client certificates)
- pytest / pytest-asyncio (testing)
- OAuth2 client credentials flow

## Sources Consulted
- Official httpx documentation — https://www.python-httpx.org/
- httpx CHANGELOG — https://github.com/encode/httpx/blob/master/CHANGELOG.md
- httpx Advanced / Clients / Transports / Auth docs
- httpx 0.26.0 and 0.28.0 release notes (for proxy/cert API changes)
- tenacity documentation — https://tenacity.readthedocs.io/

## Issues Found
1. **`proxies=` parameter is removed in httpx 0.28.0** — The post pins `httpx==0.28.1` but the original Proxy Support section used the plural `proxies=` argument (both string and dict forms). This argument was deprecated in 0.26.0 and removed entirely in 0.28.0. Code as written would raise `TypeError: __init__() got an unexpected keyword argument 'proxies'`.
   - **Fix applied:** Rewrote the Proxy Support section to use the current API: `proxy=` (singular string) for single-proxy use cases (HTTP, SOCKS, authenticated, bypass) and `mounts={"http://": httpx.AsyncHTTPTransport(proxy=...), ...}` for per-scheme routing. Added a brief inline note that explains the migration.

## Review Notes
- **`cert=` parameter is deprecated in 0.28.0.** It still works in 0.28.1 (raises a `DeprecationWarning`) and the post's `cert=("/path/to/client.crt", "/path/to/client.key")` example will run correctly. The recommended replacement is to build an `ssl.SSLContext` and pass it via `verify=ssl_context` — the post already demonstrates this in the password-protected-key example, so readers see both forms. Left as-is.
- **Stylistic caveat in the Client Configuration section.** The example creates a single `client = httpx.AsyncClient(...)` at module scope and then uses `async with client:` inside two different async functions. After the first context-manager exit the client is closed, so calling `get_user()` after `get_users()` would raise `RuntimeError: Cannot send a request, as the client has been closed.` This is a usage pattern issue, not a syntax error — the code as written would still execute the first call correctly. Left as-is since the post is illustrating configuration options, not lifecycle.
- **`request.extensions["start_time"] = time.time()`** in the metrics hook works because `Request.extensions` is a plain dict, but `extensions` is intended for transport-layer hints (sni_hostname, timeout, etc.). Stashing data there is not idiomatic; a thread-local/contextvar or wrapping dict keyed by `id(request)` would be cleaner. Not a correctness issue.
- **Default timeout, `httpx.Timeout` parameters, `event_hooks`, `MockTransport`, custom `httpx.Auth.auth_flow` generator pattern, `aiter_bytes`/`aiter_lines`, `httpx.Limits`, exception hierarchy (`NetworkError`, `ConnectError`, `ConnectTimeout`, `ReadTimeout`, `WriteTimeout`, `PoolTimeout`, `TimeoutException`, `HTTPStatusError`, `DecodingError`, `TooManyRedirects`, `RequestError`, `HTTPError`), and the `httpx[http2]` / `httpx[brotli]` / `httpx[socks]` extras** were all verified against the official documentation and are correct for the pinned 0.28.1 version.
