# How to Use Redis with NGINX as Cache Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Nginx, Cache, Reverse Proxy, Performance

Description: Learn how to use Redis as a cache backend for NGINX using the ngx_http_redis module or OpenResty to serve cached responses directly from Redis.

---

NGINX can serve responses from Redis without proxying to your application server, dramatically reducing latency for cacheable content. This is done via the `ngx_http_redis` module for simple key lookups or via OpenResty with Lua for full cache-aside logic.

## Option 1: ngx_http_redis Module

The `ngx_http_redis` module allows NGINX to GET a key from Redis and return its value as the HTTP response body.

```bash
# Compile NGINX from source with the ngx_http_redis module
# Download from https://github.com/osokin/ngx_http_redis
./configure --add-module=/path/to/ngx_http_redis
make && make install
```

```nginx
# nginx.conf
upstream redis_backend {
    server redis:6379;
    keepalive 32;
}

server {
    listen 80;

    location /cached/ {
        set $redis_key $uri;   # Use the URL path as the cache key
        redis_pass redis_backend;
        default_type application/json;

        error_page 404 = @fallback;
    }

    location @fallback {
        # Cache miss: proxy to application
        proxy_pass http://app-backend:3000;
    }
}
```

## Option 2: OpenResty with lua-resty-redis

OpenResty gives you full Lua scripting power to implement cache-aside directly in NGINX.

```bash
# Install OpenResty
apt-get install openresty
```

```nginx
# openresty nginx.conf
http {
    lua_shared_dict cache_locks 1m;

    server {
        listen 80;

        location /api/ {
            content_by_lua_block {
                local redis = require "resty.redis"

                local red = redis:new()
                red:set_timeouts(500, 500, 500)  -- connect, send, read timeouts in ms

                local ok, err = red:connect("redis", 6379)
                if not ok then
                    ngx.log(ngx.ERR, "Redis connect failed: ", err)
                    ngx.exec("@app_fallback")
                    return
                end

                local cache_key = "nginx:" .. ngx.var.uri
                local val, err = red:get(cache_key)

                if val and val ~= ngx.null then
                    -- Cache hit
                    red:set_keepalive(10000, 50)
                    ngx.header["Content-Type"] = "application/json"
                    ngx.header["X-Cache"] = "HIT"
                    ngx.say(val)
                    return
                end

                -- Cache miss: proxy to app
                red:set_keepalive(10000, 50)
                ngx.exec("@app_fallback")
            }
        }

        location @app_fallback {
            proxy_pass http://app-backend:3000;
            add_header X-Cache "MISS";
        }
    }
}
```

## Populating the Cache from Your Application

Your application writes to Redis with the same key format NGINX uses.

```python
import redis
import json

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def cache_response(uri: str, response_body: dict, ttl: int = 300):
    cache_key = f"nginx:{uri}"
    r.set(cache_key, json.dumps(response_body), ex=ttl)

# Called after your app generates the response
cache_response("/api/products/p1", {"id": "p1", "name": "Widget", "price": 9.99})
```

## Cache Invalidation

```python
def invalidate_nginx_cache(uri: str):
    cache_key = f"nginx:{uri}"
    deleted = r.delete(cache_key)
    print(f"Invalidated {cache_key}: {deleted}")

def flush_all_nginx_cache():
    keys = r.keys("nginx:*")
    if keys:
        r.delete(*keys)
        print(f"Flushed {len(keys)} nginx cache entries")
```

## Testing Cache Behavior

```bash
# First request: cache miss
curl -v http://localhost/api/products/p1
# Response: X-Cache: MISS

# Second request: cache hit (if app populated Redis)
curl -v http://localhost/api/products/p1
# Response: X-Cache: HIT

# Check TTL of cached entry
redis-cli TTL "nginx:/api/products/p1"
```

## Key Considerations

```text
- ngx_http_redis: simple, fast, read-only (GET only)
- OpenResty + Lua: full cache-aside with conditional logic
- Both require NGINX to serve only pre-cached content; app writes the cache
- Always set TTLs to prevent stale data accumulation
- Key format must match between NGINX and your application
```

## Summary

Using Redis as an NGINX cache backend allows the web server to serve responses directly from Redis without contacting your application. The `ngx_http_redis` module handles simple GET lookups while OpenResty with Lua enables full cache-aside logic with fallback. Populate Redis from your application code using a consistent key schema, and implement invalidation on data changes to keep content fresh.

