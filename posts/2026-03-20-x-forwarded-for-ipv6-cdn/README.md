# How to Handle X-Forwarded-For Headers with IPv6 at CDN Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, X-Forwarded-For, CDN, HTTP Headers, Security, Proxy

Description: A guide to correctly parsing, trusting, and using X-Forwarded-For headers containing IPv6 addresses at the CDN edge and origin server level.

The X-Forwarded-For (XFF) header is used to forward the original client IP through proxies and CDN layers. IPv6 addresses in XFF headers have specific formatting requirements and parsing challenges that differ from IPv4.

## IPv6 in X-Forwarded-For Format

IPv6 addresses in XFF headers do NOT use brackets:

```text
# IPv4 client:

X-Forwarded-For: 203.0.113.10, 10.0.0.1

# IPv6 client:
X-Forwarded-For: 2001:db8::1, 2001:db8::2, 10.0.0.2

# Mixed chain:
X-Forwarded-For: 2001:db8::1, 203.0.113.20, 10.0.0.3
```

The first IP is the original client (leftmost), subsequent IPs are proxies.

## CDN Edge: Adding IPv6 to X-Forwarded-For

### Cloudflare

```bash
# Cloudflare automatically adds CF-Connecting-IP header
# CF-Connecting-IP: 2001:db8::1    (always the real client IP)

# XFF header from Cloudflare:
# X-Forwarded-For: 2001:db8::1
```

### AWS ALB

```text
# ALB appends client IPv6 to XFF:
# X-Forwarded-For: 2001:db8::1

# If behind another proxy:
# X-Forwarded-For: 2001:db8::1, 2001:db8::2
```

### nginx at CDN Edge

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# $proxy_add_x_forwarded_for includes existing XFF + client IP
```

## Parsing IPv6 from X-Forwarded-For

### Python

```python
import ipaddress

def get_real_client_ip(x_forwarded_for: str, trusted_proxies: list) -> str:
    """Extract the real client IP from X-Forwarded-For, handling IPv6."""
    if not x_forwarded_for:
        return None

    # Split the XFF chain
    ips = [ip.strip() for ip in x_forwarded_for.split(',')]

    # Walk from right to left, skip trusted proxies
    for ip_str in reversed(ips):
        try:
            ip = ipaddress.ip_address(ip_str)
            # Check if this IP is a trusted proxy
            if not any(ip in ipaddress.ip_network(p, strict=False)
                      for p in trusted_proxies):
                return str(ip)
        except ValueError:
            continue

    return ips[0] if ips else None

# Example usage
xff = "2001:db8::1, 2001:db8::100, 10.0.0.1"
trusted = ["2001:db8::100/128", "10.0.0.0/8"]
client_ip = get_real_client_ip(xff, trusted)
print(f"Real client: {client_ip}")  # 2001:db8::1
```

### Node.js

```javascript
const ipaddr = require('ipaddr.js');

function getRealClientIP(xff, trustedProxies) {
  if (!xff) return null;

  const ips = xff.split(',').map(ip => ip.trim()).reverse();

  for (const ipStr of ips) {
    try {
      const ip = ipaddr.parse(ipStr);
      const isTrusted = trustedProxies.some(proxy => {
        const [net, prefix] = proxy.split('/');
        return ip.match(ipaddr.parseCIDR(proxy));
      });
      if (!isTrusted) return ipStr;
    } catch (e) {
      continue;
    }
  }
  return null;
}
```

## Application Framework Configuration

### Django

```python
# settings.py
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# For IPv6 trusted proxies
ALLOWED_HOSTS = ['*']

# Custom middleware for IPv6 real IP
TRUSTED_PROXIES = [
    '2001:db8:abcd::/48',   # CDN IPv6 range
    '10.0.0.0/8',           # Internal IPv4
]
```

### Flask

```python
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Trust 1 proxy hop (CDN layer)
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,      # Trust 1 X-Forwarded-For hop
    x_proto=1,
    x_host=1
)
```

## Security: XFF Spoofing with IPv6

Clients can forge XFF headers:

```bash
# Malicious client spoofing IPv6 address
curl -H "X-Forwarded-For: 2001:db8::dead" https://example.com/

# Without proper validation, your app sees the forged IPv6 as the client
```

Defense:
```nginx
# Only trust XFF from known CDN/proxy IP ranges
# In nginx, real_ip_from must match the actual connecting IP, not XFF claims

set_real_ip_from 2606:4700::/32;   # Cloudflare IPv6 (trusted)
real_ip_header X-Forwarded-For;
real_ip_recursive on;

# Any XFF from non-trusted sources is stripped
```

Correct X-Forwarded-For handling for IPv6 requires validating that the forwarding proxy is trusted and parsing the leftmost untrusted IP as the real client address.
