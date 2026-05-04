# Validation Summary: How to Configure HSTS (HTTP Strict Transport Security) Headers

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- HSTS (HTTP Strict Transport Security) — RFC 6797
- Nginx (`add_header` directive, `always` parameter)
- Apache HTTP Server (`mod_headers`, `Header always set` directive)
- curl (verification commands)
- HSTS Preload List (hstspreload.org)

## Sources Consulted
- RFC 6797 — HTTP Strict Transport Security (HSTS): https://datatracker.ietf.org/doc/html/rfc6797
- MDN Web Docs — Strict-Transport-Security header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
- Nginx documentation — ngx_http_headers_module (`add_header`): https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Apache HTTP Server documentation — mod_headers: https://httpd.apache.org/docs/current/mod/mod_headers.html
- HSTS Preload List submission site: https://hstspreload.org/
- HSTS Preload API (Chromium project): https://hstspreload.org/api/v2/status

## Issues Found
No technical issues found.

All technical content was verified against authoritative sources:
- The HSTS header syntax (`max-age=<seconds>; includeSubDomains; preload`) matches RFC 6797 and the preload list extension.
- The Nginx `add_header ... always` syntax is correct — by default `add_header` only applies to specific response codes; `always` makes it apply to all responses.
- The Apache `Header always set Strict-Transport-Security ...` syntax is the documented form for `mod_headers`, and `a2enmod headers` is the correct enable command on Debian/Ubuntu.
- The preload list requirements (valid cert, HTTP→HTTPS redirect, max-age ≥ 31536000, includeSubDomains, preload directive, all subdomains HTTPS) match the official hstspreload.org criteria.
- The progressive max-age values (300, 86400, 604800, 31536000) correctly correspond to 5 min, 1 day, 1 week, 1 year.
- The `https://hstspreload.org/api/v2/status?domain=<domain>` API endpoint is the correct path used by the official preload submission site.
- Setting `max-age=0` to revoke HSTS is correct behavior per RFC 6797 §6.1.1 (it instructs the user agent to delete the existing HSTS policy for the host).
- All curl commands and flags (`-sI`, `-v`, `-A2`) are correct and behave as described.

## Review Notes
- The note about `max-age=0` revocation is accurate but worth emphasizing in practice: clients that don't revisit the site to receive the new `max-age=0` header will continue enforcing HSTS until their cached policy expires. The post does mention this.
- Removal from the preload list is a separate, slower process (months to propagate as users update browsers) — the post correctly mentions this.
- Some browsers (Firefox, Chrome) have HSTS supercookie behaviors and additional preload lists baked into the browser binary; users in regulated environments may want to reference browser-specific HSTS handling, but this is beyond the scope of a configuration tutorial.
- The Nginx config example uses a single `server` block listening on 443; in practice, deployments should also have a port-80 server block performing a 301 redirect to HTTPS to satisfy preload requirement #2 — the post mentions the requirement but does not show the redirect block. This is a minor omission rather than an error.
