# How to Handle IPv6 in Load Balancer X-Forwarded-For Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancer, X-Forwarded-For, Nginx, Proxy, Web Development

Description: Correctly parse and use IPv6 addresses from X-Forwarded-For headers in applications and reverse proxies, handling bracket notation and IPv4-mapped addresses.

## Introduction

The `X-Forwarded-For` (XFF) header is added by load balancers and proxies to preserve the original client IP. When clients connect over IPv6, their address appears in XFF either as a plain IPv6 address or, in some implementations, with brackets when a port is appended. Applications must correctly extract IPv6 from XFF headers to avoid logging wrong IPs or applying incorrect rate limits.

## X-Forwarded-For Header Format with IPv6

The XFF header format for a chain of proxies:

```text
X-Forwarded-For: <client>, <proxy1>, <proxy2>

Examples with IPv6:
X-Forwarded-For: 2001:db8::1, 10.0.0.5, 10.0.0.1
X-Forwarded-For: [2001:db8::1]:12345, 10.0.0.5  # With port (implementation-specific)
X-Forwarded-For: ::ffff:192.168.1.5, 10.0.0.1    # IPv4-mapped
X-Forwarded-For: 2001:db8::1                      # Single client
```

## Nginx: Forwarding IPv6 Client IPs

Configure Nginx to forward the real client IPv6 address to upstream applications:

```nginx
# /etc/nginx/conf.d/proxy.conf

server {
    listen 80;
    listen [::]:80;
    server_name example.com;

    location / {
        # Trust our known proxy IPs (adjust to your infrastructure)
        set_real_ip_from 10.0.0.0/8;
        set_real_ip_from 172.16.0.0/12;
        set_real_ip_from 192.168.0.0/16;
        set_real_ip_from 2001:db8:1234::/48;

        # Use XFF for real IP
        real_ip_header X-Forwarded-For;
        real_ip_recursive on;

        # Preserve the existing XFF chain and append the trusted proxy hop
        proxy_set_header X-Forwarded-For "$http_x_forwarded_for, $realip_remote_addr";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;

        proxy_pass http://backend;
    }
}
```

## Python: Parsing IPv6 from X-Forwarded-For

```python
import ipaddress

# Trusted proxy networks that are allowed to set XFF
TRUSTED_PROXIES = [
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('2001:db8:1234::/48'),
]

def parse_ip(ip_str: str):
    """Parse an IP, normalizing zone IDs and IPv4-mapped IPv6."""
    try:
        addr = ipaddress.ip_address(clean_xff_entry(ip_str))
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return addr.ipv4_mapped
        return addr
    except ValueError:
        return None

def is_trusted_proxy(ip_str: str) -> bool:
    """Check if an IP belongs to a trusted proxy range."""
    addr = parse_ip(ip_str)
    return addr is not None and any(addr in network for network in TRUSTED_PROXIES)

def extract_client_ip(request_headers: dict, remote_addr: str) -> str:
    """
    Extract the real client IP from XFF, only if the request came from
    a trusted proxy. Walk back through the chain from right to left.
    """
    remote_ip = clean_xff_entry(remote_addr)
    if not is_trusted_proxy(remote_ip):
        return normalize_ip(remote_ip)

    xff = request_headers.get('X-Forwarded-For', '')
    if not xff:
        return normalize_ip(remote_ip)

    # Split XFF, clean each IP, and ignore invalid entries
    ips = [clean_xff_entry(ip) for ip in xff.split(',') if ip.strip()]
    valid_ips = [ip for ip in ips if parse_ip(ip) is not None]
    if not valid_ips:
        return normalize_ip(remote_ip)

    # Walk from right to left, skip trusted proxies
    for ip in reversed(valid_ips):
        if not is_trusted_proxy(ip):
            return normalize_ip(ip)

    return normalize_ip(valid_ips[0])

def clean_xff_entry(entry: str) -> str:
    """
    Clean a single IP entry from XFF, handling:
    - Brackets: [2001:db8::1]
    - Port suffix: [2001:db8::1]:12345 or 192.168.1.1:8080
    - Zone IDs: 2001:db8::1%eth0
    """
    entry = entry.strip()

    # Remove surrounding brackets
    if entry.startswith('['):
        bracket_end = entry.find(']')
        if bracket_end != -1:
            entry = entry[1:bracket_end]
    else:
        # Strip port from IPv4 (x.x.x.x:port)
        host, sep, port = entry.rpartition(':')
        if sep and port.isdigit():
            try:
                ipaddress.IPv4Address(host)
                entry = host
            except ipaddress.AddressValueError:
                pass

    # Strip zone ID
    return entry.split('%', 1)[0].strip()

def normalize_ip(ip_str: str) -> str:
    """Normalize IP to compressed form, converting IPv4-mapped to IPv4."""
    addr = parse_ip(ip_str)
    return str(addr) if addr is not None else clean_xff_entry(ip_str)

# Test
headers = {'X-Forwarded-For': '2001:db8::1, 10.0.0.5, 10.0.0.1'}
client_ip = extract_client_ip(headers, '10.0.0.1')
print(f"Client IP: {client_ip}")  # 2001:db8::1
```

## Node.js: Express Real IP Extraction

```javascript
const express = require('express');
const net = require('node:net');

const app = express();
const trustedProxies = new net.BlockList();
trustedProxies.addSubnet('127.0.0.0', 8, 'ipv4');
trustedProxies.addAddress('::1', 'ipv6');
trustedProxies.addSubnet('10.0.0.0', 8, 'ipv4');
trustedProxies.addSubnet('172.16.0.0', 12, 'ipv4');
trustedProxies.addSubnet('192.168.0.0', 16, 'ipv4');
trustedProxies.addSubnet('2001:db8:1234::', 48, 'ipv6');

function cleanXffEntry(entry) {
  const trimmed = entry.trim();

  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end !== -1) {
      return trimmed.slice(1, end).split('%')[0];
    }
  }

  const withoutZone = trimmed.split('%')[0];
  const lastColon = withoutZone.lastIndexOf(':');
  if (lastColon !== -1) {
    const host = withoutZone.slice(0, lastColon);
    const port = withoutZone.slice(lastColon + 1);
    if (/^\d+$/.test(port) && net.isIPv4(host)) {
      return host;
    }
  }

  return withoutZone;
}

function normalizeIp(ip) {
  return cleanXffEntry(ip).replace(/^::ffff:/, '');
}

function isTrustedProxy(ip) {
  const normalized = normalizeIp(ip);
  if (net.isIPv4(normalized)) return trustedProxies.check(normalized, 'ipv4');
  if (net.isIPv6(normalized)) return trustedProxies.check(normalized, 'ipv6');
  return false;
}

function extractClientIP(req) {
  const remoteAddr = req.socket.remoteAddress || '';
  if (!isTrustedProxy(remoteAddr)) {
    return normalizeIp(remoteAddr);
  }

  const xff = req.headers['x-forwarded-for'] || '';
  if (!xff) {
    return normalizeIp(remoteAddr);
  }

  const ips = xff
    .split(',')
    .map(cleanXffEntry)
    .filter(ip => net.isIP(normalizeIp(ip)));

  if (ips.length === 0) {
    return normalizeIp(remoteAddr);
  }

  for (let i = ips.length - 1; i >= 0; i -= 1) {
    if (!isTrustedProxy(ips[i])) {
      return normalizeIp(ips[i]);
    }
  }

  return normalizeIp(ips[0]);
}

// Express middleware
app.use((req, res, next) => {
  req.clientIP = extractClientIP(req);
  next();
});
```

## Conclusion

IPv6 addresses in X-Forwarded-For headers appear without brackets in most implementations but must be handled with bracket notation support for edge cases. Always validate that XFF was set by a trusted proxy before trusting it, walk the XFF chain from right to left to find the first non-trusted IP, and normalize IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) to their IPv4 equivalents.
