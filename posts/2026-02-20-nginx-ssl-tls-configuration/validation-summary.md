# Validation Summary: How to Configure SSL/TLS in Nginx for Production

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Nginx HTTPS and TLS configuration
- TLS 1.2 and TLS 1.3
- HTTP/2 with Nginx
- HSTS
- OCSP stapling
- HTTP security headers
- Let's Encrypt and Certbot
- OpenSSL
- Nmap SSL/TLS testing
- Qualys SSL Labs

## Sources Consulted
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- Nmap ssl-enum-ciphers NSE documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- MDN X-XSS-Protection header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- HSTS preload submission guidance: https://hstspreload.org/
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/

## Issues Found
- The Nginx examples used `listen 443 ssl http2;`. Current Nginx documentation uses `listen 443 ssl;` with `http2 on;`, and the `listen ... http2` parameter is deprecated in newer Nginx releases. Updated all HTTPS server block examples accordingly.
- The TLS cipher comments implied `ssl_prefer_server_ciphers` and `ssl_ciphers` controlled all configured TLS versions. Nginx/OpenSSL use `ssl_ciphers` for pre-TLS 1.3 cipher selection, while TLS 1.3 cipher selection is handled separately by OpenSSL unless explicitly configured. Updated the comments to scope those directives to TLS 1.2.
- The security headers section described `X-XSS-Protection` as "legacy but still useful" and enabled `1; mode=block`. MDN marks this header deprecated and recommends CSP for XSS mitigation. Changed the example to disable deprecated browser XSS filters with `X-XSS-Protection: 0` and point readers toward Content-Security-Policy for XSS mitigation.
- The Diffie-Hellman section implied DH parameters were generally needed for the earlier configuration. Nginx uses `ssl_dhparam` for DHE ciphers, while the configured cipher list is ECDHE-only. Added a caveat that DH parameters are only needed if DHE cipher suites are enabled.
- The OCSP stapling test command omitted SNI. Added `-servername example.com` so OpenSSL requests the correct virtual host certificate.

## Review Notes
- The examples assume Nginx 1.25.1 or newer for the `http2 on;` directive. Older deployments may still require the legacy `listen ... http2` syntax.
- The HSTS preload example is technically valid for preload eligibility only when the whole domain and all subdomains are HTTPS-ready and the domain is submitted to the preload list.
- The Certbot package names shown are appropriate for Debian/Ubuntu-style systems, but Certbot's official current recommendation varies by operating system and installation method.
