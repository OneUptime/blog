# Validation Summary: How to Configure HTTPS with ECDSA Certificates on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- HTTPS / TLS
- ECDSA and RSA certificates
- OpenSSL
- Certbot / Let's Encrypt
- Nginx
- Apache HTTP Server mod_ssl

## Sources Consulted
- OpenSSL `req` manual: https://docs.openssl.org/3.2/man1/openssl-req/
- OpenSSL `ecparam` manual: https://docs.openssl.org/3.2/man1/openssl-ecparam/
- OpenSSL `s_client` manual: https://docs.openssl.org/3.2/man1/openssl-s_client/
- Certbot User Guide, RSA and ECDSA keys: https://eff-certbot.readthedocs.io/en/stable/using.html#rsa-and-ecdsa-keys
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- NGINX `http2` directive documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- NIST SP 800-57 Part 1 Rev. 5, key strength comparison: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf
- Let's Encrypt Chains of Trust: https://letsencrypt.org/certificates/

## Issues Found
- Updated the RSA 2048 description from "increasingly obsolete" to "minimum widely accepted baseline." RSA 2048 still maps to roughly 112-bit security strength in NIST guidance and remains used by active public CA intermediates, so calling it obsolete was too strong.
- Replaced deprecated Nginx `listen 443 ssl http2;` syntax with `listen 443 ssl;` plus `http2 on;`. Nginx documents the `listen ... http2` parameter as deprecated in favor of the separate `http2` directive.
- Clarified that the custom `ssl_ciphers` list applies to TLS 1.2 cipher suites. TLS 1.3 cipher suites do not encode certificate authentication type in names such as `ECDHE-ECDSA`.
- Reworded the Nginx ECDSA-only cipher comment. ECDHE-RSA TLS 1.2 cipher suites are not usable with an ECDSA-only certificate; saying they "fail silently" was imprecise.
- Added `-servername example.com` to OpenSSL verification and timing commands so SNI-enabled hosts return the intended certificate instead of a default virtual host certificate.
- Clarified verification comments to check the leaf certificate public key rather than the entire certificate chain, because intermediates and roots can use different key algorithms from the end-entity certificate.

## Review Notes
- OpenSSL key, CSR, SAN CSR, and self-signed certificate examples were executed locally with OpenSSL 3.0.13 and produced the expected SAN output.
- `nginx`, `apache2ctl`, and `certbot` were not installed in the local workspace, so those examples were checked against official documentation rather than local command output.
