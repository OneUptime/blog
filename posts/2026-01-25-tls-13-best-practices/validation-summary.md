# Validation Summary: How to Configure TLS 1.3 Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TLS 1.3 and TLS 1.2
- Nginx TLS/HTTPS configuration
- Apache HTTP Server mod_ssl configuration
- OpenSSL command-line tooling
- Certbot and Let's Encrypt certificates
- HSTS and HSTS preload
- OCSP stapling
- HTTP security headers

## Sources Consulted
- RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3 - https://datatracker.ietf.org/doc/html/rfc8446
- IANA TLS Parameters registry - https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml
- Nginx ngx_http_ssl_module documentation - https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_v2_module documentation - https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx HTTPS server configuration guide - https://nginx.org/en/docs/http/configuring_https_servers.html
- Apache HTTP Server mod_ssl documentation - https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- OpenSSL s_client documentation - https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL ciphers documentation - https://docs.openssl.org/master/man1/openssl-ciphers/
- Certbot user guide - https://eff-certbot.readthedocs.io/en/stable/using.html
- HSTS preload submission requirements - https://hstspreload.org/
- MDN X-XSS-Protection header reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The post described TLS 1.3 as having "only five secure suites." Updated this to clarify that five TLS 1.3 suites are defined, while three are commonly enabled by default.
- The Nginx examples used `listen 443 ssl http2`, which is deprecated in current Nginx in favor of `listen 443 ssl;` plus `http2 on;`. Updated both Nginx snippets.
- The Nginx examples used `ssl_ciphers` as if it configured TLS 1.3 cipher suites. Updated the examples so `ssl_ciphers` covers TLS 1.2 and `ssl_conf_command Ciphersuites ...` covers TLS 1.3.
- The Nginx curve list omitted P-256, which can matter for common ECDSA certificates. Added `prime256v1` alongside `X25519` and `secp384r1`.
- The session-ticket comments overstated the relationship between disabling tickets and perfect forward secrecy. Reworded the guidance to focus on ticket-key rotation.
- The TLS 1.3-only early-data example said it rejected state-changing requests, but the snippet rejected all early data. Updated the comment to match the behavior.
- The 0-RTT example comment said it rejected non-idempotent requests, but the snippet only allowed GET. Updated the comment to match the implementation.
- The security headers example recommended `X-XSS-Protection: 1; mode=block`, which is deprecated/non-standard guidance for modern browsers. Changed it to disable legacy XSS filtering with `X-XSS-Protection: 0` and rely on CSP.
- The OpenSSL protocol test grepped for `Cipher`, which can produce false positives when OpenSSL reports `Cipher is (NONE)`. Updated the test to use `s_client -brief` and check for a negotiated TLS protocol.

## Review Notes
The Apache, OpenSSL certificate-generation, Certbot, HSTS, OCSP stapling, and external testing-tool references were otherwise consistent with the checked documentation. Some examples still use application-specific placeholder paths and domains, which is appropriate for a configuration guide.
