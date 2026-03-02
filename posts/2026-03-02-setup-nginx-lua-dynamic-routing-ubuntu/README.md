# How to Set Up Nginx with Lua for Dynamic Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Lua, Dynamic Routing, Web Server

Description: Configure Nginx with OpenResty or the lua-nginx-module on Ubuntu to implement dynamic routing logic, request transformation, and custom authentication using Lua scripts.

---

Nginx's configuration language is powerful but limited when you need complex conditional logic, external API calls, or dynamic routing decisions that depend on runtime data. Adding Lua scripting via the `lua-nginx-module` (or OpenResty, the Nginx distribution that includes it) gives you a full programming language inside Nginx's request processing pipeline without the overhead of a separate application server.

## Choose Your Approach: OpenResty vs lua-nginx-module

**OpenResty** is a distribution of Nginx bundled with LuaJIT and a collection of Lua modules. It is the easiest way to get started.

**lua-nginx-module** is the upstream module that can be compiled into a custom Nginx build. More complex to set up but allows use of your own Nginx version.

This guide uses OpenResty since it works on Ubuntu with a package manager.

## Install OpenResty on Ubuntu

```bash
# Add the OpenResty repository
sudo apt-get install -y gnupg curl

# Import the GPG key
curl -fsSL https://openresty.org/package/pubkey.gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/openresty.gpg

# Add the repository (Ubuntu 22.04)
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/openresty.gpg] \
    http://openresty.org/package/ubuntu jammy main" | \
    sudo tee /etc/apt/sources.list.d/openresty.list

sudo apt-get update
sudo apt-get install -y openresty

# Start and enable OpenResty
sudo systemctl enable --now openresty

# Verify
openresty -v
```

OpenResty installs to `/usr/local/openresty/` by default and uses `/etc/openresty/nginx.conf` as its main configuration file.

## Basic Lua in Nginx

Lua code runs in specific Nginx phases using directives like `content_by_lua_block`, `access_by_lua_block`, and `rewrite_by_lua_block`. Each phase corresponds to a step in Nginx's request processing.

Create a test configuration:

```bash
sudo nano /etc/openresty/conf.d/lua-test.conf
```

```nginx
server {
    listen 80;
    server_name localhost;

    # Simple Lua response
    location /hello {
        content_by_lua_block {
            -- Access the request
            local method = ngx.req.get_method()
            local uri = ngx.var.uri

            -- Set response headers
            ngx.header.content_type = "application/json"

            -- Send a JSON response
            ngx.say('{"method":"' .. method .. '","uri":"' .. uri .. '"}')
        }
    }
}
```

```bash
sudo openresty -t
sudo systemctl reload openresty

curl http://localhost/hello
# {"method":"GET","uri":"/hello"}
```

## Dynamic Routing Based on Request Parameters

Route requests to different backends based on URL parameters, headers, or cookies:

```nginx
upstream backend_v1 {
    server 127.0.0.1:3001;
}

upstream backend_v2 {
    server 127.0.0.1:3002;
}

upstream backend_default {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        # Determine which backend to use based on the X-API-Version header
        access_by_lua_block {
            local version = ngx.req.get_headers()["X-API-Version"]

            if version == "v1" then
                ngx.var.target = "backend_v1"
            elseif version == "v2" then
                ngx.var.target = "backend_v2"
            else
                ngx.var.target = "backend_default"
            end
        }

        # The target variable set above is used in proxy_pass
        set $target "backend_default";
        proxy_pass http://$target;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## A/B Testing with Lua

Send a percentage of traffic to a new backend:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        set $target "http://127.0.0.1:3000";  -- default backend

        rewrite_by_lua_block {
            -- Send 10% of traffic to the new backend
            math.randomseed(ngx.time() + ngx.var.remote_addr:byte(1))
            local rand = math.random(100)

            if rand <= 10 then
                ngx.var.target = "http://127.0.0.1:3001"  -- new backend
                -- Track which group in a cookie
                ngx.header["Set-Cookie"] = "ab_group=new; Path=/"
            else
                ngx.header["Set-Cookie"] = "ab_group=control; Path=/"
            end
        }

        proxy_pass $target;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Custom Authentication with Lua

Validate a JWT or API key using Lua before proxying the request:

```bash
# Install the lua-resty-jwt library
sudo apt-get install -y luarocks
sudo luarocks install lua-resty-jwt
```

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /protected/ {
        # Run authentication before forwarding
        access_by_lua_block {
            local cjson = require "cjson"

            -- Get the Authorization header
            local auth_header = ngx.req.get_headers()["Authorization"]

            if not auth_header then
                ngx.status = 401
                ngx.header.content_type = "application/json"
                ngx.say('{"error":"Missing Authorization header"}')
                return ngx.exit(401)
            end

            -- Extract the token (Bearer <token>)
            local token = auth_header:match("Bearer%s+(.+)")
            if not token then
                ngx.status = 401
                ngx.say('{"error":"Invalid Authorization format"}')
                return ngx.exit(401)
            end

            -- Simple API key check (replace with JWT validation in production)
            local valid_tokens = {
                ["secret-token-1"] = "user1",
                ["secret-token-2"] = "user2",
            }

            local username = valid_tokens[token]
            if not username then
                ngx.status = 403
                ngx.say('{"error":"Invalid token"}')
                return ngx.exit(403)
            end

            -- Pass the username to the backend
            ngx.req.set_header("X-Authenticated-User", username)
        }

        # If authentication passed, forward the request
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

## Rate Limiting with Lua and Shared Memory

Use Nginx's shared memory zones for cross-worker rate limiting:

```nginx
# Define a shared memory zone for rate limiting
lua_shared_dict rate_limit_store 10m;

server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        access_by_lua_block {
            local dict = ngx.shared.rate_limit_store
            local client_ip = ngx.var.remote_addr
            local key = "rate:" .. client_ip

            -- Limit to 60 requests per minute
            local limit = 60
            local window = 60  -- seconds

            local count, err = dict:incr(key, 1, 0, window)
            if not count then
                ngx.log(ngx.ERR, "Failed to increment rate limit: ", err)
            end

            if count and count > limit then
                ngx.status = 429
                ngx.header["Retry-After"] = window
                ngx.header.content_type = "application/json"
                ngx.say('{"error":"Rate limit exceeded"}')
                return ngx.exit(429)
            end

            -- Add rate limit headers
            ngx.header["X-RateLimit-Limit"] = limit
            ngx.header["X-RateLimit-Remaining"] = math.max(0, limit - (count or 0))
        }

        proxy_pass http://127.0.0.1:3000;
    }
}
```

## Request and Response Transformation

Modify request bodies or response data using Lua:

```nginx
server {
    listen 80;
    server_name example.com;

    location /transform/ {
        # Read and modify the request body before forwarding
        rewrite_by_lua_block {
            ngx.req.read_body()
            local body = ngx.req.get_body_data()

            if body then
                -- Add a timestamp field to JSON bodies
                local cjson = require "cjson"
                local ok, data = pcall(cjson.decode, body)
                if ok and type(data) == "table" then
                    data["_timestamp"] = ngx.time()
                    ngx.req.set_body_data(cjson.encode(data))
                end
            end
        }

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Content-Type "application/json";
    }
}
```

## Load Lua Scripts from Files

For complex routing logic, store Lua code in separate files rather than embedding it in nginx.conf:

```bash
# Create a Lua scripts directory
sudo mkdir -p /etc/openresty/lua

sudo nano /etc/openresty/lua/auth.lua
```

```lua
-- /etc/openresty/lua/auth.lua
local M = {}

function M.check_token(token)
    -- Your validation logic here
    if token == "valid-token" then
        return true, "user123"
    end
    return false, nil
end

return M
```

Reference it from nginx.conf:

```nginx
# Tell Nginx where to find Lua files
lua_package_path "/etc/openresty/lua/?.lua;;";

server {
    listen 80;

    location / {
        access_by_lua_block {
            local auth = require "auth"
            local token = ngx.req.get_headers()["X-Token"]
            local ok, user = auth.check_token(token)

            if not ok then
                return ngx.exit(403)
            end

            ngx.req.set_header("X-User", user)
        }

        proxy_pass http://127.0.0.1:3000;
    }
}
```

```bash
sudo openresty -t
sudo systemctl reload openresty

# Test the routing
curl -H "X-API-Version: v2" http://localhost/
curl http://localhost/hello
```

Lua in Nginx opens up a wide range of use cases that would otherwise require a separate middleware service. Once you get comfortable with the request lifecycle phases and the `ngx.*` API, complex routing and transformation logic becomes straightforward to implement and maintain directly in the web server layer.
