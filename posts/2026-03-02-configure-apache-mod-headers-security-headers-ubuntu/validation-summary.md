# Validation Summary: How to Configure Apache mod_headers for Security Headers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache mod_headers
- Apache mod_rewrite
- HTTP security headers
- Content-Security-Policy
- HSTS
- Referrer-Policy
- Permissions-Policy
- CORS response headers

## Sources Consulted
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 mod_rewrite documentation: https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 core ServerTokens documentation: https://httpd.apache.org/docs/current/en/mod/core.html#servertokens
- Apache HTTP Server configuration file documentation: https://httpd.apache.org/docs/trunk/configuring.html
- MDN Strict-Transport-Security header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- MDN X-Frame-Options header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN X-Content-Type-Options header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options
- MDN Referrer-Policy header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy
- MDN Permissions-Policy header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- MDN X-XSS-Protection header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN Content-Security-Policy frame-ancestors documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors

## Issues Found
- `ServerTokens Prod` was shown inside a `<VirtualHost>` block, but Apache documents `ServerTokens` as server-config context only and not configurable per virtual host. Moved it outside the virtual host block.
- The complete configuration tried to remove the Apache `Server` response header with `Header always unset Server`. Apache documents `ServerTokens` as the mechanism controlling the `Server` header value, so the example now says "reduce" server-identifying headers and no longer claims mod_headers can remove the Apache core `Server` header.
- `Header always unset X-Powered-By` only targets Apache's `always` response header table. Added `Header unset X-Powered-By` as well, so both normal and always response header tables are covered.
- The HSTS preload comment said the `preload` directive "submits" to preload lists. Updated it to say the directive is required for preload list eligibility; actual preload submission is a separate process.
- The `X-XSS-Protection` section said setting the header to safe values "does not hurt" and "does not cause harm." MDN documents this header as deprecated and warns it can create vulnerabilities in some cases, so the text now recommends CSP and frames `1; mode=block` as a legacy-browser choice only.
- The complete virtual host example uses `SSLEngine` and `RewriteEngine`, but the enablement commands only enabled `headers`. Added `sudo a2enmod ssl rewrite` before enabling the site so the shown directives are available on a default Ubuntu Apache install.

## Review Notes
- The remaining Apache `Header` directives, CSP directives, HSTS syntax, Referrer-Policy value, Permissions-Policy examples, X-Frame-Options examples, and curl verification commands are technically plausible for a modern Ubuntu Apache setup.
- The post correctly warns that CSP must be adjusted for each application. The sample CSP is intentionally strict and may break applications using external scripts, inline scripts, fonts, or API origins until those sources are explicitly allowed.
