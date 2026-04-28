# Validation Summary: How to Set Up a Caching Reverse Proxy with Nginx for HTTP Content

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Nginx (open-source) `ngx_http_proxy_module`
- Nginx caching directives: `proxy_cache_path`, `proxy_cache`, `proxy_cache_key`, `proxy_cache_valid`, `proxy_cache_use_stale`, `proxy_cache_bypass`, `proxy_no_cache`, `proxy_cache_lock`, `proxy_cache_lock_timeout`
- Nginx variables: `$upstream_cache_status`, `$http_authorization`, `$cookie_session`, `$scheme`, `$request_method`, `$host`, `$request_uri`
- Bash CLI / shell utilities (`awk`, `sort`, `uniq`, `rm`, `nginx -s reload`)
- HTTP caching semantics

## Sources Consulted
- Official Nginx documentation for `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx variables documentation (embedded in `ngx_http_upstream_module` and `ngx_http_proxy_module` docs)
- Nginx admin guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Nginx CLI / control signals: https://nginx.org/en/docs/control.html

## Issues Found
- **Incomplete comment for `$upstream_cache_status` values.** The inline comment in the proxy server block listed only `(HIT, MISS, BYPASS, EXPIRED)` and read as if exhaustive. Per the official nginx docs, `$upstream_cache_status` can take seven values: `MISS`, `BYPASS`, `EXPIRED`, `STALE`, `UPDATING`, `REVALIDATED`, `HIT`. Updated the comment to list all seven.

No other technical errors were found. All directive names, parameter syntax, and semantic explanations check out against the official Nginx documentation:
- `proxy_cache_path` parameters (`levels`, `keys_zone`, `inactive`, `max_size`) are valid.
- `proxy_cache_valid` syntax for multiple status codes is correct.
- `proxy_cache_use_stale` parameters (`error`, `timeout`, `updating`, `http_500`, `http_502`, `http_503`, `http_504`) are all valid.
- `proxy_cache_bypass` / `proxy_no_cache` semantics (variable non-empty and not `"0"` triggers bypass) are correctly used.
- `proxy_cache_lock` / `proxy_cache_lock_timeout` prevent cache stampedes by serializing concurrent requests for an uncached resource — accurate.
- The claim that Nginx open-source lacks a built-in cache purge module is essentially correct (`proxy_cache_purge` is a Plus feature; the third-party `ngx_cache_purge` exists but is not bundled).
- Upstream `Cache-Control` / `Expires` / `X-Accel-Expires` taking precedence over `proxy_cache_valid` is documented behavior.

## Review Notes
- The section titled "Forcing Cache Revalidation" is slightly mislabeled — its content is really about cache locking / stampede prevention, not revalidation (`proxy_cache_revalidate` is a separate directive). Content itself is accurate, so left untouched per scope.
- The `rm -rf /var/cache/nginx/*` workaround can leave the in-memory `keys_zone` out of sync with disk until inactive expiry. The post correctly frames this as a workaround. A safer approach is `nginx -s stop`, delete, then start, but the shown reload sequence is the common community practice.
- After `proxy_cache_lock_timeout` elapses, the waiting request is forwarded upstream but its response is **not** stored in cache. Worth knowing for production tuning, but the post's high-level description is not wrong.
- The custom log format in the monitoring section does not quote `$request` (which contains spaces). The `awk '{print $NF}'` trick still works since `$upstream_cache_status` is the last token, but the format is non-standard compared to the conventional `combined` format that quotes `$request`. Not a technical error, just a stylistic note.
- `add_header` only applies by default to a subset of response codes (200, 201, 204, 206, 301, 302, 303, 304, 307, 308). For visibility on error responses, use the `always` parameter. Not strictly required for the tutorial.
