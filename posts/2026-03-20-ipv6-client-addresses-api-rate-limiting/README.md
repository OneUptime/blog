# How to Handle IPv6 Client Addresses in API Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rate Limiting, API Gateway, Security, Networking, Nginx

Description: Implement effective API rate limiting for IPv6 clients by addressing prefix aggregation, address normalization, and per-/48 or per-/64 subnet bucketing strategies.

## Introduction

Rate limiting IPv6 clients presents a unique challenge: a single user can control a /64, and in some deployments a larger delegated prefix such as /56 or /48, then rotate through addresses inside that space to bypass per-IP limits. Effective IPv6 rate limiting usually requires bucketing by prefix, not individual address.

## The Problem: IPv6 Address Rotation

```text
# An attacker owns 2001:db8:1234::/48

# They can send from:
2001:db8:1234::1      -> rate limit bucket #1
2001:db8:1234::2      -> rate limit bucket #2 (bypass!)
2001:db8:1234:1::1    -> rate limit bucket #3 (bypass!)
```

The solution is to normalize the client address to a chosen prefix boundary, such as /64 or /48, and use that as the rate limit key.

## Strategy 1: NGINX Rate Limiting by /64

NGINX's `$binary_remote_addr` is per-IP. NGINX does not natively mask IPv6 prefixes for `limit_req_zone`, so derive a normalized prefix key first.

```javascript
// conf.d/ipv6_prefix.js
function expand_ipv6(addr) {
    var parts = addr.toLowerCase().split("::");
    var left = parts[0] ? parts[0].split(":") : [];
    var right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
    var missing = 8 - left.length - right.length;
    var full = [];
    var i;

    if (parts.length > 2 || missing < 0) {
        return null;
    }

    if (parts.length === 1 && left.length !== 8) {
        return null;
    }

    for (i = 0; i < left.length; i++) {
        full.push(("0000" + left[i]).slice(-4));
    }

    for (i = 0; i < missing; i++) {
        full.push("0000");
    }

    for (i = 0; i < right.length; i++) {
        full.push(("0000" + right[i]).slice(-4));
    }

    if (full.length !== 8) {
        return null;
    }

    for (i = 0; i < full.length; i++) {
        if (!/^[0-9a-f]{4}$/.test(full[i])) {
            return null;
        }
    }

    return full;
}

function rate_limit_key(r) {
    var addr = r.remoteAddress;
    var hextets;

    if (!addr || addr.indexOf(":") === -1) {
        return addr;
    }

    hextets = expand_ipv6(addr);
    if (hextets === null) {
        return addr;
    }

    // Fixed-width hextets ensure equivalent IPv6 spellings map to one key.
    return hextets.slice(0, 4).join(":") + "::/64";
}

export default {rate_limit_key};
```

```nginx
# nginx.conf - rate limit by IPv6 /64 prefix
# Requires ngx_http_js_module (njs)

http {
    js_import ipv6 from conf.d/ipv6_prefix.js;
    js_set $rate_limit_key ipv6.rate_limit_key;

    limit_req_zone $rate_limit_key zone=api_zone:10m rate=100r/m;

    server {
        listen 80;
        listen [::]:80;

        location /api/ {
            limit_req zone=api_zone burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

## Strategy 2: Python - Normalize IPv6 to /64 for Rate Limiting

```python
import ipaddress
from functools import lru_cache

@lru_cache(maxsize=10000)
def get_rate_limit_key(client_ip: str, prefix_len: int = 64) -> str:
    """
    Normalize an IP address to a subnet key for rate limiting.
    IPv6 addresses are truncated to the given prefix length and returned in CIDR notation.
    IPv4 addresses are returned as-is.
    """
    try:
        addr = ipaddress.ip_address(client_ip)
        if isinstance(addr, ipaddress.IPv6Address):
            # Create a network from the address, masked to prefix_len
            network = ipaddress.IPv6Network(
                f"{client_ip}/{prefix_len}", strict=False
            )
            return str(network)
        else:
            # IPv4: rate limit per individual address
            return client_ip
    except ValueError:
        # Invalid IP - use as-is
        return client_ip


# Example usage in a Flask view
from flask import request
import redis

r = redis.Redis()

def check_rate_limit(max_requests=100, window=60):
    client_ip = request.remote_addr
    key = f"ratelimit:{get_rate_limit_key(client_ip)}"

    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()

    return count <= max_requests
```

## Strategy 3: Redis-Based Rate Limiting with /48 Bucketing

For higher-value APIs, some deployments bucket at /48 to handle more sophisticated address rotation.

```python
import ipaddress
import redis

r = redis.Redis()

def get_ipv6_prefix(ip: str, prefix_len: int = 48) -> str:
    """Return the /48 network prefix for an IPv6 address."""
    try:
        net = ipaddress.IPv6Network(f"{ip}/{prefix_len}", strict=False)
        return str(net)
    except ValueError:
        return ip

# Redis Lua script for atomic rate limiting
RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end
if current > limit then
    return 0
end
return 1
"""

def is_allowed(client_ip, limit=1000, window=3600):
    prefix = get_ipv6_prefix(client_ip, prefix_len=48)
    key = f"rl:{prefix}"
    result = r.eval(RATE_LIMIT_SCRIPT, 1, key, limit, window)
    return bool(result)
```

## Strategy 4: Kong Plugin Configuration

This example uses Kong's Enterprise-only `rate-limiting-advanced` plugin. Kong's built-in `ip` identifier is per-address. To bucket IPv6 by prefix, normalize the prefix before Kong and rate limit on that value instead.

```yaml
# Kong rate-limiting-advanced plugin using a pre-normalized IPv6 prefix header
plugins:
  - name: rate-limiting-advanced
    config:
      limit: [100]
      window_size: [60]
      namespace: ipv6-prefix-limit
      # Populate X-IPv6-Prefix before Kong, for example at an edge proxy.
      identifier: header
      header_name: X-IPv6-Prefix
      strategy: local
      sync_rate: -1
```

## Conclusion

IPv6 rate limiting should usually operate at the subnet level, not the individual address level. /64 is a common baseline because many IPv6 subnets use 64-bit interface identifiers, while broader buckets such as /48 may fit environments where clients control larger delegated prefixes. Whichever gateway or framework you use, normalize IPv6 to a consistent prefix before creating rate limit keys. Use OneUptime to monitor your APIs for anomalous traffic patterns across both IP families.
