# Validation Summary: How to Configure Multiple SSL Certificates on a Single IPv4 Address with SNI

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (HTTP/HTTPS server)
- TLS / SSL
- Server Name Indication (SNI) — TLS extension
- Let's Encrypt certificate paths (`/etc/letsencrypt/live/...`)
- OpenSSL (`s_client`, `x509`) for verification
- HSTS (Strict-Transport-Security)
- OCSP stapling
- PCRE named captures in `server_name`

## Sources Consulted
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `server_name` documentation (named captures): https://nginx.org/en/docs/http/server_names.html
- Nginx configuring HTTPS servers (SNI section): https://nginx.org/en/docs/http/configuring_https_servers.html
- RFC 6066 (TLS Extensions: Server Name Indication): https://datatracker.ietf.org/doc/html/rfc6066#section-3
- OpenSSL `s_client` man page (`-servername` flag): https://docs.openssl.org/master/man1/openssl-s_client/
- MDN HSTS reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security

## Issues Found
No technical issues found.

Verified items:
- The `listen 203.0.113.10:443 ssl;` syntax is correct per the nginx docs (the `ssl` parameter on the listen directive is the modern form, replacing the deprecated `ssl on;` directive).
- `ssl_certificate` and `ssl_certificate_key` directive names and ordering are correct.
- `ssl_protocols TLSv1.2 TLSv1.3;` is valid; both are accepted protocol tokens.
- `ssl_session_cache shared:SSL:10m;` matches the documented `shared:name:size` syntax.
- `ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;` is a valid (if minimal) OpenSSL cipher list.
- `ssl_stapling on;` and `ssl_stapling_verify on;` are real directives requiring a `resolver`, which the post correctly includes.
- HSTS `max-age=63072000` equals 2 years (2 × 365 × 24 × 3600 = 63,072,000) — correct.
- The named-capture regex `~^(?<subdomain>.+)\.example\.com$` is valid PCRE syntax that nginx supports for `server_name`.
- The OpenSSL verification command uses `-servername` (the correct flag to send an SNI value) and `x509 -noout -subject -issuer` is a valid combination per the OpenSSL man page.
- `--with-http_ssl_module` is the correct compile flag and is enabled by default in most distro packages.
- The SNI explanation aligns with RFC 6066 §3.

## Review Notes
- The wildcard example uses `proxy_pass http://${subdomain}_backend;`. When a variable is used in `proxy_pass`, nginx switches to runtime DNS resolution (a `resolver` directive is required) and does not look up nginx `upstream {}` blocks by name. The shared SSL include in the example does include `resolver 8.8.8.8`, so the snippet would attempt to DNS-resolve hostnames like `api_backend` — readers wanting to map to local upstream blocks would need a different pattern (e.g., a `map` block). This is an illustrative snippet rather than a strict misstatement, so no edit was made.
- The prerequisite "Clients using TLS 1.0+" is technically accurate for SNI capability (the extension was introduced in RFC 3546 for TLS 1.0). Note that the post's own server config disables TLS 1.0/1.1 by setting `ssl_protocols TLSv1.2 TLSv1.3`, which is the modern best practice — the prerequisite refers to client SNI support in general, not the configured server policy.
- The cipher list shown is intentionally minimal. For production, operators may want to consult the Mozilla SSL Configuration Generator for an up-to-date "intermediate" or "modern" profile, but the existing list is not technically incorrect.
