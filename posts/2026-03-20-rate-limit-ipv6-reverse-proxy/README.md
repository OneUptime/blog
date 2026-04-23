# How to Rate Limit IPv6 Clients at the Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rate Limiting, Nginx, HAProxy, Reverse Proxy, Security

Description: Configure rate limiting for IPv6 clients at the reverse proxy layer, accounting for the challenge that IPv6 clients may share a /64 prefix, requiring prefix-based rather than per-address limiting.

## Introduction

Rate limiting IPv6 clients is more complex than IPv4 because a single user can legitimately rotate between many addresses within a /64 prefix. Rate limiting by individual /128 address is ineffective - an attacker cycles through addresses while a legitimate mobile user gets blocked. The practical approach is to rate limit by the prefix that represents the client, commonly /64 and sometimes a broader delegated prefix when that is intentional.

## The IPv6 Rate Limiting Challenge

```text
IPv4: 1 user = 1 IP (e.g., 203.0.113.5)
IPv6: 1 user = /64 prefix with 2^64 addresses
      e.g., 2001:db8:cafe:1::/64

Naive per-/128 limit: ineffective against prefix rotation
Correct approach: rate limit by /64 or another chosen prefix
```

## Nginx: Rate Limit by IPv6 /48 Prefix

```nginx
# /etc/nginx/nginx.conf
# Requires the NGINX JavaScript module (njs)

http {
    js_import ipv6_prefix.js;
    js_set $ipv6_prefix ipv6_prefix.rate_limit_key;

    # Rate limit zone keyed on IPv6 /48 prefix (or full IPv4 address)
    limit_req_zone $ipv6_prefix zone=per_prefix:10m rate=60r/m;

    server {
        listen [::]:443 ssl;
        listen 443 ssl;

        location /api/ {
            # Apply rate limit: burst allows short spikes
            limit_req zone=per_prefix burst=20 nodelay;
            limit_req_status 429;

            proxy_pass http://backend:8080;
            proxy_set_header X-Forwarded-For $remote_addr;
        }
    }
}
```

```javascript
// /etc/nginx/ipv6_prefix.js

function rate_limit_key(r) {
    var addr = r.remoteAddress;

    if (addr.indexOf(":") === -1) {
        return addr;
    }

    var parts = addr.split("::");
    var left;
    var right;
    var groups = [];
    var missing;
    var i;

    if (parts.length > 2) {
        return addr;
    }

    left = parts[0] ? parts[0].split(":") : [];
    right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
    missing = 8 - (left.length + right.length);

    if (missing < 0) {
        return addr;
    }

    for (i = 0; i < left.length; i++) {
        groups.push((left[i] || "0").toLowerCase());
    }

    for (i = 0; i < missing; i++) {
        groups.push("0");
    }

    for (i = 0; i < right.length; i++) {
        groups.push((right[i] || "0").toLowerCase());
    }

    return groups[0] + ":" + groups[1] + ":" + groups[2] + "::/48";
}

export default { rate_limit_key };
```

## Nginx: Lua-Based IPv6 Prefix Rate Limiting (OpenResty)

```nginx
# OpenResty / Nginx with lua-resty-limit-traffic

http {
    lua_shared_dict limit_store 10m;

    server {
        listen [::]:443 ssl;

        location /api/ {
            access_by_lua_block {
                local limit_req = require "resty.limit.req"

                -- resty.limit.req takes requests per second, so 1 req/s ~= 60 req/min
                local lim, err = limit_req.new("limit_store", 1, 20)
                if not lim then
                    ngx.log(ngx.ERR, "failed to create limiter: ", err)
                    return ngx.exit(500)
                end

                local key = ngx.var.remote_addr
                local binary = ngx.var.binary_remote_addr

                if binary and #binary == 16 then
                    -- First 6 bytes of a 16-byte IPv6 address = /48 prefix
                    key = ngx.encode_base64(string.sub(binary, 1, 6))
                end

                local delay, excess = lim:incoming(key, true)
                if not delay then
                    if excess == "rejected" then
                        return ngx.exit(429)
                    end

                    ngx.log(ngx.ERR, "failed to limit req: ", excess)
                    return ngx.exit(500)
                end

                if delay >= 0.001 then
                    ngx.sleep(delay)
                end
            }

            proxy_pass http://backend:8080;
        }
    }
}
```

## HAProxy: Rate Limit by IPv6 /48 Prefix

```haproxy
# /etc/haproxy/haproxy.cfg

frontend web_ipv6
    mode http
    bind [::]:443 ssl crt /etc/ssl/certs/app.pem

    stick-table type ipv6 size 1m expire 60s store http_req_rate(60s)

    # Rate limit: allow max 100 HTTP requests per 60 seconds per /48
    http-request track-sc0 src,ipmask(0,48)
    http-request deny deny_status 429 if { sc0_http_req_rate gt 100 }

    default_backend app

backend app
    server app1 [2001:db8::10]:8080
```

## Traefik: Rate Limit Middleware for IPv6

```yaml
# traefik-rate-limit.yml

http:
  middlewares:
    ipv6-rate-limit:
      rateLimit:
        average: 60
        burst: 20
        period: 1m
        sourceCriterion:
          ipStrategy:
            ipv6Subnet: 64

  routers:
    api:
      rule: "PathPrefix(`/api`)"
      middlewares:
        - ipv6-rate-limit
      service: backend

  services:
    backend:
      loadBalancer:
        servers:
          - url: "http://backend:8080"
```

## Application-Level IPv6 Prefix Rate Limiting

```python
#!/usr/bin/env python3
# ipv6_rate_limiter.py

import ipaddress
import time
from collections import defaultdict

class IPv6PrefixRateLimiter:
    """Rate limiter that groups IPv6 addresses by a configurable prefix."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60,
                 ipv6_prefix_length: int = 64):
        self.max_requests = max_requests
        self.window = window_seconds
        self.prefix_length = ipv6_prefix_length
        self._counters: dict = defaultdict(list)

    def _get_key(self, ip_str: str) -> str:
        """Map an IP address to a rate limiting key."""
        try:
            ip = ipaddress.ip_address(ip_str)
            if isinstance(ip, ipaddress.IPv6Address):
                # Group by the configured IPv6 prefix
                network = ipaddress.ip_network(
                    f"{ip_str}/{self.prefix_length}", strict=False
                )
                return str(network)
        except ValueError:
            pass
        return ip_str  # Fall back to exact IP

    def is_allowed(self, ip_str: str) -> bool:
        key = self._get_key(ip_str)
        now = time.time()

        # Remove expired timestamps
        self._counters[key] = [
            t for t in self._counters[key] if now - t < self.window
        ]

        if len(self._counters[key]) >= self.max_requests:
            return False

        self._counters[key].append(now)
        return True

# Usage

limiter = IPv6PrefixRateLimiter(
    max_requests=100,
    window_seconds=60,
    ipv6_prefix_length=64,
)

def check_rate_limit(client_ip: str) -> bool:
    if not limiter.is_allowed(client_ip):
        print(f"Rate limited: {client_ip}")
        return False
    return True
```

## Conclusion

IPv6 rate limiting at the reverse proxy should operate on a network prefix rather than individual /128 addresses when clients can rotate addresses within a subnet. A /64 is the common default for SLAAC/privacy-address clients; broader masks such as /56 or /48 intentionally aggregate a larger delegated prefix and can also group multiple users. Nginx can do this by computing a custom key before `limit_req_zone`, OpenResty can do it in Lua, HAProxy can mask the key with `ipmask()`, and Traefik supports `sourceCriterion.ipStrategy.ipv6Subnet`. Always rate limit on the client address after you have configured your proxy to trust only known upstreams, rather than on an untrusted `X-Forwarded-For` header.
