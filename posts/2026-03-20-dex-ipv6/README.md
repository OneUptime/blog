# How to Configure Dex with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dex, IPv6, OIDC, Authentication, Kubernetes

Description: Configure Dex OIDC provider to bind to IPv6 interfaces and handle identity federation over IPv6 networks.

## Overview

Configure Dex OIDC provider to bind to IPv6 interfaces and account for IPv6-aware identity workflows.

## Key Considerations for IPv6

When working with IPv6 addresses in security contexts:
- IPv6 addresses contain colons and use brackets when written as URL hosts
- IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) may need normalization before applying IP-based policy
- IPv6 CIDR notation uses a slash: `2001:db8::/32`
- A /64 IPv6 subnet contains `2^64` addresses, so IP-based policies often group by prefix instead of a single address

## Configuration Example

```yaml
issuer: "https://[2001:db8::10]:5556"
web:
  https: "[::]:5556"
  tlsCert: /etc/dex/tls.crt
  tlsKey: /etc/dex/tls.key
```

When you use literal IPv6 addresses, Dex configuration and URLs both need the bracketed host form.

### Handling IPv6 addresses in supporting Python code

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
    """Return rate limit key, using an example /64 policy for IPv6."""
    try:
        normalized_ip = normalize_ip(client_ip)
        addr = ipaddress.ip_address(normalized_ip)
        if isinstance(addr, ipaddress.IPv6Address):
            # Example policy: group an IPv6 /64 under one rate limit key.
            network = ipaddress.ip_network(f"{normalized_ip}/64", strict=False)
            return f"ratelimit:ipv6:{network}"
        else:
            return f"ratelimit:ipv4:{normalized_ip}"
    except ValueError:
        return f"ratelimit:unknown:{client_ip}"

def check_rate_limit(client_ip: str, max_requests: int = 100, window: int = 60) -> bool:
    """Return True if within rate limit, False if exceeded."""
    key = get_rate_limit_key(client_ip)
    count = r.incr(key)
    if count == 1:
        r.expire(key, window)
    return count <= max_requests
```

## Testing

```bash
# Test Dex discovery over IPv6
curl -6 -g "https://[2001:db8::10]:5556/.well-known/openid-configuration"

# Simulate multiple requests over IPv6 to verify surrounding rate limiting
for i in $(seq 1 20); do
  curl -6 -g -s -o /dev/null -w "%{http_code}\n" \
    "https://[2001:db8::10]:5556/.well-known/openid-configuration"
done
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor authentication endpoint availability over IPv6 and track response times. Set up alerts for unusually high error rates which may indicate brute force attacks against your IPv6 endpoints.

## Conclusion

How to Configure Dex with IPv6 requires understanding bracketed IPv6 literals in Dex URLs, binding Dex to an IPv6 listen address, normalizing IPv4-mapped addresses where supporting services apply IP-based policy, and remembering that a /64 contains `2^64` addresses.
