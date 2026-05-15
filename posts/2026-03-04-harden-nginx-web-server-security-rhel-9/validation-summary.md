# Validation Summary: How to Harden Nginx Web Server Security on RHEL

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx HTTP server
- Nginx configuration directives
- HTTP security headers
- TLS configuration
- DNF package management

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx ngx_http_access_module documentation: https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Red Hat RHEL 9 DNF update documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_updating-rhel-9-content_managing-software-with-the-dnf-tool
- MDN X-XSS-Protection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN Strict-Transport-Security header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security

## Issues Found
- The post recommended `X-XSS-Protection: 1; mode=block` as "Enable XSS protection." This header is deprecated and not recommended for modern production use; MDN recommends Content Security Policy instead of XSS filtering and notes that XSS filtering can introduce vulnerabilities. Changed the snippet to disable the legacy filter with `X-XSS-Protection: 0` and point readers toward CSP for XSS mitigation.
- The post advised adding HSTS in an SSL `server` block after creating other headers in a shared snippet. Nginx does not merge `add_header` directives across levels; defining HSTS in a `server` block can stop inherited headers from the `http` level from being applied. Added a caveat to repeat the other `add_header` directives when HSTS is defined in a `server` block.
- The post used `dnf update -y nginx`. Red Hat's RHEL 9 documentation uses `dnf upgrade <package_name>` for updating a single package. Changed the command to `sudo dnf upgrade -y nginx`.

## Review Notes
The Nginx directives reviewed are valid in the documented contexts, including `server_tokens`, `add_header`, `client_max_body_size`, header buffer settings, TLS directives, `return 444`, `limit_req_zone`, `limit_req`, and access control directives. The HTTP method restriction is syntactically valid, but sites using CORS, WebDAV, APIs, or health checks may need to allow additional methods such as `OPTIONS`; readers should test method restrictions against their application behavior.
