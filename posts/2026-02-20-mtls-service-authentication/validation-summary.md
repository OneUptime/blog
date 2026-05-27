# Validation Summary: How to Implement Mutual TLS for Service-to-Service Authentication

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Mutual TLS (mTLS)
- TLS certificates and certificate authorities
- OpenSSL
- Python ssl module
- FastAPI / ASGI
- Uvicorn
- HTTPX
- Kubernetes cert-manager
- Istio PeerAuthentication
- OneUptime monitoring

## Sources Consulted
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- HTTPX SSL documentation: https://www.python-httpx.org/advanced/ssl/
- Uvicorn settings documentation: https://www.uvicorn.org/settings/
- ASGI TLS extension specification: https://asgi.readthedocs.io/en/latest/specs/tls.html
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Istio PeerAuthentication documentation: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- OpenSSL 3.0.13 local command help for `openssl req` and `openssl x509`
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://datatracker.ietf.org/doc/html/rfc8446

## Issues Found
- The post said mTLS "eliminates" the need for API keys or tokens for service identity. Changed this to "can reduce or eliminate" because mTLS authenticates peer service identity, but deployments may still use tokens for end-user identity, delegated authorization, or application-level claims.
- The certificate identity wording treated CN and SAN as equivalent. Updated it to recommend SAN as the service identity and note that CN should not be the only identity, matching modern X.509/TLS guidance and cert-manager's warning that common name usage is discouraged.
- The FastAPI/Uvicorn server example attempted to read a peer certificate from `request.state.peer_cert` and implied Uvicorn exposes this automatically. Uvicorn can require client certificates with `ssl_cert_reqs` and `ssl_ca_certs`, but it does not populate `request.state.peer_cert` by default. Updated the example to read the ASGI TLS extension's `client_cert_name` when provided by the ASGI server or a trusted TLS-terminating proxy, and removed the unused `ssl_context` variable.

## Review Notes
- The OpenSSL commands use valid flags for OpenSSL 3.0.13. `openssl req -nodes` is accepted but marked deprecated in favor of `-noenc`; it remains functional.
- The HTTPX client pattern using an `ssl.SSLContext` with `load_cert_chain()` and passing it as `verify=` is consistent with HTTPX documentation.
- The cert-manager Certificate and Istio PeerAuthentication YAML snippets use valid API shapes and field values.
