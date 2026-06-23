# Validation Summary: How to Redirect non-www to www (and vice versa) in Nginx

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Nginx server blocks, redirects, SSL/TLS, HTTP/2, reverse proxying, and `map`
- Let's Encrypt certificates
- Certbot CLI
- DNS A and CNAME records
- HTTP 301 redirects and canonical URLs
- curl redirect testing

## Sources Consulted
- Nginx `ngx_http_rewrite_module` documentation for `return` and `if`: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx `ngx_http_core_module` documentation for `listen`: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `ngx_http_v2_module` documentation for `http2 on;`: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Certbot user guide for `certonly`, renewal, `--dry-run`, and hooks: https://eff-certbot.readthedocs.io/en/stable/using.html
- Let's Encrypt FAQ and glossary for SAN and wildcard certificate behavior: https://letsencrypt.org/docs/faq/ and https://letsencrypt.org/docs/glossary/
- Google Search Central canonical URL guidance and duplicate content guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls and https://developers.google.com/search/blog/2008/09/demystifying-duplicate-content-penalty

## Issues Found
- Replaced deprecated Nginx `listen 443 ssl http2;` usage with current `listen 443 ssl;` plus `http2 on;`, because current Nginx documentation defines `http2` as a separate directive and marks the `listen` parameter as deprecated.
- Changed the SEO diagram label from "SEO penalties" to "SEO signal dilution" to avoid implying that ordinary duplicate URL variants automatically cause a search penalty. Google documents canonicalization as a way to consolidate duplicate URLs and signals.
- Corrected the shared certificate wording from "or use a wildcard" to "or a wildcard certificate plus apex-domain coverage" because a wildcard such as `*.example.com` covers `www.example.com` but not `example.com`.
- Added a note in the multi-domain Nginx example that the configured certificate must cover all names listed in `server_name`.
- Changed the sample Certbot renewal cron hook from `--post-hook` to `--deploy-hook` so Nginx reloads after a successful certificate deployment rather than after every renewal attempt.

## Review Notes
The examples are otherwise syntactically consistent with Nginx redirect patterns. The local environment did not have `nginx` or `certbot` installed, so validation used official documentation rather than local `nginx -t` or CLI help output.
