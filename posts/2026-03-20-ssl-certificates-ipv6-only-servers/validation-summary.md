# Validation Summary: How to Handle SSL Certificates for IPv6-Only Servers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SSL/TLS certificates
- IPv6 and DNS AAAA records
- ACME and Let's Encrypt
- Certbot and certbot-dns-cloudflare
- OpenSSL X.509 certificates and Subject Alternative Names
- NGINX TLS configuration
- curl and openssl s_client certificate testing

## Sources Consulted
- Let's Encrypt IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- Let's Encrypt Challenge Types: https://letsencrypt.org/ca/docs/challenge-types/
- Let's Encrypt 6-day and IP Address Certificates GA announcement: https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability.html
- Let's Encrypt Certbot IP address certificate announcement: https://letsencrypt.org/2026/03/11/shorter-certs-certbot
- Certbot user guide and renewal documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot command reference: https://eff-certbot.readthedocs.io/en/stable/man/certbot.html
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/
- OpenSSL x509v3_config documentation: https://docs.openssl.org/3.6/man5/x509v3_config/
- OpenSSL req, x509, and s_client documentation: https://docs.openssl.org/3.6/man1/openssl-req/, https://docs.openssl.org/3.6/man1/openssl-x509/, https://docs.openssl.org/3.6/man1/openssl-s_client/
- NGINX listen directive and HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen, https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2
- RFC 8738, ACME IP Identifier Validation Extension: https://www.rfc-editor.org/rfc/rfc8738
- RFC 3596, DNS Extensions to Support IPv6: https://www.rfc-editor.org/rfc/rfc3596
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- Updated the opening explanation because Let's Encrypt now supports publicly trusted IP address certificates, including IPv6, under its short-lived certificate profile.
- Clarified that DNS-01 is useful for unreachable challenge ports and wildcard certificates, but it is not used to validate bare IP address identifiers.
- Updated the IP SAN section to state that Let's Encrypt IP address certificates require short-lived certificates and HTTP-01 or TLS-ALPN-01 validation.
- Made the OpenSSL internal CA example more explicit by adding CA basic constraints, CA key usage, end-entity basic constraints, key usage, and serverAuth extended key usage.
- Replaced the SAN verification command with `openssl x509 -ext subjectAltName` and adjusted the expected IPv6 output to match OpenSSL 3's expanded address format.
- Updated the NGINX HTTP/2 example from the deprecated `listen ... http2` parameter to the current `http2 on;` directive.
- Changed the Certbot renewal hook from `--post-hook` to `--deploy-hook` so NGINX reloads after successful renewal.
- Fixed the expiry monitoring script, which incorrectly bracketed a DNS hostname in the `openssl s_client -connect` target. The script now forces IPv6 with `-6` and uses `HOST:PORT` for the domain.

## Review Notes
- The updated NGINX HTTP/2 syntax requires NGINX 1.25.1 or newer; older packaged NGINX releases may still require the legacy `listen ... http2` parameter.
- Certbot usually stores DNS plugin renewal options when the certificate is first issued, so repeating the Cloudflare plugin flags during `certbot renew` is often redundant but still consistent with the example's single-certificate workflow.
