# Validation Summary: How to Fix Mixed Content Warnings When Migrating from HTTP to HTTPS

## Status
validated

## Post Type
Guide

## Technologies Covered
- HTTPS
- Mixed content
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- Nginx
- Apache HTTP Server
- WordPress / WP-CLI
- curl
- grep
- sed

## Sources Consulted
- MDN: Mixed content https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content
- MDN: CSP `upgrade-insecure-requests` https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests
- W3C: Upgrade Insecure Requests https://www.w3.org/TR/upgrade-insecure-requests/
- MDN: `Strict-Transport-Security` https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- Nginx: `ngx_http_headers_module` https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx: `ngx_http_rewrite_module` https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Apache HTTP Server: `mod_alias` https://httpd.apache.org/docs/2.4/en/mod/mod_alias.html
- Apache HTTP Server: `ServerAlias` directive https://httpd.apache.org/docs/current/en/mod/core.html#serveralias
- WordPress Developer Resources: Migrating WordPress https://developer.wordpress.org/advanced-administration/upgrade/migrating/
- WP-CLI: `wp search-replace` https://developer.wordpress.org/cli/commands/search-replace/
- WP-CLI: `wp option update` https://developer.wordpress.org/cli/commands/option/update/
- Local CLI help: `curl --help`, `grep --help`, `sed --help`

## Issues Found
- The post described mixed content using the older active/passive framing and said passive content is usually warned but loaded. I updated this to reflect current browser behavior: blockable content is blocked, while many formerly passive types are now treated as upgradable and are auto-upgraded to HTTPS when possible.
- The browser-console scan treated any `href="http:..."` as mixed content and logged `el.src` / `el.href`, which can produce false positives and hide the literal attribute value. I narrowed the selector to common mixed-content resource elements and switched the logging to `getAttribute(...)`.
- The CSP explanation overstated what `upgrade-insecure-requests` does. I corrected it to explain that the browser rewrites insecure URLs to HTTPS before the request is made, but requests still fail if the target does not actually support HTTPS.
- The WordPress SQL `REPLACE()` example was unsafe because blanket SQL replacements can corrupt serialized data in WordPress tables. I replaced it with `wp option update` for `home` and `siteurl`, plus `wp search-replace`, which officially handles serialized data safely.
- The HSTS section conflated standard HSTS with HSTS preload. I changed the default example to standard HSTS, renamed the section accordingly, and added a short caveat that `preload` should only be added when the domain is actually ready for preload submission.
- I made minor command/config fixes while preserving the article’s structure: removed `curl -k` from the examples, tightened the `grep` example syntax, and added `ServerAlias www.example.com` to the Apache virtual host example.

## Review Notes
- The `curl` and in-browser snippets are still heuristic checks. They help find obvious issues, but they will not catch every JS-generated request or every insecure URL embedded inside external CSS files.
- The post is technically relevant and valid after the corrections above.
