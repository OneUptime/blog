# Validation Summary: How to Configure Apache mod_proxy for Reverse Proxying on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Apache packaging helpers
- Apache HTTP Server 2.4
- mod_proxy and mod_proxy_http
- mod_proxy_balancer and load-balancing methods
- mod_proxy_wstunnel and WebSocket proxying
- mod_headers
- mod_ssl
- mod_cache and mod_cache_disk
- systemd service management

## Sources Consulted
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy.html
- Apache HTTP Server 2.4 mod_proxy_balancer documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html
- Apache HTTP Server 2.4 mod_proxy_wstunnel documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 mod_cache documentation: https://httpd.apache.org/docs/2.4/mod/mod_cache.html
- Apache HTTP Server 2.4 configuration file syntax documentation: https://httpd.apache.org/docs/2.4/configuring.html
- Apache HTTP Server 2.4 mod_unique_id documentation: https://httpd.apache.org/docs/2.4/mod/mod_unique_id.html
- Ubuntu a2enmod manpage: https://manpages.ubuntu.com/manpages/jammy/man8/a2enmod.8.html
- Ubuntu a2ensite manpage: https://manpages.ubuntu.com/manpages/jammy/man8/a2ensite.8.html

## Issues Found
- The Let's Encrypt SSL example used `cert.pem` plus `SSLCertificateChainFile`. Apache 2.4.8 and later treats `SSLCertificateChainFile` as obsolete when the chain is included in `SSLCertificateFile`, so the example now uses `fullchain.pem` and removes the obsolete chain directive.
- The `ProxyBadHeader Ignore` comment incorrectly described buffering behavior. It now describes the directive's actual purpose: handling malformed backend response headers.
- The `ProxyPreserveHost On` comment incorrectly called the directive required for preventing header injection. It now states that the directive passes the original Host header to the backend.
- The `UNIQUE_ID` request header example depended on `mod_unique_id`, but the module was not enabled. Added `sudo a2enmod unique_id`.
- Several Apache configuration lines used inline `#` comments after directives. Apache configuration comments cannot be placed on the same line as directives, so those comments were moved to their own lines.
- The WebSocket explanation said `proxy_wstunnel` is required. Apache 2.4.47 and later can also handle protocol upgrades through `mod_proxy_http`, so the wording now reflects current Apache behavior.
- The header example attempted to unset Apache's own `Server` header with `Header always unset Server`. The post now points readers to `ServerTokens` for limiting Apache's Server header and keeps `Header unset X-Powered-By` for backend-provided headers.
- The timeout example had two matching `ProxyPass /` directives, causing the later `retry=0` mapping to be shadowed by the earlier mapping. The example now has a single `ProxyPass` with `retry=0`.
- The caching example claimed `CacheIgnoreHeaders Authorization` prevents caching authenticated requests. `CacheIgnoreHeaders` controls which response headers are stored in cached responses, so the example now uses `CacheIgnoreHeaders Set-Cookie` with an accurate comment.

## Review Notes
The examples are suitable as general Apache 2.4 reverse-proxy patterns on Ubuntu. Future improvements could mention that `ProxyAddHeaders` is enabled by default for HTTP proxying and that production CORS, cookie, and authorization header handling should be tailored to the application.
