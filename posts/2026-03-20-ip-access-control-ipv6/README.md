# How to Configure IP-Based Access Control with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ACL, Security, Access Control, Firewall

Description: Implement IP-based access control lists (ACLs) that support IPv6 addresses, CIDR blocks, and dual-stack environments.

## Overview

Implement IP-based access control lists (ACLs) that support IPv6 addresses, CIDR blocks, and dual-stack environments.

## Key Considerations for IPv6

When working with IPv6 addresses in security contexts:
- IPv6 addresses contain colons and may include brackets in URLs
- IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) must be normalized
- IPv6 CIDR notation uses a slash: `2001:db8::/32`
- A /64 IPv6 subnet contains trillions of addresses - rate limit at /64 level

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
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def get_rate_limit_key(client_ip: str) -> str:
    """Return rate limit key, grouping /64 subnets for IPv6."""
    try:
        addr = ipaddress.ip_address(client_ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return f"ratelimit:ipv4:{addr.ipv4_mapped}"
        if isinstance(addr, ipaddress.IPv6Address):
            # Group entire /64 subnet under one rate limit key
            # This prevents bypassing rate limits by using different addresses in same /64
            network = ipaddress.ip_network(f"{addr}/64", strict=False)
            return f"ratelimit:ipv6:{network}"
        else:
            return f"ratelimit:ipv4:{addr}"
    except ValueError:
        return f"ratelimit:unknown:{client_ip}"

def check_rate_limit(client_ip: str, max_requests: int = 100, window: int = 60) -> bool:
    """Return True if within rate limit, False if exceeded."""
    key = get_rate_limit_key(client_ip)
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    count, _ = pipe.execute()
    return count <= max_requests
```

## Testing

```bash
# Test an IPv6 endpoint directly
curl -g -6 -X POST "https://[2001:db8::1]:443/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'

# Simulate multiple requests to test rate limiting over IPv6
for i in $(seq 1 20); do
  curl -g -6 -s -o /dev/null -w "%{http_code}\n" \
    -X POST "https://[::1]:443/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "password": "wrong"}'
done
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor authentication endpoint availability over IPv6 and track response times. Set up alerts for unusually high error rates which may indicate brute force attacks against your IPv6 endpoints.

## Conclusion

How to Configure IP-Based Access Control with IPv6 requires understanding IPv6 address formats, normalizing IPv4-mapped addresses, and applying security policies at the /64 subnet level for IPv6 since individual users may have trillions of addresses within their prefix.
