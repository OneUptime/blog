# How to Handle IPv6 in Rate Limiting for Auth Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rate Limiting, IPv6, Security, Authentication, Redis

Description: Configure rate limiting on authentication endpoints that correctly groups IPv6 addresses to prevent credential stuffing attacks.

## Overview

Configure rate limiting on authentication endpoints that correctly groups IPv6 addresses to prevent credential stuffing attacks.

## Key Considerations for IPv6

When working with IPv6 addresses in security contexts:
- IPv6 addresses contain colons and may include brackets in URLs
- IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) must be normalized
- IPv6 CIDR notation uses a slash: `2001:db8::/32`
- A /64 IPv6 subnet contains 2^64 addresses (about 18 quintillion) - commonly rate limit at /64 level

## Configuration Example

### Checking if an IP is IPv6

```python
import ipaddress

def normalize_ip(ip_str: str) -> str:
    """Normalize IP address, converting IPv4-mapped IPv6 to IPv4."""
    try:
        addr = ipaddress.ip_address(ip_str)
        # Convert IPv4-mapped IPv6 to plain IPv4
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(addr)
    except ValueError:
        return ip_str

def is_in_network(ip_str: str, network_str: str) -> bool:
    """Check if an IP is within a network (supports IPv6 CIDR)."""
    try:
        ip = ipaddress.ip_address(normalize_ip(ip_str))
        network = ipaddress.ip_network(network_str, strict=False)
        return ip in network
    except ValueError:
        return False

# Examples:

print(normalize_ip("::ffff:192.168.1.1"))  # → 192.168.1.1
print(normalize_ip("2001:db8::1"))          # → 2001:db8::1
print(is_in_network("2001:db8::1", "2001:db8::/32"))  # → True
```

### IPv6-Aware Rate Limiting

```python
import ipaddress
import time
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def get_rate_limit_key(client_ip: str) -> str:
    """Return rate limit key, grouping /64 subnets for native IPv6."""
    try:
        addr = ipaddress.ip_address(client_ip)

        # Normalize IPv4-mapped IPv6 so it shares the IPv4 rate limit key.
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            addr = addr.ipv4_mapped

        if isinstance(addr, ipaddress.IPv6Address):
            # Group entire /64 subnet under one rate limit key.
            # This prevents bypassing rate limits by rotating addresses in the same /64.
            network = ipaddress.ip_network(f"{addr}/64", strict=False)
            return f"ratelimit:ipv6:{network.network_address}"

        return f"ratelimit:ipv4:{addr}"
    except ValueError:
        return f"ratelimit:unknown:{client_ip}"

def check_rate_limit(client_ip: str, max_requests: int = 100, window: int = 60) -> bool:
    """Return True if within rate limit, False if exceeded."""
    # Use a time bucket so the counter resets instead of extending the TTL
    # on every request.
    bucket = int(time.time()) // window
    key = f"{get_rate_limit_key(client_ip)}:{bucket}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()
    return count <= max_requests
```

## Testing

```bash
# Test against an IPv6 endpoint
curl -6 -X POST https://[2001:db8::1]:443/auth/login   -H "Content-Type: application/json"   -d '{"username": "test", "password": "test"}'

# Simulate multiple requests against an IPv6 endpoint
for i in $(seq 1 20); do
  curl -6 -s -o /dev/null -w "%{http_code}\n"     -X POST https://[::1]:443/auth/login     -H "Content-Type: application/json"     -d '{"username": "test", "password": "wrong"}'
done
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor authentication endpoint availability over IPv6 and track response times. Set up alerts for unusually high error rates which may indicate brute force attacks against your IPv6 endpoints.

## Conclusion

How to Handle IPv6 in Rate Limiting for Auth Endpoints requires understanding IPv6 address formats, normalizing IPv4-mapped addresses, and applying security policies at the /64 subnet level for native IPv6 since a /64 contains 2^64 addresses and clients can rotate addresses within that prefix.
