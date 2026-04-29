# Validation Summary: How to Configure mTLS Between Microservices over IPv4

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- mTLS (mutual TLS)
- OpenSSL (certificate generation)
- Python `ssl` module (`SSLContext`, `PROTOCOL_TLS_SERVER`, `PROTOCOL_TLS_CLIENT`)
- Python `http.server` (`HTTPServer`, `BaseHTTPRequestHandler`)
- Python `urllib.request`
- Nginx (`ssl_certificate`, `ssl_client_certificate`, `ssl_verify_client`, `$ssl_client_s_dn`)
- Kubernetes service meshes (Istio, Linkerd) — mentioned briefly

## Sources Consulted
- OpenSSL 3.0 documentation: https://docs.openssl.org/3.0/man1/openssl-req/ and https://docs.openssl.org/3.0/man1/openssl-x509/
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- RFC 6125 (Service Identity in TLS) and RFC 5280 (X.509 PKI)
- Local verification: ran the proposed OpenSSL pipeline on OpenSSL 3.0.13 and confirmed the resulting cert contains the expected `Subject Alternative Name` extension; verified Python `PROTOCOL_TLS_CLIENT` defaults (`check_hostname=True`, `verify_mode=CERT_REQUIRED`)

## Issues Found
1. **Server certificate had no Subject Alternative Name (SAN).** The original OpenSSL commands signed a server cert with only `CN=server.internal`, but the Python client connects to `https://192.168.1.10:8443/...`. Python's `PROTOCOL_TLS_CLIENT` enables `check_hostname=True` by default, and modern Python no longer honors a CN-based fallback when verifying against an IP literal — the example would fail with `ssl.SSLCertVerificationError`. Fixed by:
   - Adding `-addext "subjectAltName=DNS:server.internal,IP:192.168.1.10"` to the server CSR step.
   - Adding `-copy_extensions copy` to the `openssl x509 -req` signing step so the SAN is carried over from the CSR (OpenSSL 3.0+).
   - Updated the in-code comment to explain why SAN is needed.

## Review Notes
- The Nginx snippet sets `X-Client-CN $ssl_client_s_dn`. `$ssl_client_s_dn` is the **full** subject DN (RFC 2253 format, e.g. `CN=client-service`), not strictly the CN. For a cert whose subject is only `CN=…` this happens to be effectively equivalent, and the directive itself is valid, so this was left as-is (style, not technical incorrectness). A future revision might rename the header to `X-Client-DN` or use a `map`/regex to extract just the CN value.
- The Python server uses `ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)` and the client uses `ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)`. These are the recommended modern constructors; `ssl.create_default_context(...)` would be even more idiomatic but is not incorrect as written.
- `-copy_extensions copy` requires OpenSSL 3.0+. OpenSSL 3.0 has been the upstream stable line since 2021 and is the default on current major distros, so this is appropriate. Users on older 1.1.x toolchains would need an `-extfile` instead.
- `ssl_verify_client on;` will reject connections with no client cert; for tutorials in a partial-rollout setting `optional` is sometimes preferred, but the post is explicitly about enforcing mTLS, so `on` is correct here.
- The `listen 443 ssl;` directive is valid in current Nginx. (Note: in Nginx 1.25.1+, `http2` is configured via the separate `http2 on;` directive rather than as a `listen` parameter, but the post does not enable HTTP/2 so this is moot.)
