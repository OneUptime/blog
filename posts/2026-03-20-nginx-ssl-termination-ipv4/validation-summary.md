# Validation Summary: How to Set Up Nginx SSL Termination on an IPv4 Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server / reverse proxy)
- TLS 1.2 / TLS 1.3
- Let's Encrypt / Certbot
- OCSP stapling
- HSTS (HTTP Strict Transport Security)
- OpenSSL (s_client)
- testssl.sh

## Sources Consulted
- Nginx HTTP SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTP Core module (listen directive): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx HTTP Proxy module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx HTTP Upstream module (keepalive): https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Let's Encrypt certificate paths documentation: https://letsencrypt.org/docs/certificates-for-localhost/
- RFC 6797 (HSTS)
- RFC 5737 (IPv4 documentation address blocks — 203.0.113.0/24 is TEST-NET-3)
- Mozilla SSL Configuration Generator (cipher recommendations)
- OpenSSL s_client manual: https://docs.openssl.org/master/man1/openssl-s_client/

## Issues Found
No technical issues found.

All elements verified as accurate:
- `apt install certbot python3-certbot-nginx` is the correct Debian/Ubuntu package set.
- `certbot --nginx -d example.com -d www.example.com` syntax is correct.
- Let's Encrypt certificate paths (`/etc/letsencrypt/live/<domain>/fullchain.pem`, `privkey.pem`, `chain.pem`) are correct.
- `listen <ip>:443 ssl;` is valid Nginx syntax for binding SSL to a specific IPv4 address.
- `ssl_protocols TLSv1.2 TLSv1.3;` matches current best practice.
- Cipher list contains valid OpenSSL cipher names; `ssl_prefer_server_ciphers off` is the correct modern recommendation (TLS 1.3 cipher selection is mandated by the spec).
- `ssl_session_cache`, `ssl_session_timeout`, `ssl_session_tickets` directives and values are correctly named and valid.
- HSTS `max-age=63072000` correctly equals 2 years (2 × 365 × 24 × 3600 = 63,072,000).
- `proxy_http_version 1.1` + `proxy_set_header Connection ""` is the correct idiom for using upstream `keepalive`.
- OCSP stapling directives (`ssl_stapling`, `ssl_stapling_verify`, `ssl_trusted_certificate`, `resolver`, `resolver_timeout`) are all valid and correctly used.
- `openssl s_client -connect host:port -servername example.com` correctly performs SNI-aware testing.
- `203.0.113.10` is in TEST-NET-3 (RFC 5737), an appropriate documentation address.

## Review Notes
- Modern Nginx (1.25.1+) supports `http2 on;` as a separate directive instead of the older `listen ... http2` syntax. The post does not enable HTTP/2 at all, which is fine for a focused SSL-termination tutorial but worth mentioning as a future enhancement.
- The cipher list is slightly conservative (AES-only, no ChaCha20-Poly1305). Adding `ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305` would benefit clients without AES-NI hardware acceleration. Not incorrect, just an optional improvement.
- OCSP stapling is becoming less central as some CAs (notably Let's Encrypt as of 2025) are phasing out OCSP responder support in favor of CRLite/short-lived certificates. The directives shown are still valid, but readers should be aware OCSP may be deprecated for Let's Encrypt issuance going forward.
- The HSTS header omits `includeSubDomains` and `preload`. This is a deliberate conservative choice (correct for a single-domain example) and not an error.
