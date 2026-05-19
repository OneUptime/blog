# Validation Summary: How to Set Up a CDN Pull Zone with Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Nginx (open source) — caching reverse proxy
- Ubuntu (system platform, `nginx-extras` package)
- HTTP caching semantics (Cache-Control, ETag, Vary, expires)
- TLS / Let's Encrypt certificates
- gzip compression (and a mention of Brotli via `ngx_brotli`)
- PHP-FPM (PHP 8.3 socket path on origin)
- MD5 cache key hashing / on-disk cache layout

## Sources Consulted
- Nginx `ngx_http_proxy_module` docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
  - `proxy_cache_path`, `proxy_cache_key`, `proxy_cache_methods`, `proxy_cache_lock`, `proxy_cache_revalidate`, `proxy_cache_background_update`, `proxy_cache_use_stale`, `proxy_cache_valid`, `proxy_cache_bypass`, `proxy_no_cache`, `$upstream_cache_status`, `$proxy_host`
- Nginx `ngx_http_core_module` docs (etag, $host, $scheme, $request_uri): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_upstream_module` (keepalive): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_gzip_module` docs: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- `ngx_cache_purge` module (bundled in Ubuntu `nginx-extras`): https://github.com/FRiCKLE/ngx_cache_purge
- `ngx_brotli` module: https://github.com/google/ngx_brotli

## Issues Found

1. **Reversed description of the `levels=1:2` on-disk cache layout.** The post said the file is stored "based on the last 2 characters and next 1 character of the hash." Per the official nginx docs, with `levels=1:2` a hash like `b7f54b2df7773722d382f4809d65029c` is stored at `<cache>/c/29/<full_hash>` — i.e., the **last 1** character of the hash, then the **2 characters before that**. Fixed by replacing the comment with the correct description.

2. **Cache key example was inconsistent with `proxy_cache_key`.** The original config used `proxy_cache_key "$scheme$proxy_host$request_uri"`, but with `proxy_pass http://origin_server;` pointing at a named upstream, `$proxy_host` resolves to the upstream block name (`origin_server`), not the client-facing hostname. The manual-purge example, however, computed an MD5 over `httpscache.example.com/path/to/file.css` — which would never match what nginx actually stores on disk. Additionally, the example used `cache.example.com` while the `server_name` in the config is `cdn.example.com`. Fixed by switching `proxy_cache_key` to use `$host` (the client-facing hostname) and updating the example to `httpscdn.example.com/...` so the documented purge procedure actually works.

3. **Claim that the compression block enables "gzip and Brotli" while only showing gzip directives.** Brotli is not built into upstream nginx — it requires the third-party `ngx_brotli` module. Reworded the section so it accurately describes what the snippet does and notes how to obtain Brotli on Ubuntu.

## Review Notes
- `proxy_cache_methods GET HEAD;` is the nginx default, so the line is redundant but not incorrect; left in for explicit documentation value.
- `etag on;` is the nginx default in `ngx_http_core_module` (since 1.3.3); harmless to set explicitly.
- The static-file `location` block both calls `expires 7d;` and `add_header Cache-Control "..."`. Because `expires` also emits its own `Cache-Control`, the response can end up with two `Cache-Control` headers. This is a common nginx pattern and not strictly wrong, but readers who care about a single canonical header should pick one mechanism.
- `awk '{print $NF}' /var/log/nginx/cdn.access.log` will print the trailing `upstream_time:N.NNN` field rather than the cache status, so it won't bucket cache hit/miss counts on its own. The preceding `tail | grep -oP 'cache:\K\S+' | sort | uniq -c` one-liner does the right thing; the awk one is just less useful than implied. Not technically wrong, so left as is.
- The PHP-FPM socket path `/run/php/php8.3-fpm.sock` is correct for Ubuntu 24.04 (default PHP 8.3). On older Ubuntu releases the version in the path will differ.
- `proxy_cache_key` was changed from the documented nginx default (`$scheme$proxy_host$request_uri`) to `$scheme$host$request_uri` to keep the rest of the post (including manual purge) internally consistent and to avoid the named-upstream pitfall.
