# How to Handle IPv6 in Rate Limiting Middleware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Rate Limiting, Middleware, Security, Node.js, Nginx, Web Development

Description: Implement IPv6-aware rate limiting middleware that handles IPv6 address aggregation, prefix-based bucketing, and bypass prevention for web applications.

## Introduction

Rate limiting with IPv6 is more complex than IPv4 because a single attacker may own an entire /64 subnet (18 quintillion addresses) and rotate through them to bypass per-IP rate limits. Effective IPv6 rate limiting requires bucketing by network prefix rather than individual addresses.

## The IPv6 Rate Limiting Problem

With IPv4, an attacker has a limited pool of IPs. With IPv6:
- A single /48 allocation contains 65,536 /64 subnets
- Each /64 has 18,446,744,073,709,551,616 addresses
- Traditional per-IP rate limiting is easily bypassed

Solution: Rate limit by an IPv6 prefix such as /64, /56, or /48, not individual addresses.

## Nginx: Rate Limiting by IPv6 Prefix

Nginx can rate limit on a computed key, but reliably extracting an IPv6 /64 requires normalizing the address first:

```nginx
# /etc/nginx/conf.d/rate_limit.conf
# Requires ngx_http_js_module (njs) to be installed and loaded.

js_path "/etc/nginx/njs/";
js_import rate_limit.js;
js_set $rate_key rate_limit.key;

limit_req_zone $rate_key zone=api:10m rate=60r/m;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

```javascript
// /etc/nginx/njs/rate_limit.js

function key(r) {
    var addr = r.remoteAddress;
    var parts;
    var left;
    var right;
    var missing;
    var expanded;
    var i;

    if (addr.indexOf('::ffff:') === 0) {
        return addr.slice(7);
    }

    if (addr.indexOf(':') === -1) {
        return addr;
    }

    parts = addr.split('::');
    left = parts[0] ? parts[0].split(':') : [];
    right = parts[1] ? parts[1].split(':') : [];
    missing = 8 - left.length - right.length;
    expanded = left.slice(0);

    for (i = 0; i < missing; i += 1) {
        expanded.push('0');
    }

    expanded = expanded.concat(right);

    for (i = 0; i < expanded.length; i += 1) {
        expanded[i] = ('0000' + expanded[i]).slice(-4).toLowerCase();
    }

    return expanded.slice(0, 4).join(':') + '::/64';
}

export default { key };
```

## Node.js: express-rate-limit with IPv6 Prefix

If Express runs behind Nginx or another reverse proxy, configure `trust proxy` correctly before relying on `req.ip`.

```javascript
const { rateLimit } = require('express-rate-limit');

// Configure rate limiter with IPv6-aware key
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  limit: 100,               // 100 requests per window per /64
  ipv6Subnet: 64,           // Group IPv6 clients by /64
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// Apply to all API routes
app.use('/api/', apiLimiter);
```

## Redis-Based IPv6 Rate Limiting

```python
import ipaddress
import time
import uuid

import redis

class IPv6RateLimiter:
    def __init__(self, redis_client: redis.Redis, limit: int, window: int):
        self.redis = redis_client
        self.limit = limit        # Max requests
        self.window = window      # Window in seconds

    def get_rate_key(self, ip_str: str) -> str:
        """
        Return rate limiting key.
        IPv6: /64 prefix
        IPv4: full address
        """
        # Strip IPv4-mapped prefix
        ip_str = ip_str.replace('::ffff:', '')

        try:
            addr = ipaddress.ip_address(ip_str)
            if isinstance(addr, ipaddress.IPv6Address):
                # Get /64 network containing this address
                network = ipaddress.IPv6Network(f'{addr}/64', strict=False)
                return f'ratelimit:v6:{network.network_address}'
            else:
                return f'ratelimit:v4:{addr}'
        except ValueError:
            return f'ratelimit:unknown:{ip_str}'

    def is_allowed(self, ip: str) -> tuple[bool, int]:
        """
        Check if request is allowed.
        Returns (allowed, remaining_requests).
        """
        key = self.get_rate_key(ip)
        now_ms = time.time_ns() // 1_000_000
        window_start = now_ms - (self.window * 1000)
        member = f'{now_ms}:{uuid.uuid4().hex}'

        # Sliding window using Redis sorted set with a unique member per request
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, '-inf', window_start)
        pipe.zadd(key, {member: now_ms})
        pipe.zcard(key)
        pipe.expire(key, self.window)
        results = pipe.execute()

        count = results[2]
        allowed = count <= self.limit
        remaining = max(0, self.limit - count)
        return allowed, remaining

# Usage in a web framework
limiter = IPv6RateLimiter(redis.Redis(), limit=100, window=60)

def rate_limit_middleware(ip: str) -> dict:
    allowed, remaining = limiter.is_allowed(ip)
    return {
        'allowed': allowed,
        'remaining': remaining,
        'key': limiter.get_rate_key(ip)
    }
```

## Testing IPv6 Rate Limiting

```bash
# If your app is behind a trusted reverse proxy and Express trust proxy is configured,
# these requests should count toward the same /64 limit bucket:
for i in 1 2 3 4 5; do
    curl -s -o /dev/null -w "%{http_code}\n" \
        -H "X-Forwarded-For: 2001:db8:1:2::$i" \
        http://localhost:3000/api/endpoint
done

# Test from a completely different /64 (should have its own bucket)
curl -H "X-Forwarded-For: 2001:db8:1:3::1" \
    http://localhost:3000/api/endpoint
```

## Conclusion

IPv6 rate limiting must aggregate by network prefix rather than individual addresses to prevent bypass through address rotation. In Nginx, compute a normalized key with `njs` or in upstream application code before applying `limit_req_zone`. In application code, normalize the client IP to its chosen IPv6 prefix before using it as the rate limit key. Redis sorted sets provide efficient sliding-window rate limiting that scales with high request volumes.
