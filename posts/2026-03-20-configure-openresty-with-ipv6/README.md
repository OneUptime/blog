# How to Configure OpenResty with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenResty, Nginx, IPv6, Lua, API Gateway, Web Platform

Description: Configure OpenResty (Nginx + LuaJIT) to serve requests over IPv6, including Lua scripts that handle IPv6 client addresses and API gateway configuration.

---

OpenResty is Nginx extended with LuaJIT for dynamic web applications. Configuring it for IPv6 is identical to Nginx for the listener, but Lua scripts must correctly handle IPv6 addresses from `$remote_addr` and other variables.

## Installing OpenResty

```bash
# Ubuntu/Debian (apt-key is deprecated; use a keyring file with signed-by)

wget -O - https://openresty.org/package/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/openresty.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/openresty.gpg] http://openresty.org/package/ubuntu $(lsb_release -sc) main" \
    | sudo tee /etc/apt/sources.list.d/openresty.list
sudo apt update && sudo apt install openresty -y

# Verify installation
openresty -V 2>&1 | head -3
```

## Basic OpenResty Configuration with IPv6

```nginx
# /usr/local/openresty/nginx/conf/nginx.conf

user nobody nogroup;
worker_processes auto;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Log format with IPv6 support
    log_format main '$remote_addr [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    server {
        # Listen on both IPv4 and IPv6
        listen 80;
        listen [::]:80;

        server_name _;

        location / {
            default_type text/plain;
            content_by_lua_block {
                local client_ip = ngx.var.remote_addr
                -- Check if client is IPv6
                if client_ip:find(":", 1, true) then
                    ngx.say("Hello from IPv6 client: " .. client_ip)
                else
                    ngx.say("Hello from IPv4 client: " .. client_ip)
                end
            }
        }
    }
}
```

## Lua Script for IPv6 Address Handling

```nginx
# IPv6 address detection and manipulation in Lua
server {
    listen [::]:8080;
    server_name _;

    location /api/ip-info {
        content_by_lua_block {
            local client_ip = ngx.var.remote_addr
            local is_ipv6 = client_ip:find(":", 1, true) ~= nil

            local response = {
                client_ip = client_ip,
                protocol = is_ipv6 and "IPv6" or "IPv4",
                compressed = client_ip
            }

            -- Normalize IPv6 address
            if is_ipv6 then
                -- Remove IPv6-mapped IPv4 prefix if present
                local mapped = client_ip:match("^::ffff:(%d+%.%d+%.%d+%.%d+)$")
                if mapped then
                    response.protocol = "IPv4-mapped-IPv6"
                    response.underlying_ipv4 = mapped
                end
            end

            ngx.header["Content-Type"] = "application/json"
            ngx.say(require("cjson").encode(response))
        }
    }
}
```

## API Rate Limiting by IPv6 Prefix

```nginx
# Rate limit by /48 IPv6 prefix (shared by a household/organization)
server {
    listen [::]:443 ssl http2;

    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location /api/ {
        access_by_lua_block {
            local redis = require "resty.redis"
            local red = redis:new()
            red:set_timeouts(1000, 1000, 1000)

            local ok, err = red:connect("2001:db8::redis", 6379)
            if not ok then
                ngx.log(ngx.ERR, "Redis connect failed: ", err)
                return ngx.exit(503)
            end

            local client_ip = ngx.var.remote_addr
            local rate_key

            -- For IPv6, rate limit by /48 prefix (first 3 hextets)
            if client_ip:find(":", 1, true) then
                -- Expand "::" so all 8 hextets are present before indexing
                local expanded = client_ip
                local left, right = expanded:match("^(.-)::(.*)$")
                if left then
                    local function count_hextets(s)
                        local n = 0
                        for _ in s:gmatch("[^:]+") do n = n + 1 end
                        return n
                    end
                    local missing = 8 - count_hextets(left) - count_hextets(right)
                    local zeros = {}
                    for i = 1, missing do zeros[i] = "0" end
                    local middle = table.concat(zeros, ":")
                    if left ~= "" then left = left .. ":" end
                    if right ~= "" then right = ":" .. right end
                    expanded = left .. middle .. right
                end
                local parts = {}
                for part in expanded:gmatch("[^:]+") do
                    parts[#parts + 1] = part
                end
                rate_key = "ratelimit:ipv6:" .. table.concat(parts, ":", 1, 3)
            else
                rate_key = "ratelimit:ipv4:" .. client_ip
            end

            local count, err = red:incr(rate_key)
            if tonumber(count) == 1 then
                red:expire(rate_key, 60)  -- 1 minute window
            end

            if tonumber(count) > 100 then  -- 100 req/min limit
                return ngx.exit(429)
            end
        }

        proxy_pass http://[2001:db8::backend]:8080;
    }
}
```

## OpenResty Upstream with IPv6

```nginx
# Define upstream with IPv6 backend servers
upstream my_backend {
    server [2001:db8::1]:8080;
    server [2001:db8::2]:8080;
    server [2001:db8::3]:8080;

    keepalive 32;
}

server {
    listen [::]:80;

    location / {
        proxy_pass http://my_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

## Testing OpenResty over IPv6

```bash
# Test basic response
curl -6 http://[2001:db8::1]:80/

# Test Lua IP detection endpoint
curl -6 http://[2001:db8::1]/api/ip-info | python3 -m json.tool

# Load test with IPv6
wrk -t4 -c100 -d30s http://[2001:db8::1]/api/test

# Check logs
sudo tail -f /usr/local/openresty/nginx/logs/access.log
```

OpenResty's Lua integration with Nginx provides powerful IPv6 address manipulation capabilities, enabling sophisticated API gateway logic such as prefix-based rate limiting and IPv6-to-IPv4 address translation in request routing.
