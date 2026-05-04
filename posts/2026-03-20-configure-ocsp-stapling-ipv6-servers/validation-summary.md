# Validation Summary: How to Configure OCSP Stapling for IPv6 Servers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OCSP (Online Certificate Status Protocol) stapling
- TLS / SSL
- IPv6
- Nginx (ssl_stapling, ssl_stapling_verify, resolver, ssl_trusted_certificate)
- Apache HTTP Server (mod_ssl: SSLUseStapling, SSLStaplingCache, SSLStaplingResponseMaxAge)
- Let's Encrypt certificates
- OpenSSL (`s_client -status`, `ocsp`, `x509`)
- SSL Labs API (v3)

## Sources Consulted
- Nginx HTTP SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTP core module (`listen` directive): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Apache mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Let's Encrypt "Transition to ISRG's `lencr.org` domain" announcement: https://community.letsencrypt.org/t/transition-to-isrgs-lencr-org-domain/199087
- Let's Encrypt "Ending OCSP" announcement: https://letsencrypt.org/2024/12/05/ending-ocsp/
- SSL Labs API v3 documentation: https://github.com/ssllabs/ssllabs-scan/blob/master/ssllabs-api-docs-v3.md
- RFC 6066 (TLS Extensions, Section 8 Certificate Status Request)

## Issues Found

1. **Non-existent Nginx directive in troubleshooting table.** The original "Fix" for "OCSP response expired" referenced `ssl_stapling_verify_depth`, which is not a real Nginx directive. The HTTP SSL module exposes only `ssl_stapling`, `ssl_stapling_file`, `ssl_stapling_responder`, and `ssl_stapling_verify` (the latter is boolean, no depth variant). Replaced the row with an accurate cause/fix: ensure outbound reachability to the responder, or pre-fetch and load with `ssl_stapling_file`.

2. **Incorrect Let's Encrypt OCSP responder domain.** The post used `r3.o.letsencrypt.org` in two places. Let's Encrypt's OCSP responders live under the ISRG-owned short domain `lencr.org` (e.g., `r3.o.lencr.org`). Updated both occurrences (the example certificate output and the `curl -6` / `openssl ocsp` reachability tests).

3. **Deprecated `http2` parameter on `listen`.** The Nginx `listen ... http2` parameter was deprecated in Nginx 1.25.1 (July 2023) in favor of the standalone `http2 on;` directive in the server block. Replaced the two `listen ... ssl http2` lines with `listen ... ssl;` and added `http2 on;` to use the current, non-deprecated syntax.

## Review Notes

- **Let's Encrypt OCSP is being retired.** Per Let's Encrypt's December 5, 2024 announcement, OCSP URLs were removed from newly issued certificates starting May 7, 2025, and the OCSP responders are scheduled for shutdown on August 6, 2025. By the post's publish date (2026-03-20), Let's Encrypt certificates rely on CRLs rather than OCSP. The tutorial's configuration is still accurate for CAs that publish OCSP (e.g., Sectigo, DigiCert, GoDaddy), but readers using Let's Encrypt should be aware that stapling is no longer applicable to LE-issued certs. This is a content-currency caveat rather than a technical error in the configuration itself.
- `SSLCertificateChainFile` (used in the Apache example) has been deprecated since Apache 2.4.8 in favor of bundling the chain into `SSLCertificateFile`. It still works and produces correct behavior, so left as-is.
- The Nginx `resolver` directive accepts IPv6 addresses both with and without brackets when no port is specified; the bracketed form shown in the post is valid.
- `ssl_trusted_certificate` correctly points at `chain.pem` (the issuing intermediate) rather than `fullchain.pem` — this is what Nginx uses to verify the OCSP responder's signature, so the example is right even though the adjacent comment about `fullchain.pem` is slightly tangential.
- The SSL Labs `jq` filter `.endpoints[].details.ocspStapling` correctly matches the v3 API schema.
