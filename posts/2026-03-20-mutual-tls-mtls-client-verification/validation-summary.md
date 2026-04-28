# Validation Summary: How to Configure Mutual TLS (mTLS) Authentication for Client Verification

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenSSL (CA, key, CSR, X.509 certificate, PKCS#12 generation)
- Nginx (`ngx_http_ssl_module` directives and embedded variables)
- Apache HTTP Server (`mod_ssl`, `mod_headers`)
- curl (mTLS client testing with `--cert`, `--key`, `--cacert`, PKCS#12)
- Python (Flask) for reading client identity from upstream headers

## Sources Consulted
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html (embedded variables `$ssl_client_cert`, `$ssl_client_escaped_cert`, `$ssl_client_s_dn`, `$ssl_client_s_dn_legacy`, `$ssl_client_verify`; `ssl_verify_client`/`ssl_verify_depth` directives)
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html (`SSLVerifyClient`, `SSLVerifyDepth`, `SSLCACertificateFile`, `SSLOptions`)
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html (`RequestHeader`)
- curl manual: https://curl.se/docs/manpage.html (`--cert`, `--key`, `--cacert`, `--cert-type`)
- OpenSSL man pages: `openssl-genrsa`, `openssl-req`, `openssl-x509`, `openssl-pkcs12` at https://www.openssl.org/docs/

## Issues Found

1. **Deprecated Nginx variable `$ssl_client_cert`** — The Nginx documentation explicitly marks `$ssl_client_cert` as deprecated and recommends `$ssl_client_escaped_cert` (added in 1.13.5) for use in `proxy_set_header`, since the deprecated variable embeds raw newlines/tabs that are problematic in HTTP headers. Replaced `$ssl_client_cert` with `$ssl_client_escaped_cert` in the Nginx config.

2. **Missing `X-SSL-Client-Verify` header in Nginx config** — The Python application reads `request.headers.get('X-SSL-Client-Verify', '')` and rejects unless equal to `'SUCCESS'`, but the Nginx config never sets this header. Without the fix, all requests would 403 from the Python check. Added `proxy_set_header X-SSL-Client-Verify $ssl_client_verify;`.

3. **DN format mismatch in Python parser** — Since Nginx 1.11.6, `$ssl_client_s_dn` returns the subject DN in RFC 2253 format (comma-separated, e.g., `CN=api-client-01,O=My Company,C=US`), not the legacy slash-separated OpenSSL format. The Python code split on `/` and would have produced wrong results (or raised `ValueError` from the dict comprehension when the comma-separated string is treated as a single element with multiple `=` signs). Updated the parser to split on `,` with `split('=', 1)` and updated the comment to describe the RFC 2253 format.

## Review Notes

- The `if ($ssl_client_verify != SUCCESS)` block inside `location /` is technically dead code: with `ssl_verify_client on`, Nginx returns 495 (cert verification failed) or 496 (no cert) before reaching the location handler, so `$ssl_client_verify` will always be `SUCCESS` if the request gets there. It is harmless and acts as defense-in-depth, so left as-is.
- The Python DN parser remains a simple comma-split. RFC 2253 allows escaped commas in attribute values; for production code with arbitrary DNs, a proper parser (e.g., `cryptography.x509.Name`) would be more robust, but the simple approach is reasonable for a tutorial.
- `openssl genrsa` still works but newer OpenSSL releases prefer `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096`. Not changed; both are valid.
- The Nginx `ssl_ciphers HIGH:!aNULL:!MD5;` and `ssl_protocols TLSv1.2 TLSv1.3;` are reasonable starting defaults; production deployments may want a tighter cipher list (e.g., from Mozilla SSL Config Generator).
- The Apache config relies on `mod_headers` for `RequestHeader`; not stated explicitly but standard on most distributions.
