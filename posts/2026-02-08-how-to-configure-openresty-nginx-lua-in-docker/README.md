# How to Configure OpenResty (Nginx + Lua) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, OpenResty, Nginx, Lua, Web Servers, API Gateway, DevOps

Description: Deploy OpenResty in Docker to extend Nginx with Lua scripting for custom API gateways, authentication, and dynamic routing

---

OpenResty bundles Nginx with LuaJIT and a collection of Lua libraries that let you run Lua code inside the Nginx request lifecycle. This turns Nginx from a static configuration-driven proxy into a programmable platform. You can write authentication logic, rate limiting, request transformation, and dynamic routing directly in Lua, all executing at the speed of compiled C code inside the Nginx event loop. Docker packages this entire stack cleanly.

## Why OpenResty?

Standard Nginx handles proxying and static files well, but its configuration language is limited. When you need logic beyond what `if` statements and `map` directives can express, you typically reach for a separate application. OpenResty lets you embed that logic directly in Nginx.

Real-world uses include API gateways (Kong is built on OpenResty), dynamic authentication, request/response transformation, real-time analytics collection, and edge computing at the CDN layer. Because Lua runs inside the Nginx worker process, there is no network hop to an external service, keeping latency extremely low.

## Quick Start

```bash
# Run OpenResty with a mounted configuration
docker run -d \
  --name openresty \
  -p 8080:8080 \
  -v $(pwd)/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf:ro \
  -v $(pwd)/lua:/usr/local/openresty/lua:ro \
  openresty/openresty:1.25.3.1-alpine
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.8"

services:
  openresty:
    image: openresty/openresty:1.25.3.1-alpine
    container_name: openresty
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "8443:8443"
    volumes:
      # Main Nginx configuration
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf:ro
      # Lua scripts
      - ./lua:/usr/local/openresty/lua:ro
      # Static content
      - ./html:/usr/local/openresty/nginx/html:ro
      # Logs
      - openresty_logs:/usr/local/openresty/nginx/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  openresty_logs:
```

## Basic Nginx + Lua Configuration

Start with a configuration that demonstrates Lua integration.

```nginx
# nginx.conf
worker_processes auto;
error_log /usr/local/openresty/nginx/logs/error.log info;

events {
    worker_connections 4096;
}

http {
    # Add the Lua package path
    lua_package_path "/usr/local/openresty/lua/?.lua;;";

    # Shared dictionary for rate limiting, caching, etc.
    lua_shared_dict rate_limit_store 10m;
    lua_shared_dict cache_store 50m;

    server {
        listen 8080;

        # Health check endpoint
        location /health {
            content_by_lua_block {
                ngx.say('{"status": "healthy"}')
            }
        }

        # Simple Lua response
        location /hello {
            content_by_lua_block {
                ngx.header.content_type = "application/json"
                local cjson = require "cjson"
                ngx.say(cjson.encode({
                    message = "Hello from OpenResty",
                    timestamp = ngx.now(),
                    worker_pid = ngx.worker.pid()
                }))
            }
        }

        # Proxy with Lua-based header injection
        location /api/ {
            access_by_lua_file /usr/local/openresty/lua/auth.lua;
            proxy_pass http://backend:3000/;
            header_filter_by_lua_block {
                ngx.header["X-Processed-By"] = "OpenResty"
                ngx.header["X-Request-ID"] = ngx.var.request_id
            }
        }
    }
}
```

## Authentication with Lua

Implement API key authentication directly in Lua.

```lua
-- lua/auth.lua
-- API key authentication middleware

local cjson = require "cjson"

-- List of valid API keys (in production, query a database or Redis)
local valid_keys = {
    ["api-key-001"] = { name = "Service A", role = "admin" },
    ["api-key-002"] = { name = "Service B", role = "reader" },
    ["api-key-003"] = { name = "Mobile App", role = "user" },
}

-- Skip authentication for health checks
if ngx.var.uri == "/health" then
    return
end

-- Extract API key from header
local api_key = ngx.req.get_headers()["X-API-Key"]

if not api_key then
    ngx.status = 401
    ngx.header.content_type = "application/json"
    ngx.say(cjson.encode({
        error = "Missing API key",
        hint = "Include X-API-Key header"
    }))
    return ngx.exit(401)
end

local client = valid_keys[api_key]

if not client then
    ngx.status = 403
    ngx.header.content_type = "application/json"
    ngx.say(cjson.encode({
        error = "Invalid API key"
    }))
    return ngx.exit(403)
end

-- Set headers with client info for downstream services
ngx.req.set_header("X-Client-Name", client.name)
ngx.req.set_header("X-Client-Role", client.role)
```

Test the authentication.

```bash
# Request without API key - should get 401
curl -i http://localhost:8080/api/users

# Request with valid API key - should succeed
curl -i -H "X-API-Key: api-key-001" http://localhost:8080/api/users

# Request with invalid API key - should get 403
curl -i -H "X-API-Key: invalid" http://localhost:8080/api/users
```

## Rate Limiting with Lua

Implement a sliding window rate limiter using Nginx's shared dictionary.

```lua
-- lua/rate_limit.lua
-- Token bucket rate limiter using shared memory

local cjson = require "cjson"
local limit_store = ngx.shared.rate_limit_store

local RATE_LIMIT = 100  -- requests per window
local WINDOW_SIZE = 60  -- seconds

-- Identify the client by IP or API key
local client_id = ngx.req.get_headers()["X-API-Key"] or ngx.var.remote_addr
local key = "rl:" .. client_id

-- Get current count and window start
local count, err = limit_store:get(key)

if count == nil then
    -- First request in this window
    limit_store:set(key, 1, WINDOW_SIZE)
    count = 1
else
    -- Increment the counter
    count = limit_store:incr(key, 1)
end

-- Set rate limit headers
ngx.header["X-RateLimit-Limit"] = RATE_LIMIT
ngx.header["X-RateLimit-Remaining"] = math.max(0, RATE_LIMIT - count)

-- Check if limit is exceeded
if count > RATE_LIMIT then
    ngx.status = 429
    ngx.header.content_type = "application/json"
    ngx.header["Retry-After"] = WINDOW_SIZE
    ngx.say(cjson.encode({
        error = "Rate limit exceeded",
        limit = RATE_LIMIT,
        window = WINDOW_SIZE,
        retry_after = WINDOW_SIZE
    }))
    return ngx.exit(429)
end
```

Wire it into the Nginx configuration.

```nginx
location /api/ {
    access_by_lua_file /usr/local/openresty/lua/rate_limit.lua;
    access_by_lua_file /usr/local/openresty/lua/auth.lua;
    proxy_pass http://backend:3000/;
}
```

## Response Caching with Lua

Cache API responses in shared memory for faster subsequent requests.

```lua
-- lua/cache.lua
-- Simple response cache using shared dictionary

local cjson = require "cjson"
local cache = ngx.shared.cache_store

local CACHE_TTL = 30  -- seconds

-- Only cache GET requests
if ngx.req.get_method() ~= "GET" then
    return
end

local cache_key = ngx.var.uri .. "?" .. (ngx.var.args or "")
local cached = cache:get(cache_key)

if cached then
    -- Cache hit: return the cached response directly
    ngx.header.content_type = "application/json"
    ngx.header["X-Cache"] = "HIT"
    ngx.say(cached)
    return ngx.exit(200)
end

-- Cache miss: let the request proceed to the backend
ngx.header["X-Cache"] = "MISS"
```

Store the response after it comes back from the backend.

```lua
-- lua/cache_store.lua
-- Store the response body in cache (body_filter_by_lua_file)

local cache = ngx.shared.cache_store
local CACHE_TTL = 30

if ngx.status == 200 then
    local cache_key = ngx.var.uri .. "?" .. (ngx.var.args or "")
    local body = ngx.arg[1]
    if body then
        cache:set(cache_key, body, CACHE_TTL)
    end
end
```

## Dynamic Routing

Route requests based on runtime logic.

```lua
-- lua/router.lua
-- Dynamic routing based on request attributes

local cjson = require "cjson"

local uri = ngx.var.uri
local method = ngx.req.get_method()
local headers = ngx.req.get_headers()

-- Route based on client version header
local client_version = headers["X-Client-Version"] or "1.0"
local major_version = tonumber(client_version:match("^(%d+)"))

local upstream

if major_version and major_version >= 2 then
    upstream = "http://api-v2:3000"
else
    upstream = "http://api-v1:3000"
end

-- Set the upstream for proxy_pass
ngx.var.upstream = upstream
```

Use it in the Nginx config.

```nginx
upstream api-v1 {
    server api-v1:3000;
}

upstream api-v2 {
    server api-v2:3000;
}

server {
    listen 8080;

    location /api/ {
        set $upstream "";
        rewrite_by_lua_file /usr/local/openresty/lua/router.lua;
        proxy_pass $upstream;
    }
}
```

## Request Logging and Analytics

Collect request metrics in Lua for real-time analytics.

```lua
-- lua/analytics.lua
-- Collect request metrics (log_by_lua_file phase)

local cjson = require "cjson"

local log_data = {
    timestamp = ngx.now(),
    method = ngx.req.get_method(),
    uri = ngx.var.uri,
    status = ngx.status,
    request_time = ngx.var.request_time,
    upstream_time = ngx.var.upstream_response_time,
    bytes_sent = ngx.var.bytes_sent,
    client_ip = ngx.var.remote_addr,
    user_agent = ngx.var.http_user_agent,
}

-- Log as JSON for structured log analysis
ngx.log(ngx.INFO, "request_log: ", cjson.encode(log_data))
```

## Building a Custom Image

For production, package your Lua scripts and config into the image.

```dockerfile
# Dockerfile
FROM openresty/openresty:1.25.3.1-alpine

# Install additional Lua modules
RUN luarocks install lua-resty-jwt && \
    luarocks install lua-resty-http

# Copy configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /usr/local/openresty/lua/
COPY html/ /usr/local/openresty/nginx/html/

# Validate configuration at build time
RUN openresty -t

EXPOSE 8080 8443
```

```bash
docker build -t my-openresty .
docker run -d -p 8080:8080 my-openresty
```

## Testing the Configuration

```bash
# Validate Nginx configuration
docker exec openresty openresty -t

# Reload configuration without restart
docker exec openresty openresty -s reload

# View error logs
docker logs openresty --tail 50

# Monitor resource usage
docker stats openresty --no-stream
```

## Summary

OpenResty in Docker lets you build programmable proxy layers with Lua scripting inside Nginx. Implement authentication, rate limiting, caching, dynamic routing, and request transformation without external services. Lua runs inside the Nginx event loop at near-C speed, so the overhead is minimal. Use shared dictionaries for in-memory state like rate limit counters and caches. For production, build a custom image with your Lua scripts baked in and validate the configuration at build time. OpenResty bridges the gap between simple Nginx configurations and full application servers, giving you programmatic control at the edge.
