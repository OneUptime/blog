# Validation Summary: How to Configure HTTPS/TLS Properly

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- HTTPS/TLS
- TLS certificates and Let's Encrypt
- Certbot
- Nginx TLS configuration
- Apache mod_ssl configuration
- Node.js HTTPS/TLS server configuration
- HTTP security headers
- OpenSSL, nmap, and testssl.sh TLS testing
- Python certificate monitoring

## Sources Consulted
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot Nginx installation instructions: https://certbot.eff.org/instructions?os=ubuntufocal&ws=nginx
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- MDN Expect-CT header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Expect-CT
- MDN mixed content guidance: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content
- HSTS preload submission requirements: https://hstspreload.org/
- Local OpenSSL `s_client -help` output for command flags

## Issues Found
- The Nginx example used `listen ... http2`, which is obsolete in current Nginx. Changed it to `listen ... ssl` plus `http2 on;` to match the current `ngx_http_v2_module` directive.
- Nginx OCSP stapling verification was enabled without configuring trusted issuer certificates. Added `ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;`, which Nginx requires for `ssl_stapling_verify`.
- Default HSTS examples included the `preload` directive. Removed `preload` from the default Nginx, Apache, Node.js, and HSTS examples because hstspreload.org says preload should be an explicit opt-in after all preload requirements are met.
- The Nginx security headers included `X-XSS-Protection: 1; mode=block`. Removed it because OWASP recommends not setting this deprecated header or explicitly disabling it.
- The Certificate Transparency section recommended an `Expect-CT` header as still useful for older browsers. Replaced it with a note that `Expect-CT` is deprecated and should not be set on new deployments.
- The mixed content example labeled protocol-relative URLs as good. Changed the example to use explicit HTTPS URLs, matching MDN guidance to use HTTPS or relative links.

## Review Notes
The remaining examples are broadly correct for a modern TLS baseline, but production deployments should still test against their exact Nginx, Apache, OpenSSL, Node.js, and client-support requirements. HSTS with `includeSubDomains` can break subdomains that are not HTTPS-ready, and HSTS preload should only be enabled after a deliberate rollout.
