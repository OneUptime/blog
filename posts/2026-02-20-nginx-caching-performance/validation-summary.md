# Validation Summary: How to Set Up Nginx Caching for Better Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- Nginx proxy caching
- HTTP cache control
- curl
- awk / Unix shell commands

## Sources Consulted
- Nginx ngx_http_proxy_module official documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX Content Caching admin guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Nginx ngx_http_rewrite_module official documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#if
- Local `curl --help all` output for `-I` / `--head` and `-H` / `--header`
- Local `awk --version` and `du --help` output for monitoring command syntax

## Issues Found
- The cache bypass section described a custom `X-Purge-Cache` header as purging or refreshing the cache, but the configuration only used `proxy_cache_bypass` and `proxy_no_cache`. That bypasses cache lookup and prevents storing the response; it does not purge an existing cache entry. Updated the section title, comments, variable name, and curl example to describe cache bypass accurately.
- The `proxy_cache_methods GET HEAD` comment said it bypassed cache for non-GET requests. The directive specifies which request methods are cacheable, with GET and HEAD already the default cacheable methods. Updated the comment to say it caches only GET and HEAD requests.
- The microcaching explanation claimed that at 1000 requests per second only one request hits the backend and 999 are served from cache. That is only approximately true for the same cache key after the cache is warm, and it depends on expiration, locking, and request distribution. Reworded the claim to be accurate.
- The access log monitoring command assumed cache status was the final access-log field, but the post had not configured a log format that guarantees that. Updated the comment to state that the command applies when the log format writes cache status as the final field.

## Review Notes
The examples rely on placeholder upstreams such as `app_backend` and `api_backend`; a production configuration must define those upstream groups or replace them with concrete backend URLs. The `proxy_cache_purge` directive exists in Nginx documentation, but it is an NGINX Plus feature in the official docs, so the post now avoids implying purge behavior in the open-source-style bypass example.
