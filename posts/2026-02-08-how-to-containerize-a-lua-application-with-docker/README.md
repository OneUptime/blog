# How to Containerize a Lua Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Lua, Containerization, DevOps, OpenResty, Scripting

Description: How to containerize Lua applications with Docker, covering standalone scripts, OpenResty web servers, and LuaRocks dependency management.

---

Lua is lightweight, fast, and embeddable. It powers everything from game engines to web servers like OpenResty (Nginx + LuaJIT). Containerizing Lua applications with Docker keeps deployments consistent, especially when managing C library dependencies that Lua modules often require. This guide covers standalone Lua scripts, OpenResty web applications, and production-ready Docker images.

## Prerequisites

Docker should be installed on your machine. Basic Lua knowledge helps, but we will build complete examples. Understanding of Nginx configuration is helpful for the OpenResty sections.

## Creating a Sample Lua Web Application

Let's build two examples: a standalone Lua HTTP server and an OpenResty application.

First, the standalone approach using the `http` library:

```lua
-- app.lua - simple HTTP server using lua-http
local http_server = require("http.server")
local http_headers = require("http.headers")
local cjson = require("cjson")

local function handle_request(myserver, stream)
    local req_headers = stream:get_headers()
    local path = req_headers:get(":path")

    local response_headers = http_headers.new()
    response_headers:append(":status", "200")
    response_headers:append("content-type", "application/json")

    local body

    if path == "/" then
        response_headers:upsert("content-type", "text/plain")
        body = "Hello from Lua in Docker!"
    elseif path == "/health" then
        body = cjson.encode({ status = "ok", runtime = "Lua " .. _VERSION })
    elseif path == "/compute" then
        -- Simple computation example
        local sum = 0
        for i = 1, 1000000 do
            sum = sum + math.sin(i)
        end
        body = cjson.encode({ result = sum })
    else
        response_headers:upsert(":status", "404")
        body = "Not Found"
    end

    stream:write_headers(response_headers, false)
    stream:write_body_from_string(body)
end

local port = tonumber(os.getenv("PORT")) or 8080
print("Starting Lua server on port " .. port)

local server = http_server.listen({
    host = "0.0.0.0",
    port = port,
    onstream = handle_request,
})

server:loop()
```

## Dockerfile for Standalone Lua

```dockerfile
# Dockerfile for standalone Lua application
FROM ubuntu:22.04

# Install Lua, LuaRocks, and build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    lua5.4 \
    luarocks \
    liblua5.4-dev \
    build-essential \
    libssl-dev \
    m4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Lua dependencies via LuaRocks
RUN luarocks install http && \
    luarocks install lua-cjson

# Copy application source
COPY app.lua /app/

EXPOSE 8080

CMD ["lua5.4", "app.lua"]
```

Build and test:

```bash
# Build the standalone Lua image
docker build -t lua-app:standalone .

# Run it
docker run -d -p 8080:8080 lua-app:standalone
curl http://localhost:8080/health
```

## OpenResty Approach (Recommended for Web Apps)

OpenResty bundles Nginx with LuaJIT and provides the most battle-tested way to run Lua web applications. The official Docker image makes this easy.

Create the Nginx configuration with embedded Lua:

```nginx
# nginx.conf - OpenResty configuration with Lua handlers
worker_processes auto;
error_log /dev/stderr info;

events {
    worker_connections 1024;
}

http {
    access_log /dev/stdout;

    # Shared dictionary for caching
    lua_shared_dict app_cache 10m;

    server {
        listen 8080;

        # Root endpoint
        location / {
            default_type text/plain;
            content_by_lua_block {
                ngx.say("Hello from Lua (OpenResty) in Docker!")
            }
        }

        # Health check endpoint
        location /health {
            default_type application/json;
            content_by_lua_block {
                local cjson = require("cjson")
                ngx.say(cjson.encode({
                    status = "ok",
                    worker_pid = ngx.worker.pid(),
                    connections = ngx.var.connections_active
                }))
            }
        }

        # API endpoint with computation
        location /api/compute {
            default_type application/json;
            content_by_lua_file /app/lua/compute.lua;
        }

        # Static file serving
        location /static/ {
            alias /app/static/;
            expires 30d;
        }
    }
}
```

Create the Lua handler file:

```lua
-- lua/compute.lua - handles computation requests
local cjson = require("cjson")

-- Read request body if present
ngx.req.read_body()
local body = ngx.req.get_body_data()

local n = 100000
local sum = 0
for i = 1, n do
    sum = sum + math.sin(i) * math.cos(i)
end

local result = {
    computation = "trigonometric_sum",
    iterations = n,
    result = sum,
    timestamp = ngx.now()
}

ngx.say(cjson.encode(result))
```

## OpenResty Dockerfile

```dockerfile
# Dockerfile for OpenResty Lua application
FROM openresty/openresty:1.25.3.1-alpine

WORKDIR /app

# Install additional LuaRocks modules if needed
RUN luarocks install lua-resty-http && \
    luarocks install lua-resty-redis

# Copy Nginx configuration
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# Copy Lua source files
COPY lua/ /app/lua/

# Copy static files if any
COPY static/ /app/static/

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["openresty", "-g", "daemon off;"]
```

## Multi-Stage Build for Standalone Lua

If you want a smaller image for standalone Lua applications:

```dockerfile
# Stage 1: Build with LuaRocks
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    lua5.4 luarocks liblua5.4-dev \
    build-essential libssl-dev m4 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies to a local tree
RUN luarocks install --tree /app/lua_modules http && \
    luarocks install --tree /app/lua_modules lua-cjson

# Stage 2: Slim runtime
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    lua5.4 libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Lua modules
COPY --from=builder /app/lua_modules /app/lua_modules

# Set Lua path to find installed modules
ENV LUA_PATH="/app/lua_modules/share/lua/5.4/?.lua;/app/lua_modules/share/lua/5.4/?/init.lua;;"
ENV LUA_CPATH="/app/lua_modules/lib/lua/5.4/?.so;;"

COPY app.lua /app/

RUN useradd -m appuser
USER appuser

EXPOSE 8080
CMD ["lua5.4", "app.lua"]
```

## LuaRocks Dependency Management

Create a rockspec file for your project to formalize dependencies:

```lua
-- app-scm-1.rockspec - LuaRocks package specification
package = "app"
version = "scm-1"
source = {
    url = "git://github.com/example/lua-app.git"
}
dependencies = {
    "lua >= 5.4",
    "http >= 0.4",
    "lua-cjson >= 2.1.0",
}
build = {
    type = "builtin",
    modules = {}
}
```

Install from the rockspec:

```dockerfile
# Install dependencies from rockspec
COPY app-scm-1.rockspec /app/
RUN luarocks install --only-deps app-scm-1.rockspec
```

## The .dockerignore File

```text
# .dockerignore
.git/
*.rockspec.bak
README.md
test/
.luarocks/
lua_modules/
```

## Docker Compose for Development

```yaml
# docker-compose.yml - development setup with Redis
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - ./lua:/app/lua
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

With volume mounts on the Lua files and nginx.conf, you can edit code locally and reload OpenResty:

```bash
# Reload OpenResty configuration without restart
docker compose exec app openresty -s reload
```

## LuaJIT vs Standard Lua

OpenResty uses LuaJIT, which is significantly faster than standard Lua but limited to Lua 5.1 compatibility. If you need Lua 5.4 features, use the standalone approach. For web applications, LuaJIT through OpenResty is almost always the better choice due to its performance and the rich ecosystem of `lua-resty-*` libraries.

## Performance Tuning

OpenResty configuration for high throughput:

```nginx
# Performance-tuned nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Keep-alive settings
    keepalive_timeout 65;
    keepalive_requests 1000;

    # Buffer settings
    lua_socket_buffer_size 16k;

    # Shared dictionaries for caching
    lua_shared_dict app_cache 64m;
    lua_shared_dict rate_limit 10m;
}
```

## Monitoring

Lua applications, particularly OpenResty-based ones, can handle enormous traffic volumes. Set up monitoring with [OneUptime](https://oneuptime.com) to track request rates, error percentages, and response latency. OpenResty's `ngx.shared.DICT` can expose internal metrics through a dedicated endpoint for deeper observability.

## Summary

Containerizing Lua applications depends on your use case. For web applications, OpenResty provides the most mature and performant platform with excellent Docker support. For standalone scripts and services, the standard Lua image with LuaRocks dependency management works well. Multi-stage builds keep images lean by separating the build toolchain from the runtime. Lua's small footprint makes it naturally suited for containers, and OpenResty's architecture scales to handle substantial production traffic.
