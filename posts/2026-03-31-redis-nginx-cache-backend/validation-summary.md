# Validation Summary: How to Use Redis with NGINX as Cache Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- NGINX (ngx_http_redis module)
- OpenResty (lua-resty-redis)
- Python (redis-py client)
- Lua

## Sources Consulted
- ngx_http_redis module GitHub repository (https://github.com/osokin/ngx_http_redis) — verified directives (`redis_pass`, `$redis_key`), 404 behavior on cache miss, and GET-only capability
- lua-resty-redis official documentation (https://github.com/openresty/lua-resty-redis) — verified `set_timeouts` vs deprecated `set_timeout`, `set_keepalive` parameters, and `ngx.null` return for missing keys
- OpenResty `ngx.exec` documentation — verified that response headers set before `ngx.exec` are discarded during internal redirects
- NGINX upstream and proxy_pass documentation — verified `keepalive` directive and proxy behavior
- redis-py documentation — verified `redis.Redis()` constructor, `set()` with `ex` parameter, `delete()`, and `keys()` methods

## Issues Found

1. **Incorrect installation instruction for ngx_http_redis**: The post originally stated `apt-get install nginx-extras` would provide the ngx_http_redis module. The Ubuntu `nginx-extras` package does not include this module. Changed to show compiling from source with the correct `--add-module=/path/to/ngx_http_redis` flag pointing to the module's GitHub repository.

2. **Deprecated `set_timeout` API**: The Lua code used `red:set_timeout(500)` which has been deprecated since lua-resty-redis v0.28. Changed to `red:set_timeouts(500, 500, 500)` which explicitly sets connect, send, and read timeouts.

3. **Unused `cjson` import**: The line `local cjson = require "cjson"` was imported but never used in the Lua code. Removed to avoid confusion.

4. **`X-Cache: MISS` header lost on internal redirect**: The Lua code set `ngx.header["X-Cache"] = "MISS"` before calling `ngx.exec("@app_fallback")`. Headers set before `ngx.exec` are discarded because the internal redirect restarts request processing, and `proxy_pass` in the fallback location overwrites `headers_out` with upstream response headers. Moved the `X-Cache: MISS` header to the `@app_fallback` location using `add_header` directive, which correctly adds the header to the proxied response.

## Review Notes
- The `r.keys("nginx:*")` call in the cache invalidation section works but is known to block Redis on large datasets. In production, `SCAN` with a match pattern is preferred. This is a best-practice consideration rather than a correctness error.
- The `ngx_http_redis` module (Option 1) uses `$uri` as the cache key, while the Python population code uses a `nginx:` prefix matching the OpenResty approach (Option 2). This is correct since the two options are independent, but readers using Option 1 would need to adjust their key format. The post already notes this in Key Considerations.
